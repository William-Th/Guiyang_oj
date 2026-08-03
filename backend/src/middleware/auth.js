const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const {
  isAdminRole,
  isGlobalAdmin,
  getAdminScope,
  SCHOOL_ADMIN_ROLES
} = require('../services/adminAuthorization');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    if (user.status !== 'active' || decoded.tokenVersion !== user.token_version) {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      realName: user.real_name
    };
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

// 新增：要求管理员角色
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (!isAdminRole(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }

  next();
};

// 新增：检查管理范围权限（用于分级管理）
const requireManagementScope = (scopeType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      if (!isAdminRole(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. Admin role required.' });
      }

      // 系统总管理员和市级总管理员是明确的全局角色。
      if (isGlobalAdmin(req.user.role)) {
        return next();
      }

      // 范围管理员缺少 admin_permissions 或必需范围时默认拒绝。
      const scope = await getAdminScope(req.user);
      if (!scope) {
        return res.status(403).json({ message: 'Access denied. No management permissions found.' });
      }

      // 根据不同的管理范围类型检查权限
      switch (scopeType) {
      case 'school':
        if (SCHOOL_ADMIN_ROLES.includes(req.user.role) && scope.type === 'school') {
          req.managementScope = scope;
          return next();
        }
        break;
      case 'district':
        if (req.user.role === 'district_admin' && scope.type === 'district') {
          req.managementScope = scope;
          return next();
        }
        break;
      case 'municipal_school':
        if (req.user.role === 'municipal_school_admin' && scope.type === 'school') {
          req.managementScope = scope;
          return next();
        }
        break;
      case 'base_school':
        if (req.user.role === 'base_school_admin' && scope.type === 'school') {
          req.managementScope = scope;
          return next();
        }
        break;
      }

      return res.status(403).json({ message: 'Access denied. Insufficient management scope.' });
    } catch (error) {
      logger.error('Management scope check error:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        if (user.status !== 'active' || decoded.tokenVersion !== user.token_version) {
          return next();
        }
        req.user = {
          id: user.id,
          username: user.username,
          role: user.role,
          realName: user.real_name
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = {
  authMiddleware,
  requireRole,
  requireAdmin,
  requireManagementScope,
  optionalAuth
};
