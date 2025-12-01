/**
 * Notification Model
 * 用户通知模型
 */

const { query } = require('../database/connection');

class Notification {
  /**
   * 创建通知
   * @param {Object} data - 通知数据
   * @returns {Object} 创建的通知
   */
  static async create(data) {
    const {
      user_id,
      type = 'system',
      title,
      content,
      metadata = {},
      related_type,
      related_id,
      priority = 3,
      expires_at
    } = data;

    const result = await query(
      `INSERT INTO user_notifications
       (user_id, type, title, content, metadata, related_type, related_id, priority, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [user_id, type, title, content, JSON.stringify(metadata), related_type, related_id, priority, expires_at]
    );

    return result.rows[0];
  }

  /**
   * 批量创建通知（发送给多个用户）
   * @param {Array<number>} userIds - 用户ID列表
   * @param {Object} notificationData - 通知数据
   * @returns {Array} 创建的通知列表
   */
  static async createBatch(userIds, notificationData) {
    const {
      type = 'system',
      title,
      content,
      metadata = {},
      related_type,
      related_id,
      priority = 3,
      expires_at
    } = notificationData;

    if (!userIds || userIds.length === 0) {
      return [];
    }

    // 构建批量插入语句
    const values = userIds.map((userId, index) => {
      const offset = index * 9;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
    }).join(', ');

    const params = userIds.flatMap(userId => [
      userId, type, title, content, JSON.stringify(metadata), related_type, related_id, priority, expires_at
    ]);

    const result = await query(
      `INSERT INTO user_notifications
       (user_id, type, title, content, metadata, related_type, related_id, priority, expires_at)
       VALUES ${values}
       RETURNING *`,
      params
    );

    return result.rows;
  }

  /**
   * 获取用户通知列表
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Object} 通知列表和分页信息
   */
  static async findByUserId(userId, options = {}) {
    const {
      type,
      is_read,
      page = 1,
      page_size = 20,
      include_expired = false
    } = options;

    let sql = `
      SELECT * FROM user_notifications
      WHERE user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (type) {
      sql += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (is_read !== undefined) {
      sql += ` AND is_read = $${paramIndex}`;
      params.push(is_read);
      paramIndex++;
    }

    if (!include_expired) {
      sql += ' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)';
    }

    // 获取总数
    const countResult = await query(
      sql.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 分页查询
    sql += ' ORDER BY priority DESC, created_at DESC';
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(page_size, (page - 1) * page_size);

    const result = await query(sql, params);

    return {
      data: result.rows,
      pagination: {
        page,
        page_size,
        total,
        total_pages: Math.ceil(total / page_size)
      }
    };
  }

  /**
   * 获取未读通知数量
   * @param {number} userId - 用户ID
   * @returns {number} 未读数量
   */
  static async getUnreadCount(userId) {
    const result = await query(
      `SELECT COUNT(*) FROM user_notifications
       WHERE user_id = $1 AND is_read = FALSE
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * 标记通知为已读
   * @param {number} notificationId - 通知ID
   * @param {number} userId - 用户ID（确保只能操作自己的通知）
   * @returns {Object} 更新后的通知
   */
  static async markAsRead(notificationId, userId) {
    const result = await query(
      `UPDATE user_notifications
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0];
  }

  /**
   * 批量标记为已读
   * @param {Array<number>} notificationIds - 通知ID列表
   * @param {number} userId - 用户ID
   * @returns {number} 更新的数量
   */
  static async markBatchAsRead(notificationIds, userId) {
    if (!notificationIds || notificationIds.length === 0) {
      return 0;
    }

    const result = await query(
      `UPDATE user_notifications
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1) AND user_id = $2 AND is_read = FALSE
       RETURNING id`,
      [notificationIds, userId]
    );
    return result.rows.length;
  }

  /**
   * 标记所有通知为已读
   * @param {number} userId - 用户ID
   * @param {string} type - 可选，只标记特定类型
   * @returns {number} 更新的数量
   */
  static async markAllAsRead(userId, type = null) {
    let sql = `
      UPDATE user_notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = FALSE
    `;
    const params = [userId];

    if (type) {
      sql += ' AND type = $2';
      params.push(type);
    }

    sql += ' RETURNING id';

    const result = await query(sql, params);
    return result.rows.length;
  }

  /**
   * 删除通知
   * @param {number} notificationId - 通知ID
   * @param {number} userId - 用户ID
   * @returns {boolean} 是否删除成功
   */
  static async delete(notificationId, userId) {
    const result = await query(
      `DELETE FROM user_notifications
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId]
    );
    return result.rows.length > 0;
  }

  /**
   * 批量删除通知
   * @param {Array<number>} notificationIds - 通知ID列表
   * @param {number} userId - 用户ID
   * @returns {number} 删除的数量
   */
  static async deleteBatch(notificationIds, userId) {
    if (!notificationIds || notificationIds.length === 0) {
      return 0;
    }

    const result = await query(
      `DELETE FROM user_notifications
       WHERE id = ANY($1) AND user_id = $2
       RETURNING id`,
      [notificationIds, userId]
    );
    return result.rows.length;
  }

  /**
   * 删除所有已读通知
   * @param {number} userId - 用户ID
   * @returns {number} 删除的数量
   */
  static async deleteAllRead(userId) {
    const result = await query(
      `DELETE FROM user_notifications
       WHERE user_id = $1 AND is_read = TRUE
       RETURNING id`,
      [userId]
    );
    return result.rows.length;
  }

  /**
   * 清理过期通知（定时任务使用）
   * @returns {number} 清理的数量
   */
  static async cleanupExpired() {
    const result = await query(
      `DELETE FROM user_notifications
       WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
       RETURNING id`
    );
    return result.rows.length;
  }
}

module.exports = Notification;
