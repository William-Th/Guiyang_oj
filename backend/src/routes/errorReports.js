const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const ErrorReport = require('../models/ErrorReport');
const QuestionBank = require('../models/QuestionBank');

/**
 * 题目纠错流程（C5）
 * 学生提交 → 出题人/审核人处理；累计 3 次提醒上级，5 次封顶。
 */

/**
 * 学生提交纠错
 * POST /api/error-reports
 * body: { questionId, errorType, errorDescription }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, error: '仅学生可提交纠错' });
    }
    const { questionId, errorType, errorDescription } = req.body;
    if (!questionId || !errorType || !errorDescription?.trim()) {
      return res.status(400).json({ success: false, error: 'questionId/errorType/errorDescription 必填' });
    }

    const question = await QuestionBank.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }

    const result = await ErrorReport.create({
      questionId,
      draftId: question.draft_id,
      reporterId: req.user.id,
      errorType,
      errorDescription: errorDescription.trim()
    });

    // 累计达阈值提醒区级（阶段二先记录，通知系统接入后续完善）
    if (result.notifySuperior) {
      console.warn(`[C5] 题目 ${questionId} 累计纠错 ${result.totalReports} 次，需上级管理员关注`);
    }

    res.status(201).json({
      success: true,
      data: result.report,
      meta: { totalReports: result.totalReports, frozen: result.frozen },
      message: result.frozen
        ? '纠错已提交，该题累计纠错已达上限，将通知出题人修订'
        : '纠错已提交，等待出题人/审核人处理'
    });
  } catch (error) {
    console.error('Error creating error report:', error);
    const status = error.message.includes('上限') ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * 纠错列表（出题人/审核人/管理员）
 * GET /api/error-reports?status=&questionId=
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, questionId, limit = 20, offset = 0 } = req.query;
    const list = await ErrorReport.list({
      status,
      questionId: questionId ? parseInt(questionId, 10) : null,
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      offset: parseInt(offset, 10) || 0
    });
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error listing error reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 处理纠错（出题人/审核人/管理员）
 * POST /api/error-reports/:id/handle
 * body: { action: accepted|rejected, comment }
 */
router.post('/:id/handle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body;
    if (!['accepted', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action 必须为 accepted 或 rejected' });
    }
    if (action === 'rejected' && !comment?.trim()) {
      return res.status(400).json({ success: false, error: '拒绝时必须填写处理意见' });
    }

    // 查纠错记录对应题目做权限校验
    const report = await ErrorReport.findById(parseInt(id, 10));
    if (!report) {
      return res.status(404).json({ success: false, error: '纠错记录不存在' });
    }
    const question = await QuestionBank.findById(report.question_id);
    if (!ErrorReport.canHandle(question, req.user)) {
      return res.status(403).json({ success: false, error: '无权处理该纠错' });
    }

    const updated = await ErrorReport.handle(parseInt(id, 10), req.user.id, action, comment);
    if (!updated) {
      return res.status(400).json({ success: false, error: '该纠错已处理' });
    }
    res.json({
      success: true,
      data: updated,
      message: action === 'accepted' ? '纠错成立，已记录' : '纠错已驳回'
    });
  } catch (error) {
    console.error('Error handling error report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
