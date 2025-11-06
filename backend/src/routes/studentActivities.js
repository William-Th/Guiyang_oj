/**
 * Student Activities Routes
 * 学生答题系统路由
 *
 * Endpoints:
 * - GET /practice - 获取可用练习列表
 * - GET /assessment - 获取可用测评列表
 * - GET /:id - 获取活动详情
 * - POST /:id/start - 开始活动
 * - GET /:id/questions - 获取题目列表
 * - POST /:id/answers - 提交单题答案
 * - GET /:id/my-answers - 获取已答题目
 * - POST /:id/submit - 提交整个活动
 * - GET /:id/result - 查看结果
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// ============================================================================
// 1. 获取可用练习列表
// ============================================================================
router.get('/practice', authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { subject, grade, ability_level } = req.query;

    let queryStr = `
      SELECT
        a.*,
        (SELECT COUNT(*) FROM activity_questions WHERE activity_id = a.id) as question_count,
        sa.id as my_attempt_id,
        sa.status as my_status,
        sa.score as my_score,
        sa.attempt_number
      FROM activities a
      LEFT JOIN student_activities sa ON a.id = sa.activity_id AND sa.student_id = $1
      WHERE a.type = 'practice'
        AND a.status = 'published'
        AND (a.start_time IS NULL OR a.start_time <= CURRENT_TIMESTAMP)
        AND (a.end_time IS NULL OR a.end_time >= CURRENT_TIMESTAMP)
    `;

    const params = [studentId];
    let paramCount = 1;

    if (subject) {
      queryStr += ` AND a.subject = $${++paramCount}`;
      params.push(subject);
    }

    if (grade) {
      queryStr += ` AND a.grade = $${++paramCount}`;
      params.push(grade);
    }

    if (ability_level) {
      queryStr += ` AND a.ability_level = $${++paramCount}`;
      params.push(ability_level);
    }

    queryStr += ' ORDER BY a.created_at DESC';

    const result = await query(queryStr, params);

    res.json({
      success: true,
      practices: result.rows
    });

  } catch (error) {
    logger.error('Get practice list error:', error);
    res.status(500).json({
      success: false,
      message: '获取练习列表失败'
    });
  }
});

// ============================================================================
// 2. 获取可用测评列表
// ============================================================================
router.get('/assessment', authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { subject, grade, ability_level } = req.query;

    let queryStr = `
      SELECT
        a.*,
        (SELECT COUNT(*) FROM activity_questions WHERE activity_id = a.id) as question_count,
        sa.id as my_attempt_id,
        sa.status as my_status,
        sa.score as my_score,
        sa.attempt_number
      FROM activities a
      LEFT JOIN student_activities sa ON a.id = sa.activity_id AND sa.student_id = $1
      WHERE a.type = 'assessment'
        AND a.status = 'published'
        AND (a.start_time IS NULL OR a.start_time <= CURRENT_TIMESTAMP)
        AND (a.end_time IS NULL OR a.end_time >= CURRENT_TIMESTAMP)
    `;

    const params = [studentId];
    let paramCount = 1;

    if (subject) {
      queryStr += ` AND a.subject = $${++paramCount}`;
      params.push(subject);
    }

    if (grade) {
      queryStr += ` AND a.grade = $${++paramCount}`;
      params.push(grade);
    }

    if (ability_level) {
      queryStr += ` AND a.ability_level = $${++paramCount}`;
      params.push(ability_level);
    }

    queryStr += ' ORDER BY a.created_at DESC';

    const result = await query(queryStr, params);

    res.json({
      success: true,
      assessments: result.rows
    });

  } catch (error) {
    logger.error('Get assessment list error:', error);
    res.status(500).json({
      success: false,
      message: '获取测评列表失败'
    });
  }
});

// ============================================================================
// 3. 获取活动详情
// ============================================================================
router.get('/:id',
  authMiddleware,
  [param('id').isInt().withMessage('Invalid activity ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const studentId = req.user.id;

      // Get activity details
      const activityResult = await query(`
        SELECT
          a.*,
          (SELECT COUNT(*) FROM activity_questions WHERE activity_id = a.id) as question_count,
          (SELECT SUM(score) FROM activity_questions WHERE activity_id = a.id) as total_possible_score
        FROM activities a
        WHERE a.id = $1 AND a.status = 'published'
      `, [activityId]);

      if (activityResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '活动不存在或未发布'
        });
      }

      const activity = activityResult.rows[0];

      // Get student's attempt history
      const attemptsResult = await query(`
        SELECT id, status, score, attempt_number, started_at, submit_time, grading_status
        FROM student_activities
        WHERE student_id = $1 AND activity_id = $2
        ORDER BY attempt_number DESC
      `, [studentId, activityId]);

      res.json({
        success: true,
        activity,
        my_attempts: attemptsResult.rows
      });

    } catch (error) {
      logger.error('Get activity detail error:', error);
      res.status(500).json({
        success: false,
        message: '获取活动详情失败'
      });
    }
  }
);

// ============================================================================
// 4. 开始活动
// ============================================================================
router.post('/:id/start',
  authMiddleware,
  [param('id').isInt().withMessage('Invalid activity ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const studentId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Check if activity exists and is published
      const activityResult = await query(`
        SELECT id, type, status, time_limit_type, duration, end_time, allow_retake, max_attempts
        FROM activities
        WHERE id = $1
      `, [activityId]);

      if (activityResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '活动不存在'
        });
      }

      const activity = activityResult.rows[0];

      if (activity.status !== 'published') {
        return res.status(400).json({
          success: false,
          message: '活动未发布'
        });
      }

      // Check existing attempts
      const existingResult = await query(`
        SELECT id, status, attempt_number
        FROM student_activities
        WHERE student_id = $1 AND activity_id = $2
        ORDER BY attempt_number DESC
        LIMIT 1
      `, [studentId, activityId]);

      // Check if already has in_progress attempt
      if (existingResult.rows.length > 0 && existingResult.rows[0].status === 'in_progress') {
        return res.json({
          success: true,
          message: '继续之前的答题',
          student_activity_id: existingResult.rows[0].id,
          is_continue: true
        });
      }

      // Check max attempts
      const attemptNumber = existingResult.rows.length > 0 ? existingResult.rows[0].attempt_number + 1 : 1;

      if (!activity.allow_retake && attemptNumber > 1) {
        return res.status(400).json({
          success: false,
          message: '该活动不允许重做'
        });
      }

      if (activity.max_attempts && attemptNumber > activity.max_attempts) {
        return res.status(400).json({
          success: false,
          message: `已达到最大尝试次数(${activity.max_attempts}次)`
        });
      }

      // Calculate deadline
      let timeLimitDeadline = null;
      if (activity.time_limit_type === 'scheduled') {
        timeLimitDeadline = activity.end_time;
      } else if (activity.time_limit_type === 'timed') {
        const durationMinutes = activity.duration || 60;
        const deadlineResult = await query(`SELECT CURRENT_TIMESTAMP + INTERVAL '${durationMinutes} minutes' AS deadline`);
        timeLimitDeadline = deadlineResult.rows[0].deadline;
      }

      // Create new attempt
      const insertResult = await query(`
        INSERT INTO student_activities (
          student_id, activity_id, status, start_time, started_at,
          time_limit_deadline, ip_address, attempt_number, grading_status
        )
        VALUES ($1, $2, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3, $4, $5, 'pending')
        RETURNING id, start_time, time_limit_deadline
      `, [studentId, activityId, timeLimitDeadline, ipAddress, attemptNumber]);

      logger.info(`Student ${studentId} started activity ${activityId}, attempt #${attemptNumber}`);

      res.json({
        success: true,
        message: '开始答题成功',
        student_activity_id: insertResult.rows[0].id,
        started_at: insertResult.rows[0].start_time,
        deadline: insertResult.rows[0].time_limit_deadline,
        attempt_number: attemptNumber
      });

    } catch (error) {
      logger.error('Start activity error:', error);
      res.status(500).json({
        success: false,
        message: '开始活动失败'
      });
    }
  }
);

// ============================================================================
// 5. 获取题目列表
// ============================================================================
router.get('/:id/questions',
  authMiddleware,
  [param('id').isInt().withMessage('Invalid activity ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const studentId = req.user.id;

      // Verify student has started this activity
      const attemptResult = await query(`
        SELECT id, status
        FROM student_activities
        WHERE student_id = $1 AND activity_id = $2 AND status = 'in_progress'
        ORDER BY attempt_number DESC
        LIMIT 1
      `, [studentId, activityId]);

      if (attemptResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '请先开始活动'
        });
      }

      // Get activity details
      const activityResult = await query(`
        SELECT id, title, description, subject, grade, start_time, end_time,
               duration, total_score, pass_score, status, type, ability_level,
               scope, allow_retake, max_attempts, is_official, target_audience,
               certificate_config, time_limit_type
        FROM activities
        WHERE id = $1
      `, [activityId]);

      if (activityResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '活动不存在'
        });
      }

      // Get questions (without correct_answer for security)
      const questionsResult = await query(`
        SELECT
          aq.id as activity_question_id,
          aq.question_id,
          aq.order_index,
          aq.score as max_score,
          aq.is_required,
          qb.question_code,
          qb.type,
          qb.content,
          qb.options,
          qb.difficulty
        FROM activity_questions aq
        JOIN question_bank qb ON aq.question_id = qb.id
        WHERE aq.activity_id = $1
        ORDER BY aq.order_index ASC
      `, [activityId]);

      const activity = activityResult.rows[0];
      activity.questions = questionsResult.rows;

      res.json({
        success: true,
        activity,
        questions: questionsResult.rows  // Keep for backward compatibility
      });

    } catch (error) {
      logger.error('Get questions error:', error);
      res.status(500).json({
        success: false,
        message: '获取题目失败'
      });
    }
  }
);

// ============================================================================
// 6. 提交单题答案
// ============================================================================
router.post('/:id/answers',
  authMiddleware,
  [
    param('id').isInt().withMessage('Invalid activity ID'),
    body('questionId').isInt().withMessage('Question ID is required'),
    body('answer').notEmpty().withMessage('Answer is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const studentId = req.user.id;
      const { questionId, answer } = req.body;

      // Get current student_activity
      const attemptResult = await query(`
        SELECT id, status
        FROM student_activities
        WHERE student_id = $1 AND activity_id = $2 AND status = 'in_progress'
        ORDER BY attempt_number DESC
        LIMIT 1
      `, [studentId, activityId]);

      if (attemptResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '未找到进行中的答题记录'
        });
      }

      const studentActivityId = attemptResult.rows[0].id;

      // Verify question belongs to this activity
      const questionCheck = await query(`
        SELECT id FROM activity_questions
        WHERE activity_id = $1 AND question_id = $2
      `, [activityId, questionId]);

      if (questionCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: '题目不属于该活动'
        });
      }

      // Save or update answer
      const answerResult = await query(`
        INSERT INTO answers (student_exam_id, question_id, answer, grading_status)
        VALUES ($1, $2, $3, 'pending')
        ON CONFLICT (student_exam_id, question_id)
        DO UPDATE SET
          answer = EXCLUDED.answer,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, created_at, updated_at
      `, [studentActivityId, questionId, answer]);

      res.json({
        success: true,
        message: '答案已保存',
        answer_id: answerResult.rows[0].id,
        saved_at: answerResult.rows[0].updated_at || answerResult.rows[0].created_at
      });

    } catch (error) {
      logger.error('Save answer error:', error);
      res.status(500).json({
        success: false,
        message: '保存答案失败'
      });
    }
  }
);

// ============================================================================
// 7. 获取已答题目
// ============================================================================
router.get('/:id/my-answers',
  authMiddleware,
  [param('id').isInt().withMessage('Invalid activity ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const studentId = req.user.id;

      // Get current student_activity
      const attemptResult = await query(`
        SELECT id, status
        FROM student_activities
        WHERE student_id = $1 AND activity_id = $2
        ORDER BY attempt_number DESC
        LIMIT 1
      `, [studentId, activityId]);

      if (attemptResult.rows.length === 0) {
        return res.json({
          success: true,
          answers: []
        });
      }

      const studentActivityId = attemptResult.rows[0].id;

      // Get all answers for this attempt
      const answersResult = await query(`
        SELECT
          a.id,
          a.question_id,
          a.answer,
          a.score,
          a.grading_status,
          a.feedback,
          a.created_at,
          a.updated_at
        FROM answers a
        WHERE a.student_exam_id = $1
        ORDER BY a.question_id ASC
      `, [studentActivityId]);

      res.json({
        success: true,
        student_activity_id: studentActivityId,
        status: attemptResult.rows[0].status,
        answers: answersResult.rows
      });

    } catch (error) {
      logger.error('Get my answers error:', error);
      res.status(500).json({
        success: false,
        message: '获取答题记录失败'
      });
    }
  }
);

// ============================================================================
// 8. 提交整个活动
// ============================================================================
router.post('/:id/submit',
  authMiddleware,
  [param('id').isInt().withMessage('Invalid activity ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const studentId = req.user.id;

      // Get current student_activity
      const attemptResult = await query(`
        SELECT id, status
        FROM student_activities
        WHERE student_id = $1 AND activity_id = $2 AND status = 'in_progress'
        ORDER BY attempt_number DESC
        LIMIT 1
      `, [studentId, activityId]);

      if (attemptResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '未找到进行中的答题记录'
        });
      }

      const studentActivityId = attemptResult.rows[0].id;

      // Update status to submitted
      await query(`
        UPDATE student_activities
        SET status = 'submitted',
            submit_time = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [studentActivityId]);

      logger.info(`Student ${studentId} submitted activity ${activityId}, student_activity_id: ${studentActivityId}`);

      // Trigger auto-grading (will be implemented in auto-grading service)
      // This will be called asynchronously
      try {
        const autoGradingService = require('../services/autoGradingService');
        await autoGradingService.autoGradeActivity(studentActivityId);
      } catch (autoGradeError) {
        logger.error('Auto-grading failed:', autoGradeError);
        // Don't fail the submission if auto-grading fails
      }

      res.json({
        success: true,
        message: '提交成功',
        student_activity_id: studentActivityId
      });

    } catch (error) {
      logger.error('Submit activity error:', error);
      res.status(500).json({
        success: false,
        message: '提交失败'
      });
    }
  }
);

// ============================================================================
// 9. 查看结果
// ============================================================================
router.get('/:id/result',
  authMiddleware,
  [param('id').isInt().withMessage('Invalid activity ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const activityId = parseInt(req.params.id);
      const studentId = req.user.id;

      // Get latest submitted or graded attempt
      const attemptResult = await query(`
        SELECT
          sa.*,
          a.title as activity_title,
          a.type as activity_type,
          a.total_score as activity_total_score
        FROM student_activities sa
        JOIN activities a ON sa.activity_id = a.id
        WHERE sa.student_id = $1
          AND sa.activity_id = $2
          AND sa.status IN ('submitted', 'graded')
        ORDER BY sa.attempt_number DESC
        LIMIT 1
      `, [studentId, activityId]);

      if (attemptResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到已提交的答题记录'
        });
      }

      const studentActivity = attemptResult.rows[0];
      const studentActivityId = studentActivity.id;

      // Get all answers with details
      const answersResult = await query(`
        SELECT
          a.id,
          a.question_id,
          a.answer as my_answer,
          a.score,
          a.is_correct,
          a.grading_status,
          a.feedback,
          qb.question_code,
          qb.type as question_type,
          qb.content as question_content,
          qb.correct_answer,
          aq.score as max_score
        FROM answers a
        JOIN question_bank qb ON a.question_id = qb.id
        JOIN activity_questions aq ON aq.activity_id = $2 AND aq.question_id = a.question_id
        WHERE a.student_exam_id = $1
        ORDER BY qb.id ASC
      `, [studentActivityId, activityId]);

      // Calculate statistics
      const stats = {
        total_questions: answersResult.rows.length,
        answered_questions: answersResult.rows.filter(a => a.my_answer).length,
        auto_graded_questions: answersResult.rows.filter(a => a.grading_status === 'auto_graded').length,
        manual_graded_questions: answersResult.rows.filter(a => a.grading_status === 'manual_graded').length,
        pending_questions: answersResult.rows.filter(a => a.grading_status === 'pending').length,
        correct_questions: answersResult.rows.filter(a => a.is_correct === true).length
      };

      res.json({
        success: true,
        student_activity: {
          id: studentActivity.id,
          status: studentActivity.status,
          grading_status: studentActivity.grading_status,
          score: studentActivity.score,
          rank: studentActivity.rank,
          started_at: studentActivity.started_at,
          submit_time: studentActivity.submit_time,
          attempt_number: studentActivity.attempt_number,
          activity_title: studentActivity.activity_title,
          activity_type: studentActivity.activity_type,
          activity_total_score: studentActivity.activity_total_score
        },
        statistics: stats,
        answers: answersResult.rows
      });

    } catch (error) {
      logger.error('Get result error:', error);
      res.status(500).json({
        success: false,
        message: '获取结果失败'
      });
    }
  }
);

module.exports = router;
