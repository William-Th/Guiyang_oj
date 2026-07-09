const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const WrongQuestion = require('../models/WrongQuestion');
const QuestionBank = require('../models/QuestionBank');

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

// 客观题本地判题（编程/问答题返回 null 表示不支持自动判题）
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
 * 错题统计（按科目分组 + 按状态分组）
 * GET /api/wrong-questions/stats
 * 返回 total/bySubject（活跃错题，供科目筛选）/ byStatus（各状态计数，供 Tab badge）
 */
router.get('/stats', authMiddleware, studentOnly, async (req, res) => {
  try {
    const { query } = require('../database/connection');
    const { subject } = req.query;
    // 选了科目时，byStatus/bySubject 只统计该科目（Tab badge 随科目筛选变化）
    const params = [req.user.id];
    let subjectCond = '';
    if (subject) {
      params.push(subject);
      subjectCond = ` AND subject = $${params.length}`;
    }
    const [subjectResult, statusResult] = await Promise.all([
      query(
        `SELECT subject, COUNT(*) AS count
         FROM student_wrong_questions
         WHERE student_id = $1${subjectCond} AND status = 'active'
         GROUP BY subject ORDER BY count DESC`,
        params
      ),
      query(
        `SELECT status, COUNT(*) AS count
         FROM student_wrong_questions
         WHERE student_id = $1${subjectCond}
         GROUP BY status`,
        params
      )
    ]);
    const totalCount = subjectResult.rows.reduce((s, r) => s + parseInt(r.count, 10), 0);
    const byStatus = { active: 0, mastered: 0, removed: 0 };
    statusResult.rows.forEach((r) => {
      byStatus[r.status] = parseInt(r.count, 10);
    });
    res.json({
      success: true,
      data: {
        total: totalCount,
        bySubject: subjectResult.rows,
        byStatus
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

/**
 * 错题重做判题（客观题本地判对 → redo 积分 + 重做计数）
 * POST /api/wrong-questions/:questionId/redo  body: { answer }
 */
router.post('/:questionId/redo', authMiddleware, studentOnly, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answer } = req.body;
    if (answer == null) {
      return res.status(400).json({ success: false, error: 'answer 必填' });
    }

    const question = await QuestionBank.findById(parseInt(questionId, 10));
    if (!question) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }

    const wq = await WrongQuestion.findByStudentAndQuestion(req.user.id, parseInt(questionId, 10));
    // active 可重做；mastered 允许重新练习（答错由 addIfWrong 重置为 active，回到活跃 Tab）；removed 拒绝
    if (!wq || wq.status === 'removed') {
      return res.status(400).json({ success: false, error: '该题已移除，无法重做' });
    }

    const correct = judgeObjective(question.type, answer, question.correct_answer);
    if (correct === null) {
      return res.status(400).json({
        success: false,
        error: '该题型（编程/问答/匹配）不支持错题重做自动判题'
      });
    }

    let awarded = 0;
    let streak = null;
    if (correct) {
      const PointsPolicy = require('../services/points/PointsPolicy');
      const policy = await PointsPolicy.load();
      const redoMax = policy.wrong_redo_max != null ? policy.wrong_redo_max : 2;
      // 重做次数未达上限才发分
      if ((wq.review_count || 0) < redoMax) {
        const award = await PointsPolicy.awardForCorrectAnswer(req.user.id, {
          difficulty: question.difficulty,
          isRedo: true,
          sourceType: 'wrong_redo',
          description: '错题重做奖励'
        });
        awarded = award.awarded;
      }
      await WrongQuestion.incReviewCount(req.user.id, parseInt(questionId, 10));
      // 答对即掌握：自动移出错题集（后续若再次答错，addIfWrong 会重新置为 active）
      await WrongQuestion.markMastered(req.user.id, parseInt(questionId, 10));
    } else {
      // 答错：重新激活错题（error_count+1，status→active），已掌握的题回到活跃 Tab
      try {
        await WrongQuestion.addIfWrong({
          studentId: req.user.id,
          questionId: parseInt(questionId, 10),
          draftId: wq.draft_id || null,
          subject: wq.subject || null,
          knowledgePoints: wq.knowledge_points || [],
          difficulty: wq.difficulty || null,
          sourceActivityId: null
        });
      } catch (e) {
        console.error('reactivate wrong question failed:', e.message);
      }
    }

    // D2 连胜：无论对错都更新（错则归零）
    try {
      const StreakService = require('../services/streak/StreakService');
      streak = await StreakService.recordResult(req.user.id, correct);
    } catch (e) {
      console.error('update streak failed:', e.message);
    }

    res.json({
      success: true,
      data: {
        correct,
        awarded,
        streak,
        correct_answer: correct ? undefined : question.correct_answer
      },
      message: correct
        ? `回答正确，已掌握并移出错题集${awarded ? `，获得积分 ${awarded}` : ''}`
        : '回答错误，再接再厉'
    });
  } catch (error) {
    console.error('Error redo wrong question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
