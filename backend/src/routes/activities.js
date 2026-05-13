const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const { authMiddleware, requireRole, optionalAuth } = require('../middleware/auth');
const {
  requireActivityPermission,
  validateAbilityLevel,
  getScopeForUser,
  validatePracticeScopePermission
} = require('../middleware/activityPermission');
const Activity = require('../models/Activity');
const StudentExam = require('../models/StudentExam'); // Will be renamed to StudentActivity later
const Answer = require('../models/Answer');
const logger = require('../utils/logger');
const { query } = require('../database/connection');

// ========================================
// Student-specific APIs
// ========================================

// Get practice activities for students
router.get('/practice', authMiddleware, async (req, res) => {
  try {
    // Only students can access this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: '只有学生可以访问此接口'
      });
    }

    const { subject, grade, ability_level } = req.query;
    const filters = {
      type: 'practice',
      status: 'published' // Only show published practices
    };

    if (subject) filters.subject = subject;
    if (grade) filters.grade = grade;
    if (ability_level) filters.ability_level = ability_level;

    // Get available practices for the student
    const activities = await Activity.getAvailableForStudent(req.user.id, filters);

    res.json({
      success: true,
      activities,
      count: activities.length
    });
  } catch (error) {
    logger.error('Get practice activities error:', error);
    res.status(500).json({
      success: false,
      message: '获取练习列表失败'
    });
  }
});

// Get assessment activities for students
router.get('/assessments', authMiddleware, async (req, res) => {
  try {
    // Only students can access this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: '只有学生可以访问此接口'
      });
    }

    const { subject, grade, ability_level } = req.query;
    const filters = {
      type: 'assessment',
      status: 'published' // Only show published assessments
    };

    if (subject) filters.subject = subject;
    if (grade) filters.grade = grade;
    if (ability_level) filters.ability_level = ability_level;

    // Get available assessments for the student
    const activities = await Activity.getAvailableForStudent(req.user.id, filters);

    res.json({
      success: true,
      activities,
      count: activities.length
    });
  } catch (error) {
    logger.error('Get assessment activities error:', error);
    res.status(500).json({
      success: false,
      message: '获取测评列表失败'
    });
  }
});

// ========================================
// General APIs
// ========================================

// Get all available activities
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { subject, grade, status, type, ability_level, scope } = req.query;
    const filters = {};

    if (subject) filters.subject = subject;
    if (grade) filters.grade = grade;
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (ability_level) filters.ability_level = ability_level;
    if (scope) filters.scope = scope;

    // If user is a student, get available activities for them
    if (req.user && req.user.role === 'student') {
      const activities = await Activity.getAvailableForStudent(req.user.id, filters);
      return res.json({
        success: true,
        activities,
        count: activities.length
      });
    }

    // For teachers, only show their own practice activities
    if (req.user && req.user.role === 'teacher') {
      filters.created_by = req.user.id;
      filters.type = 'practice'; // Teachers can only see practice activities
    }

    // For admins, show all activities
    const activities = await Activity.findAll(filters);
    res.json({
      success: true,
      activities,
      count: activities.length
    });
  } catch (error) {
    logger.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动列表失败'
    });
  }
});

// ========================================
// Specific path routes (must be before /:id)
// ========================================

// Get student's activity history
router.get('/student/history', [
  authMiddleware,
  requireRole(['student'])
], async (req, res) => {
  try {
    const { type, ability_level } = req.query;
    const filters = {};

    if (type) filters.type = type;
    if (ability_level) filters.ability_level = ability_level;

    const history = await Activity.getStudentHistory(req.user.id, filters);

    res.json({
      success: true,
      history,
      count: history.length
    });
  } catch (error) {
    logger.error('Get student activity history error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动历史失败'
    });
  }
});

// Get activities created by current user (teachers and admins)
router.get('/my/created', [
  authMiddleware,
  requireRole(['teacher', 'system_admin', 'school_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin'])
], async (req, res) => {
  try {
    const { type, status } = req.query;
    const filters = {};

    if (type) filters.type = type;
    if (status) filters.status = status;

    const activities = await Activity.getByCreator(req.user.id, filters);

    res.json({
      success: true,
      activities,
      count: activities.length
    });
  } catch (error) {
    logger.error('Get created activities error:', error);
    res.status(500).json({
      success: false,
      message: '获取创建的活动失败'
    });
  }
});

// Get all assessment activities (admin only)
router.get('/admin/assessments', [
  authMiddleware,
  requireRole(['district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin'])
], async (req, res) => {
  try {
    const { subject, grade, status, scope } = req.query;
    const filters = {
      type: 'assessment' // Only return assessments
    };

    if (subject) filters.subject = subject;
    if (grade) filters.grade = grade;
    if (status) filters.status = status;
    if (scope) filters.scope = scope;

    const assessments = await Activity.findAll(filters);

    res.json({
      success: true,
      activities: assessments,
      count: assessments.length
    });
  } catch (error) {
    logger.error('Get admin assessments error:', error);
    res.status(500).json({
      success: false,
      message: '获取测评列表失败'
    });
  }
});

// Get activity details
router.get('/:id', [
  param('id').isInt().withMessage('Invalid activity ID')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    res.json({
      success: true,
      activity
    });
  } catch (error) {
    logger.error('Get activity details error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动详情失败'
    });
  }
});

// Check if student is eligible to participate in activity
router.get('/:id/eligibility', [
  param('id').isInt().withMessage('Invalid activity ID'),
  authMiddleware,
  requireRole(['student'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // Check eligibility
    const eligibility = await Activity.checkStudentEligibility(id, req.user.id);

    res.json({
      success: true,
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      attemptsUsed: eligibility.attemptsUsed || 0,
      maxAttempts: activity.max_attempts || 1,
      activityType: activity.type,
      activityStatus: activity.status
    });
  } catch (error) {
    logger.error('Check eligibility error:', error);
    res.status(500).json({
      success: false,
      message: '检查资格失败'
    });
  }
});

// Get activity statistics
router.get('/:id/statistics', [
  param('id').isInt().withMessage('Invalid activity ID'),
  authMiddleware,
  requireRole(['teacher', 'system_admin', 'school_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const activityId = parseInt(req.params.id);

    // Verify activity exists
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // Get statistics
    const statistics = await Activity.getStatistics(activityId);

    logger.info('Activity statistics retrieved', {
      activityId,
      userId: req.user.id,
      statistics
    });

    res.json({
      success: true,
      statistics: statistics
    });
  } catch (error) {
    logger.error('Get activity statistics error:', {
      error: error.message,
      stack: error.stack,
      activityId: req.params.id
    });

    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    });
  }
});

// Get activity participants
router.get('/:id/participants', [
  param('id').isInt().withMessage('活动ID无效'),
  authMiddleware,
  requireRole(['teacher', 'system_admin', 'school_admin', 'district_admin',
    'base_school_admin', 'municipal_school_admin', 'municipal_admin'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const activityId = parseInt(req.params.id);

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    const participants = await Activity.getParticipants(activityId);

    res.json({
      success: true,
      participants
    });
  } catch (error) {
    logger.error('Get activity participants error:', {
      error: error.message,
      stack: error.stack,
      activityId: req.params.id
    });

    res.status(500).json({
      success: false,
      message: '获取参与者列表失败'
    });
  }
});

// Get activity with questions (for taking activity)
router.get('/:id/questions', [
  param('id').isInt().withMessage('Invalid activity ID'),
  authMiddleware,
  requireRole(['student', 'teacher', 'system_admin', 'school_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const activity = await Activity.findByIdWithQuestions(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // Remove correct answers for students
    if (req.user.role === 'student') {
      activity.questions = activity.questions.map(q => {
        const { correct_answer: _correct, explanation: _exp, ...question } = q;
        return question;
      });
    }

    res.json({
      success: true,
      activity
    });
  } catch (error) {
    logger.error('Get activity questions error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动题目失败'
    });
  }
});

// Create new practice activity
router.post('/practice', [
  authMiddleware,
  requireActivityPermission('practice'),
  validatePracticeScopePermission,
  validateAbilityLevel,
  body('title').notEmpty().withMessage('活动标题不能为空'),
  body('subject').notEmpty().withMessage('活动科目不能为空'),
  body('grade').optional(),
  body('duration').optional().isInt({ min: 1 }).withMessage('活动时长必须大于0'),
  body('totalScore').isInt({ min: 1 }).withMessage('总分必须大于0'),
  body('passScore').isInt({ min: 0 }).withMessage('及格分不能为负数'),
  body('allowRetake').optional().isBoolean().withMessage('允许重做必须是布尔值'),
  body('maxAttempts').optional().isInt({ min: 1 }).withMessage('最大尝试次数必须大于0'),
  body('timeLimitType').optional().isIn(['unlimited', 'scheduled', 'timed']).withMessage('时间限制类型必须是 unlimited, scheduled 或 timed'),
  body('startTime').optional().isISO8601().withMessage('开始时间格式不正确'),
  body('endTime').optional().isISO8601().withMessage('结束时间格式不正确'),
  body('scope').optional().isIn(['class', 'school', 'district', 'base_school', 'municipal_school', 'municipal']).withMessage('范围值无效')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Use the scope from request body if provided, otherwise default based on user role
    const activityData = {
      ...req.body,
      createdBy: req.user.id,
      type: 'practice',
      scope: req.body.scope || getScopeForUser(req.user),
      isOfficial: false
    };

    const activity = await Activity.create(activityData);

    logger.info('New practice activity created', {
      activityId: activity.id,
      title: activity.title,
      createdBy: req.user.id,
      abilityLevel: activity.ability_level
    });

    res.status(201).json({
      success: true,
      message: '练习活动创建成功',
      activity
    });
  } catch (error) {
    logger.error('Create practice activity error:', error);
    res.status(500).json({
      success: false,
      message: '创建练习活动失败'
    });
  }
});

// Create new assessment activity (high-level admins only)
router.post('/assessment', [
  authMiddleware,
  requireActivityPermission('assessment'),
  validateAbilityLevel,
  body('title').notEmpty().withMessage('活动标题不能为空'),
  body('subject').notEmpty().withMessage('活动科目不能为空'),
  body('grade').optional(),
  body('duration').optional().isInt({ min: 1 }).withMessage('活动时长必须大于0'),
  body('totalScore').isInt({ min: 1 }).withMessage('总分必须大于0'),
  body('passScore').isInt({ min: 0 }).withMessage('及格分不能为负数'),
  body('isOfficial').optional().isBoolean().withMessage('官方标识必须是布尔值'),
  body('certificateConfig').optional().isObject().withMessage('证书配置必须是对象'),
  body('timeLimitType').optional().isIn(['unlimited', 'scheduled', 'timed']).withMessage('时间限制类型必须是 unlimited, scheduled 或 timed'),
  body('startTime').optional().isISO8601().withMessage('开始时间格式不正确'),
  body('endTime').optional().isISO8601().withMessage('结束时间格式不正确')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const activityData = {
      ...req.body,
      createdBy: req.user.id,
      type: 'assessment',
      scope: getScopeForUser(req.user),
      allowRetake: req.body.allowRetake || false,
      maxAttempts: req.body.maxAttempts || 1,
      isOfficial: req.body.isOfficial !== undefined ? req.body.isOfficial : true
    };

    const activity = await Activity.create(activityData);

    logger.info('New assessment activity created', {
      activityId: activity.id,
      title: activity.title,
      createdBy: req.user.id,
      abilityLevel: activity.ability_level,
      isOfficial: activity.is_official
    });

    res.status(201).json({
      success: true,
      message: '测评活动创建成功',
      activity
    });
  } catch (error) {
    logger.error('Create assessment activity error:', error);
    res.status(500).json({
      success: false,
      message: '创建测评活动失败'
    });
  }
});

// Start activity session
router.post('/:id/start', [
  param('id').isInt().withMessage('Invalid activity ID'),
  authMiddleware,
  requireRole(['student'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    if (activity.status !== 'ongoing' && activity.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: '活动尚未开始或已结束'
      });
    }

    // Check if student is registered for this activity
    let existingRecord = await StudentExam.findByStudentAndExam(req.user.id, id);

    // For practice activities, auto-register if not already registered
    // For assessment activities, require explicit enrollment
    if (!existingRecord) {
      if (activity.type === 'practice') {
        // Auto-register student for practice activities
        existingRecord = await StudentExam.register(req.user.id, id);
        logger.info('Auto-registered student for practice activity', {
          studentId: req.user.id,
          activityId: id
        });
      } else {
        // Assessment activities require explicit enrollment
        return res.status(400).json({
          success: false,
          message: '请先报名参加此活动'
        });
      }
    }

    if (existingRecord.status === 'submitted') {
      // Check if retake is allowed
      if (!activity.allow_retake) {
        return res.status(400).json({
          success: false,
          message: '您已完成此活动，不允许重做'
        });
      }

      // Check attempt limit
      const attemptCount = existingRecord.attempt_number || 1;
      if (attemptCount >= activity.max_attempts) {
        return res.status(400).json({
          success: false,
          message: `您已达到最大尝试次数 (${activity.max_attempts}次)`
        });
      }
    }

    if (existingRecord.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        message: '活动已在进行中'
      });
    }

    // Start the activity
    const ipAddress = req.ip || req.connection.remoteAddress;
    const startedActivity = await StudentExam.start(req.user.id, id, ipAddress);

    if (!startedActivity) {
      return res.status(400).json({
        success: false,
        message: '无法开始活动，请检查活动状态'
      });
    }

    logger.info('Student started activity', {
      studentId: req.user.id,
      activityId: id,
      activityType: activity.type,
      timeLimitType: activity.time_limit_type,
      startTime: startedActivity.start_time,
      deadline: startedActivity.time_limit_deadline
    });

    res.json({
      success: true,
      message: '活动开始',
      activityId: id,
      studentActivityId: startedActivity.id,
      startTime: startedActivity.start_time,
      startedAt: startedActivity.started_at,
      timeLimitDeadline: startedActivity.time_limit_deadline,
      timeLimitType: activity.time_limit_type,
      duration: activity.duration,
      activityType: activity.type
    });
  } catch (error) {
    logger.error('Start activity error:', error);
    res.status(500).json({
      success: false,
      message: '开始活动失败'
    });
  }
});

// Submit activity
router.post('/:id/submit', [
  param('id').isInt().withMessage('Invalid activity ID'),
  authMiddleware,
  requireRole(['student']),
  body('answers').isArray().withMessage('答案必须是数组格式'),
  body('answers.*.questionId').isInt().withMessage('问题ID必须是整数'),
  body('answers.*.answer').notEmpty().withMessage('答案不能为空')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const { answers } = req.body;

    // Check if student has an in-progress activity
    const studentActivity = await StudentExam.findByStudentAndExam(req.user.id, id);

    if (!studentActivity) {
      return res.status(400).json({
        success: false,
        message: '活动记录不存在'
      });
    }

    if (studentActivity.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: '活动未在进行中或已提交'
      });
    }

    // Save answers
    const savedAnswers = await Answer.saveAnswers(studentActivity.id, answers);

    // Grade automatic questions (single/multiple choice)
    const gradedAnswers = await Answer.gradeAnswers(studentActivity.id);

    // Calculate total score
    const totalScore = await Answer.calculateTotalScore(studentActivity.id);

    // Submit the activity
    const submittedActivity = await StudentExam.submit(req.user.id, id, totalScore);

    if (!submittedActivity) {
      return res.status(400).json({
        success: false,
        message: '提交活动失败'
      });
    }

    // Calculate activity duration (in seconds)
    const startTime = new Date(studentActivity.start_time);
    const submitTime = new Date(submittedActivity.submit_time);
    const durationInSeconds = Math.floor((submitTime - startTime) / 1000);

    // Format duration as MM:SS
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    const durationFormatted = `${minutes}分${seconds}秒`;

    // Get activity details to check type
    const activity = await Activity.findById(id);

    logger.info('Student submitted activity', {
      studentId: req.user.id,
      activityId: id,
      activityType: activity.type,
      score: totalScore,
      submitTime: submittedActivity.submit_time,
      duration: durationInSeconds
    });

    res.json({
      success: true,
      message: '活动提交成功',
      activityId: id,
      activityType: activity.type,
      score: totalScore,
      submittedAt: submittedActivity.submit_time,
      answersProcessed: savedAnswers.length,
      autoGradedAnswers: gradedAnswers.filter(a => a.score !== null).length,
      duration: durationInSeconds,
      durationFormatted: durationFormatted
    });
  } catch (error) {
    logger.error('Submit activity error:', error);
    res.status(500).json({
      success: false,
      message: '提交活动失败'
    });
  }
});

// Register for activity
router.post('/:id/register', [
  param('id').isInt().withMessage('Invalid activity ID'),
  authMiddleware,
  requireRole(['student'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    if (activity.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: '活动尚未发布或已结束'
      });
    }

    // Check if student is already registered
    const existingRecord = await StudentExam.findByStudentAndExam(req.user.id, id);

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: '您已报名此活动'
      });
    }

    // Register student for activity
    const registration = await StudentExam.register(req.user.id, id);

    logger.info('Student registered for activity', {
      studentId: req.user.id,
      activityId: id,
      activityType: activity.type,
      registrationId: registration.id
    });

    res.json({
      success: true,
      message: '报名成功',
      activityId: id,
      activityType: activity.type,
      registrationId: registration.id,
      status: registration.status,
      registeredAt: registration.created_at
    });
  } catch (error) {
    logger.error('Register activity error:', error);
    res.status(500).json({
      success: false,
      message: '报名失败'
    });
  }
});

// Update activity status (publish/unpublish)
router.put('/:id/status', [
  param('id').isInt().withMessage('Invalid activity ID'),
  authMiddleware,
  requireRole(['teacher', 'system_admin', 'school_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin']),
  body('status').isIn(['draft', 'published', 'ongoing', 'finished', 'cancelled']).withMessage('Invalid status value')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if activity exists
    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // Check permissions: only creator or admin can update status
    const isCreator = activity.created_by === req.user.id;
    const isAdmin = ['system_admin', 'school_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '您没有权限修改此活动状态'
      });
    }

    // 检查测评活动取消发布时是否有报名记录
    if (activity.type === 'assessment' && activity.status === 'published' && status === 'draft') {
      const registrationCheck = await query(`
        SELECT COUNT(*) as count
        FROM assessment_registrations
        WHERE activity_id = $1 AND status NOT IN ('cancelled', 'rejected')
      `, [id]);

      if (parseInt(registrationCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: '该测评已有学生报名，无法取消发布。如需取消，请先处理报名记录。'
        });
      }
    }

    // Update the status
    const updatedActivity = await Activity.updateStatus(id, status);

    if (!updatedActivity) {
      return res.status(400).json({
        success: false,
        message: '更新活动状态失败'
      });
    }

    logger.info('Activity status updated', {
      activityId: id,
      oldStatus: activity.status,
      newStatus: status,
      updatedBy: req.user.id,
      role: req.user.role
    });

    res.json({
      success: true,
      message: '活动状态更新成功',
      activity: updatedActivity
    });
  } catch (error) {
    logger.error('Update activity status error:', error);
    res.status(500).json({
      success: false,
      message: '更新活动状态失败'
    });
  }
});

// Update activity details
router.put('/:id', [
  param('id').isInt().withMessage('Invalid activity ID'),
  authMiddleware,
  requireRole(['teacher', 'system_admin', 'school_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin']),
  body('title').optional().notEmpty().withMessage('活动标题不能为空'),
  body('description').optional(),
  body('duration').optional().isInt({ min: 1 }).withMessage('活动时长必须大于0'),
  body('totalScore').optional().isInt({ min: 1 }).withMessage('总分必须大于0'),
  body('passScore').optional().isInt({ min: 0 }).withMessage('及格分不能为负数'),
  body('abilityLevel').optional(),
  body('allowRetake').optional().isBoolean().withMessage('允许重做必须是布尔值'),
  body('maxAttempts').optional().isInt({ min: 1 }).withMessage('最大尝试次数必须大于0'),
  body('targetAudience').optional().isObject().withMessage('目标受众必须是对象'),
  body('certificateConfig').optional().isObject().withMessage('证书配置必须是对象'),
  body('timeLimitType').optional().isIn(['unlimited', 'scheduled', 'timed']).withMessage('时间限制类型必须是 unlimited, scheduled 或 timed'),
  body('startTime').optional().isISO8601().withMessage('开始时间格式不正确'),
  body('endTime').optional().isISO8601().withMessage('结束时间格式不正确')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;

    // Check if activity exists
    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // Check permissions: only creator or admin can update
    const isCreator = activity.created_by === req.user.id;
    const isAdmin = ['system_admin', 'school_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '您没有权限修改此活动'
      });
    }

    // Only allow updating draft activities
    if (activity.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只能修改草稿状态的活动'
      });
    }

    // Update the activity
    const updatedActivity = await Activity.update(id, req.body);

    if (!updatedActivity) {
      return res.status(400).json({
        success: false,
        message: '更新活动失败'
      });
    }

    logger.info('Activity updated', {
      activityId: id,
      title: updatedActivity.title,
      updatedBy: req.user.id,
      role: req.user.role,
      timeLimitType: updatedActivity.time_limit_type
    });

    res.json({
      success: true,
      message: '活动更新成功',
      activity: updatedActivity
    });
  } catch (error) {
    logger.error('Update activity error:', error);

    // Check if it's a validation error from Activity.validateTimeLimitConfig()
    if (error.message && (
      error.message.includes('time_limit_type') ||
      error.message.includes('start_time') ||
      error.message.includes('end_time') ||
      error.message.includes('duration')
    )) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '更新活动失败'
    });
  }
});

// Delete activity (soft delete)
router.delete('/:id', [
  param('id').isInt().withMessage('Invalid activity ID'),
  authMiddleware,
  requireRole(['teacher', 'system_admin', 'school_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;

    // Check if activity exists
    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // Check permissions: only creator or admin can delete
    const isCreator = activity.created_by === req.user.id;
    const isAdmin = ['system_admin', 'school_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin'].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '您没有权限删除此活动'
      });
    }

    // Only allow deleting draft (unpublished) activities
    if (activity.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只能删除未发布的活动，请先取消发布'
      });
    }

    // Hard delete the activity (will cascade delete related data)
    const deletedActivity = await Activity.delete(id);

    if (!deletedActivity) {
      return res.status(400).json({
        success: false,
        message: '删除活动失败'
      });
    }

    logger.info('Activity deleted (hard delete)', {
      activityId: id,
      title: activity.title,
      status: activity.status,
      deletedBy: req.user.id,
      role: req.user.role
    });

    res.json({
      success: true,
      message: '活动及相关数据删除成功'
    });
  } catch (error) {
    logger.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      message: '删除活动失败'
    });
  }
});

// ========================================
// Admin-specific APIs
// ========================================

// Create assessment activity (admin only)
router.post('/admin/assessment', [
  authMiddleware,
  requireActivityPermission('assessment'),
  validateAbilityLevel,
  body('title').notEmpty().withMessage('活动标题不能为空'),
  body('subject').notEmpty().withMessage('活动科目不能为空'),
  body('grade').optional(),
  body('duration').optional().isInt({ min: 1 }).withMessage('活动时长必须大于0'),
  body('totalScore').isInt({ min: 1 }).withMessage('总分必须大于0'),
  body('passScore').isInt({ min: 0 }).withMessage('及格分不能为负数'),
  body('certificateConfig').optional().isObject().withMessage('证书配置必须是对象'),
  body('targetAudience').optional().isObject().withMessage('目标受众必须是对象'),
  body('timeLimitType').optional().isIn(['unlimited', 'scheduled', 'timed']).withMessage('时间限制类型必须是 unlimited, scheduled 或 timed'),
  body('startTime').optional().isISO8601().withMessage('开始时间格式不正确'),
  body('endTime').optional().isISO8601().withMessage('结束时间格式不正确')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const activityData = {
      ...req.body,
      createdBy: req.user.id,
      type: 'assessment', // Force assessment type
      scope: getScopeForUser(req.user),
      isOfficial: true, // Admin-created assessments are official
      allowRetake: req.body.allowRetake || false,
      maxAttempts: req.body.maxAttempts || 1
    };

    const activity = await Activity.create(activityData);

    logger.info('Admin created assessment activity', {
      activityId: activity.id,
      title: activity.title,
      createdBy: req.user.id,
      role: req.user.role,
      abilityLevel: activity.ability_level,
      scope: activity.scope
    });

    res.status(201).json({
      success: true,
      message: '测评活动创建成功',
      activity
    });
  } catch (error) {
    logger.error('Create admin assessment error:', error);
    res.status(500).json({
      success: false,
      message: '创建测评活动失败'
    });
  }
});

// ========================================
// Paper Generation APIs
// ========================================

const PaperGenerationService = require('../services/paperGenerationService');

// Get available questions for an activity
router.get('/:id/available-questions', authMiddleware, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const filters = {
      type: req.query.type,
      difficulty: req.query.difficulty,
      level: req.query.level,
      knowledge_point: req.query.knowledge_point,
      search: req.query.search
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

    const result = await PaperGenerationService.getAvailableQuestions(activityId, filters, req.user);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Get available questions error:', error);
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Permission') ? 403 : 500).json({
      success: false,
      message: error.message || '获取可用题目失败'
    });
  }
});

// Get activity paper (all questions with details)
router.get('/:id/paper', authMiddleware, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const result = await PaperGenerationService.getActivityPaper(activityId, req.user);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Get activity paper error:', error);
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Permission') ? 403 : 500).json({
      success: false,
      message: error.message || '获取活动试卷失败'
    });
  }
});

// Get activity paper statistics
router.get('/:id/paper/stats', authMiddleware, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const stats = await PaperGenerationService.getActivityPaperStats(activityId, req.user);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Get paper stats error:', error);
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Permission') ? 403 : 500).json({
      success: false,
      message: error.message || '获取试卷统计失败'
    });
  }
});

// Add a question to activity
router.post('/:id/questions',
  authMiddleware,
  [
    param('id').isInt().withMessage('Activity ID must be an integer'),
    body('questionId').isInt().withMessage('Question ID is required and must be an integer'),
    body('score').optional().isFloat({ min: 0 }).withMessage('Score must be a positive number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const { questionId, score } = req.body;

      const addedQuestion = await PaperGenerationService.addQuestionToActivity(
        activityId,
        questionId,
        { score },
        req.user
      );

      res.json({
        success: true,
        message: '题目添加成功',
        question: addedQuestion
      });
    } catch (error) {
      logger.error('Add question to activity error:', error);
      res.status(error.message.includes('not found') ? 404 : error.message.includes('Permission') ? 403 : 400).json({
        success: false,
        message: error.message || '添加题目失败'
      });
    }
  }
);

// Add multiple questions to activity (batch)
router.post('/:id/questions/batch',
  authMiddleware,
  [
    param('id').isInt().withMessage('Activity ID must be an integer'),
    body('questions').isArray({ min: 1 }).withMessage('Questions must be a non-empty array'),
    body('questions.*.questionId').isInt().withMessage('Each question must have a questionId')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const { questions } = req.body;

      const result = await PaperGenerationService.addQuestionsToActivity(activityId, questions, req.user);

      res.json({
        success: true,
        message: `成功添加 ${result.added.length} 个题目`,
        added: result.added,
        errors: result.errors
      });
    } catch (error) {
      logger.error('Batch add questions error:', error);
      res.status(error.message.includes('not found') ? 404 : error.message.includes('Permission') ? 403 : 500).json({
        success: false,
        message: error.message || '批量添加题目失败'
      });
    }
  }
);

// Batch remove questions from activity (MUST be before single remove to avoid route conflicts)
router.delete('/:id/questions/batch',
  authMiddleware,
  [
    param('id').isInt().withMessage('Activity ID must be an integer'),
    body('questionIds').isArray({ min: 1 }).withMessage('Question IDs must be a non-empty array')
  ],
  async (req, res) => {
    try {
      // Log request for debugging
      logger.info('Batch remove questions request', {
        activityId: req.params.id,
        body: req.body,
        questionIds: req.body?.questionIds
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Batch remove validation failed', { errors: errors.array() });
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const { questionIds } = req.body;

      // Validate each questionId is an integer
      if (!Array.isArray(questionIds) || !questionIds.every(id => Number.isInteger(id))) {
        return res.status(400).json({
          success: false,
          message: 'All question IDs must be integers'
        });
      }

      const results = {
        removed: [],
        errors: []
      };

      // Remove each question
      for (const questionId of questionIds) {
        try {
          await PaperGenerationService.removeQuestionFromActivity(
            activityId,
            questionId,
            req.user
          );
          results.removed.push(questionId);
        } catch (error) {
          results.errors.push({
            questionId,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `成功移除 ${results.removed.length} 道题目`,
        removed: results.removed,
        errors: results.errors
      });
    } catch (error) {
      logger.error('Batch remove questions error:', error);
      res.status(error.message.includes('not found') ? 404 : error.message.includes('Permission') ? 403 : 500).json({
        success: false,
        message: error.message || '批量移除题目失败'
      });
    }
  }
);

// Remove a question from activity
router.delete('/:id/questions/:questionId',
  authMiddleware,
  [
    param('id').isInt().withMessage('Activity ID must be an integer'),
    param('questionId').isInt().withMessage('Question ID must be an integer')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const questionId = parseInt(req.params.questionId);

      await PaperGenerationService.removeQuestionFromActivity(activityId, questionId, req.user);

      res.json({
        success: true,
        message: '题目移除成功'
      });
    } catch (error) {
      logger.error('Remove question from activity error:', error);
      res.status(error.message.includes('not found') ? 404 : error.message.includes('Permission') ? 403 : 500).json({
        success: false,
        message: error.message || '移除题目失败'
      });
    }
  }
);

// Update question properties in activity
router.put('/:id/questions/:questionId',
  authMiddleware,
  [
    param('id').isInt().withMessage('Activity ID must be an integer'),
    param('questionId').isInt().withMessage('Question ID must be an integer'),
    body('score').optional().isFloat({ min: 0 }).withMessage('Score must be a positive number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const questionId = parseInt(req.params.questionId);
      const { score } = req.body;

      const updatedQuestion = await PaperGenerationService.updateActivityQuestion(
        activityId,
        questionId,
        { score },
        req.user
      );

      res.json({
        success: true,
        message: '题目更新成功',
        question: updatedQuestion
      });
    } catch (error) {
      logger.error('Update activity question error:', error);
      res.status(error.message.includes('not found') ? 404 : error.message.includes('Permission') ? 403 : 500).json({
        success: false,
        message: error.message || '更新题目失败'
      });
    }
  }
);

// Reorder questions in activity
router.put('/:id/questions/reorder',
  authMiddleware,
  [
    param('id').isInt().withMessage('Activity ID must be an integer'),
    body('orders').isArray({ min: 1 }).withMessage('Orders must be a non-empty array'),
    body('orders.*.questionId').isInt().withMessage('Each order must have a questionId'),
    body('orders.*.orderIndex').isInt({ min: 1 }).withMessage('Each order must have a positive orderIndex')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const { orders } = req.body;

      const updatedQuestions = await PaperGenerationService.reorderQuestions(activityId, orders, req.user);

      res.json({
        success: true,
        message: '题目顺序更新成功',
        questions: updatedQuestions
      });
    } catch (error) {
      logger.error('Reorder questions error:', error);
      res.status(error.message.includes('not found') ? 404 : error.message.includes('Permission') ? 403 : 500).json({
        success: false,
        message: error.message || '更新题目顺序失败'
      });
    }
  }
);

// Clear all questions from activity
router.delete('/:id/paper',
  authMiddleware,
  [
    param('id').isInt().withMessage('Activity ID must be an integer')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);

      const result = await PaperGenerationService.clearActivityPaper(activityId, req.user);

      res.json({
        success: true,
        message: `已清空试卷，移除 ${result.removed} 个题目`,
        removed: result.removed
      });
    } catch (error) {
      logger.error('Clear activity paper error:', error);
      res.status(error.message.includes('not found') ? 404 : error.message.includes('Permission') ? 403 : 500).json({
        success: false,
        message: error.message || '清空试卷失败'
      });
    }
  }
);

// Validate activity paper
router.get('/:id/paper/validate',
  authMiddleware,
  [
    param('id').isInt().withMessage('Activity ID must be an integer')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);

      const validation = await PaperGenerationService.validateActivityPaper(activityId);

      res.json({
        success: true,
        ...validation
      });
    } catch (error) {
      logger.error('Validate paper error:', error);
      res.status(500).json({
        success: false,
        message: error.message || '验证试卷失败'
      });
    }
  }
);

module.exports = router;
