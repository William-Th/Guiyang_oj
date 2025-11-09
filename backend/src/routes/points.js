const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const StudentPoints = require('../models/StudentPoints');

/**
 * 获取学生积分账户
 * GET /api/points/account/:studentId
 */
router.get('/account/:studentId', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;

    // 权限验证：学生只能查看自己的积分
    if (req.user.role === 'student' && req.user.userId !== parseInt(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const account = await StudentPoints.getPointsAccount(parseInt(studentId));

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Points account not found'
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error fetching points account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch points account',
      error: error.message
    });
  }
});

/**
 * 获取学生积分交易历史
 * GET /api/points/transactions/:studentId
 */
router.get('/transactions/:studentId', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { transactionType, startDate, endDate, limit } = req.query;

    // 权限验证
    if (req.user.role === 'student' && req.user.userId !== parseInt(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const filters = {};
    if (transactionType) filters.transactionType = transactionType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = parseInt(limit);

    const transactions = await StudentPoints.getTransactionHistory(
      parseInt(studentId),
      filters
    );

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

/**
 * 添加积分（管理员/系统内部调用）
 * POST /api/points/add
 */
router.post('/add', authMiddleware, async (req, res) => {
  try {
    // 只允许管理员或教师调用
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { studentId, points, transactionType, sourceId, sourceType, description, expiresAt } = req.body;

    if (!studentId || !points || !transactionType) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, points, and transaction type are required'
      });
    }

    if (points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Points must be positive'
      });
    }

    const metadata = {
      sourceId,
      sourceType,
      description,
      expiresAt
    };

    const transaction = await StudentPoints.addPoints(
      parseInt(studentId),
      parseInt(points),
      transactionType,
      metadata
    );

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error adding points:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add points',
      error: error.message
    });
  }
});

/**
 * 获取排行榜
 * GET /api/points/leaderboard
 */
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { type, scope, limit } = req.query;

    const leaderboardType = type || 'total';
    const leaderboardLimit = limit ? parseInt(limit) : 100;

    const leaderboard = await StudentPoints.getLeaderboard(
      leaderboardType,
      scope,
      leaderboardLimit
    );

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message
    });
  }
});

module.exports = router;
