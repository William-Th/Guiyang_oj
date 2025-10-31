/**
 * Teacher Grading Routes
 * 教师评卷系统路由
 *
 * Endpoints:
 * - GET /pending - 获取待评卷列表
 * - GET /student-activity/:id - 获取学生答题详情
 * - PUT /answers/:id - 评分单题
 * - PUT /batch - 批量评分
 * - POST /student-activity/:id/complete - 完成评卷
 * - GET /stats/:activityId - 评卷统计
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const AutoGradingService = require('../services/autoGradingService');

// ============================================================================
// 1. 获取待评卷列表
// ============================================================================
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    // Only teacher and admin can access
    if (!['teacher', 'school_admin', 'district_admin', 'municipal_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const teacherId = req.user.id;
    const { activityId, subject, grade, grading_status } = req.query;

    // Build query
    let queryStr = `
      SELECT
        sa.id as student_activity_id,
        sa.student_id,
        sa.activity_id,
        sa.status,
        sa.grading_status,
        sa.score,
        sa.submit_time,
        sa.attempt_number,
        u.real_name as student_name,
        u.username as student_username,
        a.title as activity_title,
        a.type as activity_type,
        a.subject,
        a.grade,
        (SELECT COUNT(*) FROM answers WHERE student_exam_id = sa.id AND grading_status = 'pending') as pending_answers,
        (SELECT COUNT(*) FROM answers WHERE student_exam_id = sa.id) as total_answers
      FROM student_activities sa
      JOIN users u ON sa.student_id = u.id
      JOIN activities a ON sa.activity_id = a.id
      WHERE sa.status IN ('submitted', 'graded')
        AND sa.grading_status IN ('pending', 'auto_graded', 'partial_graded')
        AND a.created_by = $1
    `;

    const params = [teacherId];
    let paramCount = 1;

    if (activityId) {
      queryStr += ` AND sa.activity_id = $${++paramCount}`;
      params.push(parseInt(activityId));
    }

    if (subject) {
      queryStr += ` AND a.subject = $${++paramCount}`;
      params.push(subject);
    }

    if (grade) {
      queryStr += ` AND a.grade = $${++paramCount}`;
      params.push(grade);
    }

    if (grading_status) {
      queryStr += ` AND sa.grading_status = $${++paramCount}`;
      params.push(grading_status);
    }

    queryStr += ` ORDER BY sa.submit_time DESC`;

    const result = await query(queryStr, params);

    res.json({
      success: true,
      submissions: result.rows
    });

  } catch (error) {
    logger.error('Get pending grading list error:', error);
    res.status(500).json({
      success: false,
      message: '获取待评卷列表失败'
    });
  }
});

// ============================================================================
// 2. 获取学生答题详情
// ============================================================================
router.get('/student-activity/:id',
  authMiddleware,
  [param('id').isInt().withMessage('Invalid student activity ID')],
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

      // Only teacher and admin can access
      if (!['teacher', 'school_admin', 'district_admin', 'municipal_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const studentActivityId = parseInt(req.params.id);
      const teacherId = req.user.id;

      // Get student activity details and verify ownership
      const saResult = await query(`
        SELECT
          sa.*,
          u.real_name as student_name,
          u.username as student_username,
          a.title as activity_title,
          a.type as activity_type,
          a.subject,
          a.grade,
          a.created_by
        FROM student_activities sa
        JOIN users u ON sa.student_id = u.id
        JOIN activities a ON sa.activity_id = a.id
        WHERE sa.id = $1
      `, [studentActivityId]);

      if (saResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '答题记录不存在'
        });
      }

      const studentActivity = saResult.rows[0];

      // Verify the teacher owns this activity
      if (studentActivity.created_by !== teacherId && !req.user.role.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: '无权查看此答题记录'
        });
      }

      // Get all answers with question details
      const answersResult = await query(`
        SELECT
          a.id as answer_id,
          a.question_id,
          a.answer as student_answer,
          a.score,
          a.is_correct,
          a.grading_status,
          a.feedback,
          a.auto_score,
          a.manual_score,
          a.graded_by,
          a.graded_at,
          qb.question_code,
          qb.type as question_type,
          qb.content as question_content,
          qb.options,
          qb.correct_answer,
          aq.score as max_score,
          aq.order_index,
          grader.real_name as graded_by_name
        FROM answers a
        JOIN question_bank qb ON a.question_id = qb.id
        JOIN activity_questions aq ON aq.activity_id = $2 AND aq.question_id = a.question_id
        LEFT JOIN users grader ON a.graded_by = grader.id
        WHERE a.student_exam_id = $1
        ORDER BY aq.order_index ASC
      `, [studentActivityId, studentActivity.activity_id]);

      // Categorize answers
      const objectiveQuestions = answersResult.rows.filter(a =>
        ['single', 'multiple', 'fill_blank'].includes(a.question_type)
      );

      const subjectiveQuestions = answersResult.rows.filter(a =>
        ['short_answer', 'programming'].includes(a.question_type)
      );

      res.json({
        success: true,
        student_activity: {
          id: studentActivity.id,
          student_id: studentActivity.student_id,
          student_name: studentActivity.student_name,
          student_username: studentActivity.student_username,
          activity_id: studentActivity.activity_id,
          activity_title: studentActivity.activity_title,
          activity_type: studentActivity.activity_type,
          subject: studentActivity.subject,
          grade: studentActivity.grade,
          status: studentActivity.status,
          grading_status: studentActivity.grading_status,
          score: studentActivity.score,
          submit_time: studentActivity.submit_time,
          attempt_number: studentActivity.attempt_number
        },
        objective_questions: objectiveQuestions,
        subjective_questions: subjectiveQuestions,
        statistics: {
          total_questions: answersResult.rows.length,
          objective_count: objectiveQuestions.length,
          subjective_count: subjectiveQuestions.length,
          pending_count: answersResult.rows.filter(a => a.grading_status === 'pending').length,
          graded_count: answersResult.rows.filter(a => a.grading_status !== 'pending').length
        }
      });

    } catch (error) {
      logger.error('Get student activity detail error:', error);
      res.status(500).json({
        success: false,
        message: '获取答题详情失败'
      });
    }
  }
);

// ============================================================================
// 3. 评分单题
// ============================================================================
router.put('/answers/:id',
  authMiddleware,
  [
    param('id').isInt().withMessage('Invalid answer ID'),
    body('score').isFloat({ min: 0 }).withMessage('Score must be a positive number'),
    body('feedback').optional().isString()
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

      // Only teacher and admin can access
      if (!['teacher', 'school_admin', 'district_admin', 'municipal_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const answerId = parseInt(req.params.id);
      const teacherId = req.user.id;
      const { score, feedback } = req.body;

      // Verify the answer belongs to an activity owned by this teacher
      const verifyResult = await query(`
        SELECT
          a.id,
          a.student_exam_id,
          aq.score as max_score,
          act.created_by
        FROM answers a
        JOIN student_activities sa ON a.student_exam_id = sa.id
        JOIN activities act ON sa.activity_id = act.id
        JOIN activity_questions aq ON aq.activity_id = act.id AND aq.question_id = a.question_id
        WHERE a.id = $1
      `, [answerId]);

      if (verifyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '答案不存在'
        });
      }

      const answer = verifyResult.rows[0];

      // Verify ownership
      if (answer.created_by !== teacherId && !req.user.role.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: '无权评分此题'
        });
      }

      // Validate score doesn't exceed max_score
      if (parseFloat(score) > parseFloat(answer.max_score)) {
        return res.status(400).json({
          success: false,
          message: `分数不能超过最大分值 ${answer.max_score}`
        });
      }

      // Update answer
      await query(`
        UPDATE answers
        SET
          score = $1,
          manual_score = $1,
          feedback = $2,
          grading_status = 'manual_graded',
          graded_by = $3,
          graded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [score, feedback || null, teacherId, answerId]);

      // Recalculate total score
      await AutoGradingService.recalculateTotalScore(answer.student_exam_id);

      logger.info(`Teacher ${teacherId} graded answer ${answerId} with score ${score}`);

      res.json({
        success: true,
        message: '评分成功'
      });

    } catch (error) {
      logger.error('Grade answer error:', error);
      res.status(500).json({
        success: false,
        message: '评分失败'
      });
    }
  }
);

// ============================================================================
// 4. 批量评分
// ============================================================================
router.put('/batch',
  authMiddleware,
  [
    body('answers').isArray({ min: 1 }).withMessage('Answers must be a non-empty array'),
    body('answers.*.answerId').isInt().withMessage('Answer ID must be an integer'),
    body('answers.*.score').isFloat({ min: 0 }).withMessage('Score must be a positive number'),
    body('answers.*.feedback').optional().isString()
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

      // Only teacher and admin can access
      if (!['teacher', 'school_admin', 'district_admin', 'municipal_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const teacherId = req.user.id;
      const { answers } = req.body;

      const results = {
        success: [],
        failed: []
      };

      // Grade each answer
      for (const answerData of answers) {
        try {
          const { answerId, score, feedback } = answerData;

          // Verify ownership and get max_score
          const verifyResult = await query(`
            SELECT
              a.id,
              a.student_exam_id,
              aq.score as max_score,
              act.created_by
            FROM answers a
            JOIN student_activities sa ON a.student_exam_id = sa.id
            JOIN activities act ON sa.activity_id = act.id
            JOIN activity_questions aq ON aq.activity_id = act.id AND aq.question_id = a.question_id
            WHERE a.id = $1
          `, [answerId]);

          if (verifyResult.rows.length === 0) {
            results.failed.push({
              answerId,
              error: '答案不存在'
            });
            continue;
          }

          const answer = verifyResult.rows[0];

          // Verify ownership
          if (answer.created_by !== teacherId && !req.user.role.includes('admin')) {
            results.failed.push({
              answerId,
              error: '无权评分此题'
            });
            continue;
          }

          // Validate score
          if (parseFloat(score) > parseFloat(answer.max_score)) {
            results.failed.push({
              answerId,
              error: `分数不能超过最大分值 ${answer.max_score}`
            });
            continue;
          }

          // Update answer
          await query(`
            UPDATE answers
            SET
              score = $1,
              manual_score = $1,
              feedback = $2,
              grading_status = 'manual_graded',
              graded_by = $3,
              graded_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `, [score, feedback || null, teacherId, answerId]);

          results.success.push(answerId);

        } catch (error) {
          logger.error(`Failed to grade answer ${answerData.answerId}:`, error);
          results.failed.push({
            answerId: answerData.answerId,
            error: error.message
          });
        }
      }

      // Recalculate total scores for affected student_activities
      // Get unique student_exam_ids
      const studentActivityIds = new Set();
      for (const answerId of results.success) {
        const result = await query(`
          SELECT student_exam_id FROM answers WHERE id = $1
        `, [answerId]);
        if (result.rows.length > 0) {
          studentActivityIds.add(result.rows[0].student_exam_id);
        }
      }

      // Recalculate each
      for (const studentActivityId of studentActivityIds) {
        await AutoGradingService.recalculateTotalScore(studentActivityId);
      }

      logger.info(`Teacher ${teacherId} batch graded ${results.success.length} answers, ${results.failed.length} failed`);

      res.json({
        success: true,
        message: `成功评分 ${results.success.length} 道题目`,
        graded: results.success,
        failed: results.failed
      });

    } catch (error) {
      logger.error('Batch grade error:', error);
      res.status(500).json({
        success: false,
        message: '批量评分失败'
      });
    }
  }
);

// ============================================================================
// 5. 完成评卷
// ============================================================================
router.post('/student-activity/:id/complete',
  authMiddleware,
  [param('id').isInt().withMessage('Invalid student activity ID')],
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

      // Only teacher and admin can access
      if (!['teacher', 'school_admin', 'district_admin', 'municipal_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const studentActivityId = parseInt(req.params.id);
      const teacherId = req.user.id;

      // Verify ownership
      const verifyResult = await query(`
        SELECT
          sa.id,
          sa.grading_status,
          a.created_by
        FROM student_activities sa
        JOIN activities a ON sa.activity_id = a.id
        WHERE sa.id = $1
      `, [studentActivityId]);

      if (verifyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '答题记录不存在'
        });
      }

      const studentActivity = verifyResult.rows[0];

      if (studentActivity.created_by !== teacherId && !req.user.role.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: '无权完成此评卷'
        });
      }

      // Check if all answers are graded
      const pendingResult = await query(`
        SELECT COUNT(*) as pending_count
        FROM answers
        WHERE student_exam_id = $1 AND grading_status = 'pending'
      `, [studentActivityId]);

      if (parseInt(pendingResult.rows[0].pending_count) > 0) {
        return res.status(400).json({
          success: false,
          message: '还有未评分的题目',
          pending_count: pendingResult.rows[0].pending_count
        });
      }

      // Recalculate total score
      const totalScore = await AutoGradingService.recalculateTotalScore(studentActivityId);

      // Update grading status to completed
      await query(`
        UPDATE student_activities
        SET
          grading_status = 'completed',
          status = 'graded'
        WHERE id = $1
      `, [studentActivityId]);

      logger.info(`Teacher ${teacherId} completed grading for student_activity ${studentActivityId}, final score: ${totalScore}`);

      res.json({
        success: true,
        message: '评卷完成',
        total_score: totalScore
      });

    } catch (error) {
      logger.error('Complete grading error:', error);
      res.status(500).json({
        success: false,
        message: '完成评卷失败'
      });
    }
  }
);

// ============================================================================
// 6. 评卷统计
// ============================================================================
router.get('/stats/:activityId',
  authMiddleware,
  [param('activityId').isInt().withMessage('Invalid activity ID')],
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

      // Only teacher and admin can access
      if (!['teacher', 'school_admin', 'district_admin', 'municipal_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const activityId = parseInt(req.params.activityId);
      const teacherId = req.user.id;

      // Verify ownership
      const activityResult = await query(`
        SELECT id, title, created_by FROM activities WHERE id = $1
      `, [activityId]);

      if (activityResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '活动不存在'
        });
      }

      if (activityResult.rows[0].created_by !== teacherId && !req.user.role.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: '无权查看此统计'
        });
      }

      // Get statistics from view
      const statsResult = await query(`
        SELECT * FROM activity_grading_stats WHERE activity_id = $1
      `, [activityId]);

      if (statsResult.rows.length === 0) {
        return res.json({
          success: true,
          statistics: {
            activity_id: activityId,
            total_submissions: 0,
            pending_count: 0,
            auto_graded_count: 0,
            partial_graded_count: 0,
            completed_count: 0,
            avg_score: null,
            max_score: null,
            min_score: null
          }
        });
      }

      res.json({
        success: true,
        statistics: statsResult.rows[0]
      });

    } catch (error) {
      logger.error('Get grading stats error:', error);
      res.status(500).json({
        success: false,
        message: '获取统计数据失败'
      });
    }
  }
);

module.exports = router;
