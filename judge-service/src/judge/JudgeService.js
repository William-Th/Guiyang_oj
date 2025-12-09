/**
 * Judge Service - Main orchestrator for code judging
 */

const sandbox = require('../sandbox/DockerSandbox');
const compiler = require('./Compiler');
const executor = require('./Executor');
const checker = require('./Checker');
const logger = require('../utils/logger');

// Judge result status codes - must match database CHECK constraint
// Database uses full names: accepted, wrong_answer, compile_error, etc.
const JudgeStatus = {
  PENDING: 'pending',              // Waiting in queue
  JUDGING: 'judging',              // Currently being judged
  ACCEPTED: 'accepted',            // All test cases passed
  WRONG_ANSWER: 'wrong_answer',    // Output doesn't match
  COMPILE_ERROR: 'compile_error',  // Compilation failed
  RUNTIME_ERROR: 'runtime_error',  // Runtime error
  TIME_LIMIT: 'time_limit',        // Time limit exceeded
  MEMORY_LIMIT: 'memory_limit',    // Memory limit exceeded
  OUTPUT_LIMIT: 'output_limit',    // Output limit exceeded
  PARTIAL: 'partial',              // Partial score
  SYSTEM_ERROR: 'system_error'     // System/internal error
};

class JudgeService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize judge service
   */
  async init() {
    if (this.initialized) return;

    logger.info('Initializing Judge Service...');

    await sandbox.init();

    this.initialized = true;
    logger.info('Judge Service initialized');
  }

  /**
   * Judge a code submission
   * @param {Object} submission - Submission data
   * @returns {Object} Judge result
   */
  async judge(submission) {
    const {
      submissionId,
      code,
      language,
      testCases,
      timeLimit,
      memoryLimit,
      judgeMode = 'ignore_trailing'
    } = submission;

    logger.info('Starting judge', {
      submissionId,
      language,
      testCaseCount: testCases.length
    });

    const result = {
      submissionId,
      status: JudgeStatus.PENDING,
      score: 0,
      maxScore: 0,
      compileOutput: null,
      testResults: [],
      totalTime: 0,
      judgeStartTime: new Date(),
      judgeEndTime: null
    };

    // Create sandbox (convert submissionId to string for path.join)
    const sandboxInstance = await sandbox.createSandbox(String(submissionId));

    try {
      result.status = JudgeStatus.JUDGING;

      // Step 1: Compile
      logger.debug('Compiling code', { submissionId, language });

      const compileResult = await compiler.compile(sandboxInstance, code, language);

      if (!compileResult.success) {
        result.status = JudgeStatus.COMPILE_ERROR;
        result.compileOutput = compileResult.error;
        logger.info('Compilation failed', { submissionId });
        return this.finalizeResult(result);
      }

      result.compileOutput = 'Compilation successful';
      result.compileTime = compileResult.compileTime;

      // Step 2: Execute test cases
      logger.debug('Executing test cases', {
        submissionId,
        count: testCases.length
      });

      const execResults = await executor.executeAll(
        sandboxInstance,
        language,
        testCases,
        { timeLimit, memoryLimit }
      );

      // Step 3: Check results
      logger.debug('Checking results', { submissionId });

      const checkResults = checker.checkAll(execResults.results, judgeMode);

      result.status = checkResults.status;
      result.score = checkResults.score;
      result.maxScore = checkResults.maxScore;
      result.testResults = checkResults.results;
      result.totalTime = checkResults.results.reduce(
        (sum, r) => sum + (r.executionTime || 0), 0
      );

      logger.info('Judge completed', {
        submissionId,
        status: result.status,
        score: result.score,
        maxScore: result.maxScore
      });

    } catch (err) {
      logger.error('Judge error', {
        submissionId,
        error: err.message,
        stack: err.stack
      });

      result.status = JudgeStatus.SYSTEM_ERROR;
      result.compileOutput = `System error: ${err.message}`;

    } finally {
      // Cleanup
      await sandboxInstance.cleanup();
    }

    return this.finalizeResult(result);
  }

  /**
   * Finalize judge result
   */
  finalizeResult(result) {
    result.judgeEndTime = new Date();
    result.judgeTime = result.judgeEndTime - result.judgeStartTime;
    return result;
  }

  /**
   * Judge a single test case (for quick testing)
   */
  async judgeOne(code, language, input, expectedOutput, options = {}) {
    const sandboxInstance = await sandbox.createSandbox();

    try {
      // Compile
      const compileResult = await compiler.compile(sandboxInstance, code, language);
      if (!compileResult.success) {
        return {
          status: JudgeStatus.COMPILE_ERROR,
          error: compileResult.error
        };
      }

      // Execute
      const execResult = await executor.execute(
        sandboxInstance,
        language,
        input,
        {
          timeLimit: options.timeLimit,
          memoryLimit: options.memoryLimit
        }
      );

      // Check
      const checkResult = checker.check(
        execResult,
        { expectedOutput },
        options.judgeMode || 'ignore_trailing'
      );

      return {
        status: checkResult.status,
        match: checkResult.match,
        output: checkResult.output,
        expected: checkResult.expected,
        executionTime: checkResult.executionTime,
        stderr: checkResult.stderr
      };

    } finally {
      await sandboxInstance.cleanup();
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return compiler.getSupportedLanguages();
  }

  /**
   * Health check
   */
  async healthCheck() {
    const dockerInfo = await sandbox.getInfo();
    const imageExists = await sandbox.checkImage();

    return {
      initialized: this.initialized,
      docker: dockerInfo,
      sandboxImage: imageExists ? 'available' : 'missing',
      supportedLanguages: this.getSupportedLanguages()
    };
  }
}

module.exports = {
  JudgeService: new JudgeService(),
  JudgeStatus
};
