/**
 * 微信登录/绑定（计划书第8章鉴权方案）：
 * - POST /api/auth/wechat {code}：code2session → 已绑定直接签发现有 JWT；未绑定返回 bindTicket（10 分钟一次性会话）
 * - POST /api/auth/wechat/bind {bindTicket, username, password}：校验账号密码后写 user_wechat_bindings 并签发 JWT
 * - 未配置微信凭据时 503 + WECHAT_NOT_CONFIGURED，前端引导回账号密码登录
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../database/connection');
const wechatApi = require('../services/wechat/wechatApi');
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwt');

function issueSession(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    tokenVersion: user.token_version
  };
  return {
    token: generateToken(payload),
    refreshToken: generateRefreshToken(payload),
    user: { id: user.id, username: user.username, role: user.role, realName: user.real_name, phone: user.phone || null }
  };
}

router.post(
  '/wechat',
  [body('code').notEmpty().withMessage('code is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }
    if (!wechatApi.isConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'WECHAT_NOT_CONFIGURED',
        message: '微信登录未配置，请使用账号密码登录'
      });
    }
    try {
      const session = await wechatApi.code2session(req.body.code);
      const bindResult = await query(
        'SELECT u.* FROM user_wechat_bindings b JOIN users u ON u.id = b.user_id WHERE b.openid = $1',
        [session.openid]
      );
      if (bindResult.rows.length > 0) {
        const user = bindResult.rows[0];
        if (user.status !== 'active') {
          return res.status(403).json({ success: false, message: '账号已被停用，请联系管理员' });
        }
        return res.json({ success: true, ...issueSession(user) });
      }
      // 未绑定：发 10 分钟一次性绑定会话（openid 封进 JWT，不落库）
      const bindTicket = require('jsonwebtoken').sign(
        { openid: session.openid, unionid: session.unionid || null, t: Date.now() },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );
      res.json({ success: true, needBind: true, bindTicket });
    } catch (error) {
      console.error('WeChat login error:', error.message);
      res.status(401).json({ success: false, message: '微信登录失败，请重试或使用账号密码登录' });
    }
  }
);

router.post(
  '/wechat/bind',
  [
    body('bindTicket').notEmpty().withMessage('bindTicket is required'),
    body('username').notEmpty().withMessage('账号不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '请填写账号和密码' });
    }
    let openid;
    let unionid = null;
    try {
      const decoded = require('jsonwebtoken').verify(req.body.bindTicket, process.env.JWT_SECRET);
      openid = decoded.openid;
      unionid = decoded.unionid || null;
    } catch {
      return res.status(400).json({ success: false, message: '绑定会话已过期，请重新点击微信登录' });
    }
    try {
      const { username, password } = req.body;
      const user = await User.findByUsername(username);
      if (!user || !(await User.validatePassword(password, user.password))) {
        return res.status(401).json({ success: false, message: '账号或密码错误' });
      }
      if (user.status !== 'active') {
        return res.status(403).json({ success: false, message: '账号已被停用，请联系管理员' });
      }
      // 一个微信号只能绑定一个账号
      const openidOwner = await query('SELECT user_id FROM user_wechat_bindings WHERE openid = $1', [openid]);
      if (openidOwner.rows.length > 0 && openidOwner.rows[0].user_id !== user.id) {
        return res.status(400).json({ success: false, message: '该微信已绑定其他账号' });
      }
      // 换绑：同一账号换新微信时覆盖 openid
      await query(
        `INSERT INTO user_wechat_bindings (user_id, openid, unionid)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET openid = EXCLUDED.openid, unionid = EXCLUDED.unionid, updated_at = CURRENT_TIMESTAMP`,
        [user.id, openid, unionid]
      );
      res.json({ success: true, message: '绑定成功', ...issueSession(user) });
    } catch (error) {
      console.error('WeChat bind error:', error.message);
      res.status(500).json({ success: false, message: '绑定失败，请稍后重试' });
    }
  }
);

module.exports = router;
