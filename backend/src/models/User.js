const { query } = require('../database/connection');
const bcrypt = require('bcryptjs');

class User {
  static async findByUsername(username) {
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create(userData) {
    const { username, password, role, realName, phone, email } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(`
      INSERT INTO users (username, password, role, real_name, phone, email)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, role, real_name, phone, email, created_at
    `, [username, hashedPassword, role, realName, phone, email]);

    return result.rows[0];
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(userId) {
    await query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  static async findAll(filters = {}) {
    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (filters.role) {
      paramCount++;
      whereClause += ` WHERE u.role = $${paramCount}`;
      params.push(filters.role);
    }

    if (filters.status) {
      const connector = whereClause ? ' AND' : ' WHERE';
      paramCount++;
      whereClause += `${connector} u.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.district_id) {
      const connector = whereClause ? ' AND' : ' WHERE';
      paramCount++;
      whereClause += `${connector} d.id = $${paramCount}`;
      params.push(filters.district_id);
    }

    if (filters.school_id) {
      const connector = whereClause ? ' AND' : ' WHERE';
      paramCount++;
      whereClause += `${connector} sc.id = $${paramCount}`;
      params.push(filters.school_id);
    }

    if (filters.grade) {
      const connector = whereClause ? ' AND' : ' WHERE';
      paramCount++;
      whereClause += `${connector} st.grade = $${paramCount}`;
      params.push(filters.grade);
    }

    const result = await query(
      `SELECT DISTINCT u.id, u.username, u.role, u.real_name, u.phone, u.email, u.status, u.created_at, u.updated_at,
              sc.name as school_name, sc.id as school_id,
              d.name as district_name, d.id as district_id,
              st.student_no, st.grade, st.class,
              st.id as student_id
       FROM users u
       LEFT JOIN students st ON u.id = st.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN schools sc ON COALESCE(st.school_id, t.school_id) = sc.id
       LEFT JOIN districts d ON sc.district_id = d.id
       ${whereClause} ORDER BY u.created_at DESC`,
      params
    );
    return result.rows;
  }

  // 新增：验证角色是否有效
  static isValidRole(role) {
    const validRoles = [
      'student',
      'teacher',
      'school_admin',
      'district_admin',
      'municipal_school_admin',
      'base_school_admin',
      'municipal_admin',
      'system_admin',
      'parent'
    ];
    return validRoles.includes(role);
  }

  // 新增：根据角色获取权限级别
  static getRoleLevel(role) {
    const roleLevels = {
      'student': 1,
      'teacher': 2,
      'school_admin': 3,
      'district_admin': 4,
      'municipal_school_admin': 5,
      'base_school_admin': 6,
      'municipal_admin': 7,
      'system_admin': 999,  // 系统总管理员最高权限
      'parent': 1           // 家长权限级别与学生相同（只读+代报名）
    };
    return roleLevels[role] || 0;
  }

  // 新增：检查角色是否是管理员级别
  static isAdminRole(role) {
    const adminRoles = [
      'school_admin',
      'district_admin',
      'municipal_school_admin',
      'base_school_admin',
      'municipal_admin',
      'system_admin'
    ];
    return adminRoles.includes(role);
  }

  static async updateUser(userId, userData) {
    const { realName, phone, email, status, role } = userData;

    const result = await query(`
      UPDATE users
      SET real_name = $1, phone = $2, email = $3, status = $4, role = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, username, role, real_name, phone, email, status, updated_at
    `, [realName, phone, email, status, role, userId]);

    return result.rows[0];
  }

  static async deleteUser(userId) {
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    );
    return result.rows[0];
  }

  // 删除学生账号（处理外键约束）
  static async deleteStudent(userId) {
    const client = await require('../database/connection').getClient();

    try {
      await client.query('BEGIN');

      // 1. 删除学生注册申请记录（registration_audit_log 会自动级联删除）
      //    需要删除所有引用该用户的记录：student_user_id, current_reviewer_id, reviewed_by
      await client.query(`
        DELETE FROM student_registration_requests
        WHERE student_user_id = $1
           OR current_reviewer_id = $1
           OR reviewed_by = $1
      `, [userId]);

      // 2. 删除学生信息（students 表有 ON DELETE CASCADE，但为了明确性手动删除）
      await client.query('DELETE FROM students WHERE user_id = $1', [userId]);

      // 3. 删除管理员权限（如果有，admin_permissions 表有 ON DELETE CASCADE）
      await client.query('DELETE FROM admin_permissions WHERE user_id = $1', [userId]);

      // 4. 删除用户账号
      const result = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING id, username, role',
        [userId]
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

  // 删除教师账号（处理外键约束）
  static async deleteTeacher(userId) {
    const client = await require('../database/connection').getClient();

    try {
      await client.query('BEGIN');

      // 1. 删除教师信息（teachers 表有 ON DELETE CASCADE，但为了明确性手动删除）
      await client.query('DELETE FROM teachers WHERE user_id = $1', [userId]);

      // 2. 删除管理员权限（如果有，admin_permissions 表有 ON DELETE CASCADE）
      await client.query('DELETE FROM admin_permissions WHERE user_id = $1', [userId]);

      // 3. 删除用户账号
      const result = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING id, username, role',
        [userId]
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

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );
  }

  static async checkUsernameExists(username) {
    const result = await query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    return result.rows.length > 0;
  }

  static async getAllStudents() {
    const result = await query(`
      SELECT u.id, u.username, u.real_name, u.phone, u.email, u.created_at,
             s.student_no, s.grade, s.class, s.guardian_name, s.guardian_phone,
             sc.name as school_name
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN schools sc ON s.school_id = sc.id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `);
    return result.rows;
  }

  static async createStudent(userData, studentData) {
    const client = await require('../database/connection').getClient();

    try {
      await client.query('BEGIN');

      // Create user
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userResult = await client.query(`
        INSERT INTO users (username, password, role, real_name, phone, email)
        VALUES ($1, $2, 'student', $3, $4, $5)
        RETURNING id
      `, [userData.username, hashedPassword, userData.realName, userData.phone, userData.email]);

      const userId = userResult.rows[0].id;

      // Create student record
      await client.query(`
        INSERT INTO students (user_id, student_no, school_id, grade, class, guardian_name, guardian_phone)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, studentData.studentNo, studentData.schoolId, studentData.grade, studentData.class, studentData.guardianName, studentData.guardianPhone]);

      await client.query('COMMIT');
      return await User.findById(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 新增：创建管理员用户
  static async createAdmin(userData, adminData = {}) {
    const client = await require('../database/connection').getClient();

    try {
      await client.query('BEGIN');

      // 验证角色
      if (!User.isValidRole(userData.role)) {
        throw new Error('Invalid role');
      }

      // Create user
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userResult = await client.query(`
        INSERT INTO users (username, password, role, real_name, phone, email)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [userData.username, hashedPassword, userData.role, userData.realName, userData.phone, userData.email]);

      const userId = userResult.rows[0].id;

      // 如果是管理员角色，创建管理员权限记录
      if (User.isAdminRole(userData.role)) {
        await client.query(`
          INSERT INTO admin_permissions (user_id, school_id, district_id, permission_scope)
          VALUES ($1, $2, $3, $4)
        `, [userId, adminData.schoolId || null, adminData.districtId || null, JSON.stringify(adminData.permissionScope || {})]);
      }

      await client.query('COMMIT');
      return await User.findById(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 新增：获取管理员权限信息
  static async getAdminPermissions(userId) {
    const result = await query(`
      SELECT ap.*, s.name as school_name, d.name as district_name
      FROM admin_permissions ap
      LEFT JOIN schools s ON ap.school_id = s.id
      LEFT JOIN districts d ON ap.district_id = d.id
      WHERE ap.user_id = $1
    `, [userId]);
    return result.rows[0];
  }

  // 新增：根据角色获取用户列表
  static async findByRole(role) {
    const result = await query(
      'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC',
      [role]
    );
    return result.rows;
  }

  // 新增：根据区域获取用户列表（用于区级管理员）
  static async findByDistrict(districtId, filters = {}) {
    let whereClause = `
      WHERE (u.role = 'student' OR u.role = 'teacher')
      AND (
        (u.role = 'student' AND s.school_id IN (SELECT id FROM schools WHERE district_id = $1))
        OR
        (u.role = 'teacher' AND t.school_id IN (SELECT id FROM schools WHERE district_id = $1))
      )
    `;
    let params = [districtId];
    let paramCount = 1;

    if (filters.role) {
      paramCount++;
      whereClause += ` AND u.role = $${paramCount}`;
      params.push(filters.role);
    }

    if (filters.status) {
      paramCount++;
      whereClause += ` AND u.status = $${paramCount}`;
      params.push(filters.status);
    }

    const result = await query(`
      SELECT DISTINCT u.id, u.username, u.role, u.real_name, u.phone, u.email, u.status, u.created_at, u.updated_at,
             sc.name as school_name, sc.id as school_id,
             d.name as district_name, d.id as district_id
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN schools sc ON COALESCE(s.school_id, t.school_id) = sc.id
      LEFT JOIN districts d ON sc.district_id = d.id
      ${whereClause}
      ORDER BY u.created_at DESC
    `, params);
    return result.rows;
  }

  // 新增：根据学校获取用户列表（用于校级管理员）
  static async findBySchool(schoolId, filters = {}) {
    let whereClause = `
      WHERE (u.role = 'student' OR u.role = 'teacher')
      AND (
        (u.role = 'student' AND s.school_id = $1)
        OR
        (u.role = 'teacher' AND t.school_id = $1)
      )
    `;
    let params = [schoolId];
    let paramCount = 1;

    if (filters.role) {
      paramCount++;
      whereClause += ` AND u.role = $${paramCount}`;
      params.push(filters.role);
    }

    if (filters.status) {
      paramCount++;
      whereClause += ` AND u.status = $${paramCount}`;
      params.push(filters.status);
    }

    const result = await query(`
      SELECT DISTINCT u.id, u.username, u.role, u.real_name, u.phone, u.email, u.status, u.created_at, u.updated_at,
             sc.name as school_name, sc.id as school_id,
             d.name as district_name, d.id as district_id
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN schools sc ON COALESCE(s.school_id, t.school_id) = sc.id
      LEFT JOIN districts d ON sc.district_id = d.id
      ${whereClause}
      ORDER BY u.created_at DESC
    `, params);
    return result.rows;
  }

  // 获取用户详细资料（包含角色特定信息）
  static async getDetailedProfile(userId) {
    // 1. 获取基本用户信息
    const userResult = await query(
      'SELECT id, username, role, real_name, phone, email, avatar_url, status, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0];
    const profile = {
      id: user.id,
      username: user.username,
      role: user.role,
      realName: user.real_name,
      phone: user.phone,
      email: user.email,
      avatarUrl: user.avatar_url,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    // 2. 根据角色获取额外信息
    if (user.role === 'teacher') {
      // 教师信息
      const teacherResult = await query(`
        SELECT t.teacher_no, t.subjects, t.title, t.school_id,
               s.name as school_name, s.district_id,
               d.name as district_name
        FROM teachers t
        LEFT JOIN schools s ON t.school_id = s.id
        LEFT JOIN districts d ON s.district_id = d.id
        WHERE t.user_id = $1
      `, [userId]);

      if (teacherResult.rows.length > 0) {
        const teacher = teacherResult.rows[0];
        profile.teacherNo = teacher.teacher_no;
        profile.subjects = teacher.subjects;
        profile.title = teacher.title;
        profile.schoolId = teacher.school_id;
        profile.school = teacher.school_name;
        profile.districtId = teacher.district_id;
        profile.district = teacher.district_name;
      }
    } else if (user.role === 'student') {
      // 学生信息
      const studentResult = await query(`
        SELECT s.student_no, s.grade, s.class, s.school_id,
               s.guardian_name, s.guardian_phone,
               sc.name as school_name, sc.district_id,
               d.name as district_name
        FROM students s
        LEFT JOIN schools sc ON s.school_id = sc.id
        LEFT JOIN districts d ON sc.district_id = d.id
        WHERE s.user_id = $1
      `, [userId]);

      if (studentResult.rows.length > 0) {
        const student = studentResult.rows[0];
        profile.studentNo = student.student_no;
        profile.grade = student.grade;
        profile.class = student.class;
        profile.schoolId = student.school_id;
        profile.school = student.school_name;
        profile.districtId = student.district_id;
        profile.district = student.district_name;
        profile.guardianName = student.guardian_name;
        profile.guardianPhone = student.guardian_phone;
      }
    } else if (['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'].includes(user.role)) {
      // 管理员信息
      const adminResult = await query(`
        SELECT ap.school_id, ap.district_id, ap.permission_scope,
               s.name as school_name, s.district_id as school_district_id,
               d.name as district_name,
               d2.name as school_district_name
        FROM admin_permissions ap
        LEFT JOIN schools s ON ap.school_id = s.id
        LEFT JOIN districts d ON ap.district_id = d.id
        LEFT JOIN districts d2 ON s.district_id = d2.id
        WHERE ap.user_id = $1
      `, [userId]);

      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];
        profile.schoolId = admin.school_id;
        profile.school = admin.school_name;
        // 对于school_admin，如果admin_permissions中district_id为空，则从学校的district_id获取
        profile.districtId = admin.district_id || admin.school_district_id;
        profile.district = admin.district_name || admin.school_district_name;
        profile.permissionScope = admin.permission_scope;

        // 添加管理级别信息
        const roleLevelMap = {
          'system_admin': 5,
          'municipal_admin': 4,
          'district_admin': 3,
          'school_admin': 2,
          'municipal_school_admin': 2,
          'base_school_admin': 2
        };
        profile.managementLevel = roleLevelMap[user.role] || 0;
      }
    }

    return profile;
  }
}

module.exports = User;