/**
 * Judge API Routes - Proxy to judge-service
 * Routes code judging requests to the dedicated judge microservice
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { authMiddleware } = require('../middleware/auth');
const TestCase = require('../models/TestCase');

// Judge service URL (internal Docker network)
const JUDGE_SERVICE_URL = process.env.JUDGE_SERVICE_URL || 'http://judge-service:3002';

/**
 * Forward request to judge service
 */
async function forwardToJudgeService(path, method, body, res) {
  try {
    const url = `${JUDGE_SERVICE_URL}${path}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Judge service error:', error.message);
    res.status(503).json({
      success: false,
      message: 'Judge service unavailable',
      error: error.message
    });
  }
}

/**
 * POST /api/judge/submit
 * Submit code for judging
 * Requires authentication
 */
router.post('/submit', authMiddleware, async (req, res) => {
  const { questionId, activityId, code, language } = req.body;

  // Validate required fields
  if (!questionId || !code) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: questionId, code'
    });
  }

  // Add user ID from authenticated user
  const body = {
    questionId,
    userId: req.user.id,
    activityId,
    code,
    language: language || 'cpp'
  };

  await forwardToJudgeService('/api/judge/submit', 'POST', body, res);
});

/**
 * POST /api/judge/run
 * Quick run - execute code without saving (for testing)
 * Requires authentication
 */
router.post('/run', authMiddleware, async (req, res) => {
  const { code, language, input, expectedOutput } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Code is required'
    });
  }

  const body = {
    code,
    language: language || 'cpp',
    input: input || '',
    expectedOutput
  };

  await forwardToJudgeService('/api/judge/run', 'POST', body, res);
});

/**
 * GET /api/judge/status/:submissionId
 * Get submission status and results
 */
router.get('/status/:submissionId', authMiddleware, async (req, res) => {
  const { submissionId } = req.params;
  await forwardToJudgeService(`/api/judge/status/${submissionId}`, 'GET', null, res);
});

/**
 * GET /api/judge/submission/:submissionId
 * Get full submission details
 */
router.get('/submission/:submissionId', authMiddleware, async (req, res) => {
  const { submissionId } = req.params;
  await forwardToJudgeService(`/api/judge/submission/${submissionId}`, 'GET', null, res);
});

/**
 * GET /api/judge/history/:questionId
 * Get submission history for current user on a question
 */
router.get('/history/:questionId', authMiddleware, async (req, res) => {
  const { questionId } = req.params;
  const userId = req.user.id;
  const limit = req.query.limit || 10;

  await forwardToJudgeService(`/api/judge/history/${userId}/${questionId}?limit=${limit}`, 'GET', null, res);
});

/**
 * GET /api/judge/languages
 * Get supported programming languages
 * No authentication required
 */
router.get('/languages', async (req, res) => {
  await forwardToJudgeService('/api/judge/languages', 'GET', null, res);
});

/**
 * GET /api/judge/queue/stats
 * Get queue statistics (admin only)
 */
router.get('/queue/stats', authMiddleware, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  await forwardToJudgeService('/api/judge/queue/stats', 'GET', null, res);
});

/**
 * GET /api/judge/testcases/:questionId/samples
 * Get sample test cases for a question (public)
 * Reads from local database, not from judge-service
 */
router.get('/testcases/:questionId/samples', async (req, res) => {
  try {
    const { questionId } = req.params;

    const samples = await TestCase.getSamplesByQuestionId(parseInt(questionId));

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

module.exports = router;
