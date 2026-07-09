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
    let sql = `
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
      sql += ` AND transaction_type = $${paramCount}`;
      params.push(filters.transactionType);
      paramCount++;
    }

    // earn/spend：按积分变动正负过滤（获得 > 0 / 消费 < 0）
    if (filters.earnSpend === 'earn') {
      sql += ` AND points_change > 0`;
    } else if (filters.earnSpend === 'spend') {
      sql += ` AND points_change < 0`;
    }

    if (filters.startDate) {
      sql += ` AND created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      sql += ` AND created_at <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      sql += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
      paramCount++;
    }

    const result = await pool.query(sql, params);
    return result.rows;
  }

  /**
   * 统计交易记录总数（与 getTransactionHistory 同过滤条件，用于分页）
   */
  static async countTransactionHistory(studentId, filters = {}) {
    let sql = `SELECT COUNT(*)::int AS total FROM points_transactions WHERE student_id = $1`;
    const params = [studentId];
    let paramCount = 2;

    if (filters.transactionType) {
      sql += ` AND transaction_type = $${paramCount}`;
      params.push(filters.transactionType);
      paramCount++;
    }
    if (filters.earnSpend === 'earn') {
      sql += ` AND points_change > 0`;
    } else if (filters.earnSpend === 'spend') {
      sql += ` AND points_change < 0`;
    }
    if (filters.startDate) {
      sql += ` AND created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }
    if (filters.endDate) {
      sql += ` AND created_at <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    const result = await pool.query(sql, params);
    return result.rows[0]?.total || 0;
  }

  /**
   * 积分汇总（供交易记录顶部卡片）：今日/本周获得、累计获得/消耗
   * 累计获得/消耗直接从 points_transactions 流水汇总，确保与交易记录列表完全一致
   * （student_points.total_points/spent_points 为 seed 历史值，与实际流水不符，故不采用）
   */
  static async getSummary(studentId) {
    const [aggRes, earnedTodayRes, earnedWeekRes] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(points_change) FILTER (WHERE points_change > 0), 0)::int AS total_earned,
           COALESCE(SUM(-points_change) FILTER (WHERE points_change < 0), 0)::int AS total_spent
         FROM points_transactions WHERE student_id = $1`,
        [studentId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(points_change), 0)::int AS v
         FROM points_transactions
         WHERE student_id = $1 AND points_change > 0 AND created_at >= CURRENT_DATE`,
        [studentId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(points_change), 0)::int AS v
         FROM points_transactions
         WHERE student_id = $1 AND points_change > 0
           AND created_at >= date_trunc('week', CURRENT_DATE)`,
        [studentId]
      )
    ]);
    return {
      todayEarned: earnedTodayRes.rows[0]?.v || 0,
      weekEarned: earnedWeekRes.rows[0]?.v || 0,
      totalEarned: aggRes.rows[0]?.total_earned || 0,
      totalSpent: aggRes.rows[0]?.total_spent || 0
    };
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
