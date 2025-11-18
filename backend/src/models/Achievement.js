const { pool } = require('../database/connection');

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
    const progressPercentage = targetValue > 0
      ? Math.round((currentValue / targetValue) * 100)
      : 0;

    const result = await pool.query(
      `
      INSERT INTO achievement_progress (
        student_id,
        achievement_id,
        current_value,
        target_value,
        progress_percentage
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (student_id, achievement_id)
      DO UPDATE SET
        current_value = $3,
        target_value = $4,
        progress_percentage = $5,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [studentId, achievementId, currentValue, targetValue, progressPercentage]
    );
    return result.rows[0];
  }

  /**
   * 创建成就
   * @param {Object} data - 成就数据
   * @returns {Promise<Object>}
   */
  static async createAchievement(data) {
    const {
      code,
      name,
      description,
      category,
      subcategory,
      rarity,
      icon,
      points,
      triggerCondition,
      isHidden,
      isActive,
      maxTimes,
      cooldownDays,
      validFrom,
      validTo,
      displayOrder,
      createdBy
    } = data;

    const result = await pool.query(
      `
      INSERT INTO achievements (
        achievement_code,
        achievement_name,
        achievement_desc,
        category,
        subcategory,
        rarity,
        achievement_icon,
        points_reward,
        trigger_condition,
        is_hidden,
        is_active,
        max_times,
        cooldown_days,
        valid_from,
        valid_to,
        display_order,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
      `,
      [
        code,
        name,
        description,
        category,
        subcategory || null,
        rarity || 'common',
        icon,
        points || 0,
        JSON.stringify(triggerCondition),
        isHidden !== undefined ? isHidden : false,
        isActive !== undefined ? isActive : true,
        maxTimes || 1,
        cooldownDays || null,
        validFrom || null,
        validTo || null,
        displayOrder || 0,
        createdBy || null
      ]
    );

    return result.rows[0];
  }

  /**
   * 更新成就
   * @param {number} achievementId
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>}
   */
  static async updateAchievement(achievementId, data) {
    const updates = [];
    const params = [];
    let paramCount = 1;

    // 动态构建更新字段
    const fieldMapping = {
      name: 'achievement_name',
      description: 'achievement_desc',
      category: 'category',
      subcategory: 'subcategory',
      rarity: 'rarity',
      icon: 'achievement_icon',
      points: 'points_reward',
      triggerCondition: 'trigger_condition',
      isHidden: 'is_hidden',
      isActive: 'is_active',
      maxTimes: 'max_times',
      cooldownDays: 'cooldown_days',
      validFrom: 'valid_from',
      validTo: 'valid_to',
      displayOrder: 'display_order'
    };

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && fieldMapping[key]) {
        const dbField = fieldMapping[key];

        // 特殊处理JSON字段
        if (key === 'triggerCondition') {
          updates.push(`${dbField} = $${paramCount}`);
          params.push(JSON.stringify(data[key]));
        } else {
          updates.push(`${dbField} = $${paramCount}`);
          params.push(data[key]);
        }

        paramCount++;
      }
    });

    if (updates.length === 0) {
      return null;
    }

    // 添加更新时间
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(achievementId);

    const query = `
      UPDATE achievements
      SET ${updates.join(', ')}
      WHERE achievement_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * 删除成就（软删除）
   * @param {number} achievementId
   * @returns {Promise<boolean>}
   */
  static async deleteAchievement(achievementId) {
    const result = await pool.query(
      `
      UPDATE achievements
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE achievement_id = $1
      RETURNING achievement_id
      `,
      [achievementId]
    );

    return result.rows.length > 0;
  }

  /**
   * 硬删除成就（仅用于测试/管理）
   * @param {number} achievementId
   * @returns {Promise<boolean>}
   */
  static async hardDeleteAchievement(achievementId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 删除相关的成就进度记录
      await client.query(
        'DELETE FROM achievement_progress WHERE achievement_id = $1',
        [achievementId]
      );

      // 删除相关的学生成就记录
      await client.query(
        'DELETE FROM student_achievements WHERE achievement_id = $1',
        [achievementId]
      );

      // 删除成就本身
      const result = await client.query(
        'DELETE FROM achievements WHERE achievement_id = $1 RETURNING achievement_id',
        [achievementId]
      );

      await client.query('COMMIT');
      return result.rows.length > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 检查学生是否已获得成就
   * @param {number} studentId
   * @param {number} achievementId
   * @returns {Promise<boolean>}
   */
  static async hasAchievement(studentId, achievementId) {
    const result = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM student_achievements
      WHERE student_id = $1 AND achievement_id = $2
      `,
      [studentId, achievementId]
    );

    return result.rows[0].count > 0;
  }

  /**
   * 获取成就统计信息
   * @param {number} achievementId
   * @returns {Promise<Object>}
   */
  static async getAchievementStats(achievementId) {
    const result = await pool.query(
      `
      SELECT
        COUNT(DISTINCT student_id) as total_students,
        SUM(times_achieved) as total_times,
        MAX(achieved_at) as last_achieved
      FROM student_achievements
      WHERE achievement_id = $1
      `,
      [achievementId]
    );

    return result.rows[0];
  }

  /**
   * 批量获取成就定义（用于管理后台）
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>}
   */
  static async getAchievementsWithPagination(options = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      rarity,
      isActive,
      searchTerm
    } = options;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (category) {
      conditions.push(`category = $${paramCount}`);
      params.push(category);
      paramCount++;
    }

    if (rarity) {
      conditions.push(`rarity = $${paramCount}`);
      params.push(rarity);
      paramCount++;
    }

    if (isActive !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      params.push(isActive);
      paramCount++;
    }

    if (searchTerm) {
      conditions.push(`(achievement_name ILIKE $${paramCount} OR achievement_desc ILIKE $${paramCount})`);
      params.push(`%${searchTerm}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // 获取总数
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM achievements ${whereClause}`,
      params
    );

    // 获取分页数据
    params.push(limit, offset);
    const dataResult = await pool.query(
      `
      SELECT * FROM achievements
      ${whereClause}
      ORDER BY display_order, created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `,
      params
    );

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  }
}

module.exports = Achievement;
