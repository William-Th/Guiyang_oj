const { query } = require('../database/connection');

class TeacherPermission {
  /**
   * 创建教师权限（支持新的 scope_level, district_id, school_id）
   */
  static async create(permissionData) {
    const {
      user_id,
      permission_type,
      subjects,
      scope_level,
      district_id,
      school_id,
      granted_by,
      expires_at,
      notes
    } = permissionData;

    const sql = `
      INSERT INTO teacher_permissions
      (user_id, permission_type, subjects, scope_level, district_id, school_id, granted_by, expires_at, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, permission_type, scope_level, district_id)
      DO UPDATE SET
        subjects = $3,
        school_id = $6,
        granted_by = $7,
        expires_at = $8,
        notes = $9,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await query(sql, [
      user_id,
      permission_type,
      subjects,
      scope_level || 'municipal', // 默认为市级权限
      district_id || null,
      school_id || null,
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
      sql += ' AND $3 = ANY(subjects)';
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
      sql += ' AND $2 = ANY(tp.subjects)';
      params.push(subject);
    }

    sql += ' ORDER BY u.real_name';

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
    sql += ' ORDER BY tp.created_at DESC';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * 授予区级权限（自动关联 district_id）
   */
  static async grantDistrictPermission(userId, subjects, grantedBy, districtId) {
    return await this.create({
      user_id: userId,
      permission_type: 'practice_district_review',
      subjects,
      scope_level: 'district',
      district_id: districtId,
      granted_by: grantedBy,
      notes: '区级练习题库审核权限'
    });
  }

  /**
   * 获取特定 scope 的审核人列表
   * @param {string} targetScope - 目标scope (如: 'assessment', 'practice_municipal', 'practice_district_BY')
   * @param {string} subject - 科目
   * @returns {Promise<Array>} 审核人列表
   */
  static async getReviewersForScope(targetScope, subject) {
    let permissionType;
    let districtCode = null;

    // 根据 targetScope 确定权限类型
    if (targetScope === 'assessment') {
      permissionType = 'assessment_review';
    } else if (targetScope === 'practice_municipal') {
      permissionType = 'practice_municipal_review';
    } else if (targetScope.startsWith('practice_district_')) {
      permissionType = 'practice_district_review';
      districtCode = targetScope.replace('practice_district_', '');
    } else if (targetScope.startsWith('practice_school_')) {
      // 校级题库不需要审核
      return [];
    } else {
      return [];
    }

    let sql = `
      SELECT DISTINCT
        u.id,
        u.username,
        u.real_name,
        u.role,
        tp.subjects,
        tp.scope_level,
        tp.district_id,
        d.name as district_name
      FROM teacher_permissions tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN districts d ON tp.district_id = d.id
      WHERE tp.permission_type = $1
        AND tp.is_active = true
        AND (tp.expires_at IS NULL OR tp.expires_at > CURRENT_TIMESTAMP)
        AND $2 = ANY(tp.subjects)
    `;

    const params = [permissionType, subject];

    // 如果是区级权限，需要匹配区域
    if (districtCode) {
      sql += ' AND d.code = $3';
      params.push(districtCode);
    }

    sql += ' ORDER BY u.real_name';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * 验证审核人是否有权限审核某题目
   * @param {number} reviewerId - 审核人ID
   * @param {number} questionId - 题目ID
   * @param {string} targetScope - 目标scope
   * @returns {Promise<boolean>}
   */
  static async canReviewQuestion(reviewerId, questionId, targetScope) {
    // 获取题目信息
    const questionSql = `
      SELECT subject, created_by
      FROM question_bank
      WHERE id = $1 AND is_active = true
    `;
    const questionResult = await query(questionSql, [questionId]);

    if (questionResult.rows.length === 0) {
      return false;
    }

    const { subject } = questionResult.rows[0];

    // 获取审核人列表
    const reviewers = await this.getReviewersForScope(targetScope, subject);

    // 检查审核人是否在列表中
    return reviewers.some(r => r.id === reviewerId);
  }

  /**
   * 获取用户的管理范围（用于区级管理员）
   * @param {number} userId - 用户ID
   * @returns {Promise<Object|null>} { districtId, districtName, schoolId, schoolName }
   */
  static async getUserManagementScope(userId) {
    const sql = `
      SELECT
        ap.district_id,
        d.name as district_name,
        ap.school_id,
        s.name as school_name
      FROM admin_permissions ap
      LEFT JOIN districts d ON ap.district_id = d.id
      LEFT JOIN schools s ON ap.school_id = s.id
      WHERE ap.user_id = $1
      LIMIT 1
    `;

    const result = await query(sql, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 获取区域内的教师列表（用于区级管理员授权）
   * @param {number|null} districtId - 区域ID，null 表示获取全市教师
   * @returns {Promise<Array>}
   */
  static async getTeachersByDistrict(districtId) {
    let sql = `
      SELECT DISTINCT
        u.id,
        u.username,
        u.real_name,
        u.role,
        t.subjects,
        s.name as school_name,
        d.name as district_name
      FROM users u
      JOIN teachers t ON u.id = t.user_id
      JOIN schools s ON t.school_id = s.id
      JOIN districts d ON s.district_id = d.id
      WHERE u.role = 'teacher'
        AND u.status = 'active'
    `;

    const params = [];

    // 如果指定了 districtId，则过滤特定区域
    if (districtId !== null && districtId !== undefined) {
      sql += ' AND s.district_id = $1';
      params.push(districtId);
    }

    sql += ' ORDER BY u.real_name';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * 撤销特定的区级权限
   * @param {number} userId - 用户ID
   * @param {number} districtId - 区域ID
   */
  static async revokeDistrictPermission(userId, districtId) {
    const sql = `
      UPDATE teacher_permissions
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND permission_type = 'practice_district_review'
        AND district_id = $2
      RETURNING *
    `;

    const result = await query(sql, [userId, districtId]);
    return result.rows[0];
  }

  /**
   * 根据ID获取权限详情
   * @param {number} permissionId - 权限ID
   */
  static async getById(permissionId) {
    const sql = `
      SELECT tp.*,
        u.username, u.real_name, u.role,
        g.real_name as granted_by_name,
        d.name as district_name,
        s.name as school_name
      FROM teacher_permissions tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN users g ON tp.granted_by = g.id
      LEFT JOIN districts d ON tp.district_id = d.id
      LEFT JOIN schools s ON tp.school_id = s.id
      WHERE tp.id = $1
    `;

    const result = await query(sql, [permissionId]);
    return result.rows[0];
  }

  /**
   * 删除权限（物理删除）
   * @param {number} permissionId - 权限ID
   */
  static async deleteById(permissionId) {
    const sql = `
      DELETE FROM teacher_permissions
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [permissionId]);
    return result.rows[0];
  }
}

module.exports = TeacherPermission;
