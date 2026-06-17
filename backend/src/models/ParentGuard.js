const { query } = require('../database/connection');

/**
 * ParentGuard Model (E4 家长-学生关系)
 * 一个学生只关联一个家长（student_user_id 唯一）。
 */
class ParentGuard {
  /**
   * 获取家长关联的孩子列表
   */
  static async getChildren(parentUserId) {
    const r = await query(
      `SELECT psr.student_user_id, psr.relation, psr.created_at,
              u.username, u.real_name, u.phone,
              s.grade, s.class, s.student_no
       FROM parent_student_relations psr
       JOIN users u ON psr.student_user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE psr.parent_user_id = $1
       ORDER BY psr.created_at DESC`,
      [parentUserId]
    );
    return r.rows;
  }

  /**
   * 校验家长是否关联某学生
   */
  static async isGuardian(parentUserId, studentUserId) {
    const r = await query(
      'SELECT 1 FROM parent_student_relations WHERE parent_user_id = $1 AND student_user_id = $2',
      [parentUserId, studentUserId]
    );
    return !!r.rows[0];
  }

  /**
   * 建立关联（管理端/系统调用）
   */
  static async link(parentUserId, studentUserId, relation) {
    const r = await query(
      `INSERT INTO parent_student_relations (parent_user_id, student_user_id, relation)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_user_id) DO UPDATE SET
         parent_user_id = EXCLUDED.parent_user_id,
         relation = EXCLUDED.relation
       RETURNING *`,
      [parentUserId, studentUserId, relation || null]
    );
    return r.rows[0];
  }

  /**
   * 解除关联
   */
  static async unlink(parentUserId, studentUserId) {
    const r = await query(
      'DELETE FROM parent_student_relations WHERE parent_user_id = $1 AND student_user_id = $2 RETURNING *',
      [parentUserId, studentUserId]
    );
    return r.rows[0];
  }
}

module.exports = ParentGuard;
