/**
 * Checker Module - Compares program output with expected output
 */

const logger = require('../utils/logger');

class Checker {
  /**
   * Compare output with expected result
   * @param {string} output - Program output
   * @param {string} expected - Expected output
   * @param {string} mode - Comparison mode ('strict', 'ignore_whitespace', 'ignore_trailing')
   * @returns {Object} Comparison result
   */
  compare(output, expected, mode = 'ignore_trailing') {
    if (output === null || output === undefined) {
      output = '';
    }
    if (expected === null || expected === undefined) {
      expected = '';
    }

    let normalizedOutput;
    let normalizedExpected;

    switch (mode) {
      case 'strict':
        // Exact match
        normalizedOutput = output;
        normalizedExpected = expected;
        break;

      case 'ignore_whitespace':
        // Ignore all whitespace differences
        normalizedOutput = this.normalizeWhitespace(output);
        normalizedExpected = this.normalizeWhitespace(expected);
        break;

      case 'ignore_trailing':
      default:
        // Ignore trailing whitespace on each line and trailing newlines
        normalizedOutput = this.normalizeTrailing(output);
        normalizedExpected = this.normalizeTrailing(expected);
        break;
    }

    const match = normalizedOutput === normalizedExpected;

    return {
      match,
      mode,
      output: this.truncateForDisplay(output),
      expected: this.truncateForDisplay(expected)
    };
  }

  /**
   * Check execution result against test case
   * @param {Object} execResult - Execution result from Executor
   * @param {Object} testCase - Test case with expected output
   * @param {string} mode - Comparison mode
   * @returns {Object} Check result with status and details
   */
  check(execResult, testCase, mode = 'ignore_trailing') {
    // If execution wasn't successful (time_limit, memory_limit, runtime_error, etc.), return that status
    if (execResult.status !== 'accepted') {
      return {
        status: execResult.status,
        match: false,
        executionTime: execResult.executionTime,
        output: this.truncateForDisplay(execResult.stdout),
        expected: this.truncateForDisplay(testCase.expectedOutput),
        stderr: this.truncateForDisplay(execResult.stderr)
      };
    }

    // Compare output
    const comparison = this.compare(
      execResult.stdout,
      testCase.expectedOutput,
      mode
    );

    // Use full status names to match database schema
    const status = comparison.match ? 'accepted' : 'wrong_answer';

    return {
      status,
      match: comparison.match,
      executionTime: execResult.executionTime,
      output: comparison.output,
      expected: comparison.expected,
      stderr: this.truncateForDisplay(execResult.stderr)
    };
  }

  /**
   * Check all test results
   * @param {Array} execResults - Array of execution results
   * @param {string} mode - Comparison mode
   * @returns {Object} Overall result with details
   */
  checkAll(execResults, mode = 'ignore_trailing') {
    const results = [];
    let totalScore = 0;
    let maxScore = 0;
    let allPassed = true;
    let firstFailedStatus = null;

    for (const execResult of execResults) {
      const checkResult = this.check(
        execResult,
        { expectedOutput: execResult.expectedOutput },
        mode
      );

      const score = execResult.score || 10;
      const earned = checkResult.match ? score : 0;

      maxScore += score;
      totalScore += earned;

      if (!checkResult.match) {
        allPassed = false;
        if (!firstFailedStatus) {
          firstFailedStatus = checkResult.status;
        }
      }

      results.push({
        caseNumber: execResult.caseNumber,
        status: checkResult.status,
        match: checkResult.match,
        score,
        earned,
        executionTime: checkResult.executionTime,
        output: checkResult.output,
        expected: checkResult.expected,
        stderr: checkResult.stderr,
        isSample: execResult.isSample
      });
    }

    // Determine overall status - use full names to match database schema
    let overallStatus;
    if (allPassed) {
      overallStatus = 'accepted';
    } else if (firstFailedStatus) {
      overallStatus = firstFailedStatus;
    } else {
      overallStatus = 'wrong_answer';
    }

    return {
      status: overallStatus,
      passed: allPassed,
      score: totalScore,
      maxScore,
      percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      results
    };
  }

  /**
   * Normalize string by removing all whitespace differences
   */
  normalizeWhitespace(str) {
    return str.replace(/\s+/g, ' ').trim();
  }

  /**
   * Normalize string by removing trailing whitespace and newlines
   */
  normalizeTrailing(str) {
    return str
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .trimEnd();
  }

  /**
   * Truncate string for display
   */
  truncateForDisplay(str, maxLength = 1000) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '... [truncated]';
  }

  /**
   * Get detailed diff between output and expected (for debugging)
   */
  getDiff(output, expected) {
    const outputLines = (output || '').split('\n');
    const expectedLines = (expected || '').split('\n');
    const diff = [];

    const maxLines = Math.max(outputLines.length, expectedLines.length);

    for (let i = 0; i < maxLines && i < 50; i++) { // Limit to 50 lines
      const outLine = outputLines[i] || '';
      const expLine = expectedLines[i] || '';

      if (outLine !== expLine) {
        diff.push({
          line: i + 1,
          output: outLine,
          expected: expLine
        });
      }
    }

    return diff;
  }
}

module.exports = new Checker();
