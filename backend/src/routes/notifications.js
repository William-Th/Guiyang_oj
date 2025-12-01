/**
 * Notifications Routes
 * 通知相关API路由
 */

const express = require('express');
const router = express.Router();
const { body, param, query: _queryValidator, validationResult } = require('express-validator');
const { authMiddleware, requireRole } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const NotificationTemplate = require('../models/NotificationTemplate');

// ============================================
// 用户通知API
// ============================================

/**
 * 获取当前用户的通知列表
 * GET /api/notifications
 */
router.get('/',
  authMiddleware,
  async (req, res) => {
    try {
      const { type, is_read, page = 1, page_size = 20 } = req.query;

      const result = await Notification.findByUserId(req.user.userId, {
        type,
        is_read: is_read === 'true' ? true : (is_read === 'false' ? false : undefined),
        page: parseInt(page),
        page_size: parseInt(page_size)
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 获取未读通知数量
 * GET /api/notifications/unread-count
 */
router.get('/unread-count',
  authMiddleware,
  async (req, res) => {
    try {
      const notificationCount = await Notification.getUnreadCount(req.user.userId);
      const announcementCount = await Announcement.getUnreadCount({
        id: req.user.userId,
        role: req.user.role
      });

      res.json({
        success: true,
        count: {
          notifications: notificationCount,
          announcements: announcementCount,
          total: notificationCount + announcementCount
        }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 标记单个通知为已读
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read',
  authMiddleware,
  param('id').isInt().withMessage('通知ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const notification = await Notification.markAsRead(
        parseInt(req.params.id),
        req.user.userId
      );

      if (!notification) {
        return res.status(404).json({ success: false, message: '通知不存在' });
      }

      res.json({ success: true, notification });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 批量标记通知为已读
 * PUT /api/notifications/batch-read
 */
router.put('/batch-read',
  authMiddleware,
  body('notification_ids').isArray().withMessage('通知ID列表必须是数组'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const count = await Notification.markBatchAsRead(
        req.body.notification_ids,
        req.user.userId
      );

      res.json({ success: true, count });
    } catch (error) {
      console.error('Batch mark as read error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 标记所有通知为已读
 * PUT /api/notifications/read-all
 */
router.put('/read-all',
  authMiddleware,
  async (req, res) => {
    try {
      const { type } = req.body;
      const count = await Notification.markAllAsRead(req.user.userId, type);
      res.json({ success: true, count });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 删除单个通知
 * DELETE /api/notifications/:id
 */
router.delete('/:id',
  authMiddleware,
  param('id').isInt().withMessage('通知ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const deleted = await Notification.delete(
        parseInt(req.params.id),
        req.user.userId
      );

      if (!deleted) {
        return res.status(404).json({ success: false, message: '通知不存在' });
      }

      res.json({ success: true, message: '删除成功' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 批量删除通知
 * DELETE /api/notifications/batch
 */
router.delete('/batch',
  authMiddleware,
  body('notification_ids').isArray().withMessage('通知ID列表必须是数组'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const count = await Notification.deleteBatch(
        req.body.notification_ids,
        req.user.userId
      );

      res.json({ success: true, count });
    } catch (error) {
      console.error('Batch delete error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 删除所有已读通知
 * DELETE /api/notifications/read
 */
router.delete('/read',
  authMiddleware,
  async (req, res) => {
    try {
      const count = await Notification.deleteAllRead(req.user.userId);
      res.json({ success: true, count });
    } catch (error) {
      console.error('Delete all read error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ============================================
// 系统公告API
// ============================================

/**
 * 获取用户可见的公告列表
 * GET /api/notifications/announcements
 */
router.get('/announcements',
  authMiddleware,
  async (req, res) => {
    try {
      const { page = 1, page_size = 10, include_read = 'true' } = req.query;

      const result = await Announcement.findForUser(
        { id: req.user.userId, role: req.user.role },
        {
          page: parseInt(page),
          page_size: parseInt(page_size),
          include_read: include_read === 'true'
        }
      );

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get announcements error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 获取需要弹窗显示的公告
 * GET /api/notifications/announcements/popup
 */
router.get('/announcements/popup',
  authMiddleware,
  async (req, res) => {
    try {
      const announcements = await Announcement.findPopupForUser({
        id: req.user.userId,
        role: req.user.role
      });

      res.json({ success: true, announcements });
    } catch (error) {
      console.error('Get popup announcements error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 获取公告详情
 * GET /api/notifications/announcements/:id
 */
router.get('/announcements/:id',
  authMiddleware,
  param('id').isInt().withMessage('公告ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const announcement = await Announcement.findById(parseInt(req.params.id));

      if (!announcement) {
        return res.status(404).json({ success: false, message: '公告不存在' });
      }

      // 检查权限
      if (announcement.status !== 'published' &&
          !['system_admin', 'municipal_admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: '无权访问该公告' });
      }

      res.json({ success: true, announcement });
    } catch (error) {
      console.error('Get announcement error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 标记公告为已读
 * PUT /api/notifications/announcements/:id/read
 */
router.put('/announcements/:id/read',
  authMiddleware,
  param('id').isInt().withMessage('公告ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const success = await Announcement.markAsRead(
        parseInt(req.params.id),
        req.user.userId
      );

      res.json({ success });
    } catch (error) {
      console.error('Mark announcement as read error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ============================================
// 管理员公告管理API
// ============================================

/**
 * 获取公告列表（管理后台）
 * GET /api/notifications/admin/announcements
 */
router.get('/admin/announcements',
  authMiddleware,
  requireRole(['district_admin', 'municipal_admin', 'system_admin']),
  async (req, res) => {
    try {
      const { status, type, target_audience, page = 1, page_size = 20 } = req.query;

      const result = await Announcement.findAll({
        status,
        type,
        target_audience,
        page: parseInt(page),
        page_size: parseInt(page_size)
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Admin get announcements error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 创建公告
 * POST /api/notifications/admin/announcements
 */
router.post('/admin/announcements',
  authMiddleware,
  requireRole(['district_admin', 'municipal_admin', 'system_admin']),
  body('title').trim().notEmpty().withMessage('标题不能为空'),
  body('content').trim().notEmpty().withMessage('内容不能为空'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const announcement = await Announcement.create({
        ...req.body,
        created_by: req.user.userId
      });

      res.status(201).json({ success: true, announcement });
    } catch (error) {
      console.error('Create announcement error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 更新公告
 * PUT /api/notifications/admin/announcements/:id
 */
router.put('/admin/announcements/:id',
  authMiddleware,
  requireRole(['district_admin', 'municipal_admin', 'system_admin']),
  param('id').isInt().withMessage('公告ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const announcement = await Announcement.update(
        parseInt(req.params.id),
        req.body
      );

      if (!announcement) {
        return res.status(404).json({ success: false, message: '公告不存在' });
      }

      res.json({ success: true, announcement });
    } catch (error) {
      console.error('Update announcement error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 发布公告
 * PUT /api/notifications/admin/announcements/:id/publish
 */
router.put('/admin/announcements/:id/publish',
  authMiddleware,
  requireRole(['district_admin', 'municipal_admin', 'system_admin']),
  param('id').isInt().withMessage('公告ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const announcement = await Announcement.publish(parseInt(req.params.id));

      if (!announcement) {
        return res.status(404).json({ success: false, message: '公告不存在或已发布' });
      }

      res.json({ success: true, announcement });
    } catch (error) {
      console.error('Publish announcement error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 归档公告
 * PUT /api/notifications/admin/announcements/:id/archive
 */
router.put('/admin/announcements/:id/archive',
  authMiddleware,
  requireRole(['district_admin', 'municipal_admin', 'system_admin']),
  param('id').isInt().withMessage('公告ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const announcement = await Announcement.archive(parseInt(req.params.id));

      if (!announcement) {
        return res.status(404).json({ success: false, message: '公告不存在' });
      }

      res.json({ success: true, announcement });
    } catch (error) {
      console.error('Archive announcement error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 删除公告
 * DELETE /api/notifications/admin/announcements/:id
 */
router.delete('/admin/announcements/:id',
  authMiddleware,
  requireRole(['municipal_admin', 'system_admin']),
  param('id').isInt().withMessage('公告ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const deleted = await Announcement.delete(parseInt(req.params.id));

      if (!deleted) {
        return res.status(404).json({ success: false, message: '公告不存在' });
      }

      res.json({ success: true, message: '删除成功' });
    } catch (error) {
      console.error('Delete announcement error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ============================================
// 通知模板管理API（仅系统管理员）
// ============================================

/**
 * 获取通知模板列表
 * GET /api/notifications/admin/templates
 */
router.get('/admin/templates',
  authMiddleware,
  requireRole(['system_admin']),
  async (req, res) => {
    try {
      const { active_only = 'false' } = req.query;
      const templates = await NotificationTemplate.findAll(active_only === 'true');
      res.json({ success: true, templates });
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 更新通知模板
 * PUT /api/notifications/admin/templates/:code
 */
router.put('/admin/templates/:code',
  authMiddleware,
  requireRole(['system_admin']),
  async (req, res) => {
    try {
      const template = await NotificationTemplate.upsert({
        code: req.params.code,
        ...req.body
      });

      res.json({ success: true, template });
    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
