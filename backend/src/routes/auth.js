const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

// Login endpoint
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('loginType').optional().isIn(['username', 'idCard']).withMessage('Invalid login type')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { username, password, loginType = 'username' } = req.body;
    
    // Find user by username or ID card
    let user;
    if (loginType === 'idCard') {
      user = await User.findByIdCard(username);
    } else {
      user = await User.findByUsername(username);
    }
    
    if (!user) {
      logger.warn('Login attempt with invalid credentials', { username, loginType });
      return res.status(401).json({ 
        message: loginType === 'idCard' ? '身份证号不存在' : '用户名不存在' 
      });
    }

    // Validate password
    const isValidPassword = await User.validatePassword(password, user.password);
    if (!isValidPassword) {
      logger.warn('Login attempt with wrong password', { username: user.username });
      return res.status(401).json({ message: '密码错误' });
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };
    
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    logger.info('User logged in successfully', { 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    });

    res.json({
      message: '登录成功',
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        realName: user.real_name,
        idCard: user.id_card
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: '服务器错误，请稍后重试' });
  }
});

// Register endpoint
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('用户名至少3个字符'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6个字符'),
  body('role').isIn(['student', 'teacher', 'admin']).withMessage('无效的用户角色'),
  body('realName').notEmpty().withMessage('真实姓名不能为空'),
  body('idCard').optional().matches(/^\d{18}$/).withMessage('身份证号格式不正确')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { username, password, role, realName, idCard, phone, email } = req.body;
    
    // Check if username already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    // Check if ID card already exists (if provided)
    if (idCard) {
      const existingIdCard = await User.findByIdCard(idCard);
      if (existingIdCard) {
        return res.status(400).json({ message: '身份证号已被注册' });
      }
    }
    
    // Create user
    const newUser = await User.create({
      username,
      password,
      role,
      realName,
      idCard,
      phone,
      email
    });
    
    logger.info('New user registered', { 
      userId: newUser.id, 
      username: newUser.username, 
      role: newUser.role 
    });
    
    res.status(201).json({
      message: '注册成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        realName: newUser.real_name,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: '注册失败，请稍后重试' });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        realName: user.real_name,
        idCard: user.id_card,
        phone: user.phone,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ message: '获取用户信息失败' });
  }
});

// Refresh token endpoint
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { refreshToken } = req.body;
    const { verifyRefreshToken } = require('../utils/jwt');
    
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: '无效的刷新令牌' });
    }
    
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };
    
    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    
    res.json({
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ message: '刷新令牌失败' });
  }
});

// Logout endpoint
router.post('/logout', authMiddleware, (req, res) => {
  // TODO: Add token to blacklist in Redis
  logger.info('User logged out', { userId: req.user.id });
  res.json({ message: '退出登录成功' });
});

module.exports = router;