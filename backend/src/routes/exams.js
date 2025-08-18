const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const { authMiddleware, requireRole, optionalAuth } = require('../middleware/auth');
const Exam = require('../models/Exam');
const StudentExam = require('../models/StudentExam');
const Answer = require('../models/Answer');
const logger = require('../utils/logger');

// Get all available exams
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { subject, grade, status } = req.query;
    const filters = {};
    
    if (subject) filters.subject = subject;
    if (grade) filters.grade = grade;
    if (status) filters.status = status;
    
    // If user is a student, get available exams for them
    if (req.user && req.user.role === 'student') {
      const exams = await Exam.getAvailableForStudent(req.user.id);
      return res.json({ exams });
    }
    
    // For teachers and admins, get all exams
    const exams = await Exam.findAll(filters);
    res.json({ exams });
  } catch (error) {
    logger.error('Get exams error:', error);
    res.status(500).json({ message: '获取考试列表失败' });
  }
});

// Get exam details
router.get('/:id', [
  param('id').isInt().withMessage('Invalid exam ID')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);
    
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    
    res.json({ exam });
  } catch (error) {
    logger.error('Get exam details error:', error);
    res.status(500).json({ message: '获取考试详情失败' });
  }
});

// Get exam with questions (for taking exam)
router.get('/:id/questions', [
  param('id').isInt().withMessage('Invalid exam ID'),
  authMiddleware,
  requireRole(['student', 'teacher', 'admin'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    const exam = await Exam.findByIdWithQuestions(id);
    
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    
    // Remove correct answers for students
    if (req.user.role === 'student') {
      exam.questions = exam.questions.map(q => {
        const { correct_answer: _correct, explanation: _exp, ...question } = q;
        return question;
      });
    }
    
    res.json({ exam });
  } catch (error) {
    logger.error('Get exam questions error:', error);
    res.status(500).json({ message: '获取考试题目失败' });
  }
});

// Create new exam (admin/teacher only)
router.post('/', [
  authMiddleware,
  requireRole(['admin', 'teacher']),
  body('title').notEmpty().withMessage('考试标题不能为空'),
  body('subject').notEmpty().withMessage('考试科目不能为空'),
  body('grade').notEmpty().withMessage('年级不能为空'),
  body('duration').isInt({ min: 1 }).withMessage('考试时长必须大于0'),
  body('totalScore').isInt({ min: 1 }).withMessage('总分必须大于0'),
  body('passScore').isInt({ min: 0 }).withMessage('及格分不能为负数')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const examData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    const exam = await Exam.create(examData);
    
    logger.info('New exam created', { 
      examId: exam.id, 
      title: exam.title, 
      createdBy: req.user.id 
    });
    
    res.status(201).json({ 
      message: '考试创建成功',
      exam 
    });
  } catch (error) {
    logger.error('Create exam error:', error);
    res.status(500).json({ message: '创建考试失败' });
  }
});

// Start exam session
router.post('/:id/start', [
  param('id').isInt().withMessage('Invalid exam ID'),
  authMiddleware,
  requireRole(['student'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);
    
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    
    if (exam.status !== 'ongoing' && exam.status !== 'published') {
      return res.status(400).json({ message: '考试尚未开始或已结束' });
    }
    
    // Check if student is registered for this exam
    const existingRecord = await StudentExam.findByStudentAndExam(req.user.id, id);
    
    if (!existingRecord) {
      return res.status(400).json({ message: '请先报名参加此考试' });
    }
    
    if (existingRecord.status === 'submitted') {
      return res.status(400).json({ message: '您已完成此考试' });
    }
    
    if (existingRecord.status === 'in_progress') {
      return res.status(400).json({ message: '考试已在进行中' });
    }
    
    // Start the exam
    const ipAddress = req.ip || req.connection.remoteAddress;
    const startedExam = await StudentExam.start(req.user.id, id, ipAddress);
    
    if (!startedExam) {
      return res.status(400).json({ message: '无法开始考试，请检查考试状态' });
    }
    
    logger.info('Student started exam', { 
      studentId: req.user.id, 
      examId: id,
      startTime: startedExam.start_time
    });
    
    res.json({ 
      message: '考试开始',
      examId: id,
      studentExamId: startedExam.id,
      startTime: startedExam.start_time,
      duration: exam.duration
    });
  } catch (error) {
    logger.error('Start exam error:', error);
    res.status(500).json({ message: '开始考试失败' });
  }
});

// Submit exam
router.post('/:id/submit', [
  param('id').isInt().withMessage('Invalid exam ID'),
  authMiddleware,
  requireRole(['student']),
  body('answers').isArray().withMessage('答案必须是数组格式'),
  body('answers.*.questionId').isInt().withMessage('问题ID必须是整数'),
  body('answers.*.answer').notEmpty().withMessage('答案不能为空')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    const { answers } = req.body;
    
    // Check if student has an in-progress exam
    const studentExam = await StudentExam.findByStudentAndExam(req.user.id, id);
    
    if (!studentExam) {
      return res.status(400).json({ message: '考试记录不存在' });
    }
    
    if (studentExam.status !== 'in_progress') {
      return res.status(400).json({ message: '考试未在进行中或已提交' });
    }
    
    // Save answers
    const savedAnswers = await Answer.saveAnswers(studentExam.id, answers);
    
    // Grade automatic questions (single/multiple choice)
    const gradedAnswers = await Answer.gradeAnswers(studentExam.id);
    
    // Calculate total score
    const totalScore = await Answer.calculateTotalScore(studentExam.id);
    
    // Submit the exam
    const submittedExam = await StudentExam.submit(req.user.id, id, totalScore);
    
    if (!submittedExam) {
      return res.status(400).json({ message: '提交考试失败' });
    }
    
    logger.info('Student submitted exam', { 
      studentId: req.user.id, 
      examId: id,
      score: totalScore,
      submitTime: submittedExam.submit_time
    });
    
    res.json({ 
      message: '考试提交成功',
      examId: id,
      score: totalScore,
      submittedAt: submittedExam.submit_time,
      answersProcessed: savedAnswers.length,
      autoGradedAnswers: gradedAnswers.filter(a => a.score !== null).length
    });
  } catch (error) {
    logger.error('Submit exam error:', error);
    res.status(500).json({ message: '提交考试失败' });
  }
});

// Register for exam
router.post('/:id/register', [
  param('id').isInt().withMessage('Invalid exam ID'),
  authMiddleware,
  requireRole(['student'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);
    
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    
    if (exam.status !== 'published') {
      return res.status(400).json({ message: '考试尚未发布或已结束' });
    }
    
    // Check if student is already registered
    const existingRecord = await StudentExam.findByStudentAndExam(req.user.id, id);
    
    if (existingRecord) {
      return res.status(400).json({ message: '您已报名此考试' });
    }
    
    // Register student for exam
    const registration = await StudentExam.register(req.user.id, id);
    
    logger.info('Student registered for exam', { 
      studentId: req.user.id, 
      examId: id,
      registrationId: registration.id
    });
    
    res.json({ 
      message: '报名成功',
      examId: id,
      registrationId: registration.id,
      status: registration.status,
      registeredAt: registration.created_at
    });
  } catch (error) {
    logger.error('Register exam error:', error);
    res.status(500).json({ message: '报名失败' });
  }
});

module.exports = router;