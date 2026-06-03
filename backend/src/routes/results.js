const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../database/connection');
const StudentExam = require('../models/StudentExam');
const Answer = require('../models/Answer');
const Activity = require('../models/Activity');

// Get exam results for a student
router.get('/student/:studentId', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify user can access this data
    if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== parseInt(studentId)) {
      return res.status(403).json({ message: '没有权限访问此数据' });
    }

    const results = await StudentExam.getStudentExamHistory(studentId);
    res.json({ results });
  } catch (error) {
    console.error('Get student results error:', error);
    res.status(500).json({ message: '获取学生成绩失败' });
  }
});

// Get exam results with detailed answers
router.get('/exam/:examId', authMiddleware, async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    // Get student exam record
    const studentExam = await StudentExam.findByStudentAndExam(studentId, examId);
    if (!studentExam) {
      return res.status(404).json({ message: '未找到考试记录' });
    }

    // Only allow viewing results if exam is submitted
    if (studentExam.status !== 'submitted' && studentExam.status !== 'graded') {
      return res.status(400).json({ message: '考试尚未提交' });
    }

    // Get activity details
    const exam = await Activity.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: '活动不存在' });
    }

    // Get answers with question details
    const answers = await Answer.getAnswersByStudentExam(studentExam.id);

    // Calculate statistics
    const correctAnswers = answers.filter(a => a.is_correct === true).length;
    const wrongAnswers = answers.filter(a => a.is_correct === false).length;
    const blankAnswers = answers.filter(a => a.is_correct === null).length;

    res.json({
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        grade: exam.grade,
        duration: exam.duration,
        totalScore: exam.total_score,
        passScore: exam.pass_score
      },
      result: {
        score: studentExam.score,
        rank: studentExam.rank,
        status: studentExam.status,
        startTime: studentExam.start_time,
        submitTime: studentExam.submit_time,
        totalQuestions: answers.length,
        correctAnswers,
        wrongAnswers,
        blankAnswers
      },
      answers: answers.map(a => ({
        questionId: a.question_id,
        questionType: a.question_type,
        questionContent: a.question_content,
        yourAnswer: a.answer,
        correctAnswer: a.correct_answer,
        isCorrect: a.is_correct,
        score: a.score,
        explanation: a.explanation
      }))
    });
  } catch (error) {
    console.error('Get exam results error:', error);
    res.status(500).json({ message: '获取考试成绩失败' });
  }
});

// Get statistics for an exam
router.get('/exam/:examId/statistics', authMiddleware, async (req, res) => {
  try {
    const { examId } = req.params;

    // 获取活动的统计信息
    const statsResult = await query(`
      SELECT
        COUNT(*) as total_participants,
        AVG(sa.score) as avg_score,
        MAX(sa.score) as max_score,
        MIN(sa.score) as min_score,
        COUNT(*) FILTER (WHERE sa.score >= a.total_score * 0.9) as excellent_count,
        COUNT(*) FILTER (WHERE sa.score >= a.total_score * 0.6) as pass_count
      FROM student_activities sa
      JOIN activities a ON sa.activity_id = a.id
      WHERE sa.activity_id = $1 AND sa.status = 'completed'
    `, [examId]);

    const stats = statsResult.rows[0];
    res.json({
      success: true,
      data: {
        totalParticipants: parseInt(stats.total_participants) || 0,
        avgScore: parseFloat(stats.avg_score) || 0,
        maxScore: parseFloat(stats.max_score) || 0,
        minScore: parseFloat(stats.min_score) || 0,
        excellentCount: parseInt(stats.excellent_count) || 0,
        passCount: parseInt(stats.pass_count) || 0
      }
    });
  } catch (error) {
    console.error('Get exam statistics error:', error);
    res.status(500).json({ message: '获取考试统计失败' });
  }
});

// Get available certificates for student
router.get('/certificates/available', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // 查询学生已获得证书的活动（已完成且分数达标）
    const result = await query(`
      SELECT
        c.id,
        c.exam_id AS "examId",
        a.title AS "examName",
        a.subject,
        sa.score,
        c.level,
        c.cert_no AS "certificateNumber",
        c.issue_date AS "issueDate",
        CASE WHEN c.id IS NOT NULL THEN true ELSE false END AS "canApply"
      FROM student_activities sa
      JOIN activities a ON sa.activity_id = a.id
      LEFT JOIN certificates c ON c.exam_id = a.id AND c.student_id = (
        SELECT s.id FROM students s WHERE s.user_id = $1
      )
      JOIN students s ON s.user_id = $1
      WHERE sa.student_id = s.id
        AND sa.status = 'completed'
        AND a.is_official = true
        AND sa.score >= a.total_score * 0.6
      ORDER BY sa.submit_time DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting available certificates:', error);
    res.status(500).json({ error: '获取可用证书失败' });
  }
});

// Apply for certificate
router.post('/certificate', authMiddleware, async (req, res) => {
  try {
    const { examId } = req.body;
    const userId = req.user.id;

    if (!examId) {
      return res.status(400).json({ error: 'examId is required' });
    }

    // 获取学生信息
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: '学生记录不存在' });
    }
    const studentId = studentResult.rows[0].id;

    // 检查是否已有证书
    const existingCert = await query(
      'SELECT id FROM certificates WHERE student_id = $1 AND exam_id = $2',
      [studentId, examId]
    );
    if (existingCert.rows.length > 0) {
      return res.status(400).json({ error: '证书已存在' });
    }

    // 检查学生是否有资格获得证书（已完成且分数达标）
    const eligibility = await query(`
      SELECT sa.score, a.total_score, a.title
      FROM student_activities sa
      JOIN activities a ON sa.activity_id = a.id
      WHERE sa.student_id = $1 AND sa.activity_id = $2 AND sa.status = 'completed'
    `, [studentId, examId]);

    if (eligibility.rows.length === 0) {
      return res.status(400).json({ error: '未完成该测评，无法申请证书' });
    }

    const { score, total_score, title } = eligibility.rows[0];
    if (score < total_score * 0.6) {
      return res.status(400).json({ error: '成绩未达标，无法申请证书' });
    }

    // 确定证书等级
    const percentage = score / total_score;
    let level = 'pass';
    if (percentage >= 0.9) level = 'excellent';
    else if (percentage >= 0.8) level = 'good';

    // 生成证书编号
    const certNo = `CERT-${Date.now()}-${studentId}`;

    // 创建证书记录
    const certResult = await query(`
      INSERT INTO certificates (student_id, exam_id, cert_no, issue_date, level)
      VALUES ($1, $2, $3, CURRENT_DATE, $4)
      RETURNING id, cert_no, issue_date, level
    `, [studentId, examId, certNo, level]);

    res.json({
      success: true,
      message: '证书申请成功',
      certificate: {
        id: certResult.rows[0].id,
        examId: examId,
        examName: title,
        studentId: studentId,
        certificateNumber: certResult.rows[0].cert_no,
        issueDate: certResult.rows[0].issue_date,
        level: certResult.rows[0].level,
        score: score
      }
    });
  } catch (error) {
    console.error('Error applying for certificate:', error);
    res.status(500).json({ error: '申请证书失败' });
  }
});

// Download certificate as PDF
router.get('/certificate/:examId/download', authMiddleware, async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.id;

    // 查询证书+学生+活动信息
    const certResult = await query(`
      SELECT
        c.cert_no,
        c.issue_date,
        c.level,
        c.exam_id,
        a.title AS exam_name,
        u.real_name AS student_name,
        sa.score
      FROM certificates c
      JOIN activities a ON c.exam_id = a.id
      JOIN students s ON c.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN student_activities sa ON sa.student_id = s.id AND sa.activity_id = a.id
      WHERE c.exam_id = $1 AND s.user_id = $2
    `, [examId, userId]);

    if (certResult.rows.length === 0) {
      return res.status(404).json({ error: '证书不存在' });
    }

    const cert = certResult.rows[0];

    // 使用 PDFKit 动态生成 PDF
    const pdfService = require('../services/pdfCertificateService');
    const pdfBuffer = await pdfService.generatePDFBuffer({
      certNumber: cert.cert_no,
      studentName: cert.student_name || '学生',
      examName: cert.exam_name || '测评活动',
      score: cert.score || 0,
      issueDate: cert.issue_date || new Date()
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${cert.cert_no}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ error: '下载证书失败' });
  }
});

// Export results
router.get('/export/:examId', authMiddleware, async (req, res) => {
  try {
    const { examId } = req.params;

    // 查询该活动的所有学生成绩
    const result = await query(`
      SELECT
        u.real_name AS student_name,
        u.username,
        a.title AS activity_title,
        sa.score,
        a.total_score,
        sa.status,
        sa.submit_time
      FROM student_activities sa
      JOIN students s ON sa.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN activities a ON sa.activity_id = a.id
      WHERE sa.activity_id = $1
      ORDER BY sa.score DESC
    `, [examId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Export results error:', error);
    res.status(500).json({ message: '导出成绩失败' });
  }
});

module.exports = router;