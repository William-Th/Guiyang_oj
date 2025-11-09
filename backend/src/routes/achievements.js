const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Achievement = require('../models/Achievement');

/**
 * 获取所有成就定义
 * GET /api/achievements
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { category, rarity } = req.query;
    const filters = {};

    if (category) filters.category = category;
    if (rarity) filters.rarity = rarity;

    const achievements = await Achievement.getAllAchievements(filters);
    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements',
      error: error.message
    });
  }
});

/**
 * 获取单个成就详情
 * GET /api/achievements/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const achievement = await Achievement.getAchievementById(parseInt(id));

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    res.json({
      success: true,
      data: achievement
    });
  } catch (error) {
    console.error('Error fetching achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievement',
      error: error.message
    });
  }
});

/**
 * 获取学生的成就记录
 * GET /api/achievements/student/:studentId
 */
router.get('/student/:studentId', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;

    // 权限验证：学生只能查看自己的成就
    if (req.user.role === 'student' && req.user.userId !== parseInt(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const achievements = await Achievement.getStudentAchievements(parseInt(studentId));
    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    console.error('Error fetching student achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student achievements',
      error: error.message
    });
  }
});

/**
 * 获取学生成就进度
 * GET /api/achievements/student/:studentId/progress
 */
router.get('/student/:studentId/progress', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;

    // 权限验证
    if (req.user.role === 'student' && req.user.userId !== parseInt(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const progress = await Achievement.getStudentProgress(parseInt(studentId));
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching achievement progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievement progress',
      error: error.message
    });
  }
});

/**
 * 授予成就（管理员/系统内部调用）
 * POST /api/achievements/award
 */
router.post('/award', authMiddleware, async (req, res) => {
  try {
    // 只允许管理员调用
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { studentId, achievementId, pointsAwarded } = req.body;

    if (!studentId || !achievementId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Achievement ID are required'
      });
    }

    const result = await Achievement.awardAchievement(
      parseInt(studentId),
      parseInt(achievementId),
      pointsAwarded || 0
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error awarding achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to award achievement',
      error: error.message
    });
  }
});

module.exports = router;
