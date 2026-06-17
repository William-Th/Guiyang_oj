const { query } = require('../database/connection');

const DEFAULT_QUOTA = 1000;

/**
 * QuestionQuota Model (C4 教师题目配额)
 * 默认 1000 道；市级管理员可针对教师调整额度。
 * 计数口径：question_drafts.is_active 且 created_by = 教师 的题目数
 */
class QuestionQuota {
  /**
   * 获取教师配额（无记录则返回默认值）
   * @param {number} userId
   * @returns {Promise<number>}
   */
  static async getQuota(userId) {
    const r = await query(
      'SELECT quota FROM teacher_quotas WHERE user_id = $1',
      [userId]
    );
    if (!r.rows[0]) return DEFAULT_QUOTA;
    return r.rows[0].quota;
  }

  /**
   * 设置/更新教师配额（upsert）
   * @param {number} userId
   * @param {number} quota
   * @param {number} grantedBy
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  static async setQuota(userId, quota, grantedBy, reason) {
    const r = await query(
      `INSERT INTO teacher_quotas (user_id, quota, granted_by, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         quota = EXCLUDED.quota,
         granted_by = EXCLUDED.granted_by,
         granted_at = CURRENT_TIMESTAMP,
         reason = EXCLUDED.reason,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, quota, grantedBy, reason || null]
    );
    return r.rows[0];
  }

  /**
   * 统计教师已创建的题目数（草稿+已发布题目本体）
   * @param {number} userId
   * @returns {Promise<number>}
   */
  static async countOwned(userId) {
    const r = await query(
      `SELECT COUNT(*) AS count FROM question_drafts
       WHERE created_by = $1 AND is_active = true`,
      [userId]
    );
    return parseInt(r.rows[0].count, 10);
  }

  /**
   * 校验是否还能创建题目
   * @param {number} userId
   * @returns {Promise<Object>} { allowed, quota, owned, remaining }
   */
  static async checkCanCreate(userId) {
    const [quota, owned] = await Promise.all([
      QuestionQuota.getQuota(userId),
      QuestionQuota.countOwned(userId)
    ]);
    return {
      allowed: owned < quota,
      quota,
      owned,
      remaining: Math.max(0, quota - owned)
    };
  }

  static get DEFAULT_QUOTA() {
    return DEFAULT_QUOTA;
  }
}

module.exports = QuestionQuota;
