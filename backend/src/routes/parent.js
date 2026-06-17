const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const ParentGuard = require('../models/ParentGuard');
const WrongQuestion = require('../models/WrongQuestion');
const { query } = require('../database/connection');

/**
 * 家长端（E4）
 * 只读看孩子数据/练习，可代报名测评，不能修改。
 * 家长只能访问 parent_student_relations 中关联的孩子。
 */

function parentOnly(req, res, next) {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ success: false, error: '仅家长可访问' });
  }
  next();
}

// 校验家长与孩子关联，并把 studentId 挂到 req
async function guardianCheck(req, res, next) {
  const studentId = parseInt(req.params.studentId, 10);
  if (!studentId) {
    return res.status(400).json({ success: false, error: 'studentId 无效' });
  }
  const ok = await ParentGuard.isGuardian(req.user.id, studentId);
  if (!ok) {
    return res.status(403).json({ success: false, error: '该学生未与您建立家长关联' });
  }
  req.studentId = studentId;
  next();
}

router.use(authMiddleware, parentOnly);

/**
 * 我的孩子列表
 * GET /api/parent/children
 */
router.get('/children', async (req, res) => {
  try {
    const children = await ParentGuard.getChildren(req.user.id);
    res.json({ success: true, data: children });
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 孩子基本信息
 * GET /api/parent/children/:studentId/profile
 */
router.get('/children/:studentId/profile', guardianCheck, async (req, res) => {
  try {
    const r = await query(
      `SELECT u.id, u.username, u.real_name, u.phone,
              s.grade, s.class, s.student_no
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.studentId]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (error) {
    console.error('Error fetching child profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 孩子成绩（活动成绩列表）
 * GET /api/parent/children/:studentId/results
 */
router.get('/children/:studentId/results', guardianCheck, async (req, res) => {
  try {
    const r = await query(
      `SELECT act.id AS activity_id, act.title, act.subject, act.type,
              sa.score, sa.status, sa.submit_time
       FROM student_activities sa
       JOIN activities act ON sa.activity_id = act.id
       WHERE sa.student_id = $1
       ORDER BY sa.submit_time DESC NULLS LAST`,
      [req.studentId]
    );
    res.json({ success: true, data: r.rows });
  } catch (error) {
    console.error('Error fetching child results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 孩子错题集
 * GET /api/parent/children/:studentId/wrong-questions
 */
router.get('/children/:studentId/wrong-questions', guardianCheck, async (req, res) => {
  try {
    const { subject, limit = 50 } = req.query;
    const list = await WrongQuestion.listByStudent(req.studentId, {
      subject,
      limit: Math.min(parseInt(limit, 10) || 50, 100)
    });
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error fetching child wrong questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 孩子学习统计（按科目）
 * GET /api/parent/children/:studentId/stats
 */
router.get('/children/:studentId/stats', guardianCheck, async (req, res) => {
  try {
    const r = await query(
      `SELECT subject,
              COALESCE(SUM(total_questions), 0) AS total_questions,
              COALESCE(SUM(correct_count), 0) AS correct_count,
              CASE WHEN SUM(total_questions) > 0
                THEN ROUND(SUM(correct_count)::numeric / SUM(total_questions), 4)
                ELSE 0 END AS accuracy_rate
       FROM v_student_knowledge_realtime
       WHERE student_id = $1
       GROUP BY subject ORDER BY subject`,
      [req.studentId]
    );
    res.json({ success: true, data: r.rows });
  } catch (error) {
    console.error('Error fetching child stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 代孩子报名测评
 * POST /api/parent/children/:studentId/register/:activityId
 */
router.post('/children/:studentId/register/:activityId', guardianCheck, async (req, res) => {
  try {
    const activityId = parseInt(req.params.activityId, 10);
    const AssessmentRegistration = require('../models/AssessmentRegistration');

    const exist = await AssessmentRegistration.findByActivityAndStudent(activityId, req.studentId);
    if (exist) {
      return res.status(400).json({ success: false, error: '孩子已报名该测评' });
    }
    const reg = await AssessmentRegistration.create({
      activity_id: activityId,
      student_id: req.studentId,
      status: 'pending'
    });
    res.status(201).json({ success: true, data: reg, message: '已代孩子报名' });
  } catch (error) {
    console.error('Error registering for child:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
