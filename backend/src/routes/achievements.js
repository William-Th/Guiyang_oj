const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Achievement = require('../models/Achievement');

/**
 * 生成唯一的成就编码
 */
function generateAchievementCode(category, name) {
  const timestamp = Date.now().toString().slice(-6);
  const categoryUpper = category.toUpperCase();
  const nameSlug = name
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase();
  return `ACH_${categoryUpper}_${nameSlug}_${timestamp}`;
}

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
      achievements: achievements
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

/**
 * 创建新成就（仅系统管理员和市级管理员）
 * POST /api/achievements
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    // 权限验证：只有system_admin和municipal_admin可以创建
    if (!['system_admin', 'municipal_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only system and municipal admins can create achievements.'
      });
    }

    const { name, description, category, rarity, icon, points, requirementType, requirementValue, isActive } = req.body;

    // 验证必填字段
    if (!name || !description || !category || !rarity || !icon || !requirementType || requirementValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // 自动生成成就编码
    const code = generateAchievementCode(category, name);

    // 创建成就
    const achievement = await Achievement.createAchievement({
      code,
      name,
      description,
      category,
      rarity,
      icon,
      points: points || 0,
      requirementType,
      requirementValue,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'Achievement created successfully',
      achievement: achievement
    });
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create achievement',
      error: error.message
    });
  }
});

/**
 * 更新成就（仅系统管理员和市级管理员）
 * PUT /api/achievements/:id
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // 权限验证
    if (!['system_admin', 'municipal_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only system and municipal admins can update achievements.'
      });
    }

    const { id } = req.params;
    const { name, description, category, rarity, icon, points, requirementType, requirementValue, isActive } = req.body;

    // 更新成就（不允许修改code）
    const achievement = await Achievement.updateAchievement(parseInt(id), {
      name,
      description,
      category,
      rarity,
      icon,
      points,
      requirementType,
      requirementValue,
      isActive
    });

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    res.json({
      success: true,
      message: 'Achievement updated successfully',
      achievement: achievement
    });
  } catch (error) {
    console.error('Error updating achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update achievement',
      error: error.message
    });
  }
});

/**
 * 删除成就（仅系统管理员和市级管理员）
 * DELETE /api/achievements/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // 权限验证
    if (!['system_admin', 'municipal_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only system and municipal admins can delete achievements.'
      });
    }

    const { id } = req.params;
    const result = await Achievement.deleteAchievement(parseInt(id));

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    res.json({
      success: true,
      message: 'Achievement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete achievement',
      error: error.message
    });
  }
});

module.exports = router;
