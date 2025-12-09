const { query } = require('../database/connection');

/**
 * TestCase Model
 * Programming question test case management
 */
class TestCase {
  /**
   * Create a test case
   * @param {Object} data - Test case data
   * @returns {Promise<Object>} Created test case
   */
  static async create(data) {
    const {
      question_id,
      case_number,
      input_data,
      expected_output,
      score,
      time_limit,
      memory_limit,
      is_sample,
      description
    } = data;

    const sql = `
      INSERT INTO test_cases
      (question_id, case_number, input_data, expected_output, score,
       time_limit, memory_limit, is_sample, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      question_id,
      case_number,
      input_data || '',
      expected_output,
      score || 10,
      time_limit || 1000,
      memory_limit || 256,
      is_sample || false,
      description
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Bulk create test cases
   * @param {number} questionId - Question draft ID
   * @param {Array} testCases - Array of test case data
   * @returns {Promise<Array>} Created test cases
   */
  static async bulkCreate(questionId, testCases) {
    if (!testCases || testCases.length === 0) {
      return [];
    }

    const results = [];
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const created = await this.create({
        question_id: questionId,
        case_number: tc.case_number || (i + 1),
        input_data: tc.input_data || tc.input || '',
        expected_output: tc.expected_output || tc.output,
        score: tc.score || 10,
        time_limit: tc.time_limit,
        memory_limit: tc.memory_limit,
        is_sample: tc.is_sample || false,
        description: tc.description
      });
      results.push(created);
    }
    return results;
  }

  /**
   * Get test cases by question ID
   * @param {number} questionId - Question draft ID
   * @returns {Promise<Array>} Test cases
   */
  static async getByQuestionId(questionId) {
    const sql = `
      SELECT * FROM test_cases
      WHERE question_id = $1
      ORDER BY case_number ASC
    `;
    const result = await query(sql, [questionId]);
    return result.rows;
  }

  /**
   * Get sample test cases (visible to students)
   * @param {number} questionId - Question draft ID
   * @returns {Promise<Array>} Sample test cases
   */
  static async getSamplesByQuestionId(questionId) {
    const sql = `
      SELECT case_number, input_data, expected_output, description
      FROM test_cases
      WHERE question_id = $1 AND is_sample = true
      ORDER BY case_number ASC
    `;
    const result = await query(sql, [questionId]);
    return result.rows.map(row => ({
      caseNumber: row.case_number,
      input: row.input_data,
      expectedOutput: row.expected_output,
      description: row.description
    }));
  }

  /**
   * Get test case by ID
   * @param {number} id - Test case ID
   * @returns {Promise<Object>} Test case
   */
  static async findById(id) {
    const sql = 'SELECT * FROM test_cases WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  /**
   * Update a test case
   * @param {number} id - Test case ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated test case
   */
  static async update(id, data) {
    const {
      input_data,
      expected_output,
      score,
      time_limit,
      memory_limit,
      is_sample,
      description
    } = data;

    const sql = `
      UPDATE test_cases
      SET
        input_data = COALESCE($1, input_data),
        expected_output = COALESCE($2, expected_output),
        score = COALESCE($3, score),
        time_limit = COALESCE($4, time_limit),
        memory_limit = COALESCE($5, memory_limit),
        is_sample = COALESCE($6, is_sample),
        description = COALESCE($7, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;

    const values = [
      input_data,
      expected_output,
      score,
      time_limit,
      memory_limit,
      is_sample,
      description,
      id
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Delete a test case
   * @param {number} id - Test case ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id) {
    const sql = 'DELETE FROM test_cases WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rowCount > 0;
  }

  /**
   * Delete all test cases for a question
   * @param {number} questionId - Question draft ID
   * @returns {Promise<number>} Number of deleted rows
   */
  static async deleteByQuestionId(questionId) {
    const sql = 'DELETE FROM test_cases WHERE question_id = $1';
    const result = await query(sql, [questionId]);
    return result.rowCount;
  }

  /**
   * Replace all test cases for a question
   * @param {number} questionId - Question draft ID
   * @param {Array} testCases - New test cases
   * @returns {Promise<Array>} Created test cases
   */
  static async replaceAll(questionId, testCases) {
    await this.deleteByQuestionId(questionId);
    return this.bulkCreate(questionId, testCases);
  }

  /**
   * Get test case statistics for a question
   * @param {number} questionId - Question draft ID
   * @returns {Promise<Object>} Statistics
   */
  static async getStats(questionId) {
    const sql = `
      SELECT
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_sample = true) as sample_count,
        COALESCE(SUM(score), 0) as total_score,
        MIN(time_limit) as min_time_limit,
        MAX(time_limit) as max_time_limit
      FROM test_cases
      WHERE question_id = $1
    `;
    const result = await query(sql, [questionId]);
    return result.rows[0];
  }

  /**
   * Reorder test cases
   * @param {number} questionId - Question draft ID
   * @returns {Promise<void>}
   */
  static async reorder(questionId) {
    const sql = `
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY case_number) as new_number
        FROM test_cases
        WHERE question_id = $1
      )
      UPDATE test_cases tc
      SET case_number = o.new_number
      FROM ordered o
      WHERE tc.id = o.id
    `;
    await query(sql, [questionId]);
  }
}

module.exports = TestCase;
