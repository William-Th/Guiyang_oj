/**
 * 成就规则模板库
 * 用于快速配置简单的成就，无需编写复杂的JSON规则
 */

/**
 * 模板1：计数型成就
 * 用途：某个事件发生N次时触发
 * 示例：通过10次测评、完成50次练习
 */
const countAchievement = {
  name: '${name}',
  description: '${description}',
  category: '${category}',
  subcategory: '${subcategory}',
  rarity: '${rarity}',
  icon: '${icon}',
  points: '${points}',
  triggerCondition: {
    trigger_mode: 'real_time',
    trigger_frequency: 'real_time',
    condition_type: 'count',
    event_name: '${event_name}',
    target_count: '${target_count}',
    filter: '${filter}' // 可选，用于过滤特定条件的事件
  },
  isHidden: false,
  isActive: true,
  maxTimes: 1,
  displayOrder: 0
};

/**
 * 模板2：阈值型成就
 * 用途：某个数值达到阈值时触发
 * 示例：累计学习时长达到1000小时、积分达到10000分
 */
const thresholdAchievement = {
  name: '${name}',
  description: '${description}',
  category: '${category}',
  subcategory: '${subcategory}',
  rarity: '${rarity}',
  icon: '${icon}',
  points: '${points}',
  triggerCondition: {
    trigger_mode: 'scheduled',
    trigger_frequency: 'daily',
    trigger_time: '00:10:00',
    condition_type: 'threshold',
    event_name: '${event_name}',
    metric: '${metric}',
    operator: '>=',
    threshold: '${threshold}'
  },
  isHidden: false,
  isActive: true,
  maxTimes: 1,
  displayOrder: 0
};

/**
 * 模板3：状态型成就（首次）
 * 用途：首次完成某个动作时触发
 * 示例：首次登录、首次通过测评、首次获得满分
 */
const firstTimeAchievement = {
  name: '${name}',
  description: '${description}',
  category: '${category}',
  subcategory: '${subcategory}',
  rarity: '${rarity}',
  icon: '${icon}',
  points: '${points}',
  triggerCondition: {
    trigger_mode: 'real_time',
    trigger_frequency: 'real_time',
    condition_type: 'state',
    event_name: '${event_name}',
    first_time: true,
    filter: '${filter}' // 可选
  },
  isHidden: false,
  isActive: true,
  maxTimes: 1,
  displayOrder: 0
};

/**
 * 模板4：连续性成就
 * 用途：连续N天完成某个动作时触发
 * 示例：连续7天登录、连续30天学习
 */
const consecutiveAchievement = {
  name: '${name}',
  description: '${description}',
  category: '${category}',
  subcategory: '${subcategory}',
  rarity: '${rarity}',
  icon: '${icon}',
  points: '${points}',
  triggerCondition: {
    trigger_mode: 'scheduled',
    trigger_frequency: 'daily',
    trigger_time: '00:10:00',
    condition_type: 'consecutive',
    event_name: '${event_name}',
    consecutive_days: '${consecutive_days}'
  },
  isHidden: false,
  isActive: true,
  maxTimes: 1,
  displayOrder: 0
};

/**
 * 模板5：时间窗口型成就
 * 用途：在特定时间窗口内完成某个动作
 * 示例：同一天通过2次不同级别的认证
 */
const timeWindowAchievement = {
  name: '${name}',
  description: '${description}',
  category: '${category}',
  subcategory: '${subcategory}',
  rarity: '${rarity}',
  icon: '${icon}',
  points: '${points}',
  triggerCondition: {
    trigger_mode: 'hybrid',
    trigger_frequency: 'real_time',
    condition_type: 'time_window',
    event_name: '${event_name}',
    time_window: '${time_window}', // same_day, same_week, same_month
    target_count: '${target_count}',
    distinct_field: '${distinct_field}' // 可选，用于去重统计
  },
  isHidden: false,
  isActive: true,
  maxTimes: 1,
  displayOrder: 0
};

/**
 * 模板6：组合条件型成就（AND）
 * 用途：多个条件同时满足时触发
 * 示例：数学、语文、英语均达到5级
 */
const andConditionAchievement = {
  name: '${name}',
  description: '${description}',
  category: '${category}',
  subcategory: '${subcategory}',
  rarity: '${rarity}',
  icon: '${icon}',
  points: '${points}',
  triggerCondition: {
    trigger_mode: 'scheduled',
    trigger_frequency: 'daily',
    trigger_time: '00:30:00',
    condition_type: 'and',
    event_name: '${event_name}',
    conditions: '${conditions}' // 数组，每个元素是一个子条件
  },
  isHidden: false,
  isActive: true,
  maxTimes: 1,
  displayOrder: 0
};

/**
 * 快速配置助手：生成常见成就
 */
const quickConfigs = {
  /**
   * 首次突破类成就（15个）
   */
  firstTimePass: (level) => ({
    name: `首次通过${level}级认证`,
    description: `首次通过${level}级能力认证测评`,
    category: 'exam_certification',
    subcategory: 'first_breakthrough',
    rarity: level <= 3 ? 'common' : (level <= 5 ? 'rare' : 'epic'),
    icon: `/images/achievements/first_pass_level_${level}.png`,
    points: level * 20,
    triggerCondition: {
      trigger_mode: 'real_time',
      trigger_frequency: 'real_time',
      condition_type: 'state',
      event_name: 'student.activity.completed',
      first_time: true,
      filter: {
        ability_level: level.toString(),
        status: 'passed'
      }
    }
  }),

  /**
   * 学习时长类成就（12个）
   */
  learningDuration: (hours) => ({
    name: `学习${hours}小时`,
    description: `累计学习时长达到${hours}小时`,
    category: 'learning_growth',
    subcategory: 'learning_duration',
    rarity: hours < 50 ? 'common' : (hours < 200 ? 'rare' : (hours < 500 ? 'epic' : 'legendary')),
    icon: `/images/achievements/learning_${hours}h.png`,
    points: hours * 2,
    triggerCondition: {
      trigger_mode: 'scheduled',
      trigger_frequency: 'daily',
      trigger_time: '00:10:00',
      condition_type: 'threshold',
      event_name: 'student.learning.duration',
      metric: 'total_learning_minutes',
      operator: '>=',
      threshold: hours * 60
    }
  }),

  /**
   * 连续登录类成就（10个）
   */
  consecutiveLogin: (days) => ({
    name: `连续登录${days}天`,
    description: `连续${days}天登录学习平台`,
    category: 'learning_growth',
    subcategory: 'learning_frequency',
    rarity: days <= 7 ? 'common' : (days <= 30 ? 'rare' : (days <= 100 ? 'epic' : 'legendary')),
    icon: `/images/achievements/consecutive_${days}d.png`,
    points: days * 5,
    triggerCondition: {
      trigger_mode: 'scheduled',
      trigger_frequency: 'daily',
      trigger_time: '00:10:00',
      condition_type: 'consecutive',
      event_name: 'student.login',
      consecutive_days: days
    }
  }),

  /**
   * 连续通过类成就（10个）
   */
  consecutivePass: (count) => ({
    name: `连续通过${count}次`,
    description: `连续通过${count}次认证测评（任意级别）`,
    category: 'exam_certification',
    subcategory: 'consecutive_success',
    rarity: count <= 3 ? 'common' : (count <= 5 ? 'rare' : (count <= 10 ? 'epic' : 'legendary')),
    icon: `/images/achievements/consecutive_pass_${count}.png`,
    points: count * 40,
    triggerCondition: {
      trigger_mode: 'real_time',
      trigger_frequency: 'real_time',
      condition_type: 'count',
      event_name: 'student.activity.completed',
      target_count: count,
      consecutive: true,
      filter: {
        status: 'passed'
      }
    }
  }),

  /**
   * 满分成就
   */
  perfectScore: () => ({
    name: '满分学霸',
    description: '单次模拟测评获得满分',
    category: 'exam_certification',
    subcategory: 'first_breakthrough',
    rarity: 'rare',
    icon: '/images/achievements/perfect_score.png',
    points: 150,
    triggerCondition: {
      trigger_mode: 'real_time',
      trigger_frequency: 'real_time',
      condition_type: 'state',
      event_name: 'student.perfect.score',
      first_time: false, // 可重复获得
      filter: {
        type: 'practice'
      }
    }
  }),

  /**
   * 高分成就
   */
  highScore: (score) => ({
    name: `${score}分俱乐部`,
    description: `单次测评获得${score}分以上`,
    category: 'exam_certification',
    subcategory: 'first_breakthrough',
    rarity: score >= 95 ? 'epic' : (score >= 90 ? 'rare' : 'common'),
    icon: `/images/achievements/high_score_${score}.png`,
    points: score * 2,
    triggerCondition: {
      trigger_mode: 'real_time',
      trigger_frequency: 'real_time',
      condition_type: 'threshold',
      event_name: 'student.high.score',
      metric: 'score',
      operator: '>=',
      threshold: score
    }
  })
};

module.exports = {
  // 基础模板
  countAchievement,
  thresholdAchievement,
  firstTimeAchievement,
  consecutiveAchievement,
  timeWindowAchievement,
  andConditionAchievement,

  // 快速配置助手
  quickConfigs
};
