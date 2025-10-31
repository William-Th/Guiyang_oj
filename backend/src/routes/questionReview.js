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

// 获取可以审核的老师列表
router.get('/available-reviewers', authMiddleware, async (req, res) => {
  try {
    const { subject, scope } = req.query;

    if (!subject) {
      return res.status(400).json({ success: false, error: 'Subject is required' });
    }

    // 根据scope确定需要的权限类型
    let permissionType = 'question_bank_review';
    if (scope === 'assessment') {
      permissionType = 'assessment_review';
    } else if (scope === 'competition') {
      permissionType = 'competition_review';
    }

    const reviewers = await TeacherPermission.getUsersByPermission(permissionType, subject);

    // 过滤掉自己
    const filteredReviewers = reviewers.filter(r => r.id !== req.user.id);

    res.json({ success: true, data: filteredReviewers });
  } catch (error) {
    console.error('Error fetching reviewers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 提交题目审核
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewer_id, scope } = req.body;

    if (!reviewer_id || !scope || !Array.isArray(scope) || scope.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Reviewer ID and scope are required'
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

    // 验证审核人权限
    const scopeTypes = scope.map(s => {
      if (s === 'practice') return 'question_bank_review';
      if (s === 'assessment') return 'assessment_review';
      if (s === 'competition') return 'competition_review';
      return null;
    }).filter(Boolean);

    for (const permType of scopeTypes) {
      const hasPermission = await TeacherPermission.hasPermission(
        reviewer_id,
        permType,
        question.subject
      );

      if (!hasPermission) {
        return res.status(400).json({
          success: false,
          error: `Reviewer does not have ${permType} permission for ${question.subject}`
        });
      }
    }

    // 提交审核
    const updatedQuestion = await QuestionBank.submitForReview(id, reviewer_id, scope);

    res.json({ success: true, data: updatedQuestion });
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

// 审核题目（批准/拒绝）
router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

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

    // 审核题目
    const reviewedQuestion = await QuestionBank.reviewQuestion(
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

    // 如果批准，自动发布题目
    if (status === 'approved') {
      await QuestionBank.publishQuestion(id, req.user.id);
    }

    res.json({ success: true, data: reviewedQuestion });
  } catch (error) {
    console.error('Error reviewing question:', error);
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
