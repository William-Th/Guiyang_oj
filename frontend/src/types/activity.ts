/**
 * Activity System Type Definitions
 * Supports both Practice and Assessment activity types
 */

/**
 * Activity type - determines who can create it and whether it's official
 */
export type ActivityType = 'practice' | 'assessment';

/**
 * Ability level - L1 (basic) to L7 (excellence)
 */
export type AbilityLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';

/**
 * Scope hierarchy for activity distribution
 */
export type ActivityScope =
  | 'municipal'           // 市级
  | 'district'            // 区县级
  | 'base_school'         // 基地学校
  | 'municipal_school'    // 市直属学校
  | 'school'              // 学校级
  | 'class';              // 班级

/**
 * Activity status
 */
export type ActivityStatus =
  | 'draft'       // 草稿
  | 'published'   // 已发布
  | 'ongoing'     // 进行中
  | 'finished'    // 已结束
  | 'cancelled';  // 已取消

/**
 * Student activity status
 */
export type StudentActivityStatus =
  | 'registered'  // 已报名
  | 'in_progress' // 进行中
  | 'submitted';  // 已提交

/**
 * Time limit type for activities
 * - unlimited: No time limit (练习模式)
 * - scheduled: Fixed time window (定时制测评)
 * - timed: Duration-based from start (计时制测评)
 */
export type TimeLimitType = 'unlimited' | 'scheduled' | 'timed';

/**
 * Target audience configuration
 */
export interface TargetAudience {
  grades: string[];      // Target grade levels
  schools: number[];     // Target school IDs
  classes: number[];     // Target class IDs
}

/**
 * Certificate configuration for official activities
 */
export interface CertificateConfig {
  enabled: boolean;
  template: string | null;
  passingScore?: number;
  validityPeriod?: number; // in days
}

/**
 * Complete Activity object
 */
export interface Activity {
  id: number;
  title: string;
  description?: string;
  subject: string;
  grade: string;
  time_limit_type: TimeLimitType;  // NEW: Time limit type
  start_time?: string;              // Optional: only for 'scheduled' type
  end_time?: string;                // Optional: only for 'scheduled' type
  duration?: number;                // Optional: in minutes, for 'scheduled' and 'timed' types
  total_score: number;
  pass_score: number;
  status: ActivityStatus;
  type: ActivityType;
  ability_level?: AbilityLevel;
  scope?: ActivityScope;
  allow_retake: boolean;
  max_attempts: number;
  is_official: boolean;
  target_audience?: TargetAudience;
  certificate_config?: CertificateConfig;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

/**
 * Activity creation data
 */
export interface CreateActivityData {
  title: string;
  description?: string;
  subject: string;
  grade: string;
  timeLimitType?: TimeLimitType;   // NEW: Time limit type (default: 'unlimited')
  startTime?: string;               // Required for 'scheduled' type
  endTime?: string;                 // Required for 'scheduled' type
  duration?: number;                // Required for 'scheduled' and 'timed' types
  totalScore: number;
  passScore: number;
  type?: ActivityType;
  abilityLevel?: AbilityLevel;
  scope?: ActivityScope;
  allowRetake?: boolean;
  maxAttempts?: number;
  isOfficial?: boolean;
  targetAudience?: TargetAudience;
  certificateConfig?: CertificateConfig;
}

/**
 * Activity update data
 */
export interface UpdateActivityData {
  title?: string;
  description?: string;
  timeLimitType?: TimeLimitType;   // NEW: Can update time limit type
  startTime?: string;
  endTime?: string;
  duration?: number;
  totalScore?: number;
  passScore?: number;
  abilityLevel?: AbilityLevel;
  allowRetake?: boolean;
  maxAttempts?: number;
  targetAudience?: TargetAudience;
  certificateConfig?: CertificateConfig;
}

/**
 * Activity list item (lighter version for lists)
 */
export interface ActivityListItem {
  id: number;
  title: string;
  subject: string;
  grade: string;
  time_limit_type: TimeLimitType;  // NEW: Time limit type
  start_time?: string;              // Optional
  end_time?: string;                // Optional
  duration?: number;                // Optional
  total_score: number;
  status: ActivityStatus;
  type: ActivityType;
  ability_level?: AbilityLevel;
  scope?: ActivityScope;
  is_official: boolean;
  allow_retake: boolean;
  max_attempts: number;
  created_at: string;
  participant_count?: number;
  student_status?: StudentActivityStatus;
  attempt_number?: number;
}

/**
 * Activity with questions (for taking activity)
 */
export interface ActivityWithQuestions extends Activity {
  questions: ActivityQuestion[];
}

/**
 * Question in activity
 */
export interface ActivityQuestion {
  id: number;
  type: 'single' | 'multiple' | 'blank' | 'essay' | 'code';
  content: string;
  options?: string[];
  correct_answer?: any;
  score: number;
  order_no: number;
  difficulty?: string;
  explanation?: string;
}

/**
 * Student activity record
 */
export interface StudentActivity {
  id: number;
  activity_id: number;
  student_id: number;
  status: StudentActivityStatus;
  score?: number;
  start_time?: string;
  submit_time?: string;
  submitted_at?: string;
  time_limit_deadline?: string;    // NEW: Deadline for timed activities
  attempt_number: number;
  is_retake: boolean;
  previous_attempt_id?: number;
}

/**
 * Student activity history item
 */
export interface StudentActivityHistory {
  id: number;
  title: string;
  subject: string;
  type: ActivityType;
  ability_level?: AbilityLevel;
  is_official: boolean;
  status: StudentActivityStatus;
  score?: number;
  submitted_at?: string;
  attempt_number: number;
  is_retake: boolean;
}

/**
 * Activity filters for queries
 */
export interface ActivityFilters {
  subject?: string;
  grade?: string;
  status?: ActivityStatus;
  type?: ActivityType;
  ability_level?: AbilityLevel;
  scope?: ActivityScope;
  created_by?: number;
}

/**
 * Activity statistics
 */
export interface ActivityStatistics {
  total_participants: number;
  completed_count: number;
  average_score: number;
  pass_rate: number;
  highest_score: number;
  lowest_score: number;
}

/**
 * Activity answer submission
 */
export interface ActivityAnswer {
  questionId: number;
  answer: string | string[];
}

/**
 * Activity submission data
 */
export interface ActivitySubmission {
  activityId: number;
  answers: ActivityAnswer[];
}

/**
 * Time limit information for an activity
 * Returned when starting an activity
 */
export interface TimeLimitInfo {
  timeLimitType: TimeLimitType;
  duration?: number;              // Duration in minutes (for scheduled/timed)
  startTime?: string;             // Start time (for scheduled)
  endTime?: string;               // End time (for scheduled)
  timeLimitDeadline?: string;     // Calculated deadline (for timed)
  serverTime?: string;            // Current server time for synchronization
  remainingMinutes?: number;      // Calculated remaining time
}

/**
 * Countdown timer component props
 */
export interface CountdownTimerProps {
  deadline: string;               // ISO datetime string
  onExpire: () => void;          // Callback when time expires
  warningThreshold?: number;     // Minutes before expiry to show warning (default: 5)
  className?: string;
}
