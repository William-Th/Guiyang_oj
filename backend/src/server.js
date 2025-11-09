const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { startAutoSubmitCron, stopAutoSubmitCron } = require('./services/autoSubmitService');
const { startEscalationCron, stopEscalationCron } = require('./services/registrationEscalationService');
const { startLeaderboardCron, stopLeaderboardCron } = require('./services/points/leaderboardCron');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : process.env.NODE_ENV === 'development' 
    ? '.env.development' 
    : '.env';

dotenv.config({ path: envFile });

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - needed for rate limiting with nginx
app.set('trust proxy', true);

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Initialize database connection
require('./database/connection');

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      objectSrc: ['\'none\''],
      upgradeInsecureRequests: []
    }
  }
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [process.env.CORS_ORIGIN || 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting with environment configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { message: '请求过于频繁，请稍后重试' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoint (before maintenance mode check)
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const { pool } = require('./database/connection');
    await pool.query('SELECT 1');

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

// Maintenance mode check
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).json({
      message: '系统维护中,请稍后再试',
      maintenanceMode: true
    });
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin')); // 管理员管理功能
app.use('/api/activities', require('./routes/activities')); // New activity system (测评/练习)
app.use('/api/student/activities', require('./routes/studentActivities')); // 学生答题系统
app.use('/api/teacher/grading', require('./routes/grading')); // 教师评卷系统
app.use('/api/questions', require('./routes/questions'));
app.use('/api/question-bank', require('./routes/questionBank'));
app.use('/api/question-review', require('./routes/questionReview')); // 题目审核流程
app.use('/api/permissions', require('./routes/permissions')); // 权限管理
app.use('/api/results', require('./routes/results'));
app.use('/api/certificates', require('./routes/certificates')); // 完整的证书功能
app.use('/api/certificate', require('./routes/certificate_verify')); // 公共验证和测试端点
app.use('/api/registration', require('./routes/registration')); // 学生注册申请和审核
app.use('/api/subjects', require('./routes/subjects')); // 科目配置管理
app.use('/api/achievements', require('./routes/achievements')); // 成就系统
app.use('/api/points', require('./routes/points')); // 积分系统
app.use('/api/daily-tasks', require('./routes/dailyTasks')); // 日常任务系统

// Error handling middleware
app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details
    })
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found:', { url: req.url, method: req.method });
  res.status(404).json({ message: '接口不存在' });
});

// Store cron tasks for graceful shutdown
let autoSubmitTask = null;
let registrationEscalationTask = null;
let leaderboardTask = null;

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  // Stop cron jobs
  if (autoSubmitTask) {
    stopAutoSubmitCron(autoSubmitTask);
  }
  if (registrationEscalationTask) {
    stopEscalationCron(registrationEscalationTask);
  }
  if (leaderboardTask) {
    stopLeaderboardCron(leaderboardTask);
  }
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  // Stop cron jobs
  if (autoSubmitTask) {
    stopAutoSubmitCron(autoSubmitTask);
  }
  if (registrationEscalationTask) {
    stopEscalationCron(registrationEscalationTask);
  }
  if (leaderboardTask) {
    stopLeaderboardCron(leaderboardTask);
  }
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

const server = app.listen(PORT, async () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION
  });
  console.log(`🚀 ${process.env.APP_NAME || 'Server'} running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);

  // Start cron jobs
  autoSubmitTask = startAutoSubmitCron();
  console.log('⏰ Auto-submit cron job started (runs every minute)');

  registrationEscalationTask = startEscalationCron();
  console.log('⏰ Registration escalation cron job started (runs every hour)');

  // Start leaderboard generation cron job
  leaderboardTask = startLeaderboardCron();
  console.log('⏰ Leaderboard generation cron job started (runs hourly at 5th minute)');

  // Initialize achievement detector
  try {
    const { achievementDetector } = require('./services/achievement');
    await achievementDetector.initialize();
    console.log('🏆 Achievement detector initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize achievement detector:', error);
    console.error('⚠️  Achievement detector initialization failed');
  }
});