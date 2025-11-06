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

// 获取我提交的审核列表
router.get('/my-submissions', authMiddleware, async (req, res) => {
  try {
    const submissions = await QuestionBank.getMySubmissions(req.user.id);
    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
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

    // 检查题目是否属于当前用户
    const question = await QuestionBank.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    if (question.created_by !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You can only submit your own questions' });
    }

    if (question.status !== 'draft' && question.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        error: 'Only draft or rejected questions can be submitted for review'
      });
    }

    // 验证审核人权限（使用新的 canReviewQuestion 方法）
    const canReview = await TeacherPermission.canReviewQuestion(
      reviewer_id,
      id,
      target_scope
    );

    if (!canReview) {
      return res.status(400).json({
        success: false,
        error: `Reviewer does not have permission to review questions for scope: ${target_scope}`
      });
    }

    // 提交审核（使用新的方法）
    const updatedQuestion = await QuestionBank.submitForReviewWithScope(
      id,
      reviewer_id,
      target_scope
    );

    res.json({
      success: true,
      data: updatedQuestion,
      message: `Question submitted for review to ${target_scope}`
    });
  } catch (error) {
    console.error('Error submitting for review:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取待我审核的题目列表
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const pendingQuestions = await QuestionBank.getPendingReviews(req.user.id);
    res.json({ success: true, data: pendingQuestions });
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
      reviewedQuestion = await QuestionBank.reviewQuestion(
        id,
        req.user.id,
        status,
        comment || ''
      );

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
        message: status === 'approved' ? 'Question approved' : 'Question rejected'
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
