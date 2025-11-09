const eventBus = require('./EventBus');
const { STUDENT_ACTIVITY, STUDENT_LOGIN, STUDENT_PRACTICE, STUDENT_EXAM } = require('./EventTypes');
const logger = require('../utils/logger');

/**
 * EventEmitter - 事件发射器辅助工具
 * 提供便捷的方法在业务逻辑中发布事件
 */
class EventEmitter {
  /**
   * 发布学生活动完成事件
   * @param {number} studentId - 学生ID
   * @param {number} activityId - 活动ID
   * @param {Object} details - 详细信息
   */
  static async emitActivityCompleted(studentId, activityId, details = {}) {
    try {
      await eventBus.emit(STUDENT_ACTIVITY.COMPLETED, {
        source: 'StudentActivitiesController',
        studentId,
        activityId,
        score: details.score,
        totalQuestions: details.totalQuestions,
        correctAnswers: details.correctAnswers,
        completedAt: details.completedAt || new Date().toISOString(),
        duration: details.duration,
        activityType: details.activityType, // 'practice' or 'exam'
        subject: details.subject,
        gradeLevel: details.gradeLevel
      });

      logger.info('Activity completed event emitted', {
        studentId,
        activityId,
        score: details.score
      });
    } catch (error) {
      logger.error('Failed to emit activity completed event:', error);
    }
  }

  /**
   * 发布学生获得高分事件
   * @param {number} studentId - 学生ID
   * @param {number} activityId - 活动ID
   * @param {number} score - 分数
   * @param {string} gradeLevel - 等级 (bronze/silver/gold)
   */
  static async emitHighScore(studentId, activityId, score, gradeLevel) {
    try {
      await eventBus.emit(STUDENT_ACTIVITY.HIGH_SCORE, {
        source: 'StudentActivitiesController',
        studentId,
        activityId,
        score,
        gradeLevel,
        timestamp: new Date().toISOString()
      });

      logger.info('High score event emitted', {
        studentId,
        activityId,
        score,
        gradeLevel
      });
    } catch (error) {
      logger.error('Failed to emit high score event:', error);
    }
  }

  /**
   * 发布学生登录事件
   * @param {number} studentId - 学生ID
   * @param {Object} details - 详细信息
   */
  static async emitStudentLogin(studentId, details = {}) {
    try {
      const loginTime = new Date();
      const hour = loginTime.getHours();

      // 发布普通登录事件
      await eventBus.emit(STUDENT_LOGIN.LOGIN, {
        source: 'AuthController',
        studentId,
        loginAt: loginTime.toISOString(),
        method: details.method || 'phone',
        ip: details.ip,
        userAgent: details.userAgent
      });

      // 如果是早晨登录(6-8点)，额外发布早晨登录事件
      if (hour >= 6 && hour < 8) {
        await eventBus.emit(STUDENT_LOGIN.MORNING, {
          source: 'AuthController',
          studentId,
          loginAt: loginTime.toISOString(),
          hour
        });
      }

      logger.info('Student login event emitted', {
        studentId,
        isMorning: hour >= 6 && hour < 8
      });
    } catch (error) {
      logger.error('Failed to emit student login event:', error);
    }
  }

  /**
   * 发布学生首次登录事件
   * @param {number} studentId - 学生ID
   */
  static async emitFirstLogin(studentId) {
    try {
      await eventBus.emit(STUDENT_LOGIN.FIRST, {
        source: 'AuthController',
        studentId,
        loginAt: new Date().toISOString()
      });

      logger.info('First login event emitted', { studentId });
    } catch (error) {
      logger.error('Failed to emit first login event:', error);
    }
  }

  /**
   * 发布学生连续登录事件
   * @param {number} studentId - 学生ID
   * @param {number} streakDays - 连续天数
   */
  static async emitLoginStreak(studentId, streakDays) {
    try {
      await eventBus.emit(STUDENT_LOGIN.STREAK, {
        source: 'AuthController',
        studentId,
        streakDays,
        timestamp: new Date().toISOString()
      });

      logger.info('Login streak event emitted', { studentId, streakDays });
    } catch (error) {
      logger.error('Failed to emit login streak event:', error);
    }
  }

  /**
   * 发布学生练习完成事件
   * @param {number} studentId - 学生ID
   * @param {Object} details - 详细信息
   */
  static async emitPracticeCompleted(studentId, details = {}) {
    try {
      await eventBus.emit(STUDENT_PRACTICE.COMPLETED, {
        source: 'StudentActivitiesController',
        studentId,
        questionCount: details.questionCount,
        correctCount: details.correctCount,
        accuracy: details.accuracy,
        duration: details.duration,
        subject: details.subject,
        completedAt: details.completedAt || new Date().toISOString()
      });

      // 如果正确率达标，发布正确率事件
      if (details.accuracy) {
        await eventBus.emit(STUDENT_PRACTICE.ACCURACY, {
          source: 'StudentActivitiesController',
          studentId,
          accuracy: details.accuracy,
          questionCount: details.questionCount,
          subject: details.subject,
          timestamp: new Date().toISOString()
        });
      }

      // 如果是快速完成（10分钟内完成20题以上）
      const isFast = details.duration && details.questionCount &&
        details.duration <= 600 && details.questionCount >= 20;

      if (isFast) {
        await eventBus.emit(STUDENT_PRACTICE.FAST, {
          source: 'StudentActivitiesController',
          studentId,
          questionCount: details.questionCount,
          duration: details.duration,
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Practice completed event emitted', {
        studentId,
        questionCount: details.questionCount,
        accuracy: details.accuracy,
        isFast
      });
    } catch (error) {
      logger.error('Failed to emit practice completed event:', error);
    }
  }

  /**
   * 发布学生测评完成事件
   * @param {number} studentId - 学生ID
   * @param {number} examId - 测评ID
   * @param {Object} details - 详细信息
   */
  static async emitExamCompleted(studentId, examId, details = {}) {
    try {
      await eventBus.emit(STUDENT_EXAM.COMPLETED, {
        source: 'StudentActivitiesController',
        studentId,
        examId,
        score: details.score,
        completedAt: details.completedAt || new Date().toISOString(),
        subject: details.subject,
        gradeLevel: details.gradeLevel
      });

      logger.info('Exam completed event emitted', {
        studentId,
        examId,
        score: details.score
      });
    } catch (error) {
      logger.error('Failed to emit exam completed event:', error);
    }
  }

  /**
   * 发布学生测评开始事件
   * @param {number} studentId - 学生ID
   * @param {number} examId - 测评ID
   */
  static async emitExamStarted(studentId, examId) {
    try {
      await eventBus.emit(STUDENT_EXAM.STARTED, {
        source: 'StudentActivitiesController',
        studentId,
        examId,
        startedAt: new Date().toISOString()
      });

      logger.info('Exam started event emitted', { studentId, examId });
    } catch (error) {
      logger.error('Failed to emit exam started event:', error);
    }
  }

  /**
   * 批量发布事件（优化性能）
   * @param {Array} events - 事件数组 [{eventName, data}, ...]
   */
  static async emitBatch(events) {
    try {
      const promises = events.map(({ eventName, data }) =>
        eventBus.emit(eventName, data)
      );

      await Promise.allSettled(promises);

      logger.info('Batch events emitted', { count: events.length });
    } catch (error) {
      logger.error('Failed to emit batch events:', error);
    }
  }

  /**
   * 发布自定义事件
   * @param {string} eventName - 事件名称
   * @param {Object} data - 事件数据
   * @param {string} source - 来源
   */
  static async emitCustom(eventName, data, source = 'CustomEmitter') {
    try {
      await eventBus.emit(eventName, {
        source,
        ...data,
        timestamp: new Date().toISOString()
      });

      logger.info('Custom event emitted', { eventName, source });
    } catch (error) {
      logger.error('Failed to emit custom event:', error);
    }
  }
}

module.exports = EventEmitter;
