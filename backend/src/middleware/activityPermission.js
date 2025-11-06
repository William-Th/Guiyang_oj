/**
 * Activity Permission Middleware
 * Handles role-based permissions for activity creation and management
 */

/**
 * Role hierarchy for activity permissions:
 *
 * PRACTICE (练习) - Can be created by:
 * - teacher (教师)
 * - school_admin (普通校级管理员)
 * - district_admin (区级管理员)
 * - base_school_admin (示范校管理员)
 * - municipal_school_admin (市直学校管理员)
 * - municipal_admin (市级管理员)
 *
 * ASSESSMENT (测评) - Can ONLY be created by:
 * - system_admin (系统管理员)
 * - district_admin (区级管理员)
 * - base_school_admin (示范校管理员)
 * - municipal_school_admin (市直学校管理员)
 * - municipal_admin (市级管理员)
 */

const PRACTICE_ALLOWED_ROLES = [
  'teacher',
  'school_admin',
  'district_admin',
  'base_school_admin',
  'municipal_school_admin',
  'municipal_admin',
  'system_admin'        // System administrator (highest level)
];

const ASSESSMENT_ALLOWED_ROLES = [
  'system_admin',        // System administrator (highest level)
  'district_admin',
  'base_school_admin',
  'municipal_school_admin',
  'municipal_admin'
];

/**
 * Check if a user can create a specific type of activity
 * @param {Object} user - User object with role property
 * @param {string} activityType - 'assessment' or 'practice'
 * @returns {boolean} Whether the user can create this type of activity
 */
function canCreateActivity(user, activityType) {
  if (!user || !user.role) {
    return false;
  }

  if (activityType === 'assessment') {
    return ASSESSMENT_ALLOWED_ROLES.includes(user.role);
  }

  if (activityType === 'practice') {
    return PRACTICE_ALLOWED_ROLES.includes(user.role);
  }

  return false;
}

/**
 * Check if a user can edit an activity
 * @param {Object} user - User object
 * @param {Object} activity - Activity object with created_by field
 * @returns {boolean} Whether the user can edit the activity
 */
function canEditActivity(user, activity) {
  if (!user || !activity) {
    return false;
  }

  // Creator can always edit their own activities
  if (activity.created_by === user.id) {
    return true;
  }

  // High-level admins can edit any activity
  const adminRoles = ['system_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin'];
  return adminRoles.includes(user.role);
}

/**
 * Check if a user can delete an activity
 * @param {Object} user - User object
 * @param {Object} activity - Activity object
 * @returns {boolean} Whether the user can delete the activity
 */
function canDeleteActivity(user, activity) {
  if (!user || !activity) {
    return false;
  }

  // Cannot delete published or ongoing activities
  if (['published', 'ongoing'].includes(activity.status)) {
    return false;
  }

  // Creator can delete their own draft activities
  if (activity.created_by === user.id && activity.status === 'draft') {
    return true;
  }

  // High-level admins can delete any draft activity
  const adminRoles = ['system_admin', 'district_admin', 'base_school_admin', 'municipal_school_admin', 'municipal_admin'];
  return adminRoles.includes(user.role) && activity.status === 'draft';
}

/**
 * Get the appropriate scope for an activity based on user role
 * @param {Object} user - User object with role property
 * @returns {string} Scope value
 */
function getScopeForUser(user) {
  const scopeMap = {
    'system_admin': 'system',      // System-wide scope (highest level)
    'municipal_admin': 'municipal',
    'district_admin': 'district',
    'base_school_admin': 'base_school',
    'municipal_school_admin': 'municipal_school',
    'school_admin': 'school',
    'teacher': 'class'
  };

  return scopeMap[user.role] || 'class';
}

/**
 * Middleware to check if user can create a specific type of activity
 * @param {string} activityType - 'assessment' or 'practice'
 * @returns {Function} Express middleware function
 */
function requireActivityPermission(activityType) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }

    if (!canCreateActivity(user, activityType)) {
      const typeText = activityType === 'assessment' ? '测评' : '练习';
      const allowedRoles = activityType === 'assessment'
        ? '区级管理员、示范校管理员、市直学校管理员或市级管理员'
        : '教师或管理员';

      return res.status(403).json({
        success: false,
        message: `您没有权限创建${typeText}`,
        detail: `只有${allowedRoles}可以创建${typeText}活动`,
        required_roles: activityType === 'assessment'
          ? ASSESSMENT_ALLOWED_ROLES
          : PRACTICE_ALLOWED_ROLES,
        your_role: user.role
      });
    }

    next();
  };
}

/**
 * Middleware to validate activity type in request body
 */
function validateActivityType(req, res, next) {
  const { type } = req.body;

  if (!type) {
    return res.status(400).json({
      success: false,
      message: '活动类型不能为空',
      detail: '请指定活动类型: assessment (测评) 或 practice (练习)'
    });
  }

  if (!['assessment', 'practice'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: '无效的活动类型',
      detail: '活动类型必须是 assessment (测评) 或 practice (练习)',
      received: type
    });
  }

  // Check if user has permission for this type
  if (!canCreateActivity(req.user, type)) {
    const typeText = type === 'assessment' ? '测评' : '练习';
    const allowedRoles = type === 'assessment'
      ? '区级管理员、示范校管理员、市直学校管理员或市级管理员'
      : '教师或管理员';

    return res.status(403).json({
      success: false,
      message: `您没有权限创建${typeText}`,
      detail: `只有${allowedRoles}可以创建${typeText}活动`,
      required_roles: type === 'assessment'
        ? ASSESSMENT_ALLOWED_ROLES
        : PRACTICE_ALLOWED_ROLES,
      your_role: req.user.role
    });
  }

  next();
}

/**
 * Middleware to validate ability level
 */
function validateAbilityLevel(req, res, next) {
  const { ability_level, abilityLevel } = req.body;
  const level = ability_level || abilityLevel;

  if (!level) {
    return res.status(400).json({
      success: false,
      message: '能力等级不能为空',
      detail: '请指定能力等级: L1, L2, L3, L4, L5, L6, L7'
    });
  }

  const validLevels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
  if (!validLevels.includes(level)) {
    return res.status(400).json({
      success: false,
      message: '无效的能力等级',
      detail: '能力等级必须是 L1-L7 之一',
      received: level,
      valid_levels: validLevels
    });
  }

  next();
}

/**
 * Middleware to check edit permission for an activity
 */
function requireEditPermission(req, res, next) {
  const activity = req.activity; // Should be set by previous middleware

  if (!activity) {
    return res.status(404).json({
      success: false,
      message: '活动不存在'
    });
  }

  if (!canEditActivity(req.user, activity)) {
    return res.status(403).json({
      success: false,
      message: '您没有权限编辑此活动',
      detail: '只有活动创建者或高级管理员可以编辑活动'
    });
  }

  next();
}

/**
 * Middleware to check delete permission for an activity
 */
function requireDeletePermission(req, res, next) {
  const activity = req.activity; // Should be set by previous middleware

  if (!activity) {
    return res.status(404).json({
      success: false,
      message: '活动不存在'
    });
  }

  if (!canDeleteActivity(req.user, activity)) {
    if (['published', 'ongoing'].includes(activity.status)) {
      return res.status(403).json({
        success: false,
        message: '无法删除已发布或进行中的活动',
        detail: '只能删除草稿状态的活动'
      });
    }

    return res.status(403).json({
      success: false,
      message: '您没有权限删除此活动',
      detail: '只有活动创建者或高级管理员可以删除草稿活动'
    });
  }

  next();
}

module.exports = {
  canCreateActivity,
  canEditActivity,
  canDeleteActivity,
  getScopeForUser,
  requireActivityPermission,
  validateActivityType,
  validateAbilityLevel,
  requireEditPermission,
  requireDeletePermission,
  PRACTICE_ALLOWED_ROLES,
  ASSESSMENT_ALLOWED_ROLES
};
