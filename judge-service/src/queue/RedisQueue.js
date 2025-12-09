/**
 * Redis Queue - Message queue for judge tasks
 */

const redis = require('redis');
const config = require('../config');
const logger = require('../utils/logger');

class RedisQueue {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.connected = false;
    this.queueKey = 'judge:queue';
    this.processingKey = 'judge:processing';
    this.resultKey = 'judge:results';
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (this.connected) return;

    const url = `redis://${config.redis.host}:${config.redis.port}`;

    // Main client for operations
    this.client = redis.createClient({ url });
    this.client.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });
    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    // Subscriber client for notifications
    this.subscriber = this.client.duplicate();
    this.subscriber.on('error', (err) => {
      logger.error('Redis subscriber error', { error: err.message });
    });

    await this.client.connect();
    await this.subscriber.connect();

    this.connected = true;
    logger.info('Redis queue initialized');
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    this.connected = false;
    logger.info('Redis queue disconnected');
  }

  /**
   * Add a judge task to queue
   */
  async enqueue(task) {
    const taskData = JSON.stringify({
      ...task,
      enqueuedAt: new Date().toISOString()
    });

    // Add to queue with score (priority)
    const priority = task.priority || 0;
    await this.client.zAdd(this.queueKey, {
      score: Date.now() - priority * 1000000, // Lower score = higher priority
      value: taskData
    });

    // Update queue status in database if submissionId exists
    if (task.submissionId) {
      await this.client.hSet(
        `${this.processingKey}:status`,
        task.submissionId.toString(),
        'queued'
      );
    }

    logger.debug('Task enqueued', {
      submissionId: task.submissionId,
      priority
    });

    return task;
  }

  /**
   * Get next task from queue
   */
  async dequeue() {
    // Get the task with lowest score (highest priority, oldest)
    const items = await this.client.zPopMin(this.queueKey);

    if (!items || items.length === 0) {
      return null;
    }

    const taskData = JSON.parse(items.value);

    // Mark as processing
    if (taskData.submissionId) {
      await this.client.hSet(
        `${this.processingKey}:status`,
        taskData.submissionId.toString(),
        'processing'
      );
      await this.client.hSet(
        `${this.processingKey}:worker`,
        taskData.submissionId.toString(),
        config.worker.id
      );
    }

    logger.debug('Task dequeued', { submissionId: taskData.submissionId });

    return taskData;
  }

  /**
   * Store judge result
   */
  async storeResult(submissionId, result) {
    const resultData = JSON.stringify({
      ...result,
      completedAt: new Date().toISOString()
    });

    // Store result with expiration (24 hours)
    await this.client.setEx(
      `${this.resultKey}:${submissionId}`,
      86400,
      resultData
    );

    // Clean up processing status
    await this.client.hDel(
      `${this.processingKey}:status`,
      submissionId.toString()
    );
    await this.client.hDel(
      `${this.processingKey}:worker`,
      submissionId.toString()
    );

    // Publish result notification
    await this.client.publish(
      `judge:result:${submissionId}`,
      resultData
    );

    logger.debug('Result stored', { submissionId, status: result.status });
  }

  /**
   * Get judge result
   */
  async getResult(submissionId) {
    const result = await this.client.get(`${this.resultKey}:${submissionId}`);
    return result ? JSON.parse(result) : null;
  }

  /**
   * Get task status
   */
  async getStatus(submissionId) {
    const status = await this.client.hGet(
      `${this.processingKey}:status`,
      submissionId.toString()
    );
    return status || 'unknown';
  }

  /**
   * Subscribe to result notifications
   */
  async subscribeToResult(submissionId, callback) {
    const channel = `judge:result:${submissionId}`;

    await this.subscriber.subscribe(channel, (message) => {
      callback(JSON.parse(message));
      this.subscriber.unsubscribe(channel);
    });
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const queueLength = await this.client.zCard(this.queueKey);
    const processingCount = await this.client.hLen(`${this.processingKey}:status`);

    return {
      queued: queueLength,
      processing: processingCount
    };
  }

  /**
   * Clear queue (for testing)
   */
  async clearQueue() {
    await this.client.del(this.queueKey);
    await this.client.del(`${this.processingKey}:status`);
    await this.client.del(`${this.processingKey}:worker`);
    logger.warn('Queue cleared');
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.client.ping();
      return {
        connected: true,
        stats: await this.getStats()
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message
      };
    }
  }
}

module.exports = new RedisQueue();
