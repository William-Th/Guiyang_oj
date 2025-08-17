const express = require('express');
const router = express.Router();
const QuestionBank = require('../models/QuestionBank');
const QuestionCategory = require('../models/QuestionCategory');
const { authMiddleware } = require('../middleware/auth');

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

module.exports = router;