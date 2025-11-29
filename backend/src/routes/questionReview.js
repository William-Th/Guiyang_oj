const express = require('express');
const router = express.Router();
const QuestionBank = require('../models/QuestionBank');
const QuestionReview = require('../models/QuestionReview');
const TeacherPermission = require('../models/TeacherPermission');
const { authMiddleware } = require('../middleware/auth');

// 获取我的草稿
router.get('/drafts', authMiddleware, async (req, res) => {
  try {
    const drafts = await QuestionBank.getMyDrafts(req.user.id);
    res.json({ success: true, data: drafts });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取我提交的审核列表 - 已废弃，使用新的草稿箱系统
router.get('/my-submissions', authMiddleware, async (req, res) => {
  // 返回空数组，避免前端报错
  res.json({ success: true, data: [] });
});

// 获取可以审核的老师列表（新版：基于 target_scope）
router.get('/available-reviewers', authMiddleware, async (req, res) => {
  try {
    const { subject, target_scope } = req.query;

    if (!subject || !target_scope) {
      return res.status(400).json({
        success: false,
        error: 'subject and target_scope are required'
      });
    }

    // 使用新的 getReviewersForScope 方法
    const reviewers = await TeacherPermission.getReviewersForScope(target_scope, subject);

    // 过滤掉自己
    const filteredReviewers = reviewers.filter(r => r.id !== req.user.id);

    res.json({
      success: true,
      data: filteredReviewers,
      meta: {
        count: filteredReviewers.length,
        target_scope,
        subject
      }
    });
  } catch (error) {
    console.error('Error fetching reviewers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 提交题目审核（新版：支持 target_scope）
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewer_id, target_scope } = req.body;

    if (!reviewer_id || !target_scope) {
      return res.status(400).json({
        success: false,
        error: 'reviewer_id and target_scope are required'
      });
    }

    // 🔧 从 question_drafts 表查询题目（草稿箱中的题目）
    const { query } = require('../database/connection');
    const draftResult = await query(
      'SELECT * FROM question_drafts WHERE id = $1',
      [id]
    );

    if (draftResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Question not found in drafts' });
    }

    const question = draftResult.rows[0];

    if (question.created_by !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You can only submit your own questions' });
    }

    // 验证审核人权限（使用 getReviewersForScope 直接验证）
    const reviewers = await TeacherPermission.getReviewersForScope(target_scope, question.subject);
    const canReview = reviewers.some(r => r.id === reviewer_id);

    // 🔧 临时：如果getReviewersForScope返回空（可能是实现问题），进行简单的permission_type检查
    if (!canReview) {
      // 查询审核人是否有对应的permission_type
      const permCheckSql = `
        SELECT COUNT(*) as count
        FROM teacher_permissions
        WHERE user_id = $1
          AND permission_type LIKE $2
          AND $3 = ANY(subjects)
      `;

      // 根据target_scope确定需要的permission_type
      let requiredPermType;
      if (target_scope === 'assessment') {
        requiredPermType = 'assessment_review';
      } else if (target_scope === 'practice_municipal') {
        requiredPermType = 'practice_municipal_review';
      } else if (target_scope.startsWith('practice_district_')) {
        requiredPermType = 'practice_district_review';
      } else if (target_scope.startsWith('practice_school_')) {
        requiredPermType = 'practice_school_review';
      }

      const permCheckResult = await query(permCheckSql, [
        reviewer_id,
        `%${requiredPermType}%`,
        question.subject
      ]);

      const hasPermission = parseInt(permCheckResult.rows[0].count) > 0;

      if (!hasPermission) {
        return res.status(400).json({
          success: false,
          error: `Reviewer does not have permission to review questions for scope: ${target_scope}`
        });
      }
    }

    // 检查是否已经提交到该范围（包括所有状态的记录）
    const checkSql = `
      SELECT id, status FROM question_bank
      WHERE draft_id = $1 AND scope = $2 AND is_active = true
    `;
    const checkResult = await query(checkSql, [id, target_scope]);

    if (checkResult.rows.length > 0) {
      const existingRecord = checkResult.rows[0];
      const statusMessages = {
        'pending_review': '该题目已经提交审核到此范围，请等待审核结果',
        'published': '该题目已经发布到此范围',
        'inactive': '该题目在此范围的发布记录已失效'
      };

      return res.status(400).json({
        success: false,
        error: statusMessages[existingRecord.status] || `该题目已存在于此范围（状态：${existingRecord.status}）`
      });
    }

    // 提交审核：在 question_bank 中创建待审核记录
    // 注意：question_bank 只是索引表，题目内容在 question_drafts 中
    const insertSql = `
      INSERT INTO question_bank (
        draft_id, scope, status, reviewer_id, published_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const insertResult = await query(insertSql, [
      id,                      // draft_id
      target_scope,            // scope (trigger会自动提取district_id/school_id)
      'pending_review',        // status
      reviewer_id,             // reviewer_id
      question.created_by      // published_by
    ]);

    const submittedQuestion = insertResult.rows[0];

    res.json({
      success: true,
      data: submittedQuestion,
      message: `Question submitted for review to ${target_scope}`
    });
  } catch (error) {
    console.error('Error submitting for review:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取待我审核的题目列表（新版：从 question_bank 查询）
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const { query } = require('../database/connection');

    // 查询当前用户作为审核人的待审核题目
    // 使用 question_bank_with_draft 视图获取完整信息
    const sql = `
      SELECT
        qb.id as review_id,
        qb.draft_id,
        qb.scope,
        qb.status,
        qb.published_by,
        qb.reviewer_id,
        qb.review_comment,
        qb.published_at as submitted_at,
        qd.id,
        qd.type,
        qd.subject,
        qd.grade,
        qd.level,
        qd.content,
        qd.options,
        qd.correct_answer,
        qd.suggested_score,
        qd.difficulty,
        qd.explanation,
        qd.abilities,
        qd.knowledge_points,
        qd.created_by,
        qd.created_at,
        qd.updated_at,
        u.real_name as creator_name,
        u.username as creator_username
      FROM question_bank qb
      JOIN question_drafts qd ON qb.draft_id = qd.id
      LEFT JOIN users u ON qd.created_by = u.id
      WHERE qb.reviewer_id = $1
        AND qb.status = 'pending_review'
        AND qb.is_active = true
      ORDER BY qb.published_at DESC NULLS LAST, qb.id DESC
    `;

    const result = await query(sql, [req.user.id]);

    // 格式化返回数据
    const pendingReviews = result.rows.map(row => ({
      // 使用 review_id 作为主键（而不是 draft_id）
      id: row.review_id,
      draft_id: row.draft_id,
      type: row.type,
      subject: row.subject,
      grade: row.grade,
      level: row.level,
      content: row.content,
      options: row.options,
      correct_answer: row.correct_answer,
      suggested_score: row.suggested_score,
      difficulty: row.difficulty,
      explanation: row.explanation,
      abilities: row.abilities,
      knowledge_points: row.knowledge_points,
      status: row.status,
      scope: [row.scope], // 包装成数组，兼容前端
      created_by: row.created_by,
      creator_name: row.creator_name,
      creator_username: row.creator_username,
      submitted_at: row.submitted_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    res.json({
      success: true,
      data: pendingReviews,
      meta: {
        count: pendingReviews.length
      }
    });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取审核统计信息
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { query } = require('../database/connection');

    // 统计当前用户作为审核人的审核情况
    const statsResult = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending_review' AND reviewer_id = $1) AS pending_count,
        COUNT(*) FILTER (WHERE status = 'approved' AND reviewer_id = $1) AS approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected' AND reviewer_id = $1) AS rejected_count
      FROM question_bank`,
      [req.user.id]
    );

    const stats = statsResult.rows[0];
    const total = parseInt(stats.approved_count) + parseInt(stats.rejected_count);
    const approval_rate = total > 0
      ? ((parseInt(stats.approved_count) / total) * 100).toFixed(1)
      : '0.0';

    res.json({
      success: true,
      data: {
        pending_count: parseInt(stats.pending_count),
        approved_count: parseInt(stats.approved_count),
        rejected_count: parseInt(stats.rejected_count),
        total_reviewed: total,
        approval_rate: parseFloat(approval_rate)
      }
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 审核题目（批准/拒绝，支持立即发布）
router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment, publish_immediately, target_scope } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be approved or rejected'
      });
    }

    // 验证审核意见：拒绝时必须填写，批准时可选
    if (status === 'rejected' && !comment?.trim()) {
      return res.status(400).json({
        success: false,
        error: '拒绝时必须填写审核意见'
      });
    }

    // 检查题目
    const question = await QuestionBank.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    if (question.reviewer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You are not the assigned reviewer for this question'
      });
    }

    if (question.status !== 'pending_review') {
      return res.status(400).json({
        success: false,
        error: 'Question is not pending review'
      });
    }

    let reviewedQuestion;

    // 如果批准且要求立即发布
    if (status === 'approved' && publish_immediately) {
      if (!target_scope) {
        return res.status(400).json({
          success: false,
          error: 'target_scope is required when publish_immediately is true'
        });
      }

      // 使用新的 approveAndPublish 方法（事务处理）
      reviewedQuestion = await QuestionBank.approveAndPublish(
        id,
        req.user.id,
        target_scope,
        comment || ''
      );

      // 记录审核历史
      await QuestionReview.create({
        question_id: id,
        reviewer_id: req.user.id,
        status: 'approved',
        comment: comment || `Approved and published to ${target_scope}`
      });

      res.json({
        success: true,
        data: reviewedQuestion,
        message: `Question approved and published to ${target_scope}`
      });
    }
    // 普通审核（不立即发布）
    else {
      // 直接更新 question_bank 表的状态
      const { query } = require('../database/connection');

      // 更新审核状态
      const updateSql = `
        UPDATE question_bank
        SET status = $1,
            review_comment = $2,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await query(updateSql, [
        status === 'approved' ? 'published' : 'inactive',  // approved变为published，rejected变为inactive
        comment || '',
        id
      ]);

      reviewedQuestion = updateResult.rows[0];

      // 记录审核历史
      await QuestionReview.create({
        question_id: id,
        reviewer_id: req.user.id,
        status,
        comment: comment || ''
      });

      res.json({
        success: true,
        data: reviewedQuestion,
        message: status === 'approved' ? '审核通过，题目已发布' : '已拒绝，题目未发布'
      });
    }
  } catch (error) {
    console.error('Error reviewing question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 直接发布到校级题库（无需审核）
router.post('/:id/publish-school', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id } = req.body;

    // 验证教师角色
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can publish to school-level question bank'
      });
    }

    // 检查题目是否属于当前用户
    const question = await QuestionBank.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    if (question.created_by !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You can only publish your own questions' });
    }

    if (question.status !== 'draft' && question.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Only draft or approved questions can be published to school'
      });
    }

    // 如果未指定 school_id，使用教师所在学校
    let targetSchoolId = school_id;
    if (!targetSchoolId) {
      // 从 teachers 表获取教师所在学校
      const { query } = require('../database/connection');
      const teacherResult = await query(
        'SELECT school_id FROM teachers WHERE user_id = $1',
        [req.user.id]
      );

      if (teacherResult.rows.length === 0 || !teacherResult.rows[0].school_id) {
        return res.status(400).json({
          success: false,
          error: 'Teacher has no associated school'
        });
      }

      targetSchoolId = teacherResult.rows[0].school_id;
    }

    // 直接发布到校级题库（无需审核）
    const publishedQuestion = await QuestionBank.publishToSchool(id, targetSchoolId, req.user.id);

    res.json({
      success: true,
      data: publishedQuestion,
      message: `Question published to school-level question bank (school_id: ${targetSchoolId})`
    });
  } catch (error) {
    console.error('Error publishing to school:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取题目审核历史
router.get('/:id/history', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查权限：题目创建者、审核者或管理员可以查看
    const question = await QuestionBank.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const isCreator = question.created_by === req.user.id;
    const isReviewer = question.reviewer_id === req.user.id;
    const isAdmin = req.user.role === 'system_admin';

    if (!isCreator && !isReviewer && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this question\'s review history'
      });
    }

    const history = await QuestionReview.getByQuestionId(id);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching review history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
