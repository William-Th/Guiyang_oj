const Achievement = require('../../models/Achievement');
const StudentPoints = require('../../models/StudentPoints');
const eventBus = require('../EventBus');
const { STUDENT_ACTIVITY, STUDENT_LOGIN, STUDENT_PRACTICE, STUDENT_EXAM, ACHIEVEMENT } = require('../EventTypes');
const logger = require('../../utils/logger');

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

      const { studentId } = eventData;

      for (const achievement of rules) {
        const satisfied = await this.checkCondition(achievement, eventData);

        if (satisfied) {
          await this.awardAchievement(studentId, achievement);
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
   * @returns {boolean}
   */
  async checkCondition(achievement, eventData) {
    const { trigger_condition } = achievement;
    const { condition_type, threshold, target_value } = trigger_condition;

    // 根据条件类型检查
    switch (condition_type) {
    case 'count':
      // 检查计数是否达到阈值
      return eventData.count >= threshold;

    case 'threshold':
      // 检查值是否超过阈值
      return eventData.value >= threshold;

    case 'state':
      // 检查状态
      return eventData.state === target_value;

    case 'combination':
      // 组合条件
      return await this.checkCombinationCondition(trigger_condition, eventData);

    default:
      logger.warn(`Unknown condition type: ${condition_type}`);
      return false;
    }
  }

  /**
   * 检查组合条件
   * @param {Object} condition
   * @param {Object} eventData
   * @returns {boolean}
   */
  async checkCombinationCondition(condition, eventData) {
    const { operator, conditions } = condition;

    if (operator === 'AND') {
      for (const subCondition of conditions) {
        const satisfied = await this.checkCondition(
          { trigger_condition: subCondition },
          eventData
        );
        if (!satisfied) {
          return false;
        }
      }
      return true;
    } else if (operator === 'OR') {
      for (const subCondition of conditions) {
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
