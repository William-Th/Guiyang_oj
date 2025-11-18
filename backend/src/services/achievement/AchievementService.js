const Achievement = require('../../models/Achievement');
const StudentPoints = require('../../models/StudentPoints');
const eventBus = require('../EventBus');
const { ACHIEVEMENT } = require('../EventTypes');
const logger = require('../../utils/logger');

/**
 * AchievementService - 成就业务逻辑服务
 * 处理成就的创建、更新、删除和授予逻辑
 */
class AchievementService {
  /**
   * 授予成就给学生
   * @param {number} studentId - 学生ID
   * @param {number} achievementId - 成就ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async awardAchievement(studentId, achievementId, _options = {}) {
    try {
      // 1. 获取成就信息
      const achievement = await Achievement.getAchievementById(achievementId);

      if (!achievement) {
        throw new Error(`Achievement ${achievementId} not found`);
      }

      if (!achievement.is_active) {
        throw new Error(`Achievement ${achievementId} is not active`);
      }

      // 2. 检查是否已获得
      const hasAchievement = await Achievement.hasAchievement(studentId, achievementId);

      // 3. 检查是否允许重复获得
      if (hasAchievement && achievement.max_times === 1) {
        logger.debug(`Student ${studentId} already has achievement ${achievementId}`);
        return {
          success: false,
          reason: 'already_awarded',
          achievement
        };
      }

      // 4. 检查冷却时间
      if (hasAchievement && achievement.cooldown_days) {
        const studentAchievements = await Achievement.getStudentAchievements(studentId);
        const lastAchievement = studentAchievements.find(
          sa => sa.achievement_id === achievementId
        );

        if (lastAchievement) {
          const daysSinceLastAward = Math.floor(
            (Date.now() - new Date(lastAchievement.achieved_at)) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastAward < achievement.cooldown_days) {
            logger.debug(`Achievement ${achievementId} is in cooldown period`);
            return {
              success: false,
              reason: 'cooldown',
              daysRemaining: achievement.cooldown_days - daysSinceLastAward
            };
          }
        }
      }

      // 5. 授予成就
      const result = await Achievement.awardAchievement(
        studentId,
        achievementId,
        achievement.points_reward
      );

      // 6. 添加积分
      if (achievement.points_reward > 0) {
        await StudentPoints.addPoints(
          studentId,
          achievement.points_reward,
          'achievement',
          {
            sourceId: achievementId,
            sourceType: 'achievement',
            description: `获得成就: ${achievement.achievement_name}`
          }
        );
      }

      logger.info(`✨ Awarded achievement "${achievement.achievement_name}" to student ${studentId}`);

      // 7. 发布成就获得事件
      await eventBus.emit(ACHIEVEMENT.AWARDED, {
        source: 'AchievementService',
        studentId,
        achievementId,
        achievementName: achievement.achievement_name,
        achievementCode: achievement.achievement_code,
        rarity: achievement.rarity,
        pointsAwarded: achievement.points_reward,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        data: {
          ...result,
          achievement
        }
      };
    } catch (error) {
      logger.error('Error awarding achievement:', error);
      throw error;
    }
  }

  /**
   * 创建新成就
   * @param {Object} data - 成就数据
   * @param {number} createdBy - 创建者ID
   * @returns {Promise<Object>}
   */
  async createAchievement(data, createdBy) {
    try {
      // 1. 生成成就代码
      const code = this.generateAchievementCode(data.category, data.name);

      // 2. 验证触发条件
      this.validateTriggerCondition(data.triggerCondition);

      // 3. 创建成就
      const achievement = await Achievement.createAchievement({
        ...data,
        code,
        createdBy
      });

      logger.info(`✅ Achievement created: ${achievement.achievement_name} (${achievement.achievement_code})`);

      return {
        success: true,
        data: achievement
      };
    } catch (error) {
      logger.error('Error creating achievement:', error);
      throw error;
    }
  }

  /**
   * 更新成就
   * @param {number} achievementId - 成就ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>}
   */
  async updateAchievement(achievementId, data) {
    try {
      // 验证触发条件（如果有更新）
      if (data.triggerCondition) {
        this.validateTriggerCondition(data.triggerCondition);
      }

      const achievement = await Achievement.updateAchievement(achievementId, data);

      if (!achievement) {
        throw new Error(`Achievement ${achievementId} not found`);
      }

      logger.info(`✅ Achievement updated: ${achievement.achievement_name}`);

      return {
        success: true,
        data: achievement
      };
    } catch (error) {
      logger.error('Error updating achievement:', error);
      throw error;
    }
  }

  /**
   * 删除成就
   * @param {number} achievementId - 成就ID
   * @param {boolean} hard - 是否硬删除
   * @returns {Promise<Object>}
   */
  async deleteAchievement(achievementId, hard = false) {
    try {
      let success;

      if (hard) {
        success = await Achievement.hardDeleteAchievement(achievementId);
      } else {
        success = await Achievement.deleteAchievement(achievementId);
      }

      if (!success) {
        throw new Error(`Achievement ${achievementId} not found`);
      }

      logger.info(`✅ Achievement ${hard ? 'hard deleted' : 'soft deleted'}: ${achievementId}`);

      return {
        success: true,
        message: `Achievement ${hard ? 'permanently deleted' : 'deactivated'} successfully`
      };
    } catch (error) {
      logger.error('Error deleting achievement:', error);
      throw error;
    }
  }

  /**
   * 生成成就代码
   * @private
   */
  generateAchievementCode(category, name) {
    const timestamp = Date.now().toString().slice(-6);
    const categoryPrefix = this.getCategoryPrefix(category);
    const nameSlug = name
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase();

    return `${categoryPrefix}_${nameSlug}_${timestamp}`;
  }

  /**
   * 获取分类前缀
   * @private
   */
  getCategoryPrefix(category) {
    const prefixMap = {
      exam_certification: 'EXAM',
      learning_growth: 'LEARN',
      social_collaboration: 'SOCIAL',
      special_event: 'EVENT'
    };

    return prefixMap[category] || 'ACH';
  }

  /**
   * 验证触发条件
   * @private
   */
  validateTriggerCondition(condition) {
    if (!condition || typeof condition !== 'object') {
      throw new Error('Trigger condition must be an object');
    }

    // 必需字段
    const requiredFields = ['trigger_mode', 'condition_type', 'event_name'];
    for (const field of requiredFields) {
      if (!condition[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // 验证trigger_mode
    const validModes = ['real_time', 'scheduled', 'hybrid'];
    if (!validModes.includes(condition.trigger_mode)) {
      throw new Error(`Invalid trigger_mode: ${condition.trigger_mode}`);
    }

    // 验证condition_type
    const validTypes = ['count', 'threshold', 'state', 'time_window', 'and', 'or', 'consecutive'];
    if (!validTypes.includes(condition.condition_type)) {
      throw new Error(`Invalid condition_type: ${condition.condition_type}`);
    }

    // 根据条件类型验证必需字段
    if (condition.condition_type === 'count' && !condition.target_count) {
      throw new Error('count condition requires target_count');
    }

    if (condition.condition_type === 'threshold' && condition.threshold === undefined) {
      throw new Error('threshold condition requires threshold value');
    }

    if (condition.condition_type === 'consecutive' && !condition.consecutive_days) {
      throw new Error('consecutive condition requires consecutive_days');
    }

    return true;
  }

  /**
   * 从模板创建成就
   * @param {string} templateName - 模板名称
   * @param {Object} params - 模板参数
   * @param {number} createdBy - 创建者ID
   * @returns {Promise<Object>}
   */
  async createFromTemplate(templateName, params, createdBy) {
    try {
      const template = this.getTemplate(templateName);

      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }

      // 填充模板参数
      const achievementData = this.fillTemplate(template, params);

      // 创建成就
      return await this.createAchievement(achievementData, createdBy);
    } catch (error) {
      logger.error('Error creating achievement from template:', error);
      throw error;
    }
  }

  /**
   * 获取成就模板
   * @private
   */
  getTemplate(templateName) {
    // 导入模板定义
    const templates = require('./templates/achievementTemplates');
    return templates[templateName];
  }

  /**
   * 填充模板参数
   * @private
   */
  fillTemplate(template, params) {
    const filled = JSON.parse(JSON.stringify(template)); // 深拷贝

    // 递归替换占位符
    const replace = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string' && obj[key].startsWith('${') && obj[key].endsWith('}')) {
          const paramKey = obj[key].slice(2, -1);
          if (params[paramKey] !== undefined) {
            obj[key] = params[paramKey];
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          replace(obj[key]);
        }
      }
    };

    replace(filled);
    return filled;
  }

  /**
   * 批量导入成就
   * @param {Array} achievements - 成就数组
   * @param {number} createdBy - 创建者ID
   * @returns {Promise<Object>}
   */
  async bulkImport(achievements, createdBy) {
    const results = {
      success: [],
      failed: []
    };

    for (const data of achievements) {
      try {
        const result = await this.createAchievement(data, createdBy);
        results.success.push(result.data);
      } catch (error) {
        results.failed.push({
          data,
          error: error.message
        });
      }
    }

    logger.info(`Bulk import completed: ${results.success.length} success, ${results.failed.length} failed`);

    return results;
  }

  /**
   * 测试成就触发条件
   * @param {number} achievementId - 成就ID
   * @param {number} studentId - 学生ID（可选，用于测试）
   * @returns {Promise<Object>}
   */
  async testAchievement(achievementId, studentId = null) {
    try {
      const achievement = await Achievement.getAchievementById(achievementId);

      if (!achievement) {
        throw new Error(`Achievement ${achievementId} not found`);
      }

      // 验证触发条件
      const validation = this.validateTriggerCondition(achievement.trigger_condition);

      const result = {
        valid: true,
        achievement: {
          id: achievement.achievement_id,
          name: achievement.achievement_name,
          code: achievement.achievement_code
        },
        triggerCondition: achievement.trigger_condition,
        validation
      };

      // 如果提供了学生ID，检查该学生是否满足条件
      if (studentId) {
        const hasAchievement = await Achievement.hasAchievement(studentId, achievementId);
        result.studentStatus = {
          studentId,
          hasAchievement,
          eligible: !hasAchievement || achievement.max_times > 1
        };
      }

      return result;
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

// 导出单例
const achievementService = new AchievementService();
module.exports = achievementService;
