const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Achievement = require('../models/Achievement');
const achievementService = require('../services/achievement/AchievementService');
const { quickConfigs } = require('../services/achievement/templates/achievementTemplates');

/**
 * 生成唯一的成就编码
 */
function _generateAchievementCode(category, name) {
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
 * GET /api/achievements/:id(\\d+)
 * 注意：使用正则表达式限制只匹配数字ID，避免拦截其他路由
 */
router.get('/:id(\\d+)', authMiddleware, async (req, res) => {
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

    // 权限验证：学生只能查看自己的成就
    if (req.user.role === 'student' && req.user.id !== actualUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const achievements = await Achievement.getStudentAchievements(actualStudentId);
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

    // 权限验证：学生只能查看自己的成就进度
    if (req.user.role === 'student' && req.user.id !== actualUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const progress = await Achievement.getStudentProgress(actualStudentId);
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
    const allowedRoles = ['system_admin', 'municipal_admin', 'school_admin', 'teacher'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { studentId, achievementId } = req.body;

    if (!studentId || !achievementId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Achievement ID are required'
      });
    }

    // 将user_id转换为student_id（如果需要）
    const { pool } = require('../database/connection');
    const studentCheck = await pool.query(
      'SELECT id FROM students WHERE id = $1 OR user_id = $1',
      [parseInt(studentId)]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const actualStudentId = studentCheck.rows[0].id;

    // 使用Service层授予成就（自动添加积分）
    const result = await achievementService.awardAchievement(
      actualStudentId,
      parseInt(achievementId)
    );

    res.json(result);
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

    const result = await achievementService.createAchievement(req.body, req.user.userId);

    res.status(201).json({
      success: true,
      message: 'Achievement created successfully',
      data: result.data
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
router.put('/:id(\\d+)', authMiddleware, async (req, res) => {
  try {
    // 权限验证
    if (!['system_admin', 'municipal_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only system and municipal admins can update achievements.'
      });
    }

    const { id } = req.params;
    const result = await achievementService.updateAchievement(parseInt(id), req.body);

    res.json({
      success: true,
      message: 'Achievement updated successfully',
      data: result.data
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
router.delete('/:id(\\d+)', authMiddleware, async (req, res) => {
  try {
    // 权限验证
    if (!['system_admin', 'municipal_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only system and municipal admins can delete achievements.'
      });
    }

    const { id } = req.params;
    const { hard } = req.query; // 是否硬删除

    const result = await achievementService.deleteAchievement(parseInt(id), hard === 'true');

    res.json(result);
  } catch (error) {
    console.error('Error deleting achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete achievement',
      error: error.message
    });
  }
});

/**
 * 从模板创建成就
 * POST /api/achievements/template/:templateName
 */
router.post('/template/:templateName', authMiddleware, async (req, res) => {
  try {
    // 权限验证
    if (!['system_admin', 'municipal_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only system and municipal admins can create achievements.'
      });
    }

    const { templateName } = req.params;
    const params = req.body;

    const result = await achievementService.createFromTemplate(
      templateName,
      params,
      req.user.userId
    );

    res.status(201).json({
      success: true,
      message: 'Achievement created from template successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error creating achievement from template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create achievement from template',
      error: error.message
    });
  }
});

/**
 * 使用快速配置创建成就
 * POST /api/achievements/quick/:configName
 */
router.post('/quick/:configName', authMiddleware, async (req, res) => {
  try {
    // 权限验证
    if (!['system_admin', 'municipal_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only system and municipal admins can create achievements.'
      });
    }

    const { configName } = req.params;
    const params = req.body;

    // 获取快速配置
    const configFunc = quickConfigs[configName];
    if (!configFunc) {
      return res.status(404).json({
        success: false,
        message: `Quick config '${configName}' not found`
      });
    }

    // 生成成就数据
    const achievementData = configFunc(...Object.values(params));

    // 创建成就
    const result = await achievementService.createAchievement(achievementData, req.user.userId);

    res.status(201).json({
      success: true,
      message: 'Achievement created using quick config successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error creating achievement from quick config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create achievement from quick config',
      error: error.message
    });
  }
});

/**
 * 批量导入成就
 * POST /api/achievements/bulk
 */
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    // 权限验证
    if (!['system_admin', 'municipal_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only system and municipal admins can bulk import achievements.'
      });
    }

    const { achievements } = req.body;

    if (!Array.isArray(achievements) || achievements.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'achievements must be a non-empty array'
      });
    }

    const results = await achievementService.bulkImport(achievements, req.user.userId);

    res.json({
      success: true,
      message: `Bulk import completed: ${results.success.length} success, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error('Error bulk importing achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk import achievements',
      error: error.message
    });
  }
});

/**
 * 测试成就规则
 * POST /api/achievements/:id/test
 */
router.post('/:id(\\d+)/test', authMiddleware, async (req, res) => {
  try {
    // 权限验证
    if (!['system_admin', 'municipal_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can test achievements.'
      });
    }

    const { id } = req.params;
    const { studentId } = req.body;

    const result = await achievementService.testAchievement(parseInt(id), studentId);

    res.json({
      success: result.valid,
      data: result
    });
  } catch (error) {
    console.error('Error testing achievement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test achievement',
      error: error.message
    });
  }
});

/**
 * 获取成就统计信息
 * GET /api/achievements/:id/stats
 */
router.get('/:id(\\d+)/stats', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await Achievement.getAchievementStats(parseInt(id));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievement stats',
      error: error.message
    });
  }
});

/**
 * 获取分页成就列表（管理后台）
 * GET /api/achievements/admin/list
 */
router.get('/admin/list', authMiddleware, async (req, res) => {
  try {
    // 权限验证
    if (!['system_admin', 'municipal_admin', 'school_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      category: req.query.category,
      rarity: req.query.rarity,
      isActive: req.query.isActive === 'true' ? true : (req.query.isActive === 'false' ? false : undefined),
      searchTerm: req.query.search
    };

    const result = await Achievement.getAchievementsWithPagination(options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching achievements with pagination:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements',
      error: error.message
    });
  }
});

/**
 * 获取可用的模板列表
 * GET /api/achievements/templates
 */
router.get('/templates', authMiddleware, async (req, res) => {
  try {
    const templates = require('../services/achievement/templates/achievementTemplates');

    const templateList = Object.keys(templates).filter(key => key.endsWith('Achievement')).map(key => ({
      name: key,
      description: `${key} template`
    }));

    res.json({
      success: true,
      data: templateList
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

/**
 * 获取可用的快速配置列表
 * GET /api/achievements/quick-configs
 */
router.get('/quick-configs', authMiddleware, async (req, res) => {
  try {
    const configList = Object.keys(quickConfigs).map(key => ({
      name: key,
      description: `Quick config for ${key}`
    }));

    res.json({
      success: true,
      data: configList
    });
  } catch (error) {
    console.error('Error fetching quick configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick configs',
      error: error.message
    });
  }
});

module.exports = router;
