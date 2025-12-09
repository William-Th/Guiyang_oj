/**
 * Test Cases API Routes
 */

const express = require('express');
const router = express.Router();
const TestCase = require('../models/TestCase');
const logger = require('../utils/logger');

/**
 * GET /api/testcases/:questionId
 * Get test cases for a question
 */
router.get('/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const includeSamples = req.query.samples !== 'false';

    const testCases = await TestCase.getByQuestionId(questionId, includeSamples);

    res.json({
      success: true,
      data: testCases.map(tc => ({
        id: tc.id,
        caseNumber: tc.case_number,
        input: tc.input_data,
        expectedOutput: tc.expected_output,
        score: tc.score,
        timeLimit: tc.time_limit,
        memoryLimit: tc.memory_limit,
        isSample: tc.is_sample,
        description: tc.description
      }))
    });

  } catch (err) {
    logger.error('Get test cases error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get test cases'
    });
  }
});

/**
 * GET /api/testcases/:questionId/samples
 * Get only sample test cases (for public display)
 */
router.get('/:questionId/samples', async (req, res) => {
  try {
    const { questionId } = req.params;
    const samples = await TestCase.getSamplesByQuestionId(questionId);

    res.json({
      success: true,
      data: samples.map(tc => ({
        caseNumber: tc.case_number,
        input: tc.input_data,
        expectedOutput: tc.expected_output,
        description: tc.description
      }))
    });

  } catch (err) {
    logger.error('Get samples error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get sample test cases'
    });
  }
});

/**
 * POST /api/testcases/:questionId
 * Create a new test case
 */
router.post('/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const {
      caseNumber,
      inputData,
      expectedOutput,
      score,
      timeLimit,
      memoryLimit,
      isSample,
      description
    } = req.body;

    if (expectedOutput === undefined) {
      return res.status(400).json({
        success: false,
        message: 'expectedOutput is required'
      });
    }

    const testCase = await TestCase.create({
      questionId: parseInt(questionId),
      caseNumber,
      inputData: inputData || '',
      expectedOutput,
      score,
      timeLimit,
      memoryLimit,
      isSample,
      description
    });

    res.status(201).json({
      success: true,
      data: {
        id: testCase.id,
        caseNumber: testCase.case_number,
        input: testCase.input_data,
        expectedOutput: testCase.expected_output,
        score: testCase.score,
        isSample: testCase.is_sample
      }
    });

  } catch (err) {
    logger.error('Create test case error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create test case'
    });
  }
});

/**
 * POST /api/testcases/:questionId/bulk
 * Bulk create test cases
 */
router.post('/:questionId/bulk', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { testCases } = req.body;

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'testCases array is required'
      });
    }

    // Validate each test case has expectedOutput
    for (const tc of testCases) {
      if (tc.expectedOutput === undefined && tc.expected_output === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Each test case must have expectedOutput'
        });
      }
    }

    const created = await TestCase.bulkCreate(parseInt(questionId), testCases);

    res.status(201).json({
      success: true,
      data: {
        count: created.length,
        testCases: created.map(tc => ({
          id: tc.id,
          caseNumber: tc.case_number
        }))
      }
    });

  } catch (err) {
    logger.error('Bulk create test cases error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create test cases'
    });
  }
});

/**
 * PUT /api/testcases/:id
 * Update a test case
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const testCase = await TestCase.update(parseInt(id), updateData);

    if (!testCase) {
      return res.status(404).json({
        success: false,
        message: 'Test case not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: testCase.id,
        caseNumber: testCase.case_number,
        input: testCase.input_data,
        expectedOutput: testCase.expected_output,
        score: testCase.score,
        isSample: testCase.is_sample
      }
    });

  } catch (err) {
    logger.error('Update test case error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update test case'
    });
  }
});

/**
 * DELETE /api/testcases/:id
 * Delete a test case
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TestCase.delete(parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Test case not found'
      });
    }

    res.json({
      success: true,
      message: 'Test case deleted'
    });

  } catch (err) {
    logger.error('Delete test case error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete test case'
    });
  }
});

/**
 * DELETE /api/testcases/question/:questionId
 * Delete all test cases for a question
 */
router.delete('/question/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const count = await TestCase.deleteByQuestionId(parseInt(questionId));

    res.json({
      success: true,
      message: `Deleted ${count} test cases`
    });

  } catch (err) {
    logger.error('Delete question test cases error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete test cases'
    });
  }
});

/**
 * GET /api/testcases/:questionId/stats
 * Get test case statistics
 */
router.get('/:questionId/stats', async (req, res) => {
  try {
    const { questionId } = req.params;
    const stats = await TestCase.getStats(parseInt(questionId));

    res.json({
      success: true,
      data: {
        totalCases: parseInt(stats.total_cases) || 0,
        sampleCases: parseInt(stats.sample_cases) || 0,
        totalScore: parseInt(stats.total_score) || 0,
        avgTimeLimit: stats.avg_time_limit,
        avgMemoryLimit: stats.avg_memory_limit
      }
    });

  } catch (err) {
    logger.error('Get test case stats error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get test case statistics'
    });
  }
});

module.exports = router;
