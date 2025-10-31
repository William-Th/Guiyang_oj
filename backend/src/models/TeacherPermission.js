const { query } = require('../database/connection');

class TeacherPermission {
  /**
   * 创建教师权限
   */
  static async create(permissionData) {
    const {
      user_id,
      permission_type,
      subjects,
      granted_by,
      expires_at,
      notes
    } = permissionData;

    const sql = `
      INSERT INTO teacher_permissions
      (user_id, permission_type, subjects, granted_by, expires_at, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, permission_type)
      DO UPDATE SET
        subjects = $3,
        granted_by = $4,
        expires_at = $5,
        notes = $6,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await query(sql, [
      user_id,
      permission_type,
      subjects,
      granted_by,
      expires_at,
      notes
    ]);

    return result.rows[0];
  }

  /**
   * 获取用户的所有权限
   */
  static async getByUserId(userId) {
    const sql = `
      SELECT tp.*, u.real_name as granted_by_name
      FROM teacher_permissions tp
      LEFT JOIN users u ON tp.granted_by = u.id
      WHERE tp.user_id = $1 AND tp.is_active = true
      AND (tp.expires_at IS NULL OR tp.expires_at > CURRENT_TIMESTAMP)
      ORDER BY tp.created_at DESC
    `;

    const result = await query(sql, [userId]);
    return result.rows;
  }

  /**
   * 检查用户是否有特定权限
   */
  static async hasPermission(userId, permissionType, subject = null) {
    let sql = `
      SELECT COUNT(*) as count
      FROM teacher_permissions
      WHERE user_id = $1
      AND permission_type = $2
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;

    const params = [userId, permissionType];

    if (subject) {
      sql += ` AND $3 = ANY(subjects)`;
      params.push(subject);
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * 获取有特定权限的所有用户
   */
  static async getUsersByPermission(permissionType, subject = null) {
    let sql = `
      SELECT DISTINCT u.id, u.username, u.real_name, u.role, tp.subjects
      FROM teacher_permissions tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.permission_type = $1
      AND tp.is_active = true
      AND (tp.expires_at IS NULL OR tp.expires_at > CURRENT_TIMESTAMP)
    `;

    const params = [permissionType];

    if (subject) {
      sql += ` AND $2 = ANY(tp.subjects)`;
      params.push(subject);
    }

    sql += ` ORDER BY u.real_name`;

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * 撤销权限
   */
  static async revoke(userId, permissionType) {
    const sql = `
      UPDATE teacher_permissions
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND permission_type = $2
      RETURNING *
    `;

    const result = await query(sql, [userId, permissionType]);
    return result.rows[0];
  }

  /**
   * 获取所有权限列表（管理员用）
   */
  static async getAll(filters = {}) {
    let sql = `
      SELECT tp.*,
        u.username, u.real_name, u.role,
        g.real_name as granted_by_name
      FROM teacher_permissions tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN users g ON tp.granted_by = g.id
    `;

    const params = [];
    let paramCount = 0;
    const whereClauses = ['1=1'];

    if (filters.is_active !== undefined) {
      paramCount++;
      whereClauses.push(`tp.is_active = $${paramCount}`);
      params.push(filters.is_active);
    }

    if (filters.permission_type) {
      paramCount++;
      whereClauses.push(`tp.permission_type = $${paramCount}`);
      params.push(filters.permission_type);
    }

    // 区级管理员只能看到该区域内的教师权限
    if (filters.managementScope && filters.managementScope.role === 'district_admin') {
      const districtId = filters.managementScope.districtId;
      if (districtId) {
        paramCount++;
        whereClauses.push(`u.id IN (
          SELECT DISTINCT t.user_id
          FROM teachers t
          WHERE t.school_id IN (SELECT id FROM schools WHERE district_id = $${paramCount})
        )`);
        params.push(districtId);
      }
    }

    // 校级管理员只能看到该校的教师权限
    if (filters.managementScope &&
        (filters.managementScope.role === 'school_admin' ||
         filters.managementScope.role === 'base_school_admin' ||
         filters.managementScope.role === 'municipal_school_admin')) {
      const schoolId = filters.managementScope.schoolId;
      if (schoolId) {
        paramCount++;
        whereClauses.push(`u.id IN (
          SELECT user_id FROM teachers WHERE school_id = $${paramCount}
        )`);
        params.push(schoolId);
      }
    }

    sql += ` WHERE ${whereClauses.join(' AND ')}`;
    sql += ` ORDER BY tp.created_at DESC`;

    const result = await query(sql, params);
    return result.rows;
  }
}

module.exports = TeacherPermission;
