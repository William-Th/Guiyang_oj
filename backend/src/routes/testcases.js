/**
 * Test Case Management API Routes
 * Manage test cases for programming questions
 */

const express = require('express');
const router = express.Router();
const TestCase = require('../models/TestCase');
const QuestionDraft = require('../models/QuestionDraft');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/testcases/:questionId
 * Get all test cases for a question
 */
router.get('/:questionId', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;

    // Verify the question exists and is a code type
    const draft = await QuestionDraft.findById(questionId);
    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (draft.type !== 'code') {
      return res.status(400).json({
        success: false,
        message: 'Test cases only available for programming questions'
      });
    }

    // Check permission (owner or admin)
    if (draft.created_by !== req.user.id && req.user.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const testCases = await TestCase.getByQuestionId(questionId);
    const stats = await TestCase.getStats(questionId);

    res.json({
      success: true,
      data: testCases,
      stats: {
        totalCount: parseInt(stats.total_count),
        sampleCount: parseInt(stats.sample_count),
        totalScore: parseInt(stats.total_score),
        minTimeLimit: parseInt(stats.min_time_limit) || 1000,
        maxTimeLimit: parseInt(stats.max_time_limit) || 1000
      }
    });
  } catch (error) {
    console.error('Error fetching test cases:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/testcases/:questionId/samples
 * Get sample test cases for a question (public for students)
 */
router.get('/:questionId/samples', async (req, res) => {
  try {
    const { questionId } = req.params;

    const samples = await TestCase.getSamplesByQuestionId(questionId);

    res.json({
      success: true,
      data: samples
    });
  } catch (error) {
    console.error('Error fetching sample test cases:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/testcases/:questionId
 * Create a new test case
 */
router.post('/:questionId', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;
    const testCaseData = req.body;

    // Verify the question exists and belongs to user
    const draft = await QuestionDraft.findById(questionId);
    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (draft.type !== 'code') {
      return res.status(400).json({
        success: false,
        message: 'Test cases only available for programming questions'
      });
    }

    if (draft.created_by !== req.user.id && req.user.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    // Get next case number
    const existing = await TestCase.getByQuestionId(questionId);
    const nextNumber = existing.length > 0
      ? Math.max(...existing.map(tc => tc.case_number)) + 1
      : 1;

    const testCase = await TestCase.create({
      question_id: parseInt(questionId),
      case_number: testCaseData.case_number || nextNumber,
      input_data: testCaseData.input_data || testCaseData.input || '',
      expected_output: testCaseData.expected_output || testCaseData.output,
      score: testCaseData.score || 10,
      time_limit: testCaseData.time_limit || draft.time_limit || 1000,
      memory_limit: testCaseData.memory_limit || draft.memory_limit || 256,
      is_sample: testCaseData.is_sample || false,
      description: testCaseData.description
    });

    res.status(201).json({
      success: true,
      data: testCase,
      message: 'Test case created successfully'
    });
  } catch (error) {
    console.error('Error creating test case:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/testcases/:questionId/bulk
 * Bulk create/replace test cases
 */
router.post('/:questionId/bulk', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { testCases, replace = false } = req.body;

    // Verify the question exists and belongs to user
    const draft = await QuestionDraft.findById(questionId);
    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (draft.type !== 'code') {
      return res.status(400).json({
        success: false,
        message: 'Test cases only available for programming questions'
      });
    }

    if (draft.created_by !== req.user.id && req.user.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    if (!testCases || !Array.isArray(testCases)) {
      return res.status(400).json({
        success: false,
        message: 'testCases array is required'
      });
    }

    let created;
    if (replace) {
      created = await TestCase.replaceAll(parseInt(questionId), testCases);
    } else {
      created = await TestCase.bulkCreate(parseInt(questionId), testCases);
    }

    res.status(201).json({
      success: true,
      data: created,
      message: `${created.length} test cases ${replace ? 'replaced' : 'created'} successfully`
    });
  } catch (error) {
    console.error('Error bulk creating test cases:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/testcases/:questionId/:testCaseId
 * Update a test case
 */
router.put('/:questionId/:testCaseId', authMiddleware, async (req, res) => {
  try {
    const { questionId, testCaseId } = req.params;
    const updateData = req.body;

    // Verify ownership
    const draft = await QuestionDraft.findById(questionId);
    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (draft.created_by !== req.user.id && req.user.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    // Verify test case exists
    const existing = await TestCase.findById(testCaseId);
    if (!existing || existing.question_id !== parseInt(questionId)) {
      return res.status(404).json({
        success: false,
        message: 'Test case not found'
      });
    }

    const updated = await TestCase.update(testCaseId, updateData);

    res.json({
      success: true,
      data: updated,
      message: 'Test case updated successfully'
    });
  } catch (error) {
    console.error('Error updating test case:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/testcases/:questionId/:testCaseId
 * Delete a test case
 */
router.delete('/:questionId/:testCaseId', authMiddleware, async (req, res) => {
  try {
    const { questionId, testCaseId } = req.params;

    // Verify ownership
    const draft = await QuestionDraft.findById(questionId);
    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (draft.created_by !== req.user.id && req.user.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    // Verify test case exists
    const existing = await TestCase.findById(testCaseId);
    if (!existing || existing.question_id !== parseInt(questionId)) {
      return res.status(404).json({
        success: false,
        message: 'Test case not found'
      });
    }

    await TestCase.delete(testCaseId);

    // Reorder remaining test cases
    await TestCase.reorder(questionId);

    res.json({
      success: true,
      message: 'Test case deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test case:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/testcases/:questionId
 * Delete all test cases for a question
 */
router.delete('/:questionId', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;

    // Verify ownership
    const draft = await QuestionDraft.findById(questionId);
    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (draft.created_by !== req.user.id && req.user.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const deleted = await TestCase.deleteByQuestionId(questionId);

    res.json({
      success: true,
      message: `${deleted} test cases deleted`
    });
  } catch (error) {
    console.error('Error deleting test cases:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
