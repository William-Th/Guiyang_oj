/**
 * Judge API Routes
 */

const express = require('express');
const router = express.Router();
const queue = require('../queue/RedisQueue');
const { JudgeService, JudgeStatus } = require('../judge/JudgeService');
const Submission = require('../models/Submission');
const TestCase = require('../models/TestCase');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * POST /api/judge/submit
 * Submit code for judging
 */
router.post('/submit', async (req, res) => {
  try {
    const {
      questionId,
      userId,
      activityId,
      code,
      language = 'cpp'
    } = req.body;

    // Validate required fields
    if (!questionId || !userId || !code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: questionId, userId, code'
      });
    }

    // Validate language
    if (!config.languages[language]) {
      return res.status(400).json({
        success: false,
        message: `Unsupported language: ${language}`
      });
    }

    // Check code length
    if (code.length > config.limits.codeMaxLength) {
      return res.status(400).json({
        success: false,
        message: `Code too long: ${code.length} bytes (max: ${config.limits.codeMaxLength})`
      });
    }

    // Get question info for time/memory limits
    const testCases = await TestCase.getByQuestionId(questionId);
    if (!testCases || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No test cases found for this question'
      });
    }

    // Create submission record
    const submission = await Submission.create({
      questionId,
      userId,
      activityId,
      code,
      language,
      status: JudgeStatus.PENDING
    });

    // Add to judge queue
    await queue.enqueue({
      submissionId: submission.id,
      questionId,
      userId,
      code,
      language,
      timeLimit: testCases[0].time_limit || config.limits.runTimeout,
      memoryLimit: testCases[0].memory_limit || 256,
      judgeMode: 'ignore_trailing',
      priority: 0
    });

    logger.info('Submission created and queued', {
      submissionId: submission.id,
      questionId,
      userId
    });

    res.json({
      success: true,
      data: {
        submissionId: submission.id,
        status: JudgeStatus.PENDING
      }
    });

  } catch (err) {
    logger.error('Submit error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to submit code'
    });
  }
});

/**
 * GET /api/judge/status/:submissionId
 * Get submission status and results
 */
router.get('/status/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;

    // Try to get result from queue cache first
    let result = await queue.getResult(submissionId);

    if (!result) {
      // Fall back to database
      const submission = await Submission.getById(submissionId);

      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }

      // Map database column names to API response format
      result = {
        submissionId: submission.id,
        status: submission.status,
        score: submission.score,
        totalScore: submission.total_score,
        compileOutput: submission.compile_output,
        executionTime: submission.time_used,
        testResults: submission.judge_result ? (typeof submission.judge_result === 'string' ? JSON.parse(submission.judge_result) : submission.judge_result) : null,
        submittedAt: submission.submitted_at,
        judgedAt: submission.judged_at
      };
    }

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    logger.error('Status check error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get submission status'
    });
  }
});

/**
 * GET /api/judge/submission/:submissionId
 * Get full submission details
 */
router.get('/submission/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await Submission.getById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Map database column names to API response format
    res.json({
      success: true,
      data: {
        id: submission.id,
        questionId: submission.question_id,
        userId: submission.student_id,
        activityId: submission.student_activity_id,
        language: submission.language,
        code: submission.source_code,
        status: submission.status,
        score: submission.score,
        totalScore: submission.total_score,
        compileOutput: submission.compile_output,
        executionTime: submission.time_used,
        testResults: submission.judge_result ? (typeof submission.judge_result === 'string' ? JSON.parse(submission.judge_result) : submission.judge_result) : null,
        submittedAt: submission.submitted_at,
        judgedAt: submission.judged_at
      }
    });

  } catch (err) {
    logger.error('Get submission error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get submission'
    });
  }
});

/**
 * GET /api/judge/history/:userId/:questionId
 * Get submission history for user on a question
 */
router.get('/history/:userId/:questionId', async (req, res) => {
  try {
    const { userId, questionId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const submissions = await Submission.getByUserAndQuestion(userId, questionId, limit);

    // Map database column names to API response format
    res.json({
      success: true,
      data: submissions.map(s => ({
        id: s.id,
        language: s.language,
        status: s.status,
        score: s.score,
        totalScore: s.total_score,
        executionTime: s.time_used,
        submittedAt: s.submitted_at
      }))
    });

  } catch (err) {
    logger.error('Get history error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get submission history'
    });
  }
});

/**
 * POST /api/judge/run
 * Quick run - execute code without saving submission
 */
router.post('/run', async (req, res) => {
  try {
    const {
      code,
      language = 'cpp',
      input = '',
      expectedOutput = null
    } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code is required'
      });
    }

    if (!config.languages[language]) {
      return res.status(400).json({
        success: false,
        message: `Unsupported language: ${language}`
      });
    }

    // Run code directly
    const result = await JudgeService.judgeOne(
      code,
      language,
      input,
      expectedOutput,
      {
        timeLimit: config.limits.runTimeout,
        memoryLimit: 256
      }
    );

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    logger.error('Quick run error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to run code'
    });
  }
});

/**
 * GET /api/judge/languages
 * Get supported languages
 */
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    data: JudgeService.getSupportedLanguages()
  });
});

/**
 * GET /api/judge/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', async (req, res) => {
  try {
    const stats = await queue.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (err) {
    logger.error('Queue stats error', { error: err.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get queue stats'
    });
  }
});

module.exports = router;
