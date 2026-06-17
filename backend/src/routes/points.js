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
    const inputId = parseInt(studentId);

    // 查询student记录（支持user_id或student_id）
    const { pool } = require('../database/connection');
    const studentQuery = await pool.query(
      'SELECT id, user_id FROM students WHERE id = $1 OR user_id = $1',
      [inputId]
    );

    if (studentQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = studentQuery.rows[0];
    const actualStudentId = student.id;
    const actualUserId = student.user_id;

    // 权限验证：学生只能查看自己的积分
    if (req.user.role === 'student' && req.user.id !== actualUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const account = await StudentPoints.getPointsAccount(actualStudentId);

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
    const inputId = parseInt(studentId);

    // 查询student记录（支持user_id或student_id）
    const { pool } = require('../database/connection');
    const studentQuery = await pool.query(
      'SELECT id, user_id FROM students WHERE id = $1 OR user_id = $1',
      [inputId]
    );

    if (studentQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = studentQuery.rows[0];
    const actualStudentId = student.id;
    const actualUserId = student.user_id;

    // 权限验证：学生只能查看自己的积分交易历史
    if (req.user.role === 'student' && req.user.id !== actualUserId) {
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
      actualStudentId,
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

/**
 * 获取当前连胜（D2）
 * GET /api/points/streak
 */
router.get('/streak', authMiddleware, async (req, res) => {
  try {
    const StreakService = require('../services/streak/StreakService');
    let studentId = req.user.id;
    // 家长查看孩子连胜
    if (req.query.studentId) {
      studentId = parseInt(req.query.studentId, 10);
    }
    const streak = await StreakService.get(studentId);
    res.json({ success: true, data: streak });
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ success: false, message: '获取连胜失败', error: error.message });
  }
});

module.exports = router;
