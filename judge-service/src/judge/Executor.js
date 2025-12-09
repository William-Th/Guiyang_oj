/**
 * Executor Module - Executes compiled code with test cases
 */

const config = require('../config');
const logger = require('../utils/logger');

class Executor {
  /**
   * Execute compiled code with input
   * @param {Object} sandbox - Sandbox instance
   * @param {string} language - Programming language
   * @param {string} input - Input data (stdin)
   * @param {Object} limits - Execution limits
   * @returns {Object} Execution result
   */
  async execute(sandbox, language, input, limits = {}) {
    const langConfig = config.languages[language];

    if (!langConfig) {
      return {
        success: false,
        status: 'system_error',
        error: `Unsupported language: ${language}`
      };
    }

    const timeLimit = Math.min(
      limits.timeLimit || config.limits.runTimeout,
      config.limits.maxRunTimeout
    );
    const memoryLimit = (limits.memoryLimit || 256) * 1024 * 1024; // Convert MB to bytes

    logger.debug('Executing code', {
      sandboxId: sandbox.id,
      language,
      timeLimit,
      memoryLimit: memoryLimit / (1024 * 1024) + 'MB',
      inputLength: input ? input.length : 0
    });

    const startTime = Date.now();

    const result = await sandbox.exec(langConfig.runCommand, {
      timeout: timeLimit,
      memoryLimit,
      stdin: input || ''
    });

    const executionTime = Date.now() - startTime;

    // Determine status - use full names to match database schema
    let status = 'accepted'; // Assume success initially

    if (result.timeout) {
      status = 'time_limit'; // Time Limit Exceeded
    } else if (result.memoryExceeded) {
      status = 'memory_limit'; // Memory Limit Exceeded
    } else if (result.exitCode !== 0) {
      // Check for runtime error
      if (result.stderr && result.stderr.includes('Segmentation fault')) {
        status = 'runtime_error';
      } else if (result.stderr && result.stderr.includes('floating point')) {
        status = 'runtime_error';
      } else {
        status = 'runtime_error';
      }
    }

    // Check output limit
    if (result.stdout && result.stdout.length > config.limits.outputLimit) {
      status = 'output_limit'; // Output Limit Exceeded
    }

    logger.debug('Execution completed', {
      sandboxId: sandbox.id,
      status,
      executionTime,
      exitCode: result.exitCode
    });

    return {
      success: status === 'accepted',
      status,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      executionTime,
      memoryUsed: null // Would need cgroup stats to get actual memory
    };
  }

  /**
   * Execute code for multiple test cases
   * @param {Object} sandbox - Sandbox instance
   * @param {string} language - Programming language
   * @param {Array} testCases - Array of test cases
   * @param {Object} limits - Execution limits
   * @returns {Object} Results for all test cases
   */
  async executeAll(sandbox, language, testCases, limits = {}) {
    const results = [];
    let totalScore = 0;
    let maxScore = 0;
    let allPassed = true;

    for (const testCase of testCases) {
      maxScore += testCase.score || 10;

      const testLimits = {
        timeLimit: testCase.timeLimit || limits.timeLimit || config.limits.runTimeout,
        memoryLimit: testCase.memoryLimit || limits.memoryLimit || 256
      };

      const result = await this.execute(
        sandbox,
        language,
        testCase.input,
        testLimits
      );

      const testResult = {
        caseNumber: testCase.caseNumber,
        ...result,
        expectedOutput: testCase.expectedOutput,
        score: testCase.score || 10,
        earned: 0,
        isSample: testCase.isSample || false
      };

      // Store result for later comparison
      results.push(testResult);

      // If execution failed, mark as not passed
      if (result.status !== 'accepted') {
        allPassed = false;
      }
    }

    return {
      results,
      totalScore,
      maxScore,
      allPassed
    };
  }
}

module.exports = new Executor();
