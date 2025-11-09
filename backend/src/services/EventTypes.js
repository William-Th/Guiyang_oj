/**
 * Event Types - 事件类型常量定义
 * 统一管理所有事件名称，避免字符串硬编码
 */

/**
 * 学生活动相关事件
 */
const STUDENT_ACTIVITY = {
  // 活动完成
  COMPLETED: 'student.activity.completed',
  // 活动开始
  STARTED: 'student.activity.started',
  // 提交答案
  SUBMITTED: 'student.activity.submitted',
  // 获得高分
  HIGH_SCORE: 'student.high.score',
  // 获得满分
  PERFECT_SCORE: 'student.perfect.score'
};

/**
 * 学生登录相关事件
 */
const STUDENT_LOGIN = {
  // 登录
  LOGIN: 'student.login',
  // 早晨登录（6-8点）
  MORNING: 'student.login.morning',
  // 首次登录
  FIRST: 'student.first.login',
  // 连续登录
  STREAK: 'student.login.streak'
};

/**
 * 学生练习相关事件
 */
const STUDENT_PRACTICE = {
  // 完成练习
  COMPLETED: 'student.practice.completed',
  // 快速完成
  FAST: 'student.practice.fast',
  // 正确率记录
  ACCURACY: 'student.practice.accuracy'
};

/**
 * 学生测评相关事件
 */
const STUDENT_EXAM = {
  // 完成测评
  COMPLETED: 'student.exam.completed',
  // 测评开始
  STARTED: 'student.exam.started'
};

/**
 * 日常任务相关事件
 */
const DAILY_TASK = {
  // 每日正确率
  DAILY_ACCURACY: 'student.daily.accuracy',
  // 每周正确率
  WEEKLY_ACCURACY: 'student.weekly.accuracy',
  // 每月正确率
  MONTHLY_ACCURACY: 'student.monthly.accuracy',
  // 每周登录天数
  WEEKLY_LOGIN_DAYS: 'student.weekly.login.days',
  // 每月登录天数
  MONTHLY_LOGIN_DAYS: 'student.monthly.login.days',
  // 完美一周
  PERFECT_WEEK: 'student.perfect.week'
};

/**
 * 成就相关事件
 */
const ACHIEVEMENT = {
  // 成就授予
  AWARDED: 'achievement.awarded',
  // 成就解锁
  UNLOCKED: 'achievement.unlocked',
  // 成就进度更新
  PROGRESS_UPDATED: 'achievement.progress.updated'
};

/**
 * 积分相关事件
 */
const POINTS = {
  // 积分增加
  EARNED: 'points.earned',
  // 积分扣除
  SPENT: 'points.spent',
  // 积分交易
  TRANSACTION: 'points.transaction'
};

/**
 * 排行榜相关事件
 */
const LEADERBOARD = {
  // 排名更新
  RANK_UPDATED: 'student.rank.update',
  // 进入前十
  TOP_10: 'student.rank.top10',
  // 排名第一
  RANK_1: 'student.rank.first'
};

/**
 * 题目相关事件
 */
const QUESTION = {
  // 题目创建
  CREATED: 'question.created',
  // 题目审核
  REVIEWED: 'question.reviewed',
  // 题目批准
  APPROVED: 'question.approved',
  // 题目拒绝
  REJECTED: 'question.rejected'
};

/**
 * 用户相关事件
 */
const USER = {
  // 用户创建
  CREATED: 'user.created',
  // 用户更新
  UPDATED: 'user.updated',
  // 用户删除
  DELETED: 'user.deleted'
};

/**
 * 社交相关事件
 */
const SOCIAL = {
  // 帮助他人
  HELP_OTHERS: 'student.help.others',
  // 评论
  COMMENT: 'student.comment',
  // 分享
  SHARE: 'student.share'
};

/**
 * 多科目相关事件
 */
const MULTI_SUBJECT = {
  // 三冠王（数学、语文、英语金级）
  THREE_SUBJECTS: 'student.multi.subject',
  // 大满贯（所有科目金级）
  ALL_SUBJECTS_GOLD: 'student.all.subjects.gold'
};

/**
 * 长期目标相关事件
 */
const LONG_TERM = {
  // 完美学年
  PERFECT_YEAR: 'student.year.perfect'
};

/**
 * 所有事件类型
 */
const EVENT_TYPES = {
  STUDENT_ACTIVITY,
  STUDENT_LOGIN,
  STUDENT_PRACTICE,
  STUDENT_EXAM,
  DAILY_TASK,
  ACHIEVEMENT,
  POINTS,
  LEADERBOARD,
  QUESTION,
  USER,
  SOCIAL,
  MULTI_SUBJECT,
  LONG_TERM
};

/**
 * 获取所有事件名称列表
 */
function getAllEventNames() {
  const names = [];

  function traverse(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        names.push(obj[key]);
      } else if (typeof obj[key] === 'object') {
        traverse(obj[key]);
      }
    }
  }

  traverse(EVENT_TYPES);
  return names;
}

/**
 * 验证事件名称是否存在
 */
function isValidEvent(eventName) {
  return getAllEventNames().includes(eventName);
}

module.exports = {
  // 导出事件类型
  STUDENT_ACTIVITY,
  STUDENT_LOGIN,
  STUDENT_PRACTICE,
  STUDENT_EXAM,
  DAILY_TASK,
  ACHIEVEMENT,
  POINTS,
  LEADERBOARD,
  QUESTION,
  USER,
  SOCIAL,
  MULTI_SUBJECT,
  LONG_TERM,

  // 导出所有事件类型
  EVENT_TYPES,

  // 工具函数
  getAllEventNames,
  isValidEvent
};
