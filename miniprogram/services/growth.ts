/**
 * M2 成长/智能练习契约（已对后端源码核实）：
 * - 每日推题题集服务端已过滤为客观题；answered/is_correct 标记用于恢复进度
 * - 即答即判可判任意客观题；答错自动入错题本+连胜归零；答对按难度发积分
 * - 错题重练走 /wrong-questions/:id/redo（积分半价、review_count 语义）
 */
import { request } from '../utils/request';

// ---------- 每日推题 / 即答即判 ----------

export interface DailyQuestion {
  question_id: number;
  type: string; // single | multiple | true_false | blank
  content?: string;
  options?: unknown;
  difficulty?: string;
  answered?: boolean;
  is_correct?: boolean;
}

export interface DailyQuestionSet {
  id: number;
  subject: string;
  question_ids: number[];
  answered_count?: number;
  questions: DailyQuestion[];
}

export function getDailyQuestions(subject?: string) {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  return request<{ success: boolean; data: DailyQuestionSet }>(
    'GET',
    `/student/activities/daily-questions${query}`
  );
}

export interface JudgeResult {
  correct: boolean;
  awarded: number;
  streak: { current_streak: number; max_streak: number; awarded?: number };
  type: string;
  options?: unknown;
  correct_answer?: unknown;
  explanation?: string | null;
}

/** 即答即判（任意客观题）；答错服务端自动入错题本 */
export function submitRecommendAnswer(questionId: number, answer: unknown) {
  return request<{ success: boolean; data: JudgeResult; message?: string }>(
    'POST',
    `/student/activities/recommend/${questionId}/answer`,
    { answer }
  );
}

/** 错题重练（积分按重做折扣发放） */
export function redoWrongQuestion(questionId: number, answer: unknown) {
  return request<{
    success: boolean;
    data: { correct: boolean; awarded: number; streak: JudgeResult['streak']; correct_answer?: unknown };
    message?: string;
  }>('POST', `/wrong-questions/${questionId}/redo`, { answer });
}

// ---------- 积分 ----------

export interface PointsSummary {
  todayEarned: number;
  weekEarned: number;
  totalEarned: number;
  totalSpent: number;
}

export function getPointsSummary(studentId: number) {
  return request<{ success: boolean; data: PointsSummary }>('GET', `/points/summary/${studentId}`);
}

export interface PointTransaction {
  transaction_id: number;
  points_change: number;
  transaction_type: string;
  description: string;
  balance_after: number;
  created_at: string;
}

export function getPointTransactions(studentId: number, limit = 20) {
  return request<{ success: boolean; data: PointTransaction[]; total: number }>(
    'GET',
    `/points/transactions/${studentId}?limit=${limit}`
  );
}

// ---------- 排行榜 ----------

export type LeaderboardType = 'total' | 'weekly' | 'monthly';

export interface LeaderboardEntry {
  student_id: number;
  student_name: string;
  school_name?: string;
  class_name?: string;
  points: number;
  rank: number;
  rank_change?: number;
}

export function getLeaderboard(type: LeaderboardType = 'total') {
  return request<{ success: boolean; data: LeaderboardEntry[] }>(
    'GET',
    `/points/leaderboard?type=${type}&limit=100`
  );
}

// ---------- 成就 ----------

export interface AchievementItem {
  achievement_id: number;
  achievement_name: string;
  achievement_desc?: string;
  achievement_icon?: string;
  rarity?: string;
  points_reward?: number;
  category?: string;
  awarded_at?: string;
}

export interface AchievementProgressItem extends AchievementItem {
  current_value?: number;
  target_value?: number;
  progress_percentage?: number;
}

export function getMyAchievements(studentId: number) {
  return request<{ success: boolean; data: AchievementItem[] }>(
    'GET',
    `/achievements/student/${studentId}`
  );
}

export function getMyAchievementProgress(studentId: number) {
  return request<{ success: boolean; data: AchievementProgressItem[] }>(
    'GET',
    `/achievements/student/${studentId}/progress`
  );
}

// ---------- 错题本 ----------

export interface WrongQuestionItem {
  id: number;
  question_id: number;
  subject?: string;
  knowledge_points?: string[];
  difficulty?: string;
  error_count?: number;
  review_count?: number;
  status?: string; // active | mastered | removed
  last_wrong_at?: string;
  content?: string;
  options?: unknown;
  correct_answer?: unknown;
  type: string;
  explanation?: string | null;
  image_url?: string | null;
}

export function getWrongQuestions(page = 1, limit = 20) {
  return request<{
    success: boolean;
    data: WrongQuestionItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>('GET', `/wrong-questions?page=${page}&limit=${limit}`);
}

export function getWrongQuestionStats() {
  return request<{
    success: boolean;
    data: { total: number; bySubject: { subject: string; count: number }[]; byStatus: { active: number; mastered: number; removed: number } };
  }>('GET', '/wrong-questions/stats');
}

// ---------- 学习统计 ----------

export interface AbilityStat {
  ability: string;
  subject: string;
  total_questions: number;
  correct_count: number;
  accuracy_rate: number;
  avg_score?: number;
}

export interface KnowledgeStat {
  knowledge_point: string;
  subject: string;
  total_questions: number;
  correct_count: number;
  accuracy_rate: number;
  avg_score?: number;
}

export function getStudentAbilities() {
  return request<{ success: boolean; data: AbilityStat[] }>('GET', '/statistics/student/abilities');
}

export function getStudentKnowledgePoints() {
  return request<{ success: boolean; data: KnowledgeStat[] }>('GET', '/statistics/student/knowledge-points');
}
