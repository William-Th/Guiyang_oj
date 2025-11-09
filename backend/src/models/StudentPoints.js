const { pool } = require('../database/connection');

/**
 * StudentPoints Model
 * 学生积分数据模型 - 管理积分账户和交易
 */
class StudentPoints {
  /**
   * 获取学生积分账户信息
   * @param {number} studentId
   * @returns {Promise<Object>}
   */
  static async getPointsAccount(studentId) {
    const result = await pool.query(
      `
      SELECT
        student_id,
        current_points,
        total_points,
        spent_points,
        frozen_points,
        last_updated
      FROM student_points
      WHERE student_id = $1
      `,
      [studentId]
    );
    return result.rows[0];
  }

  /**
   * 获取学生积分交易历史
   * @param {number} studentId
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>}
   */
  static async getTransactionHistory(studentId, filters = {}) {
    let query = `
      SELECT
        transaction_id,
        points_change,
        transaction_type,
        source_id,
        source_type,
        description,
        balance_before,
        balance_after,
        expires_at,
        is_expired,
        created_at
      FROM points_transactions
      WHERE student_id = $1
    `;

    const params = [studentId];
    let paramCount = 2;

    if (filters.transactionType) {
      query += ` AND transaction_type = $${paramCount}`;
      params.push(filters.transactionType);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * 添加积分
   * @param {number} studentId
   * @param {number} points
   * @param {string} transactionType
   * @param {Object} metadata - {sourceId, sourceType, description, expiresAt}
   * @returns {Promise<Object>}
   */
  static async addPoints(studentId, points, transactionType, metadata = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 获取当前积分
      const accountResult = await client.query(
        'SELECT current_points, total_points FROM student_points WHERE student_id = $1 FOR UPDATE',
        [studentId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Student points account not found');
      }

      const { current_points, total_points } = accountResult.rows[0];
      const newCurrentPoints = current_points + points;
      const newTotalPoints = total_points + points;

      // 更新积分账户
      await client.query(
        `
        UPDATE student_points
        SET current_points = $1,
            total_points = $2,
            last_updated = CURRENT_TIMESTAMP
        WHERE student_id = $3
        `,
        [newCurrentPoints, newTotalPoints, studentId]
      );

      // 记录交易
      const transactionResult = await client.query(
        `
        INSERT INTO points_transactions (
          student_id,
          points_change,
          transaction_type,
          source_id,
          source_type,
          description,
          balance_before,
          balance_after,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        `,
        [
          studentId,
          points,
          transactionType,
          metadata.sourceId || null,
          metadata.sourceType || null,
          metadata.description || '',
          current_points,
          newCurrentPoints,
          metadata.expiresAt || null
        ]
      );

      await client.query('COMMIT');
      return transactionResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 扣除积分
   * @param {number} studentId
   * @param {number} points
   * @param {string} transactionType
   * @param {Object} metadata
   * @returns {Promise<Object>}
   */
  static async deductPoints(studentId, points, transactionType, metadata = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 获取当前积分
      const accountResult = await client.query(
        'SELECT current_points, spent_points FROM student_points WHERE student_id = $1 FOR UPDATE',
        [studentId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Student points account not found');
      }

      const { current_points, spent_points } = accountResult.rows[0];

      if (current_points < points) {
        throw new Error('Insufficient points');
      }

      const newCurrentPoints = current_points - points;
      const newSpentPoints = spent_points + points;

      // 更新积分账户
      await client.query(
        `
        UPDATE student_points
        SET current_points = $1,
            spent_points = $2,
            last_updated = CURRENT_TIMESTAMP
        WHERE student_id = $3
        `,
        [newCurrentPoints, newSpentPoints, studentId]
      );

      // 记录交易
      const transactionResult = await client.query(
        `
        INSERT INTO points_transactions (
          student_id,
          points_change,
          transaction_type,
          source_id,
          source_type,
          description,
          balance_before,
          balance_after
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
          studentId,
          -points,
          transactionType,
          metadata.sourceId || null,
          metadata.sourceType || null,
          metadata.description || '',
          current_points,
          newCurrentPoints
        ]
      );

      await client.query('COMMIT');
      return transactionResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取排行榜
   * @param {string} leaderboardType - weekly/monthly/total
   * @param {string} scope - 范围
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async getLeaderboard(leaderboardType, scope = null, limit = 100) {
    let query = `
      SELECT
        student_id,
        student_name,
        school_name,
        class_name,
        points,
        rank,
        rank_change,
        period_start,
        period_end
      FROM leaderboards
      WHERE leaderboard_type = $1
    `;

    const params = [leaderboardType];
    let paramCount = 2;

    if (scope) {
      query += ` AND scope = $${paramCount}`;
      params.push(scope);
      paramCount++;
    }

    query += ` ORDER BY rank ASC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = StudentPoints;
