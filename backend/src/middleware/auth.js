const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

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

// 新增：要求最低权限级别
const requireMinLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const userLevel = User.getRoleLevel(req.user.role);
    if (userLevel < minLevel) {
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

  if (!User.isAdminRole(req.user.role)) {
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

      // 系统总管理员和市级总管理员有所有权限
      if (req.user.role === 'system_admin' || req.user.role === 'municipal_admin') {
        return next();
      }

      // 获取管理员权限信息
      const permissions = await User.getAdminPermissions(req.user.id);
      if (!permissions) {
        return res.status(403).json({ message: 'Access denied. No management permissions found.' });
      }

      // 根据不同的管理范围类型检查权限
      switch (scopeType) {
      case 'school':
        if (req.user.role === 'school_admin' && permissions.school_id) {
          req.managementScope = { type: 'school', id: permissions.school_id };
          return next();
        }
        break;
      case 'district':
        if (req.user.role === 'district_admin' && permissions.district_id) {
          req.managementScope = { type: 'district', id: permissions.district_id };
          return next();
        }
        break;
      case 'municipal_school':
        if (req.user.role === 'municipal_school_admin') {
          req.managementScope = { type: 'municipal_school' };
          return next();
        }
        break;
      case 'base_school':
        if (req.user.role === 'base_school_admin' && permissions.school_id) {
          req.managementScope = { type: 'base_school', id: permissions.school_id };
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
  requireMinLevel,
  requireAdmin,
  requireManagementScope,
  optionalAuth
};