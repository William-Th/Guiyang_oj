const Achievement = require('../../models/Achievement');
const StudentPoints = require('../../models/StudentPoints');
const eventBus = require('../EventBus');
const { STUDENT_ACTIVITY, STUDENT_LOGIN, STUDENT_PRACTICE, STUDENT_EXAM, ACHIEVEMENT } = require('../EventTypes');
const logger = require('../../utils/logger');
const { query } = require('../../database/connection');

/**
 * AchievementDetector - 成就检测器
 * 负责检测和触发成就
 */
class AchievementDetector {
  constructor() {
    this.achievementRules = new Map(); // 缓存成就规则
    this.isInitialized = false;
  }

  /**
   * 初始化检测器
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // 加载所有成就规则
      await this.loadAchievementRules();

      // 订阅各类事件
      this.subscribeToEvents();

      this.isInitialized = true;
      logger.info('✅ AchievementDetector initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AchievementDetector:', error);
      throw error;
    }
  }

  /**
   * 加载成就规则
   */
  async loadAchievementRules() {
    try {
      const achievements = await Achievement.getAllAchievements();

      // 清空缓存
      this.achievementRules.clear();

      // 按事件类型分组存储规则
      for (const achievement of achievements) {
        const { trigger_condition } = achievement;

        if (!trigger_condition || !trigger_condition.event_name) {
          continue;
        }

        const eventName = trigger_condition.event_name;
        if (!this.achievementRules.has(eventName)) {
          this.achievementRules.set(eventName, []);
        }

        this.achievementRules.get(eventName).push(achievement);
      }

      logger.info(`Loaded ${achievements.length} achievement rules`);
    } catch (error) {
      logger.error('Error loading achievement rules:', error);
      throw error;
    }
  }

  /**
   * 订阅事件
   */
  subscribeToEvents() {
    // 学生活动相关事件
    eventBus.on(STUDENT_ACTIVITY.COMPLETED, async (data) => {
      await this.detectAchievements(STUDENT_ACTIVITY.COMPLETED, data);
    }, { priority: 5 });

    eventBus.on(STUDENT_ACTIVITY.HIGH_SCORE, async (data) => {
      await this.detectAchievements(STUDENT_ACTIVITY.HIGH_SCORE, data);
    }, { priority: 5 });

    eventBus.on(STUDENT_ACTIVITY.PERFECT_SCORE, async (data) => {
      await this.detectAchievements(STUDENT_ACTIVITY.PERFECT_SCORE, data);
    }, { priority: 5 });

    // 学生登录相关事件
    eventBus.on(STUDENT_LOGIN.LOGIN, async (data) => {
      await this.detectAchievements(STUDENT_LOGIN.LOGIN, data);
    }, { priority: 5 });

    eventBus.on(STUDENT_LOGIN.MORNING, async (data) => {
      await this.detectAchievements(STUDENT_LOGIN.MORNING, data);
    }, { priority: 5 });

    eventBus.on(STUDENT_LOGIN.FIRST, async (data) => {
      await this.detectAchievements(STUDENT_LOGIN.FIRST, data);
    }, { priority: 5 });

    eventBus.on(STUDENT_LOGIN.STREAK, async (data) => {
      await this.detectAchievements(STUDENT_LOGIN.STREAK, data);
    }, { priority: 5 });

    // 学生练习相关事件
    eventBus.on(STUDENT_PRACTICE.COMPLETED, async (data) => {
      await this.detectAchievements(STUDENT_PRACTICE.COMPLETED, data);
    }, { priority: 5 });

    eventBus.on(STUDENT_PRACTICE.FAST, async (data) => {
      await this.detectAchievements(STUDENT_PRACTICE.FAST, data);
    }, { priority: 5 });

    eventBus.on(STUDENT_PRACTICE.ACCURACY, async (data) => {
      await this.detectAchievements(STUDENT_PRACTICE.ACCURACY, data);
    }, { priority: 5 });

    // 学生测评相关事件
    eventBus.on(STUDENT_EXAM.COMPLETED, async (data) => {
      await this.detectAchievements(STUDENT_EXAM.COMPLETED, data);
    }, { priority: 5 });

    logger.info('AchievementDetector: Event subscriptions configured');
  }

  /**
   * 检测成就
   * @param {string} eventName - 事件名称
   * @param {Object} eventData - 事件数据 { studentId, ...otherData }
   */
  async detectAchievements(eventName, eventData) {
    try {
      const rules = this.achievementRules.get(eventName);

      if (!rules || rules.length === 0) {
        return;
      }

      const { studentId: userId } = eventData;

      // Convert user_id to student_id (student_achievements references students.id, not users.id)
      const studentResult = await query(
        'SELECT id FROM students WHERE user_id = $1',
        [userId]
      );

      if (studentResult.rows.length === 0) {
        logger.debug(`No student record found for user_id ${userId}, skipping achievement detection`);
        return;
      }

      const studentId = studentResult.rows[0].id;

      for (const achievement of rules) {
        const satisfied = await this.checkCondition(achievement, eventData);

        if (satisfied) {
          await this.awardAchievement(studentId, achievement);
        } else {
          // 即使未满足条件，也更新进度追踪
          await this.updateAchievementProgress(studentId, achievement, eventData);
        }
      }
    } catch (error) {
      logger.error(`Error detecting achievements for event ${eventName}:`, error);
    }
  }

  /**
   * 检查条件是否满足
   * @param {Object} achievement - 成就定义
   * @param {Object} eventData - 事件数据
   * @returns {Promise<boolean>}
   */
  async checkCondition(achievement, eventData) {
    const { trigger_condition } = achievement;
    const { condition_type } = trigger_condition;

    try {
      // 根据条件类型检查
      switch (condition_type) {
      case 'count':
        return await this.checkCountCondition(trigger_condition, eventData);

      case 'threshold':
        return await this.checkThresholdCondition(trigger_condition, eventData);

      case 'state':
        return await this.checkStateCondition(trigger_condition, eventData);

      case 'time_window':
        return await this.checkTimeWindowCondition(trigger_condition, eventData);

      case 'consecutive':
        return await this.checkConsecutiveCondition(trigger_condition, eventData);

      case 'and':
      case 'or':
        return await this.checkLogicalCondition(trigger_condition, eventData);

      default:
        logger.warn(`Unknown condition type: ${condition_type}`, { achievement_id: achievement.achievement_id });
        return false;
      }
    } catch (error) {
      logger.error('Error checking condition:', error, { achievement_id: achievement.achievement_id });
      return false;
    }
  }

  /**
   * 检查计数条件
   * @param {Object} condition - 条件配置
   * @param {Object} eventData - 事件数据
   * @returns {Promise<boolean>}
   */
  async checkCountCondition(condition, eventData) {
    const { target_count } = condition;

    // 简化实现：如果事件数据中已包含count，直接比较
    if (eventData.count !== undefined) {
      return eventData.count >= target_count;
    }

    // 否则需要查询数据库统计（这里暂时返回false，等待实现）
    logger.debug('Count condition requires database query - not yet implemented');
    return false;
  }

  /**
   * 检查阈值条件
   * @param {Object} condition - 条件配置
   * @param {Object} eventData - 事件数据
   * @returns {Promise<boolean>}
   */
  async checkThresholdCondition(condition, eventData) {
    const { threshold_value, threshold_field } = condition;

    // 从事件数据中提取字段值
    const value = threshold_field ? eventData[threshold_field] : eventData.value;

    if (value === undefined) {
      logger.debug('Threshold field not found in event data', { threshold_field, eventData });
      return false;
    }

    return value >= threshold_value;
  }

  /**
   * 检查状态条件
   * @param {Object} condition - 条件配置
   * @param {Object} eventData - 事件数据
   * @returns {Promise<boolean>}
   */
  async checkStateCondition(condition, eventData) {
    const { first_time, filter } = condition;

    // 检查是否首次触发
    if (first_time) {
      return eventData.isFirstTime === true;
    }

    // 检查过滤条件
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (eventData[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 检查时间窗口条件
   * @param {Object} condition - 条件配置
   * @param {Object} eventData - 事件数据
   * @returns {Promise<boolean>}
   */
  async checkTimeWindowCondition(condition, eventData) {
    const { time_window } = condition;
    const { start, end } = time_window;

    // 简化实现：检查当前事件时间是否在窗口内
    const now = eventData.timestamp ? new Date(eventData.timestamp) : new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    return now >= startDate && now <= endDate;
  }

  /**
   * 检查连续条件
   * @param {Object} condition - 条件配置
   * @param {Object} eventData - 事件数据
   * @returns {Promise<boolean>}
   */
  async checkConsecutiveCondition(condition, eventData) {
    const { consecutive_days, consecutive_weeks } = condition;

    // 简化实现：从事件数据中读取连续天数/周数
    if (consecutive_days && eventData.consecutiveDays !== undefined) {
      return eventData.consecutiveDays >= consecutive_days;
    }

    if (consecutive_weeks && eventData.consecutiveWeeks !== undefined) {
      return eventData.consecutiveWeeks >= consecutive_weeks;
    }

    logger.debug('Consecutive condition requires pre-calculated value in event data');
    return false;
  }

  /**
   * 检查逻辑条件 (and/or)
   * @param {Object} condition - 条件配置
   * @param {Object} eventData - 事件数据
   * @returns {Promise<boolean>}
   */
  async checkLogicalCondition(condition, eventData) {
    const { condition_type, sub_conditions } = condition;

    if (!sub_conditions || sub_conditions.length === 0) {
      return false;
    }

    if (condition_type === 'and') {
      // AND: 所有子条件必须满足
      for (const subCondition of sub_conditions) {
        const satisfied = await this.checkCondition(
          { trigger_condition: subCondition },
          eventData
        );
        if (!satisfied) {
          return false;
        }
      }
      return true;
    } else if (condition_type === 'or') {
      // OR: 至少一个子条件满足
      for (const subCondition of sub_conditions) {
        const satisfied = await this.checkCondition(
          { trigger_condition: subCondition },
          eventData
        );
        if (satisfied) {
          return true;
        }
      }
      return false;
    }

    return false;
  }

  /**
   * 更新成就进度
   * @param {number} studentId
   * @param {Object} achievement
   * @param {Object} eventData
   */
  async updateAchievementProgress(studentId, achievement, eventData) {
    try {
      const { achievement_id, trigger_condition } = achievement;
      const { condition_type } = trigger_condition;

      let currentValue = 0;
      let targetValue = 0;

      // 根据条件类型计算当前值和目标值
      switch (condition_type) {
      case 'count': {
        // 计数型：需要查询数据库统计当前计数
        targetValue = trigger_condition.target_count || 0;

        // 获取user_id (因为student_activities.student_id引用users.id)
        const userResult = await query(
          'SELECT user_id FROM students WHERE id = $1',
          [studentId]
        );

        if (userResult.rows.length === 0) {
          logger.warn(`Student ${studentId} not found`);
          return;
        }

        const userId = userResult.rows[0].user_id;

        // 查询student_activities表统计已完成的活动数量
        const filter = trigger_condition.filter || {};
        const result = await query(
          `SELECT COUNT(*) as count
           FROM student_activities sa
           JOIN activities a ON sa.activity_id = a.id
           WHERE sa.student_id = $1
           AND sa.status = 'graded'
           ${filter.type ? 'AND a.type = $2' : ''}`,
          filter.type ? [userId, filter.type] : [userId]
        );
        currentValue = parseInt(result.rows[0].count) || 0;
        break;
      }

      case 'threshold': {
        // 阈值型：当前值就是事件数据中的值
        targetValue = trigger_condition.threshold_value || 0;
        const threshold_field = trigger_condition.threshold_field;
        currentValue = threshold_field ? eventData[threshold_field] : (eventData.value || 0);
        break;
      }

      case 'consecutive': {
        // 连续型：连续天数/周数
        if (trigger_condition.consecutive_days) {
          targetValue = trigger_condition.consecutive_days;
          currentValue = eventData.consecutiveDays || 0;
        } else if (trigger_condition.consecutive_weeks) {
          targetValue = trigger_condition.consecutive_weeks;
          currentValue = eventData.consecutiveWeeks || 0;
        }
        break;
      }

      default:
        // 其他类型暂不追踪进度
        return;
      }

      // 只有在有明确目标值的情况下才更新进度
      if (targetValue > 0) {
        await Achievement.updateProgress(studentId, achievement_id, currentValue, targetValue);
        logger.debug(`Updated progress for achievement ${achievement_id}: ${currentValue}/${targetValue}`);
      }
    } catch (error) {
      logger.error('Error updating achievement progress:', error);
    }
  }

  /**
   * 授予成就
   * @param {number} studentId
   * @param {Object} achievement
   */
  async awardAchievement(studentId, achievement) {
    try {
      const { achievement_id, points_reward, achievement_name } = achievement;

      // 检查是否已获得
      const studentAchievements = await Achievement.getStudentAchievements(studentId);
      const alreadyAwarded = studentAchievements.some(
        (sa) => sa.achievement_id === achievement_id
      );

      if (alreadyAwarded) {
        logger.debug(`Student ${studentId} already has achievement ${achievement_id}`);
        return;
      }

      // 授予成就
      await Achievement.awardAchievement(studentId, achievement_id, points_reward);

      // 添加积分
      if (points_reward > 0) {
        await StudentPoints.addPoints(
          studentId,
          points_reward,
          'achievement',
          {
            sourceId: achievement_id,
            sourceType: 'achievement',
            description: `获得成就: ${achievement_name}`
          }
        );
      }

      logger.info(`✨ Awarded achievement ${achievement_name} to student ${studentId}`);

      // 发布成就获得事件
      await eventBus.emit(ACHIEVEMENT.AWARDED, {
        source: 'AchievementDetector',
        studentId,
        achievementId: achievement_id,
        achievementName: achievement_name,
        pointsAwarded: points_reward,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error awarding achievement:', error);
    }
  }
}

// 导出单例
const achievementDetector = new AchievementDetector();
module.exports = achievementDetector;
