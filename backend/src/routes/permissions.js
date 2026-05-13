const express = require('express');
const router = express.Router();
const TeacherPermission = require('../models/TeacherPermission');
const { authMiddleware } = require('../middleware/auth');

// 仅管理员可以访问权限管理API
const adminOnly = async (req, res, next) => {
  const User = require('../models/User');

  // 系统管理员和市级总管理员有所有权限
  if (req.user.role === 'system_admin' || req.user.role === 'municipal_admin') {
    req.canManageAll = true;
    return next();
  }

  // 区级管理员和校级管理员只能管理自己范围内的权限
  if (req.user.role === 'district_admin' || req.user.role === 'school_admin' ||
      req.user.role === 'base_school_admin' || req.user.role === 'municipal_school_admin') {
    const permissions = await User.getAdminPermissions(req.user.id);
    if (!permissions) {
      return res.status(403).json({
        success: false,
        error: '未找到管理权限'
      });
    }
    req.managementScope = {
      role: req.user.role,
      schoolId: permissions.school_id,
      districtId: permissions.district_id
    };
    req.canManageAll = false;
    return next();
  }

  return res.status(403).json({
    success: false,
    error: '只有管理员可以管理权限'
  });
};

// 获取所有权限列表
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { is_active, permission_type } = req.query;

    const filters = {};
    if (is_active !== undefined) {
      filters.is_active = is_active === 'true';
    }
    if (permission_type) {
      filters.permission_type = permission_type;
    }

    // 如果不是总管理员，需要根据管理范围过滤
    if (!req.canManageAll && req.managementScope) {
      filters.managementScope = req.managementScope;
    }

    const permissions = await TeacherPermission.getAll(filters);
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取用户的权限
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // 只有管理员或用户自己可以查看权限
    if (req.user.role !== 'system_admin' &&
        req.user.role !== 'municipal_admin' &&
        req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: '您没有权限查看该用户的权限'
      });
    }

    const permissions = await TeacherPermission.getByUserId(userId);
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 授予权限（支持 scope_level, district_id, school_id）
router.post('/grant', authMiddleware, adminOnly, async (req, res) => {
  try {
    const {
      user_id,
      permission_type,
      subjects,
      scope_level,
      district_id,
      school_id,
      expires_at,
      notes
    } = req.body;

    if (!user_id || !permission_type || !subjects || !Array.isArray(subjects)) {
      return res.status(400).json({
        success: false,
        error: 'user_id, permission_type, and subjects are required'
      });
    }

    // 验证权限类型
    const validPermissionTypes = [
      // 管理权限（包含审核 + 撤回）
      'assessment_manage',              // 测评题库管理（原 assessment_review）
      'practice_municipal_manage',      // 市级练习题库管理（原 practice_municipal_review）
      'practice_district_manage',       // 区级练习题库管理（原 practice_district_review）
      'competition_manage',             // 竞赛管理（原 competition_review）
      // 练习发布权限
      'practice_publish_municipal',       // 市级练习发布
      'practice_publish_district',        // 区级练习发布
      'practice_publish_school',          // 校级练习发布
      'practice_publish_base_school',     // 基地学校练习发布
      'practice_publish_municipal_school' // 市直学校练习发布
    ];

    // 明确拒绝废弃的权限类型
    const deprecatedPermissionTypes = [
      'question_bank_review',
      'assessment_review',              // 已迁移为 _manage
      'practice_municipal_review',
      'practice_district_review',
      'competition_review'
    ];

    if (deprecatedPermissionTypes.includes(permission_type)) {
      return res.status(400).json({
        success: false,
        error: `Permission type "${permission_type}" has been deprecated. Please use the new permission types: assessment_manage, practice_municipal_manage, or practice_district_manage`
      });
    }

    if (!validPermissionTypes.includes(permission_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid permission type. Must be one of: ${validPermissionTypes.join(', ')}`
      });
    }

    // 授权规则验证
    // 1. 只有市级/系统管理员可以授予测评管理权限
    if (permission_type === 'assessment_manage') {
      if (req.user.role !== 'municipal_admin' && req.user.role !== 'system_admin') {
        return res.status(403).json({
          success: false,
          error: '只有市级管理员或系统管理员可以授予测评管理权限'
        });
      }
    }

    // 2. 只有市级/系统管理员可以授予市级练习管理权限
    if (permission_type === 'practice_municipal_manage') {
      if (req.user.role !== 'municipal_admin' && req.user.role !== 'system_admin') {
        return res.status(403).json({
          success: false,
          error: '只有市级管理员或系统管理员可以授予市级练习管理权限'
        });
      }
    }

    // 3. 区级管理员只能授予本区的区级练习管理权限
    if (permission_type === 'practice_district_manage') {
      if (req.user.role === 'district_admin') {
        // 区级管理员必须自动关联自己的 district_id
        const managementScope = await TeacherPermission.getUserManagementScope(req.user.id);
        if (!managementScope || !managementScope.district_id) {
          return res.status(403).json({
            success: false,
            error: '区级管理员没有关联区域'
          });
        }

        // 自动设置 district_id，忽略前端传入的值
        const permission = await TeacherPermission.grantDistrictPermission(
          user_id,
          subjects,
          req.user.id,
          managementScope.district_id,
          expires_at || null,
          notes || null
        );

        return res.json({ success: true, data: permission });
      } else if (req.user.role === 'municipal_admin' || req.user.role === 'system_admin') {
        // 市级/系统管理员可以授予任意区的权限，但必须指定 district_id
        if (!district_id) {
          return res.status(400).json({
            success: false,
            error: 'district_id is required for district-level permission'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: '只有区级、市级或系统管理员可以授予区级管理权限'
        });
      }
    }

    // 创建权限
    const permission = await TeacherPermission.create({
      user_id,
      permission_type,
      subjects,
      scope_level: scope_level || 'municipal',
      district_id: district_id || null,
      school_id: school_id || null,
      granted_by: req.user.id,
      expires_at: expires_at || null,
      notes: notes || ''
    });

    res.json({ success: true, data: permission });
  } catch (error) {
    console.error('Error granting permission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 撤销权限
router.post('/revoke', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { user_id, permission_type } = req.body;

    if (!user_id || !permission_type) {
      return res.status(400).json({
        success: false,
        error: 'user_id and permission_type are required'
      });
    }

    const permission = await TeacherPermission.revoke(user_id, permission_type);

    if (!permission) {
      return res.status(404).json({
        success: false,
        error: '权限不存在'
      });
    }

    res.json({ success: true, data: permission });
  } catch (error) {
    console.error('Error revoking permission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 检查用户是否有特定权限
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const { user_id, permission_type, subject } = req.body;

    if (!user_id || !permission_type) {
      return res.status(400).json({
        success: false,
        error: 'user_id and permission_type are required'
      });
    }

    const hasPermission = await TeacherPermission.hasPermission(
      user_id,
      permission_type,
      subject || null
    );

    res.json({ success: true, data: { hasPermission } });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取可授权的教师列表（根据管理员权限范围过滤）
router.get('/available-teachers', authMiddleware, adminOnly, async (req, res) => {
  try {
    let teachers;

    // 系统管理员和市级管理员可以看到所有教师
    if (req.user.role === 'system_admin' || req.user.role === 'municipal_admin') {
      teachers = await TeacherPermission.getTeachersByDistrict(null); // null 表示全市
    }
    // 区级管理员只能看到本区的教师
    else if (req.user.role === 'district_admin') {
      const managementScope = await TeacherPermission.getUserManagementScope(req.user.id);
      if (!managementScope || !managementScope.district_id) {
        return res.status(403).json({
          success: false,
          error: '区级管理员没有关联区域'
        });
      }
      teachers = await TeacherPermission.getTeachersByDistrict(managementScope.district_id);
    }
    // 其他角色无权限
    else {
      return res.status(403).json({
        success: false,
        error: '只有管理员可以查看可用教师列表'
      });
    }

    res.json({ success: true, data: teachers });
  } catch (error) {
    console.error('Error fetching available teachers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取特定 scope 的审核人列表
router.get('/available-reviewers', authMiddleware, async (req, res) => {
  try {
    const { target_scope, subject } = req.query;

    if (!target_scope || !subject) {
      return res.status(400).json({
        success: false,
        error: 'target_scope and subject are required'
      });
    }

    const reviewers = await TeacherPermission.getReviewersForScope(target_scope, subject);

    res.json({
      success: true,
      data: reviewers,
      meta: {
        count: reviewers.length,
        target_scope,
        subject
      }
    });
  } catch (error) {
    console.error('Error fetching available reviewers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除权限（仅允许删除已失效的权限）
router.delete('/:permissionId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { permissionId } = req.params;

    // 获取权限详情
    const permission = await TeacherPermission.getById(permissionId);

    if (!permission) {
      return res.status(404).json({
        success: false,
        error: '权限不存在'
      });
    }

    // 检查权限是否已失效
    const now = new Date();
    const isExpired = permission.expires_at && new Date(permission.expires_at) < now;
    const isInactive = !permission.is_active;

    if (!isExpired && !isInactive) {
      return res.status(400).json({
        success: false,
        error: '无法删除有效权限，请先撤销权限'
      });
    }

    // 删除权限
    await TeacherPermission.deleteById(permissionId);

    res.json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取当前用户可发布练习的范围列表
router.get('/my-practice-scopes', authMiddleware, async (req, res) => {
  try {
    const scopes = await TeacherPermission.getAvailablePracticeScopes(req.user.id);

    const scopeDetails = scopes.map(scope => {
      const scopeNames = {
        'class': '班级',
        'school': '学校',
        'district': '区县',
        'base_school': '基地学校',
        'municipal_school': '市直属学校',
        'municipal': '市级'
      };
      return {
        value: scope,
        label: scopeNames[scope] || scope
      };
    });

    res.json({
      success: true,
      data: {
        scopes,
        scopeDetails
      }
    });
  } catch (error) {
    console.error('Error fetching available practice scopes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 检查用户是否有特定范围的练习发布权限
router.post('/check-practice-publish', authMiddleware, async (req, res) => {
  try {
    const { scope, district_id, school_id } = req.body;

    if (!scope) {
      return res.status(400).json({
        success: false,
        error: 'scope is required'
      });
    }

    const hasPermission = await TeacherPermission.hasPracticePublishPermission(
      req.user.id,
      scope,
      district_id || null,
      school_id || null
    );

    res.json({
      success: true,
      data: { hasPermission, scope }
    });
  } catch (error) {
    console.error('Error checking practice publish permission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量删除权限（仅允许删除已失效的权限）
router.post('/batch-delete', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { permissionIds } = req.body;

    if (!permissionIds || !Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'permissionIds array is required'
      });
    }

    const results = {
      deleted: [],
      failed: [],
      skipped: []
    };

    for (const permissionId of permissionIds) {
      try {
        // 获取权限详情
        const permission = await TeacherPermission.getById(permissionId);

        if (!permission) {
          results.failed.push({
            id: permissionId,
            reason: 'Permission not found'
          });
          continue;
        }

        // 检查权限是否已失效
        const now = new Date();
        const isExpired = permission.expires_at && new Date(permission.expires_at) < now;
        const isInactive = !permission.is_active;

        if (!isExpired && !isInactive) {
          results.skipped.push({
            id: permissionId,
            reason: 'Permission is still active'
          });
          continue;
        }

        // 删除权限
        await TeacherPermission.deleteById(permissionId);
        results.deleted.push(permissionId);
      } catch (error) {
        results.failed.push({
          id: permissionId,
          reason: error.message
        });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Successfully deleted ${results.deleted.length} permissions, skipped ${results.skipped.length} active permissions, ${results.failed.length} failed`
    });
  } catch (error) {
    console.error('Error batch deleting permissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
