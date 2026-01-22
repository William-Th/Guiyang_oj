const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const StudentExam = require('../models/StudentExam');
const Answer = require('../models/Answer');
const Activity = require('../models/Activity');
// const path = require('path');
// const fs = require('fs').promises;

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
router.get('/exam/:examId/statistics', (req, res) => {
  // TODO: Implement get exam statistics
  res.json({ message: 'Get exam statistics endpoint', examId: req.params.examId });
});

// Get available certificates for student
router.get('/certificates/available', (req, res) => {
  try {
    // Mock data - simulate available certificates based on exam performance
    const availableCertificates = [
      {
        examId: 1,
        examName: '2024年春季语文期中考试',
        subject: '语文',
        score: 85,
        level: 'good',
        canApply: true
      },
      {
        examId: 2,
        examName: '2024年春季数学期中考试',
        subject: '数学',
        score: 92,
        level: 'excellent',
        canApply: true
      }
    ];

    // Filter certificates that meet the criteria (e.g., score >= 80)
    const eligibleCertificates = availableCertificates.filter(cert => cert.score >= 80);

    res.json(eligibleCertificates);
  } catch (error) {
    console.error('Error getting available certificates:', error);
    res.status(500).json({ error: '获取可用证书失败' });
  }
});

// Apply for certificate
router.post('/certificate', (req, res) => {
  try {
    const { examId } = req.body;

    if (!examId) {
      return res.status(400).json({ error: 'examId is required' });
    }

    // Mock certificate application - in real implementation, would:
    // 1. Verify student eligibility
    // 2. Check if certificate already exists
    // 3. Generate certificate record in database
    // 4. Queue certificate generation

    const certificateData = {
      id: Date.now(),
      examId: examId,
      studentId: req.user?.id || 1, // Assuming auth middleware sets req.user
      appliedAt: new Date().toISOString(),
      status: 'approved',
      certificateNumber: `CERT-${Date.now()}`,
      issueDate: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Certificate application successful',
      certificate: certificateData
    });
  } catch (error) {
    console.error('Error applying for certificate:', error);
    res.status(500).json({ error: '申请证书失败' });
  }
});

// Download certificate
router.get('/certificate/:examId/download', async (req, res) => {
  try {
    const { examId } = req.params;

    // Mock certificate download - generate a simple PDF-like response
    // In real implementation, would:
    // 1. Verify certificate exists and belongs to user
    // 2. Generate/retrieve actual PDF certificate
    // 3. Return the PDF file

    // For demo purposes, create a mock PDF content
    const mockCertificateContent = generateMockCertificate(examId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${examId}.pdf"`);
    res.setHeader('Content-Length', Buffer.byteLength(mockCertificateContent));
    
    res.send(Buffer.from(mockCertificateContent));
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ error: '下载证书失败' });
  }
});

// Helper function to generate mock certificate content
function generateMockCertificate(examId) {
  // This is a mock implementation - in real world, you'd use a PDF library
  // like puppeteer, jsPDF, or PDFKit to generate actual PDF certificates
  const examNames = {
    1: '2024年春季语文期中考试',
    2: '2024年春季数学期中考试'
  };

  const mockPDFContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 24 Tf
100 700 Td
(Certificate of Excellence) Tj
0 -50 Td
/F1 16 Tf
(This certifies that) Tj
0 -30 Td
(Student Name) Tj
0 -30 Td
(has successfully completed) Tj
0 -30 Td
(${examNames[examId] || 'Unknown Exam'}) Tj
0 -50 Td
(Date: ${new Date().toLocaleDateString('zh-CN')}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000526 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
625
%%EOF`;

  return mockPDFContent;
}

// Export results
router.get('/export/:examId', (req, res) => {
  // TODO: Implement export results
  res.json({ message: 'Export results endpoint', examId: req.params.examId });
});

module.exports = router;