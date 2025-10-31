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
        error: 'No management permissions found'
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
    error: 'Only administrators can manage permissions'
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
        error: 'You do not have permission to view this user\'s permissions'
      });
    }

    const permissions = await TeacherPermission.getByUserId(userId);
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 授予权限
router.post('/grant', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { user_id, permission_type, subjects, expires_at, notes } = req.body;

    if (!user_id || !permission_type || !subjects || !Array.isArray(subjects)) {
      return res.status(400).json({
        success: false,
        error: 'user_id, permission_type, and subjects are required'
      });
    }

    // 验证权限类型
    const validPermissionTypes = [
      'question_bank_review',
      'assessment_review',
      'competition_review'
    ];

    if (!validPermissionTypes.includes(permission_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid permission type. Must be one of: ${validPermissionTypes.join(', ')}`
      });
    }

    const permission = await TeacherPermission.create({
      user_id,
      permission_type,
      subjects,
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
        error: 'Permission not found'
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

module.exports = router;
