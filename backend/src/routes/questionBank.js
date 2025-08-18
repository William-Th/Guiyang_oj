const express = require('express');
const router = express.Router();
const QuestionBank = require('../models/QuestionBank');
const QuestionCategory = require('../models/QuestionCategory');
const ImportLog = require('../models/ImportLog');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// Get all questions from the bank
router.get('/bank', authMiddleware, async (req, res) => {
  try {
    const filters = {
      subject: req.query.subject,
      grade: req.query.grade,
      difficulty: req.query.difficulty,
      type: req.query.type,
      category_id: req.query.category_id,
      tags: req.query.tags ? req.query.tags.split(',') : null,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const questions = await QuestionBank.findAll(filters);
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search questions
router.get('/bank/search', authMiddleware, async (req, res) => {
  try {
    const { q, subject, grade } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search term required' });
    }

    const questions = await QuestionBank.searchQuestions(q, { subject, grade });
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error searching questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a single question
router.get('/bank/:id', authMiddleware, async (req, res) => {
  try {
    const question = await QuestionBank.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    
    res.json({ success: true, data: question });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new question (teacher/admin only)
router.post('/bank', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const questionData = {
      ...req.body,
      created_by: req.user.id
    };

    // Validate question based on type
    const validationError = validateQuestion(questionData);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const question = await QuestionBank.create(questionData);
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a question (teacher/admin only)
router.put('/bank/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Validate question if type is being changed
    if (req.body.type) {
      const validationError = validateQuestion(req.body);
      if (validationError) {
        return res.status(400).json({ success: false, error: validationError });
      }
    }

    const question = await QuestionBank.update(req.params.id, req.body);
    
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    
    res.json({ success: true, data: question });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a question (admin only)
router.delete('/bank/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const question = await QuestionBank.delete(req.params.id);
    
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add questions to an exam
router.post('/exam/:examId/questions', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { questionIds, scores } = req.body;
    
    if (!questionIds || !Array.isArray(questionIds)) {
      return res.status(400).json({ success: false, error: 'Question IDs required' });
    }

    const questions = await QuestionBank.addToExam(req.params.examId, questionIds, scores);
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error adding questions to exam:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get questions for an exam
router.get('/exam/:examId/questions', authMiddleware, async (req, res) => {
  try {
    const questions = await QuestionBank.getExamQuestions(req.params.examId);
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error fetching exam questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import questions from file
router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const batchId = uuidv4();
    const fileType = req.file.mimetype.includes('csv') ? 'csv' : 'excel';
    
    let questions = [];
    
    if (fileType === 'csv') {
      questions = await parseCSV(req.file.path);
    } else {
      questions = await parseExcel(req.file.path);
    }

    // Import questions and track results
    const results = await importQuestions(questions, req.user.id, batchId);
    
    // Log the import
    const importLog = await ImportLog.create({
      batch_id: batchId,
      file_name: req.file.originalname,
      file_type: fileType,
      total_rows: questions.length,
      successful_rows: results.successful,
      failed_rows: results.failed,
      error_details: results.errors,
      imported_by: req.user.id
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        batchId,
        totalRows: questions.length,
        successful: results.successful,
        failed: results.failed,
        errors: results.errors,
        importLog
      }
    });
  } catch (error) {
    console.error('Error importing questions:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get import template
router.get('/import/template', (req, res) => {
  const templatePath = path.join(__dirname, '../..', 'templates', 'question_template.csv');
  res.download(templatePath, 'question_import_template.csv', (err) => {
    if (err) {
      console.error('Error downloading template:', err);
      res.status(404).json({ success: false, error: 'Template file not found' });
    }
  });
});

// Question Categories Routes

// Get all categories
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const categories = await QuestionCategory.findAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get category hierarchy
router.get('/categories/hierarchy', authMiddleware, async (req, res) => {
  try {
    const hierarchy = await QuestionCategory.getHierarchy();
    res.json({ success: true, data: hierarchy });
  } catch (error) {
    console.error('Error fetching category hierarchy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new category
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const category = await QuestionCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to validate questions
function validateQuestion(question) {
  const { type, content, correct_answer } = question;

  if (!type || !content) {
    return 'Question type and content are required';
  }

  switch (type) {
  case 'single':
    if (!question.options || question.options.length < 2) {
      return 'Single choice questions must have at least 2 options';
    }
    if (!correct_answer) {
      return 'Single choice questions must have a correct answer';
    }
    break;

  case 'multiple':
    if (!question.options || question.options.length < 2) {
      return 'Multiple choice questions must have at least 2 options';
    }
    if (!correct_answer || !Array.isArray(correct_answer) || correct_answer.length === 0) {
      return 'Multiple choice questions must have at least one correct answer';
    }
    break;

  case 'blank':
    if (!correct_answer || (Array.isArray(correct_answer) && correct_answer.length === 0)) {
      return 'Fill-in-the-blank questions must have at least one correct answer';
    }
    break;

  case 'true_false':
    if (typeof correct_answer !== 'boolean') {
      return 'True/false questions must have a boolean correct answer';
    }
    break;

  case 'essay':
  case 'code':
    // These don't require a correct answer as they're manually graded
    break;

  default:
    return 'Invalid question type';
  }

  return null;
}

// Helper function to parse CSV
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const questions = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        questions.push(parseQuestionRow(row));
      })
      .on('end', () => resolve(questions))
      .on('error', reject);
  });
}

// Helper function to parse Excel
async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return data.map(parseQuestionRow);
}

// Helper function to parse question row
function parseQuestionRow(row) {
  const question = {
    type: row.type || row['题型'] || 'single',
    subject: row.subject || row['科目'],
    grade: row.grade || row['年级'],
    content: row.content || row['题目内容'],
    difficulty: row.difficulty || row['难度'] || 'medium',
    explanation: row.explanation || row['解析'],
    score: parseInt(row.score || row['分值']) || 1,
    tags: row.tags ? row.tags.split(',').map(t => t.trim()) : []
  };

  // Parse options and correct answer based on type
  if (row.options || row['选项']) {
    const optionsStr = row.options || row['选项'];
    question.options = optionsStr.split('|').map(o => o.trim());
  }

  const answerStr = row.correct_answer || row['正确答案'];
  
  switch (question.type) {
  case 'multiple':
    question.correct_answer = answerStr ? answerStr.split(',').map(a => a.trim()) : [];
    break;
  case 'blank':
    question.correct_answer = answerStr ? answerStr.split('|').map(a => a.trim()) : [];
    break;
  case 'true_false':
    question.correct_answer = answerStr?.toLowerCase() === 'true' || answerStr === '正确';
    break;
  default:
    question.correct_answer = answerStr;
  }

  return question;
}

// Helper function to import questions
async function importQuestions(questions, userId, batchId) {
  let successful = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < questions.length; i++) {
    try {
      const question = questions[i];
      question.created_by = userId;
      question.import_batch_id = batchId;

      const validationError = validateQuestion(question);
      if (validationError) {
        throw new Error(validationError);
      }

      await QuestionBank.create(question);
      successful++;
    } catch (error) {
      failed++;
      errors.push({
        row: i + 1,
        error: error.message
      });
    }
  }

  return { successful, failed, errors };
}

module.exports = router;