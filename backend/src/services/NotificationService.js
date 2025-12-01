/**
 * NotificationService
 * 通知服务 - 统一的通知发送接口
 *
 * 功能：
 * 1. 使用模板发送通知
 * 2. 批量发送通知
 * 3. 与EventBus集成，监听事件自动发送通知
 */

const Notification = require('../models/Notification');
const NotificationTemplate = require('../models/NotificationTemplate');
const eventBus = require('./EventBus');
const { ACHIEVEMENT, QUESTION } = require('./EventTypes');
const logger = require('../utils/logger');
const { query } = require('../database/connection');

class NotificationService {
  constructor() {
    this.initialized = false;
  }

  /**
   * 初始化通知服务，订阅相关事件
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    // 订阅成就解锁事件
    eventBus.on(ACHIEVEMENT.AWARDED, async (data) => {
      await this.handleAchievementAwarded(data);
    }, { async: true });

    // 订阅题目审核事件
    eventBus.on(QUESTION.APPROVED, async (data) => {
      await this.handleQuestionApproved(data);
    }, { async: true });

    eventBus.on(QUESTION.REJECTED, async (data) => {
      await this.handleQuestionRejected(data);
    }, { async: true });

    this.initialized = true;
    logger.info('NotificationService initialized with event subscriptions');
  }

  /**
   * 使用模板发送通知
   * @param {string} templateCode - 模板代码
   * @param {number} userId - 用户ID
   * @param {Object} variables - 模板变量
   * @param {Object} extra - 额外的通知数据（related_type, related_id, metadata）
   * @returns {Object|null} 创建的通知
   */
  async sendByTemplate(templateCode, userId, variables = {}, extra = {}) {
    try {
      const rendered = await NotificationTemplate.renderByCode(templateCode, variables);
      if (!rendered) {
        logger.warn(`Notification template not found: ${templateCode}`);
        return null;
      }

      const notification = await Notification.create({
        user_id: userId,
        title: rendered.title,
        content: rendered.content,
        type: rendered.type,
        priority: rendered.priority,
        ...extra
      });

      logger.debug('Notification sent via template', {
        templateCode,
        userId,
        notificationId: notification.id
      });

      return notification;
    } catch (error) {
      logger.error('Send notification by template failed', {
        error: error.message,
        templateCode,
        userId
      });
      return null;
    }
  }

  /**
   * 批量发送通知（使用模板）
   * @param {string} templateCode - 模板代码
   * @param {Array<number>} userIds - 用户ID列表
   * @param {Object} variables - 模板变量
   * @param {Object} extra - 额外的通知数据
   * @returns {Array} 创建的通知列表
   */
  async sendBatchByTemplate(templateCode, userIds, variables = {}, extra = {}) {
    try {
      if (!userIds || userIds.length === 0) {
        return [];
      }

      const rendered = await NotificationTemplate.renderByCode(templateCode, variables);
      if (!rendered) {
        logger.warn(`Notification template not found: ${templateCode}`);
        return [];
      }

      const notifications = await Notification.createBatch(userIds, {
        title: rendered.title,
        content: rendered.content,
        type: rendered.type,
        priority: rendered.priority,
        ...extra
      });

      logger.info('Batch notifications sent via template', {
        templateCode,
        count: notifications.length
      });

      return notifications;
    } catch (error) {
      logger.error('Send batch notification by template failed', {
        error: error.message,
        templateCode,
        userCount: userIds?.length
      });
      return [];
    }
  }

  /**
   * 直接发送通知（不使用模板）
   * @param {number} userId - 用户ID
   * @param {Object} data - 通知数据
   * @returns {Object|null} 创建的通知
   */
  async send(userId, data) {
    try {
      const notification = await Notification.create({
        user_id: userId,
        ...data
      });

      logger.debug('Notification sent', {
        userId,
        notificationId: notification.id,
        type: data.type
      });

      return notification;
    } catch (error) {
      logger.error('Send notification failed', {
        error: error.message,
        userId
      });
      return null;
    }
  }

  /**
   * 批量直接发送通知
   * @param {Array<number>} userIds - 用户ID列表
   * @param {Object} data - 通知数据
   * @returns {Array} 创建的通知列表
   */
  async sendBatch(userIds, data) {
    try {
      if (!userIds || userIds.length === 0) {
        return [];
      }

      const notifications = await Notification.createBatch(userIds, data);

      logger.info('Batch notifications sent', {
        count: notifications.length,
        type: data.type
      });

      return notifications;
    } catch (error) {
      logger.error('Send batch notification failed', {
        error: error.message,
        userCount: userIds?.length
      });
      return [];
    }
  }

  // ==========================================
  // 测评活动相关通知
  // ==========================================

  /**
   * 发送测评发布通知
   * @param {Object} activity - 活动信息
   * @param {Array<number>} targetUserIds - 目标用户ID列表
   */
  async sendAssessmentPublished(activity, targetUserIds) {
    const variables = {
      activity_title: activity.title,
      registration_start: activity.registration_start_time ?
        new Date(activity.registration_start_time).toLocaleString('zh-CN') : '即刻起',
      registration_end: activity.registration_end_time ?
        new Date(activity.registration_end_time).toLocaleString('zh-CN') : '待定'
    };

    return this.sendBatchByTemplate('assessment_published', targetUserIds, variables, {
      related_type: 'activity',
      related_id: activity.id,
      metadata: {
        activity_id: activity.id,
        ability_level: activity.ability_level,
        subject: activity.subject
      }
    });
  }

  /**
   * 发送报名确认通知
   * @param {Object} registration - 报名信息
   */
  async sendRegistrationConfirmed(registration) {
    const variables = {
      activity_title: registration.activity_title,
      location: registration.location_name || null
    };

    return this.sendByTemplate('registration_confirmed', registration.student_id, variables, {
      related_type: 'registration',
      related_id: registration.id,
      metadata: {
        registration_id: registration.id,
        activity_id: registration.activity_id,
        location_id: registration.location_id
      }
    });
  }

  /**
   * 发送报名拒绝通知
   * @param {Object} registration - 报名信息
   * @param {string} reason - 拒绝原因
   */
  async sendRegistrationRejected(registration, reason) {
    const variables = {
      activity_title: registration.activity_title,
      reason: reason || null
    };

    return this.sendByTemplate('registration_rejected', registration.student_id, variables, {
      related_type: 'registration',
      related_id: registration.id
    });
  }

  /**
   * 发送报名取消通知
   * @param {Object} registration - 报名信息
   * @param {string} reason - 取消原因
   */
  async sendRegistrationCancelled(registration, reason) {
    const variables = {
      activity_title: registration.activity_title,
      reason: reason || null
    };

    return this.sendByTemplate('registration_cancelled', registration.student_id, variables, {
      related_type: 'registration',
      related_id: registration.id
    });
  }

  /**
   * 发送测评提醒通知
   * @param {Object} activity - 活动信息
   * @param {Array<Object>} registrations - 报名信息列表
   */
  async sendAssessmentReminder(activity, registrations) {
    const results = [];

    for (const reg of registrations) {
      const variables = {
        activity_title: activity.title,
        start_time: new Date(activity.start_time).toLocaleString('zh-CN'),
        location: reg.location_name || null
      };

      const notification = await this.sendByTemplate(
        'assessment_reminder',
        reg.student_id,
        variables,
        {
          related_type: 'activity',
          related_id: activity.id,
          priority: 5  // 高优先级
        }
      );

      if (notification) {
        results.push(notification);
      }
    }

    return results;
  }

  // ==========================================
  // 事件处理器
  // ==========================================

  /**
   * 处理成就获得事件
   */
  async handleAchievementAwarded(data) {
    try {
      const { userId, achievement } = data;

      await this.sendByTemplate('achievement_unlocked', userId, {
        achievement_name: achievement.name,
        description: achievement.description || ''
      }, {
        related_type: 'achievement',
        related_id: achievement.id,
        metadata: {
          achievement_code: achievement.code,
          points: achievement.points
        }
      });
    } catch (error) {
      logger.error('Handle achievement awarded notification failed', {
        error: error.message,
        data
      });
    }
  }

  /**
   * 处理题目审核通过事件
   */
  async handleQuestionApproved(data) {
    try {
      const { questionId, creatorId, questionCode } = data;

      await this.sendByTemplate('question_approved', creatorId, {
        question_code: questionCode
      }, {
        related_type: 'question',
        related_id: questionId
      });
    } catch (error) {
      logger.error('Handle question approved notification failed', {
        error: error.message,
        data
      });
    }
  }

  /**
   * 处理题目审核拒绝事件
   */
  async handleQuestionRejected(data) {
    try {
      const { questionId, creatorId, questionCode, reason } = data;

      await this.sendByTemplate('question_rejected', creatorId, {
        question_code: questionCode,
        reason: reason || ''
      }, {
        related_type: 'question',
        related_id: questionId
      });
    } catch (error) {
      logger.error('Handle question rejected notification failed', {
        error: error.message,
        data
      });
    }
  }

  // ==========================================
  // 辅助方法
  // ==========================================

  /**
   * 获取符合条件的学生用户ID列表（用于批量通知）
   * @param {Object} filters - 过滤条件
   * @returns {Array<number>} 用户ID列表
   */
  async getStudentUserIds(filters = {}) {
    const { district_id, school_id, grade, subject: _subject } = filters;

    let sql = `
      SELECT DISTINCT u.id
      FROM users u
      JOIN students s ON u.id = s.user_id
      WHERE u.role = 'student' AND u.status = 'active'
    `;
    const params = [];
    let paramIndex = 1;

    if (district_id) {
      sql += ` AND s.district_id = $${paramIndex}`;
      params.push(district_id);
      paramIndex++;
    }

    if (school_id) {
      sql += ` AND s.school_id = $${paramIndex}`;
      params.push(school_id);
      paramIndex++;
    }

    if (grade) {
      sql += ` AND s.grade = $${paramIndex}`;
      params.push(grade);
      paramIndex++;
    }

    const result = await query(sql, params);
    return result.rows.map(row => row.id);
  }

  /**
   * 发送欢迎通知
   * @param {number} userId - 用户ID
   */
  async sendWelcome(userId) {
    return this.sendByTemplate('welcome', userId, {});
  }

  /**
   * 发送密码修改通知
   * @param {number} userId - 用户ID
   */
  async sendPasswordChanged(userId) {
    return this.sendByTemplate('password_changed', userId, {});
  }
}

// 单例模式
const notificationService = new NotificationService();

module.exports = notificationService;
