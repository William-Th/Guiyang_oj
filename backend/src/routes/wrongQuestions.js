const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const WrongQuestion = require('../models/WrongQuestion');

/**
 * 错题集（D4）
 * 答错自动入库已在 studentActivities 提交判题流程接入；
 * 本路由提供：列表、统计、标记掌握、移除。
 * 注：错题重做判题随阶段三（碎片化练习统一入口）实现。
 */

// 仅学生可访问自己的错题
function studentOnly(req, res, next) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, error: '仅学生可访问错题集' });
  }
  next();
}

/**
 * 错题列表（按科目筛选，分页）
 * GET /api/wrong-questions?subject=&status=&page=1&limit=20
 */
router.get('/', authMiddleware, studentOnly, async (req, res) => {
  try {
    const { subject, status, page = 1, limit = 20 } = req.query;
    const filters = {
      subject,
      status,
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      offset: ((parseInt(page, 10) || 1) - 1) * (parseInt(limit, 10) || 20)
    };
    const [list, total] = await Promise.all([
      WrongQuestion.listByStudent(req.user.id, filters),
      WrongQuestion.countByStudent(req.user.id, { subject, status })
    ]);
    res.json({
      success: true,
      data: list,
      meta: {
        total,
        page: parseInt(page, 10) || 1,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching wrong questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 错题统计（按科目分组）
 * GET /api/wrong-questions/stats
 */
router.get('/stats', authMiddleware, studentOnly, async (req, res) => {
  try {
    const { query } = require('../database/connection');
    const result = await query(
      `SELECT subject, COUNT(*) AS count
       FROM student_wrong_questions
       WHERE student_id = $1 AND status = 'active'
       GROUP BY subject ORDER BY count DESC`,
      [req.user.id]
    );
    const totalCount = result.rows.reduce((s, r) => s + parseInt(r.count, 10), 0);
    res.json({
      success: true,
      data: {
        total: totalCount,
        bySubject: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching wrong question stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 标记错题为已掌握
 * POST /api/wrong-questions/:questionId/mastered
 */
router.post('/:questionId/mastered', authMiddleware, studentOnly, async (req, res) => {
  try {
    const { questionId } = req.params;
    const updated = await WrongQuestion.markMastered(req.user.id, parseInt(questionId, 10));
    if (!updated) {
      return res.status(404).json({ success: false, error: '错题不存在' });
    }
    res.json({ success: true, data: updated, message: '已标记为掌握' });
  } catch (error) {
    console.error('Error mastering wrong question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 移除错题
 * DELETE /api/wrong-questions/:questionId
 */
router.delete('/:questionId', authMiddleware, studentOnly, async (req, res) => {
  try {
    const { questionId } = req.params;
    const updated = await WrongQuestion.remove(req.user.id, parseInt(questionId, 10));
    if (!updated) {
      return res.status(404).json({ success: false, error: '错题不存在' });
    }
    res.json({ success: true, message: '已移出错题集' });
  } catch (error) {
    console.error('Error removing wrong question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
