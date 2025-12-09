/**
 * Submission Model - Database operations for code submissions
 *
 * Note: Column names match database schema from 031_judge_system.sql:
 * - student_id (not user_id)
 * - student_activity_id (not activity_id)
 * - source_code (not code)
 * - total_score (not max_score)
 * - time_used (not execution_time)
 * - judge_result (not test_results)
 */

const db = require('./db');
const logger = require('../utils/logger');

class SubmissionModel {
  /**
   * Create a new submission
   */
  async create(submissionData) {
    const {
      questionId,
      userId,
      activityId,
      code,
      language,
      status = 'pending'
    } = submissionData;

    const result = await db.query(
      `INSERT INTO code_submissions
       (question_id, student_id, student_activity_id, source_code, language, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [questionId, userId, activityId, code, language, status]
    );

    logger.info('Submission created', { id: result.rows[0].id });
    return result.rows[0];
  }

  /**
   * Get submission by ID
   * Note: code_submissions.question_id references question_bank.id,
   *       and question_bank.draft_id references question_drafts.id
   */
  async getById(id) {
    const result = await db.query(
      `SELECT s.*,
              qd.content as question_content,
              qd.time_limit,
              qd.memory_limit,
              qd.judge_mode
       FROM code_submissions s
       LEFT JOIN question_bank qb ON s.question_id = qb.id
       LEFT JOIN question_drafts qd ON qb.draft_id = qd.id
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * Update submission status and results
   * Uses correct column names from database schema:
   * - total_score (not max_score)
   * - time_used (not execution_time)
   * - judge_result (not test_results)
   */
  async updateResult(id, resultData) {
    const {
      status,
      score,
      maxScore,
      compileOutput,
      executionTime,
      memoryUsed,
      testResults,
      judgedAt = new Date()
    } = resultData;

    const result = await db.query(
      `UPDATE code_submissions
       SET status = $1,
           score = $2,
           total_score = $3,
           compile_output = $4,
           time_used = $5,
           memory_used = $6,
           judge_result = $7,
           judged_at = $8
       WHERE id = $9
       RETURNING *`,
      [
        status,
        score,
        maxScore,
        compileOutput,
        executionTime,
        memoryUsed,
        JSON.stringify(testResults),
        judgedAt,
        id
      ]
    );

    logger.info('Submission updated', { id, status, score });
    return result.rows[0];
  }

  /**
   * Get submissions for a user on a question
   */
  async getByUserAndQuestion(userId, questionId, limit = 10) {
    const result = await db.query(
      `SELECT * FROM code_submissions
       WHERE student_id = $1 AND question_id = $2
       ORDER BY submitted_at DESC
       LIMIT $3`,
      [userId, questionId, limit]
    );
    return result.rows;
  }

  /**
   * Get submissions for an activity
   */
  async getByActivity(activityId, options = {}) {
    const { userId, status, limit = 100, offset = 0 } = options;

    let query = `
      SELECT s.*, u.real_name as user_name
      FROM code_submissions s
      LEFT JOIN users u ON s.student_id = u.id
      WHERE s.student_activity_id = $1
    `;
    const params = [activityId];
    let paramIndex = 2;

    if (userId) {
      query += ` AND s.student_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (status) {
      query += ` AND s.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY s.submitted_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get submission statistics for a question
   * Note: status values in DB are full names (accepted, wrong_answer) not abbreviations (AC, WA)
   */
  async getQuestionStats(questionId) {
    const result = await db.query(
      `SELECT
         COUNT(*) as total_submissions,
         COUNT(DISTINCT student_id) as unique_users,
         COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
         COUNT(*) FILTER (WHERE status = 'wrong_answer') as wrong_answer,
         COUNT(*) FILTER (WHERE status = 'compile_error') as compile_error,
         COUNT(*) FILTER (WHERE status = 'runtime_error') as runtime_error,
         COUNT(*) FILTER (WHERE status = 'time_limit') as time_limit,
         COUNT(*) FILTER (WHERE status = 'memory_limit') as memory_limit,
         AVG(score) as avg_score,
         AVG(time_used) as avg_time
       FROM code_submissions
       WHERE question_id = $1`,
      [questionId]
    );
    return result.rows[0];
  }

  /**
   * Get leaderboard for a question
   */
  async getLeaderboard(questionId, limit = 50) {
    const result = await db.query(
      `SELECT
         s.student_id as user_id,
         u.real_name as user_name,
         MAX(s.score) as best_score,
         MIN(s.time_used) FILTER (WHERE s.status = 'accepted') as best_time,
         COUNT(*) as attempts,
         MAX(s.submitted_at) as last_submission
       FROM code_submissions s
       LEFT JOIN users u ON s.student_id = u.id
       WHERE s.question_id = $1
       GROUP BY s.student_id, u.real_name
       ORDER BY best_score DESC, best_time ASC
       LIMIT $2`,
      [questionId, limit]
    );
    return result.rows;
  }
}

module.exports = new SubmissionModel();
