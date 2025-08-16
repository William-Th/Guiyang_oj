const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const { authMiddleware, requireRole, optionalAuth } = require('../middleware/auth');
const Exam = require('../models/Exam');
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
        const { correct_answer, explanation, ...question } = q;
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
    
    // TODO: Create student_exam record and return exam session
    // This is a placeholder response
    res.json({ 
      message: '考试开始',
      examId: id,
      startTime: new Date(),
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
  body('answers').isArray().withMessage('答案必须是数组格式')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    const { answers } = req.body;
    
    // TODO: Process answers and calculate score
    // This is a placeholder response
    res.json({ 
      message: '考试提交成功',
      examId: id,
      score: 85,
      submittedAt: new Date()
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
    
    // TODO: Create student exam registration record
    res.json({ 
      message: '报名成功',
      examId: id
    });
  } catch (error) {
    logger.error('Register exam error:', error);
    res.status(500).json({ message: '报名失败' });
  }
});

module.exports = router;