const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const StudentPoints = require('../models/StudentPoints');
const { pool } = require('../database/connection');
const { authorizeStudentAccess, getStudentQueryScope } = require('../services/studentAccessControl');

async function getAuthorizedStudent(req, res, identifier, options) {
  const access = await authorizeStudentAccess(req.user, identifier, options);
  if (!access.student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return null;
  }
  if (!access.allowed) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return null;
  }
  return access.student;
}

/**
 * 获取学生积分账户
 * GET /api/points/account/:studentId
 */
router.get('/account/:studentId', authMiddleware, async (req, res) => {
  try {
    const student = await getAuthorizedStudent(req, res, req.params.studentId);
    if (!student) return;

    const account = await StudentPoints.getPointsAccount(student.student_id);

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
    const { transactionType, type, startDate, endDate, limit, offset } = req.query;
    const student = await getAuthorizedStudent(req, res, req.params.studentId);
    if (!student) return;

    const filters = {};
    if (transactionType) filters.transactionType = transactionType;
    if (type === 'earn' || type === 'spend') filters.earnSpend = type;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const [transactions, total] = await Promise.all([
      StudentPoints.getTransactionHistory(student.student_id, filters),
      StudentPoints.countTransactionHistory(student.student_id, filters)
    ]);

    res.json({
      success: true,
      data: transactions,
      total
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
 * 积分汇总（今日/本周获得、累计获得/消耗）— 供交易记录顶部卡片
 * GET /api/points/summary/:studentId
 */
router.get('/summary/:studentId', authMiddleware, async (req, res) => {
  try {
    const student = await getAuthorizedStudent(req, res, req.params.studentId);
    if (!student) return;

    const summary = await StudentPoints.getSummary(student.student_id);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching points summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
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

    if (['student', 'parent'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const student = await getAuthorizedStudent(req, res, studentId, { write: true });
    if (!student) return;

    const metadata = {
      sourceId,
      sourceType,
      description,
      expiresAt
    };

    const transaction = await StudentPoints.addPoints(
      student.student_id,
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
    const { type, scope: requestedScope, limit } = req.query;
    const leaderboardType = type || 'total';
    const leaderboardLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 100);
    const params = [leaderboardType];
    let scopeFilter = '';
    if (requestedScope) {
      params.push(requestedScope);
      scopeFilter = ` AND l.scope = $${params.length}`;
    }
    const accessScope = await getStudentQueryScope(req.user, {
      studentAlias: 's',
      firstParam: params.length + 1
    });
    if (!accessScope.allowed) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    params.push(...accessScope.params);
    params.push(leaderboardLimit);
    const result = await pool.query(
      `SELECT l.student_id, l.student_name, l.school_name, l.class_name,
              l.points, l.rank, l.rank_change, l.period_start, l.period_end
         FROM leaderboards l
         JOIN students s ON s.id = l.student_id
        WHERE l.leaderboard_type = $1${scopeFilter}
          AND ${accessScope.sql}
        ORDER BY l.rank ASC
        LIMIT $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: result.rows
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
    const student = await getAuthorizedStudent(req, res, studentId);
    if (!student) return;
    const streak = await StreakService.get(student.student_id);
    res.json({ success: true, data: streak });
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ success: false, message: '获取连胜失败', error: error.message });
  }
});

module.exports = router;
