/**
 * Achievement Type Definitions
 * Achievement system-related interfaces
 */

import { Timestamps } from './common';

/**
 * Achievement types
 */
export type AchievementType =
  | 'practice'      // 练习相关
  | 'assessment'    // 测评相关
  | 'points'        // 积分相关
  | 'ranking'       // 排名相关
  | 'streak'        // 连续相关
  | 'special';      // 特殊成就

/**
 * Achievement category
 */
export type AchievementCategory =
  | 'beginner'      // 新手
  | 'intermediate'  // 进阶
  | 'advanced'      // 高级
  | 'master'        // 大师
  | 'special';      // 特殊

/**
 * Achievement rarity
 */
export type AchievementRarity =
  | 'common'    // 普通
  | 'rare'      // 稀有
  | 'epic'      // 史诗
  | 'legendary'; // 传说

/**
 * Achievement trigger type
 */
export type TriggerType =
  | 'count'      // 计数型（完成N次）
  | 'threshold'  // 阈值型（达到某个值）
  | 'sequence'   // 序列型（连续完成）
  | 'condition'  // 条件型（满足特定条件）
  | 'manual';    // 手动授予

/**
 * Achievement status
 */
export type AchievementStatus = 'active' | 'inactive' | 'hidden';

/**
 * Achievement definition
 */
export interface Achievement extends Timestamps {
  id: number;
  code: string;  // Unique code like 'PRACTICE_FIRST'
  name: string;
  description: string;
  type: AchievementType;
  category?: AchievementCategory;
  rarity?: AchievementRarity;

  // Trigger configuration
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;  // JSON configuration
  trigger_event?: string;  // Event name to listen for

  // Rewards
  points: number;  // Points awarded
  badge_icon?: string;  // Icon URL

  // Status
  status: AchievementStatus;
  is_hidden?: boolean;  // Hidden until unlocked

  // Display
  display_order?: number;
}

/**
 * Student achievement (unlocked achievement)
 */
export interface StudentAchievement extends Timestamps {
  id: number;
  student_id: number;
  achievement_id: number;

  // Achievement info (denormalized for performance)
  achievement_code: string;
  achievement_name: string;
  achievement_description: string;
  achievement_type: AchievementType;
  achievement_icon?: string;
  points_awarded: number;

  // Unlock info
  achieved_at: string;  // When it was unlocked
  progress_value?: number;  // Progress at unlock time
  trigger_data?: Record<string, unknown>;  // What triggered it
}

/**
 * Achievement progress (for trackable achievements)
 */
export interface AchievementProgress {
  achievement_id: number;
  achievement_code: string;
  achievement_name: string;
  achievement_description: string;
  achievement_icon?: string;
  points: number;

  // Progress tracking
  current_value: number;
  target_value: number;
  progress_percentage: number;  // 0-100

  // Status
  is_unlocked: boolean;
  unlocked_at?: string;
}

/**
 * Achievement statistics
 */
export interface AchievementStats {
  total_achievements: number;
  unlocked_count: number;
  locked_count: number;
  total_points: number;
  unlock_rate: number;  // Percentage

  // By type
  by_type: Record<AchievementType, {
    total: number;
    unlocked: number;
  }>;

  // By rarity
  by_rarity?: Record<AchievementRarity, {
    total: number;
    unlocked: number;
  }>;
}

/**
 * Points transaction record
 */
export interface PointsTransaction extends Timestamps {
  id: number;
  student_id: number;
  points: number;  // Can be positive or negative
  source: string;  // e.g., 'achievement', 'activity_completion', 'manual'
  reference_id?: number;  // e.g., achievement_id, activity_id
  description: string;
  balance_after: number;  // Balance after this transaction
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  student_id: number;
  student_name: string;
  student_number?: string;
  grade?: string;
  school_name?: string;
  points: number;
  achievement_count: number;
  avatar?: string;
}

/**
 * Achievement filter parameters
 */
export interface AchievementFilterParams {
  type?: AchievementType;
  category?: AchievementCategory;
  rarity?: AchievementRarity;
  status?: AchievementStatus;
  unlocked?: boolean;  // Filter by unlock status
  search?: string;
}
