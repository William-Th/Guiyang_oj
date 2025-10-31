const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authMiddleware, requireRole, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // Remove password from response
    const { password, ...userProfile } = user;
    res.json({ user: userProfile });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ message: '获取用户信息失败' });
  }
});

// Update user profile
router.put('/profile', [
  authMiddleware,
  body('realName').optional().isLength({ min: 1 }).withMessage('真实姓名不能为空'),
  body('phone').optional().isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
  body('email').optional().isEmail().withMessage('邮箱格式不正确')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { realName, phone, email } = req.body;
    const userData = {
      realName: realName || null,
      phone: phone || null,
      email: email || null,
      status: 'active', // 保持当前状态
      role: req.user.role // 保持当前角色
    };

    const updatedUser = await User.updateUser(req.user.id, userData);
    if (!updatedUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      message: '用户信息更新成功',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ message: '更新用户信息失败' });
  }
});

// Get all users (admin only)
router.get('/all', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const { role, status } = req.query;
    const filters = {};

    if (role) filters.role = role;
    if (status) filters.status = status;

    // 根据管理员角色获取对应范围的用户
    let users = [];

    // 系统管理员和市级总管理员可以看到所有用户
    if (req.user.role === 'system_admin' || req.user.role === 'municipal_admin') {
      users = await User.findAll(filters);
    }
    // 区级管理员只能看到该区域内的老师和学生
    else if (req.user.role === 'district_admin') {
      const permissions = await User.getAdminPermissions(req.user.id);
      if (!permissions || !permissions.district_id) {
        return res.status(403).json({ message: '未找到管理权限信息' });
      }
      users = await User.findByDistrict(permissions.district_id, filters);
    }
    // 校级管理员只能看到该校的老师和学生
    else if (req.user.role === 'school_admin' || req.user.role === 'base_school_admin' || req.user.role === 'municipal_school_admin') {
      const permissions = await User.getAdminPermissions(req.user.id);
      if (!permissions || !permissions.school_id) {
        return res.status(403).json({ message: '未找到管理权限信息' });
      }
      users = await User.findBySchool(permissions.school_id, filters);
    }
    else {
      return res.status(403).json({ message: '权限不足' });
    }

    res.json({ users });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({ message: '获取用户列表失败' });
  }
});

// Create new user (admin only)
router.post('/create', [
  authMiddleware,
  requireAdmin,
  body('username').isLength({ min: 3 }).withMessage('用户名至少3个字符'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6个字符'),
  body('role').isIn(['student', 'teacher', 'school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'])
    .withMessage('角色必须是有效的用户角色'),
  body('realName').notEmpty().withMessage('真实姓名不能为空'),
  body('phone').optional().isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
  body('email').optional().isEmail().withMessage('邮箱格式不正确')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, password, role, realName, idCard, phone, email } = req.body;

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

    const userData = {
      username,
      password,
      role,
      realName,
      idCard: idCard || null,
      phone: phone || null,
      email: email || null
    };

    const newUser = await User.create(userData);

    logger.info('New user created by admin', {
      createdBy: req.user.id,
      newUserId: newUser.id,
      role: newUser.role
    });

    res.status(201).json({
      message: '用户创建成功',
      user: newUser
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ message: '创建用户失败' });
  }
});

// Update user (admin only)
router.put('/:id', [
  authMiddleware,
  requireAdmin,
  body('realName').optional().isLength({ min: 1 }).withMessage('真实姓名不能为空'),
  body('role').optional().isIn(['student', 'teacher', 'school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'])
    .withMessage('角色必须是有效的用户角色'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('状态必须是active、inactive或suspended'),
  body('phone').optional().isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
  body('email').optional().isEmail().withMessage('邮箱格式不正确')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.params.id;
    const { realName, role, status, phone, email } = req.body;

    // Prevent admin from modifying their own role or status
    if (userId == req.user.id && (role || status)) {
      return res.status(400).json({ message: '不能修改自己的角色或状态' });
    }

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const userData = {
      realName: realName || existingUser.real_name,
      phone: phone || existingUser.phone,
      email: email || existingUser.email,
      status: status || existingUser.status,
      role: role || existingUser.role
    };

    const updatedUser = await User.updateUser(userId, userData);

    logger.info('User updated by admin', {
      updatedBy: req.user.id,
      userId: userId,
      changes: userData
    });

    res.json({
      message: '用户信息更新成功',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ message: '更新用户失败' });
  }
});

// Reset user password (admin only)
router.put('/:id/reset-password', [
  authMiddleware,
  requireAdmin,
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6个字符')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    await User.updatePassword(userId, newPassword);

    logger.info('Password reset by admin', {
      resetBy: req.user.id,
      userId: userId
    });

    res.json({ message: '密码重置成功' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ message: '重置密码失败' });
  }
});

// Delete user (admin only)
router.delete('/:id', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId == req.user.id) {
      return res.status(400).json({ message: '不能删除自己的账号' });
    }

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    await User.deleteUser(userId);

    logger.info('User deleted by admin', {
      deletedBy: req.user.id,
      userId: userId,
      deletedUser: existingUser.username
    });

    res.json({ message: '用户删除成功' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ message: '删除用户失败' });
  }
});

// Get all students (admin and teacher)
router.get('/students', [
  authMiddleware,
  requireRole(['admin', 'teacher'])
], async (req, res) => {
  try {
    const students = await User.findAll({ role: 'student' });
    res.json({ students });
  } catch (error) {
    logger.error('Get students error:', error);
    res.status(500).json({ message: '获取学生列表失败' });
  }
});

// Get all teachers (admin only)
router.get('/teachers', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const teachers = await User.findAll({ role: 'teacher' });
    res.json({ teachers });
  } catch (error) {
    logger.error('Get teachers error:', error);
    res.status(500).json({ message: '获取教师列表失败' });
  }
});

// Batch import users (admin only)
router.post('/import', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    // TODO: Implement batch import functionality
    res.json({ message: '批量导入功能开发中' });
  } catch (error) {
    logger.error('Import users error:', error);
    res.status(500).json({ message: '批量导入失败' });
  }
});

// Delete student account with foreign key handling
// 专门用于删除学生账号，处理所有外键约束
router.delete('/student/:userId', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ message: '无效的用户ID' });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ message: '不能删除自己的账号' });
    }

    // Verify user exists and is a student
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (existingUser.role !== 'student') {
      return res.status(400).json({ message: '该用户不是学生账号' });
    }

    // Delete with proper foreign key handling
    const deletedUser = await User.deleteStudent(userId);

    logger.info('Student account deleted by admin', {
      deletedBy: req.user.id,
      userId: userId,
      deletedUser: existingUser.username
    });

    res.json({
      message: '学生账号删除成功',
      deletedUser: {
        id: deletedUser.id,
        username: deletedUser.username,
        role: deletedUser.role
      }
    });
  } catch (error) {
    logger.error('Delete student error:', error);
    res.status(500).json({
      message: '删除学生账号失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete teacher account with foreign key handling
// 专门用于删除教师账号，处理所有外键约束
router.delete('/teacher/:userId', [
  authMiddleware,
  requireAdmin
], async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ message: '无效的用户ID' });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ message: '不能删除自己的账号' });
    }

    // Verify user exists and is a teacher
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (existingUser.role !== 'teacher') {
      return res.status(400).json({ message: '该用户不是教师账号' });
    }

    // Delete with proper foreign key handling
    const deletedUser = await User.deleteTeacher(userId);

    logger.info('Teacher account deleted by admin', {
      deletedBy: req.user.id,
      userId: userId,
      deletedUser: existingUser.username
    });

    res.json({
      message: '教师账号删除成功',
      deletedUser: {
        id: deletedUser.id,
        username: deletedUser.username,
        role: deletedUser.role
      }
    });
  } catch (error) {
    logger.error('Delete teacher error:', error);
    res.status(500).json({
      message: '删除教师账号失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;