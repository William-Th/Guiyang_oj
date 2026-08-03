const express = require('express');
const router = express.Router();
const TeachingClass = require('../models/TeachingClass');
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../database/connection');
const {
  getActorScope,
  canAccessTeachingClass,
  canManageTeachingClass,
  canManageActivity
} = require('../services/teachingAccessControl');

/**
 * Teaching Class Routes
 * Base path: /api/teaching-classes
 */

// ========== Basic CRUD ==========

/**
 * POST /api/teaching-classes
 * Create a new teaching class (draft status)
 * Required: teacher or admin role
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, scope, school_id, district_id, subject, grade, academic_year } = req.body;

    // Validate required fields
    if (!name || !scope || !academic_year) {
      return res.status(400).json({
        success: false,
        error: 'name、scope和academic_year为必填项'
      });
    }

    // Validate scope
    if (!['school', 'district', 'municipal'].includes(scope)) {
      return res.status(400).json({
        success: false,
        error: 'scope必须是：school、district或municipal'
      });
    }

    // Check permission based on scope
    const canCreate = await canCreateTeachingClass(req.user, scope);
    if (!canCreate) {
      return res.status(403).json({
        success: false,
        error: `您没有权限创建${scope}级别的教学班`
      });
    }

    // Bind the class scope to the authenticated actor. Client supplied IDs may
    // narrow a global administrator's request, but can never widen local scope.
    const actorScope = await getActorScope(req.user);
    let finalSchoolId = school_id;
    let finalDistrictId = district_id;

    if (scope === 'school' && !school_id) {
      // Get user's school
      const schoolResult = await getUserSchool(req.user.id);
      if (!schoolResult) {
        return res.status(400).json({
          success: false,
          error: 'school_id is required for school scope teaching class'
        });
      }
      finalSchoolId = schoolResult.school_id;
    }

    if (scope === 'district' && !district_id) {
      // Get user's district
      const districtResult = await getUserDistrict(req.user.id);
      if (!districtResult) {
        return res.status(400).json({
          success: false,
          error: 'district_id is required for district scope teaching class'
        });
      }
      finalDistrictId = districtResult.district_id;
    }

    if (actorScope?.level === 'school') {
      if (scope !== 'school' || (finalSchoolId && Number(finalSchoolId) !== actorScope.schoolId)) {
        return res.status(403).json({ success: false, error: '教学班范围超出您的学校管理范围' });
      }
      finalSchoolId = actorScope.schoolId;
      finalDistrictId = actorScope.districtId;
    } else if (actorScope?.level === 'district') {
      if (scope === 'municipal' || (finalDistrictId && Number(finalDistrictId) !== actorScope.districtId)) {
        return res.status(403).json({ success: false, error: '教学班范围超出您的区县管理范围' });
      }
      finalDistrictId = actorScope.districtId;
      if (finalSchoolId) {
        const school = await query('SELECT district_id FROM schools WHERE id = $1', [finalSchoolId]);
        if (!school.rows[0] || Number(school.rows[0].district_id) !== actorScope.districtId) {
          return res.status(403).json({ success: false, error: '学校不属于您的管理区县' });
        }
      }
    }

    const teachingClass = await TeachingClass.create({
      name,
      description,
      scope,
      school_id: finalSchoolId,
      district_id: finalDistrictId,
      subject,
      grade,
      academic_year,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      data: teachingClass
    });
  } catch (error) {
    console.error('Create teaching class error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create teaching class'
    });
  }
});

/**
 * GET /api/teaching-classes
 * Get teaching classes list
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { scope, status, school_id, district_id, academic_year, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (scope) filters.scope = scope;
    if (status) filters.status = status;
    if (school_id) filters.school_id = parseInt(school_id);
    if (district_id) filters.district_id = parseInt(district_id);
    if (academic_year) filters.academic_year = academic_year;

    // Apply visibility rules based on user role
    const visibility = await getVisibleTeachingClasses(req.user);
    if (visibility.teacher_user_id) {
      filters.teacher_user_id = visibility.teacher_user_id;
    }
    if (visibility.created_by) {
      filters.created_by = visibility.created_by;
    }
    if (visibility.school_id) {
      filters.school_id = visibility.school_id;
    }
    if (visibility.district_id) {
      filters.district_id = visibility.district_id;
    }
    if (visibility.deny) {
      return res.status(403).json({ success: false, error: '用户缺少有效的教学管理范围' });
    }

    filters.limit = parseInt(limit);
    filters.offset = (parseInt(page) - 1) * filters.limit;

    const [teachingClasses, total] = await Promise.all([
      TeachingClass.findAll(filters),
      TeachingClass.count(filters)
    ]);

    res.json({
      success: true,
      data: teachingClasses,
      pagination: {
        page: parseInt(page),
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit)
      }
    });
  } catch (error) {
    console.error('Get teaching classes error:', error);
    res.status(500).json({
      success: false,
      error: '获取教学班失败'
    });
  }
});

/**
 * GET /api/teaching-classes/:id
 * Get teaching class details
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const teachingClass = await TeachingClass.findById(id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        error: '教学班不存在'
      });
    }

    if (!await canAccessTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({ success: false, error: '您无权查看此教学班' });
    }

    // Get additional data
    const [students, teachers, activities, statistics, approvalHistory] = await Promise.all([
      TeachingClass.getStudents(id),
      TeachingClass.getTeachers(id),
      TeachingClass.getActivities(id),
      TeachingClass.getStatistics(id),
      TeachingClass.getApprovalHistory(id)
    ]);

    res.json({
      success: true,
      data: {
        ...teachingClass,
        students,
        teachers,
        activities,
        statistics,
        approval_history: approvalHistory
      }
    });
  } catch (error) {
    console.error('Get teaching class error:', error);
    res.status(500).json({
      success: false,
      error: '获取教学班失败'
    });
  }
});

/**
 * PUT /api/teaching-classes/:id
 * Update teaching class (only draft status)
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const teachingClass = await TeachingClass.findById(id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        error: '教学班不存在'
      });
    }

    if (!await canManageTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({
        success: false,
        error: '只有创建者可以更新此教学班'
      });
    }

    const { name, description, subject, grade, academic_year } = req.body;
    const updated = await TeachingClass.update(id, {
      name,
      description,
      subject,
      grade,
      academic_year
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Update teaching class error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update teaching class'
    });
  }
});

/**
 * DELETE /api/teaching-classes/:id
 * Delete teaching class (only draft status)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const teachingClass = await TeachingClass.findById(id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        error: '教学班不存在'
      });
    }

    if (!await canManageTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({
        success: false,
        error: '只有创建者可以删除此教学班'
      });
    }

    await TeachingClass.delete(id);

    res.json({
      success: true,
      message: 'Teaching class deleted successfully'
    });
  } catch (error) {
    console.error('Delete teaching class error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete teaching class'
    });
  }
});

// ========== Approval Workflow ==========

/**
 * POST /api/teaching-classes/:id/submit
 * Submit teaching class for approval
 */
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const teachingClass = await TeachingClass.findById(id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        error: '教学班不存在'
      });
    }

    if (!await canManageTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({
        success: false,
        error: '只有创建者可以提交此教学班进行审批'
      });
    }

    const updated = await TeachingClass.submitForApproval(id);

    res.json({
      success: true,
      data: updated,
      message: 'Teaching class submitted for approval'
    });
  } catch (error) {
    console.error('Submit teaching class error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit teaching class'
    });
  }
});

/**
 * GET /api/teaching-classes/pending
 * Get pending teaching classes for current admin
 */
router.get('/admin/pending', authMiddleware, async (req, res) => {
  try {
    // Determine reviewer level and filters based on user's admin permissions
    const adminInfo = await getAdminInfo(req.user.id);

    if (!adminInfo) {
      return res.status(403).json({
        success: false,
        error: '您没有管理权限来审核教学班'
      });
    }

    const pendingClasses = await TeachingClass.getPendingForReviewer(
      adminInfo.level,
      { school_id: adminInfo.school_id, district_id: adminInfo.district_id }
    );

    res.json({
      success: true,
      data: pendingClasses,
      reviewer_level: adminInfo.level
    });
  } catch (error) {
    console.error('Get pending teaching classes error:', error);
    res.status(500).json({
      success: false,
      error: '获取待审核教学班失败'
    });
  }
});

/**
 * POST /api/teaching-classes/:id/approve
 * Approve teaching class
 */
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        error: '教学班不存在'
      });
    }

    // Check admin permission
    const adminInfo = await getAdminInfo(req.user.id);
    if (!adminInfo) {
      return res.status(403).json({
        success: false,
        error: '您没有权限批准教学班'
      });
    }

    // Verify the admin can approve this class
    const canApprove = await canApproveTeachingClass(adminInfo, teachingClass);
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        error: '您没有权限批准此教学班'
      });
    }

    const approved = await TeachingClass.approve(id, req.user.id, adminInfo.level, comment);

    res.json({
      success: true,
      data: approved,
      message: 'Teaching class approved successfully'
    });
  } catch (error) {
    console.error('Approve teaching class error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve teaching class'
    });
  }
});

/**
 * POST /api/teaching-classes/:id/reject
 * Reject teaching class
 */
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: '请提供拒绝原因'
      });
    }

    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        error: '教学班不存在'
      });
    }

    // Check admin permission
    const adminInfo = await getAdminInfo(req.user.id);
    if (!adminInfo) {
      return res.status(403).json({
        success: false,
        error: '您没有权限拒绝教学班'
      });
    }

    // Verify the admin can reject this class
    const canReject = await canApproveTeachingClass(adminInfo, teachingClass);
    if (!canReject) {
      return res.status(403).json({
        success: false,
        error: '您没有权限拒绝此教学班'
      });
    }

    const rejected = await TeachingClass.reject(id, req.user.id, adminInfo.level, reason);

    res.json({
      success: true,
      data: rejected,
      message: 'Teaching class rejected'
    });
  } catch (error) {
    console.error('Reject teaching class error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject teaching class'
    });
  }
});

// ========== Student Management ==========

/**
 * GET /api/teaching-classes/:id/students
 * Get students in teaching class
 */
router.get('/:id/students', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { include_inactive } = req.query;

    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) return res.status(404).json({ success: false, error: '教学班不存在' });
    if (!await canAccessTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({ success: false, error: '您无权查看此教学班学生' });
    }

    const students = await TeachingClass.getStudents(id, include_inactive !== 'true');

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      error: '获取学生失败'
    });
  }
});

/**
 * POST /api/teaching-classes/:id/students
 * Add student to teaching class
 */
router.post('/:id/students', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: 'student_id is required'
      });
    }

    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        error: '教学班不存在'
      });
    }

    if (!await canManageTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({ success: false, error: '您无权管理此教学班学生' });
    }

    // Check if teaching class is approved
    if (teachingClass.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: '只能向已批准的教学班添加学生'
      });
    }

    // Validate student scope
    const isValidScope = await validateStudentScope(teachingClass, student_id);
    if (!isValidScope) {
      return res.status(400).json({
        success: false,
        error: `Student is not within the scope of this ${teachingClass.scope} teaching class`
      });
    }

    const member = await TeachingClass.addStudent(id, student_id);

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add student'
    });
  }
});

/**
 * POST /api/teaching-classes/:id/students/batch
 * Add multiple students to teaching class
 */
router.post('/:id/students/batch', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { student_ids } = req.body;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'student_ids array is required'
      });
    }

    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        error: '教学班不存在'
      });
    }

    if (!await canManageTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({ success: false, error: '您无权管理此教学班学生' });
    }

    if (teachingClass.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: '只能向已批准的教学班添加学生'
      });
    }

    // Validate all students' scope
    const validStudentIds = [];
    const invalidStudents = [];

    for (const studentId of student_ids) {
      const isValid = await validateStudentScope(teachingClass, studentId);
      if (isValid) {
        validStudentIds.push(studentId);
      } else {
        invalidStudents.push({ studentId, reason: 'Not within scope' });
      }
    }

    const results = await TeachingClass.addStudentsBatch(id, validStudentIds);

    res.json({
      success: true,
      data: {
        success_count: results.success,
        errors: [...results.errors, ...invalidStudents]
      }
    });
  } catch (error) {
    console.error('Batch add students error:', error);
    res.status(500).json({
      success: false,
      error: '添加学生失败'
    });
  }
});

/**
 * DELETE /api/teaching-classes/:id/students/:studentId
 * Remove student from teaching class
 */
router.delete('/:id/students/:studentId', authMiddleware, async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) return res.status(404).json({ success: false, error: '教学班不存在' });
    if (!await canManageTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({ success: false, error: '您无权管理此教学班学生' });
    }

    await TeachingClass.removeStudent(id, parseInt(studentId));

    res.json({
      success: true,
      message: 'Student removed from teaching class'
    });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove student'
    });
  }
});

// ========== Activity Management ==========

/**
 * GET /api/teaching-classes/:id/activities
 * Get activities for teaching class
 */
router.get('/:id/activities', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) return res.status(404).json({ success: false, error: '教学班不存在' });
    if (!await canAccessTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({ success: false, error: '您无权查看此教学班活动' });
    }
    const activities = await TeachingClass.getActivities(id);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      error: '获取活动失败'
    });
  }
});

/**
 * POST /api/teaching-classes/:id/activities
 * Add activity to teaching class
 */
router.post('/:id/activities', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { activity_id, deadline, is_required } = req.body;

    if (!activity_id) {
      return res.status(400).json({
        success: false,
        error: 'activity_id is required'
      });
    }

    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        error: '教学班不存在'
      });
    }

    if (!await canManageTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({ success: false, error: '您无权管理此教学班活动' });
    }

    const activityResult = await query('SELECT * FROM activities WHERE id = $1', [activity_id]);
    if (!activityResult.rows[0]) return res.status(404).json({ success: false, error: '活动不存在' });
    if (!await canManageActivity(req.user, activityResult.rows[0])) {
      return res.status(403).json({ success: false, error: '只能关联您有权管理的活动' });
    }

    if (teachingClass.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: '只能向已批准的教学班添加活动'
      });
    }

    const association = await TeachingClass.addActivity(id, activity_id, req.user.id, {
      deadline,
      is_required
    });

    res.json({
      success: true,
      data: association
    });
  } catch (error) {
    console.error('Add activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add activity'
    });
  }
});

/**
 * DELETE /api/teaching-classes/:id/activities/:activityId
 * Remove activity from teaching class
 */
router.delete('/:id/activities/:activityId', authMiddleware, async (req, res) => {
  try {
    const { id, activityId } = req.params;

    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) return res.status(404).json({ success: false, error: '教学班不存在' });
    if (!await canManageTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({ success: false, error: '您无权管理此教学班活动' });
    }

    await TeachingClass.removeActivity(id, parseInt(activityId));

    res.json({
      success: true,
      message: 'Activity removed from teaching class'
    });
  } catch (error) {
    console.error('Remove activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove activity'
    });
  }
});

/**
 * GET /api/teaching-classes/:id/statistics
 * Get teaching class statistics
 */
router.get('/:id/statistics', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) return res.status(404).json({ success: false, error: '教学班不存在' });
    if (!await canAccessTeachingClass(req.user, teachingClass)) {
      return res.status(403).json({ success: false, error: '您无权查看此教学班统计' });
    }
    const statistics = await TeachingClass.getStatistics(id);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
});

// ========== Helper Functions ==========

/**
 * Check if user can create teaching class of given scope
 */
async function canCreateTeachingClass(user, scope) {
  const actor = await getActorScope(user);
  if (!actor) return false;
  if (user.role === 'teacher') return scope === 'school';
  if (actor.level === 'school') return scope === 'school';
  if (actor.level === 'district') return scope === 'school' || scope === 'district';
  return actor.level === 'municipal' && ['school', 'district', 'municipal'].includes(scope);
}

/**
 * Get admin information for a user
 */
async function getAdminInfo(userId) {
  const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
  const role = userResult.rows[0]?.role;
  if (!['system_admin', 'municipal_admin', 'district_admin', 'school_admin',
    'base_school_admin', 'municipal_school_admin'].includes(role)) return null;
  const actor = await getActorScope({ id: userId, role });
  if (!actor) return null;
  return { level: actor.level, school_id: actor.schoolId || null, district_id: actor.districtId || null };
}

/**
 * Check if admin can approve/reject a teaching class
 */
async function canApproveTeachingClass(adminInfo, teachingClass) {
  // Must match current reviewer level
  if (teachingClass.current_reviewer_level !== adminInfo.level) {
    // Allow higher level admins to approve
    const levelOrder = { school: 1, district: 2, municipal: 3 };
    if (levelOrder[adminInfo.level] < levelOrder[teachingClass.current_reviewer_level]) {
      return false;
    }
  }

  // School admin can only approve their school's classes
  if (adminInfo.level === 'school' && adminInfo.school_id) {
    return Number(teachingClass.school_id) === Number(adminInfo.school_id);
  }

  // District admin can only approve their district's classes
  if (adminInfo.level === 'district' && adminInfo.district_id) {
    if (Number(teachingClass.district_id) === Number(adminInfo.district_id)) return true;
    // Check if school belongs to district
    if (teachingClass.school_id) {
      const schoolResult = await query(
        'SELECT district_id FROM schools WHERE id = $1',
        [teachingClass.school_id]
      );
      return schoolResult.rows.length > 0 &&
        Number(schoolResult.rows[0].district_id) === Number(adminInfo.district_id);
    }
  }

  // Municipal admin can approve all
  if (adminInfo.level === 'municipal') {
    return true;
  }

  return false;
}

/**
 * Get visible teaching classes based on user role
 */
async function getVisibleTeachingClasses(user) {
  if (user.role === 'teacher') {
    return { teacher_user_id: user.id };
  }
  const actor = await getActorScope(user);
  if (!actor) return { deny: true };
  if (actor.level === 'municipal') return {};
  if (actor.level === 'district') return { district_id: actor.districtId };
  if (actor.level === 'school' && user.role !== 'student') return { school_id: actor.schoolId };
  return { deny: true };
}

/**
 * Get user's school
 */
async function getUserSchool(userId) {
  // Try teachers table
  let result = await query(
    'SELECT school_id FROM teachers WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length > 0 && result.rows[0].school_id) {
    return { school_id: result.rows[0].school_id };
  }

  // Try teacher_permissions
  result = await query(
    'SELECT school_id FROM teacher_permissions WHERE user_id = $1 AND school_id IS NOT NULL LIMIT 1',
    [userId]
  );
  if (result.rows.length > 0) {
    return { school_id: result.rows[0].school_id };
  }

  return null;
}

/**
 * Get user's district
 */
async function getUserDistrict(userId) {
  // Try teacher_permissions
  let result = await query(
    'SELECT district_id FROM teacher_permissions WHERE user_id = $1 AND district_id IS NOT NULL LIMIT 1',
    [userId]
  );
  if (result.rows.length > 0) {
    return { district_id: result.rows[0].district_id };
  }

  // Try through school
  result = await query(`
    SELECT s.district_id
    FROM teachers t
    JOIN schools s ON t.school_id = s.id
    WHERE t.user_id = $1
  `, [userId]);
  if (result.rows.length > 0 && result.rows[0].district_id) {
    return { district_id: result.rows[0].district_id };
  }

  return null;
}

/**
 * Validate student is within teaching class scope
 */
async function validateStudentScope(teachingClass, studentId) {
  // Get student info
  const studentResult = await query(`
    SELECT s.school_id, sch.district_id
    FROM students s
    LEFT JOIN schools sch ON s.school_id = sch.id
    WHERE s.id = $1
  `, [studentId]);

  if (studentResult.rows.length === 0) {
    return false;
  }

  const student = studentResult.rows[0];

  switch (teachingClass.scope) {
  case 'school':
    // Student must be in the same school
    return student.school_id === teachingClass.school_id;

  case 'district':
    // Student must be in the same district
    return student.district_id === teachingClass.district_id;

  case 'municipal':
    // All students in the system are valid
    return true;

  default:
    return false;
  }
}

module.exports = router;
