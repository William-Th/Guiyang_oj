/**
 * Judge Service - Main Entry Point
 */

const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const db = require('./models/db');
const queue = require('./queue/RedisQueue');
const consumer = require('./queue/Consumer');
const { JudgeService } = require('./judge/JudgeService');

// Routes
const judgeRoutes = require('./routes/judge');
const testcaseRoutes = require('./routes/testcases');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug('Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration
    });
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const [dbHealth, queueHealth, judgeHealth] = await Promise.all([
      db.healthCheck(),
      queue.healthCheck(),
      JudgeService.healthCheck()
    ]);

    const healthy = dbHealth.connected && queueHealth.connected;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        queue: queueHealth,
        judge: judgeHealth,
        consumer: consumer.getStatus()
      }
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      error: err.message
    });
  }
});

// API Routes
app.use('/api/judge', judgeRoutes);
app.use('/api/testcases', testcaseRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found'
  });
});

// Startup
async function start() {
  try {
    logger.info('Starting Judge Service...');
    logger.info('Configuration', {
      port: config.port,
      nodeEnv: config.nodeEnv,
      workerId: config.worker.id
    });

    // Initialize services
    await queue.connect();
    logger.info('Redis queue connected');

    await JudgeService.init();
    logger.info('Judge service initialized');

    // Start consumer
    await consumer.start();
    logger.info('Queue consumer started');

    // Start HTTP server
    app.listen(config.port, () => {
      logger.info(`Judge Service listening on port ${config.port}`);
    });

  } catch (err) {
    logger.error('Startup failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');

  try {
    await consumer.stop();
    await queue.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error('Shutdown error', { error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the service
start();
