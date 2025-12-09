/**
 * TestCase Model - Database operations for test cases
 */

const db = require('./db');
const logger = require('../utils/logger');

class TestCaseModel {
  /**
   * Get test cases for a question
   * Note: questionId can be either question_bank.id or question_drafts.id
   * - For published questions: input is question_bank.id, need to look up draft_id
   * - For unpublished drafts: input is question_drafts.id directly
   *
   * Strategy:
   * 1. First try to find test cases with the given questionId directly
   * 2. If found, use those test cases
   * 3. If not found, try to look up draft_id from question_bank
   * 4. If draft_id found, query test cases with draft_id
   */
  async getByQuestionId(questionId, includeSamples = true) {
    // Strategy 1: First try to find test cases with the given questionId directly
    let query = `
      SELECT * FROM test_cases WHERE question_id = $1
    `;
    if (!includeSamples) {
      query += ` AND is_sample = false`;
    }
    query += ` ORDER BY case_number ASC`;

    let result = await db.query(query, [questionId]);

    // If found test cases, return them
    if (result.rows.length > 0) {
      logger.debug('Found test cases with direct questionId', {
        questionId,
        count: result.rows.length
      });
      return result.rows;
    }

    // Strategy 2: Try to look up draft_id from question_bank
    const bankResult = await db.query(
      `SELECT draft_id FROM question_bank WHERE id = $1`,
      [questionId]
    );

    // Use draft_id if found in question_bank
    const draftId = bankResult.rows.length > 0 && bankResult.rows[0].draft_id
      ? bankResult.rows[0].draft_id
      : null;

    // If no draft_id found, return empty (no test cases for this question)
    if (!draftId) {
      logger.debug('No test cases found and no draft_id mapping', { questionId });
      return [];
    }

    logger.debug('Using draft_id from question_bank', {
      questionId,
      draftId
    });

    // Query again with draft_id
    let draftQuery = `
      SELECT *
      FROM test_cases
      WHERE question_id = $1
    `;

    if (!includeSamples) {
      draftQuery += ` AND is_sample = false`;
    }

    draftQuery += ` ORDER BY case_number ASC`;

    const draftResult = await db.query(draftQuery, [draftId]);
    return draftResult.rows;
  }

  /**
   * Get sample test cases only (for display to users)
   * Note: questionId can be either question_bank.id or question_drafts.id
   * Uses same strategy as getByQuestionId - try direct first, then lookup
   */
  async getSamplesByQuestionId(questionId) {
    // Strategy 1: First try to find sample test cases with the given questionId directly
    let result = await db.query(
      `SELECT id, question_id, case_number, input_data, expected_output, description
       FROM test_cases
       WHERE question_id = $1 AND is_sample = true
       ORDER BY case_number ASC`,
      [questionId]
    );

    // If found, return them
    if (result.rows.length > 0) {
      return result.rows;
    }

    // Strategy 2: Try to look up draft_id from question_bank
    const bankResult = await db.query(
      `SELECT draft_id FROM question_bank WHERE id = $1`,
      [questionId]
    );

    const draftId = bankResult.rows.length > 0 && bankResult.rows[0].draft_id
      ? bankResult.rows[0].draft_id
      : null;

    if (!draftId) {
      return [];
    }

    // Query with draft_id
    result = await db.query(
      `SELECT id, question_id, case_number, input_data, expected_output, description
       FROM test_cases
       WHERE question_id = $1 AND is_sample = true
       ORDER BY case_number ASC`,
      [draftId]
    );
    return result.rows;
  }

  /**
   * Create a new test case
   */
  async create(testCaseData) {
    const {
      questionId,
      caseNumber,
      inputData,
      expectedOutput,
      score = 10,
      timeLimit,
      memoryLimit,
      isSample = false,
      description = null
    } = testCaseData;

    const result = await db.query(
      `INSERT INTO test_cases
       (question_id, case_number, input_data, expected_output, score,
        time_limit, memory_limit, is_sample, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        questionId,
        caseNumber,
        inputData,
        expectedOutput,
        score,
        timeLimit,
        memoryLimit,
        isSample,
        description
      ]
    );

    logger.info('Test case created', {
      id: result.rows[0].id,
      questionId,
      caseNumber
    });

    return result.rows[0];
  }

  /**
   * Update a test case
   */
  async update(id, updateData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'input_data', 'expected_output', 'score',
      'time_limit', 'memory_limit', 'is_sample', 'description'
    ];

    for (const [key, value] of Object.entries(updateData)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey) && value !== undefined) {
        fields.push(`${snakeKey} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    const result = await db.query(
      `UPDATE test_cases
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete a test case
   */
  async delete(id) {
    const result = await db.query(
      `DELETE FROM test_cases WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * Delete all test cases for a question
   */
  async deleteByQuestionId(questionId) {
    const result = await db.query(
      `DELETE FROM test_cases WHERE question_id = $1`,
      [questionId]
    );
    return result.rowCount;
  }

  /**
   * Get test case by ID
   */
  async getById(id) {
    const result = await db.query(
      `SELECT * FROM test_cases WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * Bulk create test cases
   */
  async bulkCreate(questionId, testCases) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const results = [];
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const result = await client.query(
          `INSERT INTO test_cases
           (question_id, case_number, input_data, expected_output, score,
            time_limit, memory_limit, is_sample, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            questionId,
            tc.caseNumber || i + 1,
            tc.inputData || tc.input_data || '',
            tc.expectedOutput || tc.expected_output,
            tc.score || 10,
            tc.timeLimit || tc.time_limit || null,
            tc.memoryLimit || tc.memory_limit || null,
            tc.isSample || tc.is_sample || false,
            tc.description || null
          ]
        );
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');

      logger.info('Bulk test cases created', {
        questionId,
        count: results.length
      });

      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get test case statistics for a question
   */
  async getStats(questionId) {
    const result = await db.query(
      `SELECT
         COUNT(*) as total_cases,
         COUNT(*) FILTER (WHERE is_sample = true) as sample_cases,
         SUM(score) as total_score,
         AVG(time_limit) as avg_time_limit,
         AVG(memory_limit) as avg_memory_limit
       FROM test_cases
       WHERE question_id = $1`,
      [questionId]
    );
    return result.rows[0];
  }
}

module.exports = new TestCaseModel();
