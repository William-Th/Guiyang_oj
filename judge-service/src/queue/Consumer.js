/**
 * Queue Consumer - Processes judge tasks from queue
 */

const queue = require('./RedisQueue');
const { JudgeService } = require('../judge/JudgeService');
const Submission = require('../models/Submission');
const TestCase = require('../models/TestCase');
const config = require('../config');
const logger = require('../utils/logger');

class Consumer {
  constructor() {
    this.running = false;
    this.currentTasks = 0;
    this.processedCount = 0;
  }

  /**
   * Start consuming tasks
   */
  async start() {
    if (this.running) {
      logger.warn('Consumer already running');
      return;
    }

    logger.info('Starting queue consumer', {
      workerId: config.worker.id,
      maxConcurrent: config.worker.maxConcurrent
    });

    this.running = true;
    await JudgeService.init();
    await queue.connect();

    this.poll();
  }

  /**
   * Stop consuming tasks
   */
  async stop() {
    logger.info('Stopping queue consumer');
    this.running = false;

    // Wait for current tasks to complete
    while (this.currentTasks > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await queue.disconnect();
    logger.info('Consumer stopped', { processed: this.processedCount });
  }

  /**
   * Poll for new tasks
   */
  async poll() {
    while (this.running) {
      try {
        // Check if we can process more tasks
        if (this.currentTasks >= config.worker.maxConcurrent) {
          await new Promise(resolve =>
            setTimeout(resolve, config.worker.pollInterval)
          );
          continue;
        }

        // Try to get a task
        const task = await queue.dequeue();

        if (task) {
          // Process task asynchronously
          this.processTask(task);
        } else {
          // No task, wait before polling again
          await new Promise(resolve =>
            setTimeout(resolve, config.worker.pollInterval)
          );
        }
      } catch (err) {
        logger.error('Poll error', { error: err.message });
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Process a single task
   */
  async processTask(task) {
    this.currentTasks++;
    const startTime = Date.now();

    logger.info('Processing task', {
      submissionId: task.submissionId,
      questionId: task.questionId
    });

    try {
      // Update submission status
      await Submission.updateResult(task.submissionId, {
        status: 'judging'
      });

      // Get test cases
      const testCases = await TestCase.getByQuestionId(task.questionId);

      if (!testCases || testCases.length === 0) {
        throw new Error(`No test cases found for question ${task.questionId}`);
      }

      // Format test cases for judge
      const formattedTestCases = testCases.map(tc => ({
        caseNumber: tc.case_number,
        input: tc.input_data,
        expectedOutput: tc.expected_output,
        score: tc.score,
        timeLimit: tc.time_limit || task.timeLimit,
        memoryLimit: tc.memory_limit || task.memoryLimit,
        isSample: tc.is_sample
      }));

      // Execute judge
      const result = await JudgeService.judge({
        submissionId: task.submissionId,
        code: task.code,
        language: task.language,
        testCases: formattedTestCases,
        timeLimit: task.timeLimit,
        memoryLimit: task.memoryLimit,
        judgeMode: task.judgeMode
      });

      // Calculate total execution time
      const totalTime = result.testResults.reduce(
        (sum, r) => sum + (r.executionTime || 0), 0
      );

      // Update submission with results
      await Submission.updateResult(task.submissionId, {
        status: result.status,
        score: result.score,
        maxScore: result.maxScore,
        compileOutput: result.compileOutput,
        executionTime: totalTime,
        memoryUsed: null, // Would need cgroup stats
        testResults: result.testResults,
        judgedAt: new Date()
      });

      // Store result in queue for real-time notification
      await queue.storeResult(task.submissionId, {
        submissionId: task.submissionId,
        status: result.status,
        score: result.score,
        maxScore: result.maxScore,
        testResults: result.testResults.map(r => ({
          caseNumber: r.caseNumber,
          status: r.status,
          executionTime: r.executionTime,
          score: r.score,
          earned: r.earned,
          isSample: r.isSample
        }))
      });

      const duration = Date.now() - startTime;
      logger.info('Task completed', {
        submissionId: task.submissionId,
        status: result.status,
        score: result.score,
        duration
      });

      this.processedCount++;

    } catch (err) {
      logger.error('Task processing error', {
        submissionId: task.submissionId,
        error: err.message,
        stack: err.stack
      });

      // Update submission with error (use full status name to match database schema)
      await Submission.updateResult(task.submissionId, {
        status: 'system_error',
        score: 0,
        compileOutput: `System error: ${err.message}`,
        judgedAt: new Date()
      });

      // Store error result
      await queue.storeResult(task.submissionId, {
        submissionId: task.submissionId,
        status: 'system_error',
        error: err.message
      });

    } finally {
      this.currentTasks--;
    }
  }

  /**
   * Get consumer status
   */
  getStatus() {
    return {
      running: this.running,
      workerId: config.worker.id,
      currentTasks: this.currentTasks,
      maxConcurrent: config.worker.maxConcurrent,
      processedCount: this.processedCount
    };
  }
}

module.exports = new Consumer();
