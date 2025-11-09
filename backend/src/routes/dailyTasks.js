const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const DailyTask = require('../models/DailyTask');
const logger = require('../utils/logger');

/**
 * GET /api/daily-tasks
 * 获取所有活跃的日常任务
 * Query params:
 *   - category: daily/weekly/monthly
 *   - taskType: login/practice/exam/social
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { category, taskType } = req.query;

    const tasks = await DailyTask.getAllTasks({
      category: category || null,
      taskType: taskType || null,
      activeOnly: true
    });

    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    logger.error('Error fetching daily tasks:', error);
    res.status(500).json({
      success: false,
      message: '获取日常任务失败',
      error: error.message
    });
  }
});

/**
 * GET /api/daily-tasks/:id
 * 获取单个任务详情
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: '无效的任务ID'
      });
    }

    const task = await DailyTask.getTaskById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Error fetching task by ID:', error);
    res.status(500).json({
      success: false,
      message: '获取任务详情失败',
      error: error.message
    });
  }
});

/**
 * POST /api/daily-tasks
 * 创建新任务（仅管理员）
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Check admin permission
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，仅管理员可创建任务'
      });
    }

    const {
      taskCode,
      taskName,
      taskDesc,
      taskIcon,
      category,
      taskType,
      pointsReward,
      bonusPoints,
      targetValue,
      progressType,
      resetPeriod,
      resetTime,
      triggerCondition,
      isActive,
      displayOrder,
      validFrom,
      validTo
    } = req.body;

    // Validate required fields
    if (!taskCode || !taskName || !category || !taskType || !pointsReward || !targetValue || !progressType || !resetPeriod || !triggerCondition) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }

    // Check if task code already exists
    const existingTask = await DailyTask.getTaskByCode(taskCode);
    if (existingTask) {
      return res.status(409).json({
        success: false,
        message: '任务代码已存在'
      });
    }

    const newTask = await DailyTask.createTask({
      taskCode,
      taskName,
      taskDesc,
      taskIcon,
      category,
      taskType,
      pointsReward,
      bonusPoints,
      targetValue,
      progressType,
      resetPeriod,
      resetTime,
      triggerCondition,
      isActive,
      displayOrder,
      validFrom,
      validTo
    });

    logger.info('Daily task created', {
      taskId: newTask.task_id,
      taskCode: newTask.task_code,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: '任务创建成功',
      data: newTask
    });
  } catch (error) {
    logger.error('Error creating daily task:', error);
    res.status(500).json({
      success: false,
      message: '创建任务失败',
      error: error.message
    });
  }
});

/**
 * PUT /api/daily-tasks/:id
 * 更新任务（仅管理员）
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Check admin permission
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，仅管理员可更新任务'
      });
    }

    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: '无效的任务ID'
      });
    }

    // Check if task exists
    const existingTask = await DailyTask.getTaskById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    const updatedTask = await DailyTask.updateTask(taskId, req.body);

    logger.info('Daily task updated', {
      taskId: updatedTask.task_id,
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      message: '任务更新成功',
      data: updatedTask
    });
  } catch (error) {
    logger.error('Error updating daily task:', error);
    res.status(500).json({
      success: false,
      message: '更新任务失败',
      error: error.message
    });
  }
});

/**
 * DELETE /api/daily-tasks/:id
 * 删除任务（仅管理员）
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check admin permission
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，仅管理员可删除任务'
      });
    }

    const taskId = parseInt(req.params.id);

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: '无效的任务ID'
      });
    }

    // Check if task exists
    const existingTask = await DailyTask.getTaskById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    await DailyTask.deleteTask(taskId);

    logger.info('Daily task deleted', {
      taskId: taskId,
      deletedBy: req.user.id
    });

    res.json({
      success: true,
      message: '任务删除成功'
    });
  } catch (error) {
    logger.error('Error deleting daily task:', error);
    res.status(500).json({
      success: false,
      message: '删除任务失败',
      error: error.message
    });
  }
});

/**
 * GET /api/daily-tasks/student/:studentId/progress
 * 获取学生的任务进度
 * Query params:
 *   - category: daily/weekly/monthly
 *   - periodStart: 周期开始日期 (YYYY-MM-DD)
 *   - periodEnd: 周期结束日期 (YYYY-MM-DD)
 */
router.get('/student/:studentId/progress', authMiddleware, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { category, periodStart, periodEnd } = req.query;

    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        message: '无效的学生ID'
      });
    }

    // Check permission - students can only view their own progress
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: '权限不足，只能查看自己的任务进度'
      });
    }

    const progress = await DailyTask.getStudentTaskProgress(studentId, {
      category: category || null,
      periodStart: periodStart || null,
      periodEnd: periodEnd || null
    });

    res.json({
      success: true,
      data: progress,
      count: progress.length
    });
  } catch (error) {
    logger.error('Error fetching student task progress:', error);
    res.status(500).json({
      success: false,
      message: '获取学生任务进度失败',
      error: error.message
    });
  }
});

/**
 * POST /api/daily-tasks/:taskId/progress
 * 更新任务进度
 * Body:
 *   - studentId: 学生ID
 *   - incrementValue: 增加的进度值
 *   - periodStart: 周期开始日期
 *   - periodEnd: 周期结束日期
 */
router.post('/:taskId/progress', authMiddleware, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { studentId, incrementValue, periodStart, periodEnd } = req.body;

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: '无效的任务ID'
      });
    }

    if (!studentId || !incrementValue || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }

    // Check permission - students can only update their own progress
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: '权限不足，只能更新自己的任务进度'
      });
    }

    const updatedProgress = await DailyTask.updateTaskProgress(
      studentId,
      taskId,
      incrementValue,
      periodStart,
      periodEnd
    );

    logger.info('Task progress updated', {
      studentId,
      taskId,
      incrementValue,
      isCompleted: updatedProgress.is_completed
    });

    res.json({
      success: true,
      message: '任务进度更新成功',
      data: updatedProgress
    });
  } catch (error) {
    logger.error('Error updating task progress:', error);
    res.status(500).json({
      success: false,
      message: '更新任务进度失败',
      error: error.message
    });
  }
});

/**
 * GET /api/daily-tasks/student/:studentId/current
 * 获取学生当前周期的所有任务及进度
 * 自动根据当前日期计算周期
 */
router.get('/student/:studentId/current', authMiddleware, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { category } = req.query;

    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        message: '无效的学生ID'
      });
    }

    // Check permission
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    // Calculate current period dates
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all active tasks
    const tasks = await DailyTask.getAllTasks({
      category: category || null,
      activeOnly: true
    });

    // Get student's progress for current period
    const progress = await DailyTask.getStudentTaskProgress(studentId, {
      category: category || null,
      periodStart: currentDate,
      periodEnd: null
    });

    // Merge tasks with progress
    const tasksWithProgress = tasks.map(task => {
      const taskProgress = progress.find(p => p.task_id === task.task_id);

      return {
        ...task,
        progress: taskProgress || {
          current_value: 0,
          target_value: task.target_value,
          completion_rate: 0,
          is_completed: false,
          points_awarded: 0,
          bonus_awarded: 0
        }
      };
    });

    res.json({
      success: true,
      data: tasksWithProgress,
      count: tasksWithProgress.length
    });
  } catch (error) {
    logger.error('Error fetching current tasks:', error);
    res.status(500).json({
      success: false,
      message: '获取当前任务失败',
      error: error.message
    });
  }
});

module.exports = router;
