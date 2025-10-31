const { query } = require('../database/connection');

class QuestionReview {
  /**
   * 创建审核记录
   */
  static async create(reviewData) {
    const {
      question_id,
      reviewer_id,
      status,
      comment
    } = reviewData;

    const sql = `
      INSERT INTO question_reviews
      (question_id, reviewer_id, status, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await query(sql, [
      question_id,
      reviewer_id,
      status,
      comment
    ]);

    return result.rows[0];
  }

  /**
   * 获取题目的审核历史
   */
  static async getByQuestionId(questionId) {
    const sql = `
      SELECT qr.*, u.real_name as reviewer_name, u.username
      FROM question_reviews qr
      JOIN users u ON qr.reviewer_id = u.id
      WHERE qr.question_id = $1
      ORDER BY qr.reviewed_at DESC
    `;

    const result = await query(sql, [questionId]);
    return result.rows;
  }

  /**
   * 获取审核人的待审核列表
   */
  static async getPendingByReviewer(reviewerId) {
    const sql = `
      SELECT qb.*, u.real_name as creator_name
      FROM question_bank qb
      JOIN users u ON qb.created_by = u.id
      WHERE qb.reviewer_id = $1
      AND qb.status = 'pending_review'
      AND qb.is_active = true
      ORDER BY qb.created_at DESC
    `;

    const result = await query(sql, [reviewerId]);
    return result.rows;
  }

  /**
   * 获取审核统计
   */
  static async getStatsByReviewer(reviewerId, dateFrom = null, dateTo = null) {
    let sql = `
      SELECT
        status,
        COUNT(*) as count
      FROM question_reviews
      WHERE reviewer_id = $1
    `;

    const params = [reviewerId];
    let paramCount = 1;

    if (dateFrom) {
      paramCount++;
      sql += ` AND reviewed_at >= $${paramCount}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      sql += ` AND reviewed_at <= $${paramCount}`;
      params.push(dateTo);
    }

    sql += ` GROUP BY status`;

    const result = await query(sql, params);
    return result.rows;
  }
}

module.exports = QuestionReview;
