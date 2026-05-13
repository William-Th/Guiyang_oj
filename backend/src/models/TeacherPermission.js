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
        g.real_name as granted_by_name,
        d.name as district_name,
        s.name as school_name
      FROM teacher_permissions tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN users g ON tp.granted_by = g.id
      LEFT JOIN districts d ON tp.district_id = d.id
      LEFT JOIN schools s ON tp.school_id = s.id
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

    // 区级管理员只能看到该区域内的教师权限，且只能看到区级练习管理权限
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

        // 区级管理员只能看到区级练习管理权限，不能看到测评和市级练习管理权限
        whereClauses.push('tp.permission_type = \'practice_district_manage\'');
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
  static async grantDistrictPermission(userId, subjects, grantedBy, districtId, expiresAt = null, notes = null) {
    return await this.create({
      user_id: userId,
      permission_type: 'practice_district_manage',
      subjects,
      scope_level: 'district',
      district_id: districtId,
      granted_by: grantedBy,
      expires_at: expiresAt,
      notes: notes || '区级练习题库管理权限'
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
      permissionType = 'assessment_manage';
    } else if (targetScope === 'practice_municipal') {
      permissionType = 'practice_municipal_manage';
    } else if (targetScope.startsWith('practice_district_')) {
      permissionType = 'practice_district_manage';
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
        AND permission_type = 'practice_district_manage'
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

  /**
   * 检查用户是否有权限撤回某个题库发布记录
   * 撤回权限规则：
   * 1. 题目发布者本人 → 允许
   * 2. 系统管理员 / 市级管理员 → 允许
   * 3. 区级管理员 + 题目scope为本区 → 允许
   * 4. 拥有对应scope管理权限（_manage）的教师 → 允许
   * 5. 其他 → 拒绝
   * @param {number} userId - 当前用户ID
   * @param {Object} questionBankRecord - 题库发布记录（含 published_by, scope, subject 等）
   * @returns {Promise<boolean>}
   */
  static async canWithdrawQuestion(userId, questionBankRecord) {
    // 规则1：发布者本人
    if (questionBankRecord.published_by === userId) {
      return true;
    }

    // 获取用户角色
    const userSql = 'SELECT role FROM users WHERE id = $1';
    const userResult = await query(userSql, [userId]);
    if (userResult.rows.length === 0) return false;
    const userRole = userResult.rows[0].role;

    // 规则2：系统管理员 / 市级管理员
    if (userRole === 'system_admin' || userRole === 'municipal_admin') {
      return true;
    }

    // 规则3：区级管理员 + 题目scope为本区
    if (userRole === 'district_admin') {
      const scope = questionBankRecord.scope;
      if (scope && scope.startsWith('practice_district_')) {
        const managementScope = await this.getUserManagementScope(userId);
        if (managementScope && managementScope.district_id) {
          // 比较题目的 district_id 和管理员的 district_id
          if (questionBankRecord.district_id === managementScope.district_id) {
            return true;
          }
        }
      }
    }

    // 规则4：拥有对应scope管理权限的教师
    const scope = questionBankRecord.scope;
    let permissionType = null;
    if (scope === 'assessment') {
      permissionType = 'assessment_manage';
    } else if (scope === 'practice_municipal') {
      permissionType = 'practice_municipal_manage';
    } else if (scope && scope.startsWith('practice_district_')) {
      permissionType = 'practice_district_manage';
    } else if (scope === 'competition') {
      permissionType = 'competition_manage';
    }

    if (permissionType) {
      const hasManagePerm = await this.hasPermission(userId, permissionType, questionBankRecord.subject);
      if (hasManagePerm) return true;
    }

    // 规则5：其他 → 拒绝
    return false;
  }

  // ========================================
  // 练习活动发布权限相关方法
  // ========================================

  /**
   * 检查用户是否有特定范围的练习发布权限
   * @param {number} userId - 用户ID
   * @param {string} scope - 范围 (class, school, district, base_school, municipal_school, municipal)
   * @param {number|null} districtId - 区域ID (可选)
   * @param {number|null} schoolId - 学校ID (可选)
   * @returns {Promise<boolean>}
   */
  static async hasPracticePublishPermission(userId, scope, districtId = null, schoolId = null) {
    // 班级练习不需要权限
    if (scope === 'class') {
      return true;
    }

    // 获取用户角色
    const userSql = 'SELECT role FROM users WHERE id = $1';
    const userResult = await query(userSql, [userId]);
    if (userResult.rows.length === 0) {
      return false;
    }
    const userRole = userResult.rows[0].role;

    // 管理员默认有对应范围的权限
    if (userRole === 'system_admin' || userRole === 'municipal_admin') {
      // 系统管理员和市级管理员有所有权限
      return true;
    }

    if (userRole === 'district_admin' && scope === 'district') {
      // 区级管理员默认有区级发布权限（检查是否在同一区域）
      const adminSql = 'SELECT district_id FROM admin_permissions WHERE user_id = $1';
      const adminResult = await query(adminSql, [userId]);
      if (adminResult.rows.length > 0) {
        const userDistrictId = adminResult.rows[0].district_id;
        if (!districtId || userDistrictId === districtId) {
          return true;
        }
      }
    }

    if (userRole === 'school_admin' && scope === 'school') {
      // 校级管理员默认有校级发布权限（检查是否在同一学校）
      const adminSql = 'SELECT school_id FROM admin_permissions WHERE user_id = $1';
      const adminResult = await query(adminSql, [userId]);
      if (adminResult.rows.length > 0) {
        const userSchoolId = adminResult.rows[0].school_id;
        if (!schoolId || userSchoolId === schoolId) {
          return true;
        }
      }
    }

    if (userRole === 'base_school_admin' && scope === 'base_school') {
      return true;
    }

    if (userRole === 'municipal_school_admin' && scope === 'municipal_school') {
      return true;
    }

    // 检查 teacher_permissions 表中是否有授权
    const permissionType = `practice_publish_${scope}`;
    let sql = `
      SELECT COUNT(*) as count
      FROM teacher_permissions
      WHERE user_id = $1
        AND permission_type = $2
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;
    const params = [userId, permissionType];

    if (districtId) {
      sql += ' AND (district_id IS NULL OR district_id = $3)';
      params.push(districtId);
    }

    if (schoolId) {
      const paramIndex = params.length + 1;
      sql += ` AND (school_id IS NULL OR school_id = $${paramIndex})`;
      params.push(schoolId);
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * 获取用户可发布练习的所有范围
   * @param {number} userId - 用户ID
   * @returns {Promise<string[]>} 可发布的范围列表
   */
  static async getAvailablePracticeScopes(userId) {
    const scopes = ['class']; // 班级始终可用

    // 获取用户角色和信息
    const userSql = `
      SELECT u.role, ap.district_id, ap.school_id
      FROM users u
      LEFT JOIN admin_permissions ap ON u.id = ap.user_id
      WHERE u.id = $1
    `;
    const userResult = await query(userSql, [userId]);
    if (userResult.rows.length === 0) {
      return scopes;
    }

    const { role } = userResult.rows[0];

    // 根据角色添加默认可用范围
    if (role === 'system_admin' || role === 'municipal_admin') {
      scopes.push('school', 'district', 'base_school', 'municipal_school', 'municipal');
    } else if (role === 'district_admin') {
      scopes.push('school', 'district');
    } else if (role === 'school_admin') {
      scopes.push('school');
    } else if (role === 'base_school_admin') {
      scopes.push('school', 'base_school');
    } else if (role === 'municipal_school_admin') {
      scopes.push('school', 'municipal_school');
    }

    // 检查额外授权的权限
    const permissionSql = `
      SELECT DISTINCT
        REPLACE(permission_type, 'practice_publish_', '') as scope
      FROM teacher_permissions
      WHERE user_id = $1
        AND permission_type LIKE 'practice_publish_%'
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;
    const permissionResult = await query(permissionSql, [userId]);

    for (const row of permissionResult.rows) {
      if (!scopes.includes(row.scope)) {
        scopes.push(row.scope);
      }
    }

    return scopes;
  }

  /**
   * 授予练习发布权限
   * @param {number} userId - 被授权用户ID
   * @param {string} scope - 范围 (school, district, base_school, municipal_school, municipal)
   * @param {string[]} subjects - 科目列表
   * @param {number} grantedBy - 授权人ID
   * @param {number|null} districtId - 区域ID
   * @param {number|null} schoolId - 学校ID
   * @param {string|null} expiresAt - 过期时间
   * @param {string|null} notes - 备注
   * @returns {Promise<Object>}
   */
  static async grantPracticePublishPermission(userId, scope, subjects, grantedBy, districtId = null, schoolId = null, expiresAt = null, notes = null) {
    const permissionType = `practice_publish_${scope}`;
    const scopeLevel = scope === 'municipal' ? 'municipal' :
      scope === 'district' ? 'district' : 'school';

    return await this.create({
      user_id: userId,
      permission_type: permissionType,
      subjects,
      scope_level: scopeLevel,
      district_id: districtId,
      school_id: schoolId,
      granted_by: grantedBy,
      expires_at: expiresAt,
      notes: notes || `${scope}级练习发布权限`
    });
  }

  /**
   * 撤销练习发布权限
   * @param {number} userId - 用户ID
   * @param {string} scope - 范围
   * @param {number|null} districtId - 区域ID
   * @returns {Promise<Object>}
   */
  static async revokePracticePublishPermission(userId, scope, districtId = null) {
    const permissionType = `practice_publish_${scope}`;

    let sql = `
      UPDATE teacher_permissions
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND permission_type = $2
    `;
    const params = [userId, permissionType];

    if (districtId) {
      sql += ' AND district_id = $3';
      params.push(districtId);
    }

    sql += ' RETURNING *';

    const result = await query(sql, params);
    return result.rows[0];
  }
}

module.exports = TeacherPermission;
