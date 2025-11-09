const pool = require('../config/database');

/**
 * Achievement Model
 * 成就数据模型 - 管理成就定义和学生成就记录
 */
class Achievement {
  /**
   * 获取所有成就定义
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>}
   */
  static async getAllAchievements(filters = {}) {
    let query = `
      SELECT
        achievement_id,
        achievement_code,
        achievement_name,
        achievement_desc,
        achievement_icon,
        category,
        subcategory,
        rarity,
        points_reward,
        trigger_condition,
        is_hidden,
        is_active,
        max_times,
        cooldown_days,
        valid_from,
        valid_to,
        display_order,
        created_at,
        updated_at
      FROM achievements
      WHERE is_active = TRUE
    `;

    const params = [];
    let paramCount = 1;

    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    if (filters.rarity) {
      query += ` AND rarity = $${paramCount}`;
      params.push(filters.rarity);
      paramCount++;
    }

    query += ' ORDER BY display_order, created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * 根据ID获取成就详情
   * @param {number} achievementId
   * @returns {Promise<Object>}
   */
  static async getAchievementById(achievementId) {
    const result = await pool.query(
      'SELECT * FROM achievements WHERE achievement_id = $1',
      [achievementId]
    );
    return result.rows[0];
  }

  /**
   * 获取学生的成就记录
   * @param {number} studentId
   * @returns {Promise<Array>}
   */
  static async getStudentAchievements(studentId) {
    const result = await pool.query(
      `
      SELECT
        sa.id,
        sa.achievement_id,
        sa.achieved_at,
        sa.points_awarded,
        sa.is_displayed,
        sa.times_achieved,
        a.achievement_code,
        a.achievement_name,
        a.achievement_desc,
        a.achievement_icon,
        a.category,
        a.rarity
      FROM student_achievements sa
      JOIN achievements a ON sa.achievement_id = a.achievement_id
      WHERE sa.student_id = $1
      ORDER BY sa.achieved_at DESC
      `,
      [studentId]
    );
    return result.rows;
  }

  /**
   * 授予学生成就
   * @param {number} studentId
   * @param {number} achievementId
   * @param {number} pointsAwarded
   * @returns {Promise<Object>}
   */
  static async awardAchievement(studentId, achievementId, pointsAwarded) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 插入成就记录
      const result = await client.query(
        `
        INSERT INTO student_achievements (student_id, achievement_id, points_awarded)
        VALUES ($1, $2, $3)
        ON CONFLICT (student_id, achievement_id)
        DO UPDATE SET times_achieved = student_achievements.times_achieved + 1
        RETURNING *
        `,
        [studentId, achievementId, pointsAwarded]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取学生成就进度
   * @param {number} studentId
   * @returns {Promise<Array>}
   */
  static async getStudentProgress(studentId) {
    const result = await pool.query(
      `
      SELECT
        ap.id,
        ap.achievement_id,
        ap.current_value,
        ap.target_value,
        ap.progress_percentage,
        ap.last_updated,
        a.achievement_code,
        a.achievement_name,
        a.achievement_desc,
        a.achievement_icon,
        a.category,
        a.rarity
      FROM achievement_progress ap
      JOIN achievements a ON ap.achievement_id = a.achievement_id
      WHERE ap.student_id = $1 AND ap.progress_percentage < 100
      ORDER BY ap.progress_percentage DESC
      `,
      [studentId]
    );
    return result.rows;
  }

  /**
   * 更新成就进度
   * @param {number} studentId
   * @param {number} achievementId
   * @param {number} currentValue
   * @param {number} targetValue
   * @returns {Promise<Object>}
   */
  static async updateProgress(studentId, achievementId, currentValue, targetValue) {
    const result = await pool.query(
      `
      INSERT INTO achievement_progress (student_id, achievement_id, current_value, target_value)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (student_id, achievement_id)
      DO UPDATE SET
        current_value = $3,
        target_value = $4,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [studentId, achievementId, currentValue, targetValue]
    );
    return result.rows[0];
  }
}

module.exports = Achievement;
