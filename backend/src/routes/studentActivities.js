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
        AND (a.is_virtual = false OR a.is_virtual IS NULL)
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
// D1 碎片化学习推荐（算法②）
// ============================================================================
router.get('/recommend', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: '仅学生可使用推荐' });
    }
    const { subject, grade, count, excludeShownIds } = req.query;
    if (!subject) {
      return res.status(400).json({ success: false, message: 'subject 必填' });
    }
    // 换一批：前端把本会话已展示的 question_id 传入，后端排除以强制换内容
    const shownIds = Array.isArray(excludeShownIds)
      ? excludeShownIds
      : String(excludeShownIds || '')
          .split(',')
          .map((s) => parseInt(s, 10))
          .filter((n) => Number.isFinite(n));
    const QuestionRecommender = require('../services/recommend/QuestionRecommender');
    const result = await QuestionRecommender.recommend(req.user.id, {
      subject,
      grade,
      count: Math.min(parseInt(count, 10) || 10, 30),
      includeReviews: true,          // 碎片化推荐混入 SM-2 到期错题复习槽
      excludeShownIds: shownIds
    });
    res.json({ success: true, data: result.recommendations, meta: result.meta });
  } catch (error) {
    logger.error('Recommend questions error:', error);
    res.status(500).json({ success: false, message: '获取推荐失败', error: error.message });
  }
});

// ============================================================================
// D3 每日推题（算法③）
// ============================================================================
router.get('/daily-questions', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: '仅学生可使用每日推题' });
    }
    const { subject } = req.query;
    const DailyQuestionService = require('../services/recommend/DailyQuestionService');
    const set = await DailyQuestionService.getToday(req.user.id, subject || null);
    res.json({ success: true, data: set });
  } catch (error) {
    logger.error('Daily questions error:', error);
    res.status(500).json({ success: false, message: '获取每日推题失败', error: error.message });
  }
});

// 客观题本地判题（编程/问答/匹配返回 null 表示不支持自动判题）
function judgeObjective(type, studentAnswer, correctAnswer) {
  if (type === 'code' || type === 'essay' || type === 'matching') return null;
  const norm = (v) => {
    if (v == null) return '';
    if (Array.isArray(v)) return v.map((x) => String(x).trim().toUpperCase()).filter(Boolean).sort().join('|');
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return String(v).trim().toUpperCase();
  };
  const a = norm(studentAnswer);
  if (type === 'blank') {
    const arr = Array.isArray(correctAnswer)
      ? correctAnswer.map(norm)
      : [norm(correctAnswer)];
    return arr.includes(a);
  }
  return a === norm(correctAnswer) && a !== '';
}

// ============================================================================
// 推荐答题判题（算法②/③ 题目可作答：判对错→记练习表→入错题/积分/连胜）
// POST /recommend/:questionId/answer  body: { answer }
// ============================================================================
router.post('/recommend/:questionId/answer', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: '仅学生可作答推荐题目' });
    }
    const { questionId } = req.params;
    const { answer } = req.body;
    if (answer == null) {
      return res.status(400).json({ success: false, message: 'answer 必填' });
    }

    // 取题目（type/correct_answer/options/explanation/draft_id/subject/difficulty）
    const qr = await query(
      `SELECT qb.id AS question_id, qb.draft_id, qd.type, qd.difficulty, qd.subject,
              qd.options, qd.correct_answer, qd.explanation, qd.knowledge_points
       FROM question_bank qb
       JOIN question_drafts qd ON qb.draft_id = qd.id
       WHERE qb.id = $1 AND qd.is_active = true`,
      [parseInt(questionId, 10)]
    );
    const question = qr.rows[0];
    if (!question) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }

    const correct = judgeObjective(question.type, answer, question.correct_answer);
    if (correct === null) {
      return res.status(400).json({
        success: false,
        message: '该题型（编程/问答/匹配）不支持自动判题'
      });
    }

    // 记录推荐答题（upsert：同一题只留最后作答状态）
    const subject = question.subject || null;
    await query(
      `INSERT INTO student_question_practice
         (student_id, question_id, draft_id, subject, is_correct, source)
       VALUES ($1, $2, $3, $4, $5, 'recommend')
       ON CONFLICT (student_id, question_id) DO UPDATE SET
         is_correct = EXCLUDED.is_correct,
         draft_id = EXCLUDED.draft_id,
         subject = EXCLUDED.subject,
         answered_at = CURRENT_TIMESTAMP`,
      [req.user.id, parseInt(questionId, 10), question.draft_id || null, subject, correct]
    );

    const WrongQuestion = require('../models/WrongQuestion');
    let awarded = 0;
    let streak = null;

    if (correct) {
      // 答对：积分 + 若在错题集则标记掌握
      const PointsPolicy = require('../services/points/PointsPolicy');
      try {
        const award = await PointsPolicy.awardForCorrectAnswer(req.user.id, {
          difficulty: question.difficulty,
          isRedo: false,
          sourceType: 'recommend_practice',
          description: '智能练习答对奖励'
        });
        awarded = award.awarded;
      } catch (e) {
        logger.error('award recommend points failed:', e.message);
      }
      await WrongQuestion.markMastered(req.user.id, parseInt(questionId, 10))
        .catch((e) => logger.error('markMastered failed:', e.message));
    } else {
      // 答错：入错题集（幂等 upsert）
      await WrongQuestion.addIfWrong({
        studentId: req.user.id,
        questionId: parseInt(questionId, 10),
        draftId: question.draft_id || null,
        subject,
        knowledgePoints: Array.isArray(question.knowledge_points) ? question.knowledge_points : [],
        difficulty: question.difficulty || null,
        sourceActivityId: null
      }).catch((e) => logger.error('addIfWrong failed:', e.message));
    }

    // 连胜：无论对错都更新（错则归零）
    try {
      const StreakService = require('../services/streak/StreakService');
      streak = await StreakService.recordResult(req.user.id, correct);
    } catch (e) {
      logger.error('update streak failed:', e.message);
    }

    res.json({
      success: true,
      data: {
        correct,
        awarded,
        streak,
        type: question.type,
        options: question.options,
        correct_answer: correct ? undefined : question.correct_answer,
        explanation: correct ? undefined : (question.explanation || null)
      },
      message: correct ? `回答正确，获得积分 ${awarded}` : '回答错误，已加入错题集'
    });
  } catch (error) {
    logger.error('Recommend answer error:', error);
    res.status(500).json({ success: false, message: '提交答案失败', error: error.message });
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
        AND (a.is_virtual = false OR a.is_virtual IS NULL)
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
      // Use question_bank_with_draft view to get question content
      const questionsResult = await query(`
        SELECT
          aq.id as activity_question_id,
          aq.question_id,
          aq.order_index,
          aq.score as max_score,
          qb.question_code,
          qb.type,
          qb.content,
          qb.options,
          qb.difficulty,
          qb.image_url
        FROM activity_questions aq
        JOIN question_bank_with_draft qb ON aq.question_id = qb.id
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
    body('answer').exists().withMessage('Answer field is required')  // Allow empty answers
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

      // B1 刷题积分 + D4 错题入库：遍历本次已自动判题的客观题
      try {
        const PointsPolicy = require('../services/points/PointsPolicy');
        const WrongQuestion = require('../models/WrongQuestion');

        const graded = await query(`
          SELECT a.id AS answer_id, a.question_id, a.is_correct,
                 qd.id AS draft_id, qd.subject, qd.difficulty, qd.knowledge_points
          FROM answers a
          JOIN question_bank qb ON a.question_id = qb.id
          JOIN question_drafts qd ON qb.draft_id = qd.id
          WHERE a.student_exam_id = $1
            AND a.grading_status = 'auto_graded'
            AND a.is_correct IS NOT NULL
        `, [studentActivityId]);

        for (const row of graded.rows) {
          // A5 使用统计：累计提交人数 / 正确人数 / 使用次数
          await query(
            `UPDATE question_bank
             SET submit_count = submit_count + 1,
                 correct_count = correct_count + $1,
                 usage_count = usage_count + 1
             WHERE id = $2`,
            [row.is_correct ? 1 : 0, row.question_id]
          );
          if (row.is_correct) {
            await PointsPolicy.awardForCorrectAnswer(studentId, {
              difficulty: row.difficulty,
              sourceId: row.answer_id,
              sourceType: 'answer',
              description: '答题奖励'
            });
          } else {
            await WrongQuestion.addIfWrong({
              studentId,
              questionId: row.question_id,
              draftId: row.draft_id,
              subject: row.subject,
              knowledgePoints: row.knowledge_points,
              difficulty: row.difficulty,
              sourceActivityId: activityId
            });
          }
        }
      } catch (rewardError) {
        logger.error('Award points / wrong question failed:', rewardError);
        // 积分/错题失败不影响提交结果
      }

      // B2 触发刷题成就检测：发 practice.completed 事件，携带累计正确数
      try {
        const eventBus = require('../services/EventBus');
        const { STUDENT_PRACTICE } = require('../services/EventTypes');
        const totalCorrectRow = await query(
          `SELECT COUNT(*) AS c FROM answers a
           JOIN student_activities sa ON a.student_exam_id = sa.id
           WHERE sa.student_id = $1 AND a.is_correct = true`,
          [studentId]
        );
        const activityRow = await query('SELECT subject FROM activities WHERE id = $1', [activityId]);
        eventBus.emit(STUDENT_PRACTICE.COMPLETED, {
          userId: studentId,
          studentId,
          subject: activityRow.rows[0] ? activityRow.rows[0].subject : null,
          count: parseInt(totalCorrectRow.rows[0].c, 10) || 0,
          activityId
        });
      } catch (eventError) {
        logger.error('Emit practice event failed:', eventError);
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

      // Get latest submitted or graded attempt with activity details
      const attemptResult = await query(`
        SELECT
          sa.*,
          a.title as activity_title,
          a.type as activity_type,
          a.total_score as activity_total_score,
          a.result_publish_time
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

      // Determine if correct answers should be shown
      // - Practice (练习): Always show answers immediately
      // - Assessment (测评): Only show answers after result_publish_time
      const activityType = studentActivity.activity_type;
      const resultPublishTime = studentActivity.result_publish_time;
      const currentTime = new Date();

      let showAnswers = false;
      let showAnswersReason = '';

      if (activityType === 'practice') {
        // 练习类活动：立即显示答案
        showAnswers = true;
        showAnswersReason = 'practice_immediate';
      } else if (activityType === 'assessment') {
        // 测评类活动：检查结果发布时间
        if (!resultPublishTime) {
          // 未设置发布时间，立即显示
          showAnswers = true;
          showAnswersReason = 'assessment_no_time_set';
        } else {
          const publishTime = new Date(resultPublishTime);
          if (currentTime >= publishTime) {
            showAnswers = true;
            showAnswersReason = 'assessment_published';
          } else {
            showAnswers = false;
            showAnswersReason = 'assessment_pending';
          }
        }
      }

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
          qb.options as question_options,
          qb.correct_answer,
          qb.explanation as question_explanation,
          qb.image_url as question_image_url,
          qb.difficulty as question_difficulty,
          aq.score as max_score
        FROM answers a
        JOIN question_bank_with_draft qb ON a.question_id = qb.id
        JOIN activity_questions aq ON aq.activity_id = $2 AND aq.question_id = a.question_id
        WHERE a.student_exam_id = $1
        ORDER BY qb.id ASC
      `, [studentActivityId, activityId]);

      // Calculate statistics from actual answers data
      // 有 answers 时从 answers 合计，否则回退到 student_activities.score（历史记录）
      const computedScore = answersResult.rows.length > 0
        ? answersResult.rows.reduce((sum, a) => sum + (parseFloat(a.score) || 0), 0)
        : parseFloat(studentActivity.score) || 0;
      const computedMaxScore = answersResult.rows.length > 0
        ? answersResult.rows.reduce((sum, a) => sum + (parseFloat(a.max_score) || 0), 0)
        : parseFloat(studentActivity.activity_total_score) || 0;

      const stats = {
        total_questions: answersResult.rows.length,
        answered_questions: answersResult.rows.filter(a => a.my_answer).length,
        auto_graded_questions: answersResult.rows.filter(a => a.grading_status === 'auto_graded').length,
        manual_graded_questions: answersResult.rows.filter(a => a.grading_status === 'manual_graded').length,
        pending_questions: answersResult.rows.filter(a => a.grading_status === 'pending').length,
        correct_questions: answersResult.rows.filter(a => a.is_correct === true).length
      };

      // Prepare answers - hide correct_answer if not allowed to show
      const processedAnswers = answersResult.rows.map(answer => {
        if (!showAnswers) {
          // Remove sensitive information when answers are not yet published
          const { correct_answer: _ca, is_correct: _ic, ...rest } = answer;
          return rest;
        }
        return answer;
      });

      res.json({
        success: true,
        can_show_answers: showAnswers,
        show_answers_reason: showAnswersReason,
        result_publish_time: resultPublishTime,
        student_activity: {
          id: studentActivity.id,
          status: studentActivity.status,
          grading_status: studentActivity.grading_status,
          score: computedScore,
          original_score: studentActivity.score,
          rank: studentActivity.rank,
          started_at: studentActivity.started_at,
          submit_time: studentActivity.submit_time,
          attempt_number: studentActivity.attempt_number,
          activity_title: studentActivity.activity_title,
          activity_type: studentActivity.activity_type,
          activity_total_score: computedMaxScore,
          original_activity_total_score: studentActivity.activity_total_score
        },
        statistics: stats,
        answers: processedAnswers
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

// ============================================================================
// 10. 获取学生已完成的练习列表
// ============================================================================
router.get('/practice/completed', authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { subject, grade, ability_level } = req.query;

    let queryStr = `
      SELECT DISTINCT ON (a.id)
        a.id,
        a.title,
        a.subject,
        a.grade,
        a.ability_level,
        a.start_time,
        a.end_time,
        a.duration,
        a.total_score,
        a.type,
        sa.id as student_activity_id,
        sa.status as student_status,
        sa.score as my_score,
        sa.submit_time,
        sa.attempt_number,
        sa.grading_status
      FROM activities a
      INNER JOIN student_activities sa ON a.id = sa.activity_id
      WHERE sa.student_id = $1
        AND a.type = 'practice'
        AND sa.status IN ('submitted', 'graded')
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

    queryStr += ' ORDER BY a.id DESC, sa.attempt_number DESC';

    const result = await query(queryStr, params);

    res.json({
      success: true,
      practices: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('Get completed practices error:', error);
    res.status(500).json({
      success: false,
      message: '获取已完成练习列表失败'
    });
  }
});

module.exports = router;
