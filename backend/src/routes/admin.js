const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authMiddleware, requireAdmin, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const { query } = require('../database/connection');
const {
  SCHOOL_ADMIN_ROLES,
  getAdminScope,
  getUserResource,
  canManageUser,
  canViewAdmin,
  scopeAllowsAssignment,
  userScopePredicate
} = require('../services/adminAuthorization');

// Get all admin users
router.get('/admins', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const { role } = req.query;
    const scope = await getAdminScope(req.user);
    if (!scope) return res.status(403).json({ message: '未找到有效的管理权限信息' });
    const scopeFilter = userScopePredicate(scope, 'u', 1);

    // Build query to get all admin users with their permissions
    let queryText = `
      SELECT u.id, u.username, u.role, u.real_name, u.phone, u.email, u.status, u.created_at,
             ap.school_id, ap.district_id, ap.permission_scope,
             s.name as school_name, d.name as district_name
      FROM users u
      LEFT JOIN admin_permissions ap ON u.id = ap.user_id
      LEFT JOIN schools s ON ap.school_id = s.id
      LEFT JOIN districts d ON ap.district_id = d.id
      WHERE u.role IN ('school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin')
        AND ${scopeFilter.sql}
    `;

    const params = [...scopeFilter.params];
    if (req.user.role === 'municipal_admin') {
      queryText += ' AND u.role <> \'municipal_admin\'';
    }
    if (role) {
      params.push(role);
      queryText += ` AND u.role = $${params.length}`;
    }

    queryText += ' ORDER BY u.created_at DESC';

    const result = await query(queryText, params);

    res.json({
      admins: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    logger.error('Get admins error:', error);
    res.status(500).json({ message: '获取管理员列表失败' });
  }
});

// Get admin by ID with permissions
router.get('/admins/:id', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const adminId = req.params.id;

    const target = await getUserResource(adminId);
    if (!target) return res.status(404).json({ message: '管理员不存在' });
    if (!await canViewAdmin(req.user, target)) {
      return res.status(403).json({ message: '目标管理员超出当前管理范围' });
    }

    const result = await query(`
      SELECT u.id, u.username, u.role, u.real_name, u.phone, u.email, u.status, u.created_at,
             ap.id as permission_id, ap.school_id, ap.district_id, ap.permission_scope,
             s.name as school_name, d.name as district_name
      FROM users u
      LEFT JOIN admin_permissions ap ON u.id = ap.user_id
      LEFT JOIN schools s ON ap.school_id = s.id
      LEFT JOIN districts d ON ap.district_id = d.id
      WHERE u.id = $1
    `, [adminId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    res.json({ admin: result.rows[0] });
  } catch (error) {
    logger.error('Get admin error:', error);
    res.status(500).json({ message: '获取管理员信息失败' });
  }
});

// Create new admin user with permissions
router.post('/admins', [
  authMiddleware,
  requireRole(['system_admin', 'municipal_admin']),
  body('username').isLength({ min: 3 }).withMessage('用户名至少3个字符'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6个字符'),
  body('role').isIn(['school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin'])
    .withMessage('角色必须是有效的管理员角色'),
  body('realName').notEmpty().withMessage('真实姓名不能为空'),
  body('phone').optional().isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
  body('email').optional().isEmail().withMessage('邮箱格式不正确')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, password, role, realName, idCard, phone, email, schoolId, districtId, permissionScope } = req.body;

    // Check if username already exists
    const usernameExists = await User.checkUsernameExists(username);
    if (usernameExists) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // Check if ID card already exists (if provided)
    if (idCard) {
      const idCardExists = await User.checkIdCardExists(idCard);
      if (idCardExists) {
        return res.status(400).json({ message: '身份证号已存在' });
      }
    }

    // Validate permission scope based on role
    const adminData = {
      permissionScope: permissionScope || {}
    };

    if (SCHOOL_ADMIN_ROLES.includes(role)) {
      if (!schoolId) {
        return res.status(400).json({ message: '校级管理员必须指定管理的学校' });
      }
      adminData.schoolId = schoolId;
    } else if (role === 'district_admin') {
      if (!districtId) {
        return res.status(400).json({ message: '区级管理员必须指定管理的区域' });
      }
      adminData.districtId = districtId;
    }

    if (role === 'municipal_admin' && req.user.role !== 'system_admin') {
      return res.status(403).json({ message: '只有系统管理员可以创建市级管理员' });
    }

    if (!await scopeAllowsAssignment(req.user, { schoolId, districtId })) {
      return res.status(403).json({ message: '指定管理范围超出当前管理员权限' });
    }

    const userData = {
      username,
      password,
      role,
      realName,
      idCard: idCard || null,
      phone: phone || null,
      email: email || null
    };

    const newAdmin = await User.createAdmin(userData, adminData);

    logger.info('New admin created', {
      createdBy: req.user.id,
      newAdminId: newAdmin.id,
      role: newAdmin.role
    });

    // Get full admin info with permissions
    const adminInfo = await query(`
      SELECT u.id, u.username, u.role, u.real_name, u.phone, u.email, u.created_at,
             ap.school_id, ap.district_id, ap.permission_scope,
             s.name as school_name, d.name as district_name
      FROM users u
      LEFT JOIN admin_permissions ap ON u.id = ap.user_id
      LEFT JOIN schools s ON ap.school_id = s.id
      LEFT JOIN districts d ON ap.district_id = d.id
      WHERE u.id = $1
    `, [newAdmin.id]);

    res.status(201).json({
      message: '管理员创建成功',
      admin: adminInfo.rows[0]
    });
  } catch (error) {
    logger.error('Create admin error:', error);
    res.status(500).json({ message: '创建管理员失败', error: error.message });
  }
});

// Update admin permissions
router.put('/admins/:id/permissions', [
  authMiddleware,
  requireRole(['system_admin', 'municipal_admin']),
  body('schoolId').optional().isInt().withMessage('学校ID必须是整数'),
  body('districtId').optional().isInt().withMessage('区域ID必须是整数'),
  body('permissionScope').optional().isObject().withMessage('权限范围必须是对象')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const adminId = req.params.id;
    const { schoolId, districtId, permissionScope } = req.body;

    // Check if admin exists
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }

    if (!User.isAdminRole(admin.role)) {
      return res.status(400).json({ message: '该用户不是管理员角色' });
    }

    const target = await getUserResource(adminId);
    if (!await canManageUser(req.user, target)) {
      return res.status(403).json({ message: '目标管理员超出当前管理员权限' });
    }

    // Prevent admin from modifying their own permissions
    if (adminId == req.user.id) {
      return res.status(400).json({ message: '不能修改自己的权限' });
    }

    if (SCHOOL_ADMIN_ROLES.includes(admin.role) && schoolId === null) {
      return res.status(400).json({ message: '校级管理员必须保留管理学校' });
    }
    if (admin.role === 'district_admin' && districtId === null) {
      return res.status(400).json({ message: '区级管理员必须保留管理区域' });
    }
    if ((schoolId !== undefined || districtId !== undefined)
      && !await scopeAllowsAssignment(req.user, { schoolId, districtId })) {
      return res.status(403).json({ message: '指定管理范围超出当前管理员权限' });
    }

    // Check if permission record exists
    const existingPermission = await query(
      'SELECT id FROM admin_permissions WHERE user_id = $1',
      [adminId]
    );

    if (existingPermission.rows.length === 0) {
      // Create new permission record
      await query(`
        INSERT INTO admin_permissions (user_id, school_id, district_id, permission_scope)
        VALUES ($1, $2, $3, $4)
      `, [adminId, schoolId || null, districtId || null, JSON.stringify(permissionScope || {})]);
    } else {
      // Update existing permission record
      const updates = [];
      const params = [];
      let paramCount = 0;

      if (schoolId !== undefined) {
        paramCount++;
        updates.push(`school_id = $${paramCount}`);
        params.push(schoolId);
      }

      if (districtId !== undefined) {
        paramCount++;
        updates.push(`district_id = $${paramCount}`);
        params.push(districtId);
      }

      if (permissionScope !== undefined) {
        paramCount++;
        updates.push(`permission_scope = $${paramCount}`);
        params.push(JSON.stringify(permissionScope));
      }

      if (updates.length > 0) {
        paramCount++;
        params.push(adminId);
        await query(
          `UPDATE admin_permissions SET ${updates.join(', ')} WHERE user_id = $${paramCount}`,
          params
        );
      }
    }

    logger.info('Admin permissions updated', {
      updatedBy: req.user.id,
      adminId: adminId
    });

    // Get updated admin info
    const adminInfo = await query(`
      SELECT u.id, u.username, u.role, u.real_name, u.phone, u.email,
             ap.school_id, ap.district_id, ap.permission_scope,
             s.name as school_name, d.name as district_name
      FROM users u
      LEFT JOIN admin_permissions ap ON u.id = ap.user_id
      LEFT JOIN schools s ON ap.school_id = s.id
      LEFT JOIN districts d ON ap.district_id = d.id
      WHERE u.id = $1
    `, [adminId]);

    res.json({
      message: '管理员权限更新成功',
      admin: adminInfo.rows[0]
    });
  } catch (error) {
    logger.error('Update admin permissions error:', error);
    res.status(500).json({ message: '更新管理员权限失败' });
  }
});

// Delete admin permissions (without deleting the user)
router.delete('/admins/:id/permissions', [
  authMiddleware,
  requireRole(['system_admin', 'municipal_admin'])
], async (req, res) => {
  try {
    const adminId = req.params.id;

    // Prevent admin from deleting their own permissions
    if (adminId == req.user.id) {
      return res.status(400).json({ message: '不能删除自己的权限' });
    }


    const target = await getUserResource(adminId);
    if (!target) return res.status(404).json({ message: '管理员不存在' });
    if (!await canManageUser(req.user, target)) {
      return res.status(403).json({ message: '目标管理员超出当前管理员权限' });
    }

    const result = await query(
      'DELETE FROM admin_permissions WHERE user_id = $1 RETURNING id',
      [adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '该管理员没有权限记录' });
    }

    logger.info('Admin permissions deleted', {
      deletedBy: req.user.id,
      adminId: adminId
    });

    res.json({ message: '管理员权限删除成功' });
  } catch (error) {
    logger.error('Delete admin permissions error:', error);
    res.status(500).json({ message: '删除管理员权限失败' });
  }
});

// Get all schools (for admin creation)
router.get('/schools', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const scope = await getAdminScope(req.user);
    if (!scope) return res.status(403).json({ message: '未找到有效的管理权限信息' });
    const params = [];
    let where = '';
    if (scope.type === 'school') {
      params.push(scope.id);
      where = 'WHERE id = $1';
    } else if (scope.type === 'district') {
      params.push(scope.id);
      where = 'WHERE district_id = $1';
    }
    const result = await query(`
      SELECT id, name, code, district, type, district_id
      FROM schools
      ${where}
      ORDER BY name ASC
    `, params);

    res.json({ schools: result.rows });
  } catch (error) {
    logger.error('Get schools error:', error);
    res.status(500).json({ message: '获取学校列表失败' });
  }
});

// Get all districts (for admin creation)
router.get('/districts', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const scope = await getAdminScope(req.user);
    if (!scope) return res.status(403).json({ message: '未找到有效的管理权限信息' });
    const params = [];
    let where = '';
    if (scope.type === 'district') {
      params.push(scope.id);
      where = 'WHERE id = $1';
    } else if (scope.type === 'school') {
      params.push(scope.id);
      where = 'WHERE id = (SELECT district_id FROM schools WHERE id = $1)';
    }
    const result = await query(`
      SELECT id, name, code, level
      FROM districts
      ${where}
      ORDER BY name ASC
    `, params);

    res.json({ districts: result.rows });
  } catch (error) {
    logger.error('Get districts error:', error);
    res.status(500).json({ message: '获取区域列表失败' });
  }
});

// Get admin statistics
router.get('/stats', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const scope = await getAdminScope(req.user);
    if (!scope) return res.status(403).json({ message: '未找到有效的管理权限信息' });
    const scopeFilter = userScopePredicate(scope, 'u', 1);
    const municipalBoundary = req.user.role === 'municipal_admin' ? ' AND u.role <> \'municipal_admin\'' : '';
    const stats = await query(`
      SELECT
        u.role,
        COUNT(*) as count
      FROM users u
      WHERE u.role IN ('school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin')
        AND ${scopeFilter.sql}${municipalBoundary}
      GROUP BY u.role
    `, scopeFilter.params);

    const totalAdmins = await query(`
      SELECT COUNT(*) as total
      FROM users u
      WHERE u.role IN ('school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin')
        AND ${scopeFilter.sql}${municipalBoundary}
    `, scopeFilter.params);

    res.json({
      total: parseInt(totalAdmins.rows[0].total),
      byRole: stats.rows
    });
  } catch (error) {
    logger.error('Get admin stats error:', error);
    res.status(500).json({ message: '获取管理员统计失败' });
  }
});

// Get dashboard statistics (comprehensive overview)
router.get('/dashboard/stats', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const scope = await getAdminScope(req.user);
    if (!scope) return res.status(403).json({ message: '未找到有效的管理权限信息' });
    const studentScope = userScopePredicate(scope, 'u', 1);
    const creatorScope = userScopePredicate(scope, 'creator', 1);
    const participantScope = userScopePredicate(scope, 'participant', 1);

    // Total students count
    const studentCount = await query(`
      SELECT COUNT(*) as count FROM users u WHERE u.role = 'student' AND ${studentScope.sql}
    `, studentScope.params);

    // Total exams count
    const examCount = await query(`
      SELECT COUNT(*) as count FROM activities a
      JOIN users creator ON creator.id = a.created_by
      WHERE ${creatorScope.sql}
    `, creatorScope.params);

    // This month exams count
    const thisMonthExams = await query(`
      SELECT COUNT(*) as count
      FROM activities a
      JOIN users creator ON creator.id = a.created_by
      WHERE DATE_TRUNC('month', a.created_at) = DATE_TRUNC('month', CURRENT_DATE)
        AND ${creatorScope.sql}
    `, creatorScope.params);

    // Online teachers count (teachers who have logged in within last 7 days)
    const onlineTeachers = await query(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      INNER JOIN audit_logs al ON u.id = al.user_id
      WHERE u.role IN ('teacher', 'school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin')
      AND al.action = 'login'
      AND al.created_at >= NOW() - INTERVAL '7 days'
      AND ${studentScope.sql}
    `, studentScope.params);

    // Recent exams with statistics
    const recentExams = await query(`
      SELECT
        a.id,
        a.title as name,
        COUNT(DISTINCT sa.student_id) FILTER (WHERE ${participantScope.sql}) as participants,
        ROUND(AVG(sa.score) FILTER (WHERE ${participantScope.sql}), 1) as avg_score,
        TO_CHAR(a.start_time, 'YYYY-MM-DD') as date
      FROM activities a
      JOIN users creator ON creator.id = a.created_by
      LEFT JOIN student_activities sa ON a.id = sa.activity_id AND sa.status = 'completed'
      LEFT JOIN users participant ON participant.id = sa.student_id
      WHERE a.status IN ('published', 'ongoing', 'finished') AND ${creatorScope.sql}
      GROUP BY a.id, a.title, a.start_time
      ORDER BY a.start_time DESC
      LIMIT 10
    `, creatorScope.params);

    res.json({
      totalStudents: parseInt(studentCount.rows[0].count),
      totalExams: parseInt(examCount.rows[0].count),
      thisMonthExams: parseInt(thisMonthExams.rows[0].count),
      onlineTeachers: parseInt(onlineTeachers.rows[0].count || 0),
      recentExams: recentExams.rows.map(exam => ({
        id: exam.id,
        name: exam.name,
        participants: parseInt(exam.participants || 0),
        avgScore: parseFloat(exam.avg_score || 0),
        date: exam.date
      }))
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ message: '获取仪表盘统计失败' });
  }
});

// Get pending workflows (work items requiring admin action)
router.get('/dashboard/workflows', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const scope = await getAdminScope(req.user);
    if (!scope) return res.status(403).json({ message: '未找到有效的管理权限信息' });
    const reviewerScope = userScopePredicate(scope, 'reviewer', 1);
    const creatorScope = userScopePredicate(scope, 'creator', 1);
    const registrationWhere = scope.type === 'global'
      ? { sql: 'TRUE', params: [] }
      : { sql: scope.type === 'school' ? 'srr.school_id = $1' : 'srr.district_id = $1', params: [scope.id] };
    // 查询各模块的待处理数量
    // 注：question_drafts 与 certificates 表均无 status 列。
    //   - 题目审核状态走 question_reviews 流程表（status: pending/approved/rejected）
    //   - certificates 表为已颁发记录，无“待颁发”概念，故该项移除
    const [
      registrationPending,
      questionSubmitted,
      activitiesOngoing
    ] = await Promise.all([
      // 待审核的学生注册
      query(`SELECT COUNT(*) as count FROM student_registration_requests srr WHERE srr.status = 'pending' AND ${registrationWhere.sql}`, registrationWhere.params),
      // 待审核的题目（走 question_reviews 流程表）
      query(`SELECT COUNT(*) as count FROM question_reviews qr JOIN users reviewer ON reviewer.id = qr.reviewer_id WHERE qr.status = 'pending' AND ${reviewerScope.sql}`, reviewerScope.params),
      // 进行中的活动
      query(`SELECT COUNT(*) as count FROM activities a JOIN users creator ON creator.id = a.created_by WHERE a.status IN ('published', 'ongoing') AND ${creatorScope.sql}`, creatorScope.params)
    ]);

    const workflows = [];

    const regCount = parseInt(registrationPending.rows[0].count);
    if (regCount > 0) {
      workflows.push({
        id: 'user_approval',
        type: 'user_approval',
        title: '学生注册审核',
        description: `${regCount}个学生注册申请待审核`,
        status: regCount >= 5 ? 'urgent' : 'pending',
        priority: regCount >= 5 ? 'high' : 'medium'
      });
    }

    const qCount = parseInt(questionSubmitted.rows[0].count);
    if (qCount > 0) {
      workflows.push({
        id: 'question_review',
        type: 'question_review',
        title: '题目审核',
        description: `${qCount}道题目提交待审核`,
        status: 'pending',
        priority: 'medium'
      });
    }

    const aCount = parseInt(activitiesOngoing.rows[0].count);
    if (aCount > 0) {
      workflows.push({
        id: 'exam_approval',
        type: 'exam_approval',
        title: '活动管理',
        description: `${aCount}场活动进行中或待开始`,
        status: 'pending',
        priority: 'medium'
      });
    }

    res.json({
      success: true,
      workflows
    });
  } catch (error) {
    logger.error('Get workflows error:', error);
    res.status(500).json({ message: '获取工作流数据失败' });
  }
});

// Get region statistics (schools, teachers, students counts)
router.get('/dashboard/region-stats', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const scope = await getAdminScope(req.user);
    if (!scope) return res.status(403).json({ message: '未找到有效的管理权限信息' });
    const userFilter = userScopePredicate(scope, 'u', 1);
    const creatorFilter = userScopePredicate(scope, 'creator', 1);
    const schoolWhere = scope.type === 'global'
      ? { sql: 'TRUE', params: [] }
      : { sql: scope.type === 'school' ? 'sc.id = $1' : 'sc.district_id = $1', params: [scope.id] };
    const registrationWhere = scope.type === 'global'
      ? { sql: 'TRUE', params: [] }
      : { sql: scope.type === 'school' ? 'srr.school_id = $1' : 'srr.district_id = $1', params: [scope.id] };
    const [
      schoolCount,
      teacherCount,
      studentCount,
      activeExams,
      pendingApprovals
    ] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM schools sc WHERE ${schoolWhere.sql}`, schoolWhere.params),
      query(`SELECT COUNT(*) as count FROM users u WHERE u.role IN ('teacher', 'school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin') AND ${userFilter.sql}`, userFilter.params),
      query(`SELECT COUNT(*) as count FROM users u WHERE u.role = 'student' AND u.status = 'active' AND ${userFilter.sql}`, userFilter.params),
      query(`SELECT COUNT(*) as count FROM activities a JOIN users creator ON creator.id = a.created_by WHERE a.status IN ('published', 'ongoing') AND ${creatorFilter.sql}`, creatorFilter.params),
      query(`SELECT COUNT(*) as count FROM student_registration_requests srr WHERE srr.status = 'pending' AND ${registrationWhere.sql}`, registrationWhere.params)
    ]);

    res.json({
      success: true,
      data: {
        totalSchools: parseInt(schoolCount.rows[0].count),
        totalTeachers: parseInt(teacherCount.rows[0].count),
        totalStudents: parseInt(studentCount.rows[0].count),
        activeExams: parseInt(activeExams.rows[0].count),
        pendingApprovals: parseInt(pendingApprovals.rows[0].count)
      }
    });
  } catch (error) {
    logger.error('Get region stats error:', error);
    res.status(500).json({ message: '获取区域统计失败' });
  }
});

// ============================================================================
// E4 家长-学生关联管理（管理员）
// ============================================================================

// 建立家长-学生关联
router.post('/parent-links', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { parentUserId, studentUserId, relation } = req.body;
    if (!parentUserId || !studentUserId) {
      return res.status(400).json({ success: false, error: 'parentUserId 和 studentUserId 必填' });
    }
    // 校验角色
    const p = await query('SELECT role FROM users WHERE id=$1', [parentUserId]);
    const s = await query('SELECT role FROM users WHERE id=$1', [studentUserId]);
    if (!p.rows[0] || p.rows[0].role !== 'parent') {
      return res.status(400).json({ success: false, error: 'parentUserId 不是家长角色' });
    }
    if (!s.rows[0] || s.rows[0].role !== 'student') {
      return res.status(400).json({ success: false, error: 'studentUserId 不是学生角色' });
    }
    const student = await getUserResource(studentUserId);
    if (!await canManageUser(req.user, student)) {
      return res.status(403).json({ success: false, error: '目标学生超出当前管理员的管理范围' });
    }
    const scope = await getAdminScope(req.user);
    if (scope.type !== 'global') {
      const outsideColumn = scope.type === 'school' ? 'st.school_id' : 'sc.district_id';
      const outsideLinks = await query(`
        SELECT 1 FROM parent_student_relations psr
        JOIN students st ON st.user_id = psr.student_user_id
        LEFT JOIN schools sc ON sc.id = st.school_id
        WHERE psr.parent_user_id = $1 AND ${outsideColumn} <> $2
        LIMIT 1
      `, [parentUserId, scope.id]);
      if (outsideLinks.rows.length > 0) {
        return res.status(403).json({ success: false, error: '该家长已关联其他管理范围的学生' });
      }
    }
    const ParentGuard = require('../models/ParentGuard');
    const link = await ParentGuard.link(parentUserId, studentUserId, relation);
    res.status(201).json({ success: true, data: link, message: '家长-学生关联已建立' });
  } catch (error) {
    console.error('Error linking parent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 解除关联
router.delete('/parent-links', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { parentUserId, studentUserId } = req.body;
    const student = await getUserResource(studentUserId);
    if (!student) return res.status(404).json({ success: false, error: '学生不存在' });
    if (!await canManageUser(req.user, student)) {
      return res.status(403).json({ success: false, error: '目标学生超出当前管理员的管理范围' });
    }
    const ParentGuard = require('../models/ParentGuard');
    const removed = await ParentGuard.unlink(parentUserId, studentUserId);
    if (!removed) {
      return res.status(404).json({ success: false, error: '关联不存在' });
    }
    res.json({ success: true, message: '关联已解除' });
  } catch (error) {
    console.error('Error unlinking parent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
