/**
 * Announcement Model
 * 系统公告模型
 */

const { query } = require('../database/connection');

class Announcement {
  /**
   * 创建公告
   * @param {Object} data - 公告数据
   * @returns {Object} 创建的公告
   */
  static async create(data) {
    const {
      title,
      content,
      summary,
      type = 'notice',
      target_audience = 'all',
      target_district_id,
      target_school_id,
      is_pinned = false,
      is_popup = false,
      start_time,
      end_time,
      created_by
    } = data;

    const result = await query(
      `INSERT INTO system_announcements
       (title, content, summary, type, target_audience, target_district_id, target_school_id,
        is_pinned, is_popup, start_time, end_time, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [title, content, summary, type, target_audience, target_district_id, target_school_id,
        is_pinned, is_popup, start_time, end_time, created_by]
    );

    return result.rows[0];
  }

  /**
   * 更新公告
   * @param {number} id - 公告ID
   * @param {Object} data - 更新数据
   * @returns {Object} 更新后的公告
   */
  static async update(id, data) {
    const allowedFields = [
      'title', 'content', 'summary', 'type', 'target_audience',
      'target_district_id', 'target_school_id', 'is_pinned', 'is_popup',
      'start_time', 'end_time', 'status'
    ];

    const updates = [];
    const params = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        params.push(data[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return null;
    }

    params.push(id);

    const result = await query(
      `UPDATE system_announcements
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  /**
   * 发布公告
   * @param {number} id - 公告ID
   * @returns {Object} 发布后的公告
   */
  static async publish(id) {
    const result = await query(
      `UPDATE system_announcements
       SET status = 'published', published_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'draft'
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * 归档公告
   * @param {number} id - 公告ID
   * @returns {Object} 归档后的公告
   */
  static async archive(id) {
    const result = await query(
      `UPDATE system_announcements
       SET status = 'archived'
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * 获取公告详情
   * @param {number} id - 公告ID
   * @returns {Object} 公告详情
   */
  static async findById(id) {
    const result = await query(
      `SELECT a.*, u.real_name as creator_name
       FROM system_announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * 获取公告列表（管理后台）
   * @param {Object} options - 查询选项
   * @returns {Object} 公告列表和分页信息
   */
  static async findAll(options = {}) {
    const {
      status,
      type,
      target_audience,
      page = 1,
      page_size = 20
    } = options;

    let sql = `
      SELECT a.*, u.real_name as creator_name
      FROM system_announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      sql += ` AND a.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (target_audience) {
      sql += ` AND a.target_audience = $${paramIndex}`;
      params.push(target_audience);
      paramIndex++;
    }

    // 获取总数
    const countResult = await query(
      sql.replace('SELECT a.*, u.real_name as creator_name', 'SELECT COUNT(*)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 分页查询
    sql += ' ORDER BY a.is_pinned DESC, a.published_at DESC NULLS LAST, a.created_at DESC';
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
   * 获取用户可见的公告列表
   * @param {Object} user - 用户信息
   * @param {Object} options - 查询选项
   * @returns {Array} 公告列表
   */
  static async findForUser(user, options = {}) {
    const { page = 1, page_size = 10, include_read = true } = options;

    // 构建基础WHERE条件
    let whereClause = `
      WHERE a.status = 'published'
        AND (a.target_audience = 'all' OR a.target_audience = $2)
        AND (a.start_time IS NULL OR a.start_time <= CURRENT_TIMESTAMP)
        AND (a.end_time IS NULL OR a.end_time > CURRENT_TIMESTAMP)
    `;
    const baseParams = [user.id, user.role];

    if (!include_read) {
      whereClause += ' AND ar.read_at IS NULL';
    }

    // 获取总数
    const countSql = `
      SELECT COUNT(*) FROM system_announcements a
      LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = $1
      ${whereClause}
    `;
    const countResult = await query(countSql, baseParams);
    const total = parseInt(countResult.rows[0].count || 0);

    // 分页查询
    const dataSql = `
      SELECT a.*,
             ar.read_at IS NOT NULL as is_read
      FROM system_announcements a
      LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = $1
      ${whereClause}
      ORDER BY a.is_pinned DESC, a.published_at DESC
      LIMIT $3 OFFSET $4
    `;
    const dataParams = [...baseParams, page_size, (page - 1) * page_size];
    const result = await query(dataSql, dataParams);

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
   * 获取需要弹窗显示的公告
   * @param {Object} user - 用户信息
   * @returns {Array} 弹窗公告列表
   */
  static async findPopupForUser(user) {
    const result = await query(
      `SELECT a.*
       FROM system_announcements a
       LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = $1
       WHERE a.status = 'published'
         AND a.is_popup = TRUE
         AND ar.read_at IS NULL
         AND (a.target_audience = 'all' OR a.target_audience = $2)
         AND (a.start_time IS NULL OR a.start_time <= CURRENT_TIMESTAMP)
         AND (a.end_time IS NULL OR a.end_time > CURRENT_TIMESTAMP)
       ORDER BY a.published_at DESC
       LIMIT 5`,
      [user.id, user.role]
    );
    return result.rows;
  }

  /**
   * 标记公告为已读
   * @param {number} announcementId - 公告ID
   * @param {number} userId - 用户ID
   * @returns {boolean} 是否成功
   */
  static async markAsRead(announcementId, userId) {
    try {
      await query(
        `INSERT INTO announcement_reads (announcement_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (announcement_id, user_id) DO NOTHING`,
        [announcementId, userId]
      );
      return true;
    } catch (error) {
      console.error('Mark announcement as read error:', error);
      return false;
    }
  }

  /**
   * 获取未读公告数量
   * @param {Object} user - 用户信息
   * @returns {number} 未读数量
   */
  static async getUnreadCount(user) {
    const result = await query(
      `SELECT COUNT(*) FROM system_announcements a
       LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = $1
       WHERE a.status = 'published'
         AND ar.read_at IS NULL
         AND (a.target_audience = 'all' OR a.target_audience = $2)
         AND (a.start_time IS NULL OR a.start_time <= CURRENT_TIMESTAMP)
         AND (a.end_time IS NULL OR a.end_time > CURRENT_TIMESTAMP)`,
      [user.id, user.role]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * 删除公告
   * @param {number} id - 公告ID
   * @returns {boolean} 是否删除成功
   */
  static async delete(id) {
    const result = await query(
      'DELETE FROM system_announcements WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  }
}

module.exports = Announcement;
