const express = require('express');
const router = express.Router();

/**
 * 废弃路由 - 题目功能已迁移到 questionBank.js 和 questionDrafts.js
 * 保留此文件仅为了向后兼容，所有端点返回 410 Gone
 */

// 所有题目相关功能请使用：
// - /api/question-bank - 题库管理
// - /api/question-drafts - 题目草稿管理
// - /api/question-review - 题目审核
router.all('*', (req, res) => {
  res.status(410).json({
    message: '此接口已废弃，请使用 /api/question-bank 或 /api/question-drafts',
    deprecated: true,
    alternatives: {
      questionBank: '/api/question-bank',
      questionDrafts: '/api/question-drafts',
      questionReview: '/api/question-review'
    }
  });
});

module.exports = router;
