/**
 * API 封装（M1 计划项：接口类型将随 /bohe-plan 抽到 types 共享包，与 web 端契约对齐）。
 * 响应结构均已对后端源码核实（2026-10-05）。
 */
import { request } from '../utils/request';
import type { UserInfo } from '../utils/auth';

// ---------- 认证 ----------

export interface LoginResponse {
  message: string;
  token: string;
  refreshToken: string;
  user: UserInfo;
}

/** 学生/管理员账号登录：手机号与用户名均走 loginType=username（与 web 端一致） */
export function login(username: string, password: string) {
  return request<LoginResponse>('POST', '/auth/login', { username, password, loginType: 'username' }, { auth: false });
}

/** 注意：后端登出会递增 tokenVersion 吊销所有端会话（含 web），/bohe-plan 待核实单端登出方案 */
export function logout() {
  return request<{ message: string }>('POST', '/auth/logout');
}

// ---------- 学生：首页/成长 ----------

export interface StreakInfo {
  currentStreak?: number;
  longestStreak?: number;
  [key: string]: unknown;
}

export function getStreak() {
  return request<{ success: boolean; data: StreakInfo }>('GET', '/points/streak');
}

export function getUnreadCount() {
  return request<{ count?: number; data?: { count: number } }>('GET', '/notifications/unread-count');
}

// ---------- 学生：活动列表 ----------

export interface ActivityItem {
  id: number;
  title: string;
  type?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  subject_name?: string;
  question_count?: number;
  [key: string]: unknown;
}

/** 后端列表响应存在数组 / {activities} / {data} 多种形态，统一归一化 */
function normalizeList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const obj = res as { activities?: T[]; data?: T[] | { list?: T[] }; list?: T[] };
  if (Array.isArray(obj?.activities)) return obj.activities;
  if (Array.isArray(obj?.data)) return obj.data;
  if (Array.isArray(obj?.data?.list)) return obj.data.list;
  if (Array.isArray(obj?.list)) return obj.list;
  return [];
}

export function getPracticeActivities() {
  return request<unknown>('GET', '/activities/practice').then(normalizeList<ActivityItem>);
}

export function getAssessmentActivities() {
  return request<unknown>('GET', '/activities/assessment').then(normalizeList<ActivityItem>);
}

// ---------- 管理端（复用现有接口，零新增） ----------

export interface AdminDashboardStats {
  totalStudents: number;
  totalExams: number;
  thisMonthExams: number;
  onlineTeachers: number;
  recentExams: { id: number; name: string; participants: number; avgScore: number; date: string }[];
}

export function getAdminDashboardStats() {
  return request<AdminDashboardStats>('GET', '/admin/dashboard/stats');
}

export interface RegistrationRequest {
  id: number;
  real_name?: string;
  username?: string;
  school_name?: string;
  district_name?: string;
  status?: string;
  submitted_at?: string;
  [key: string]: unknown;
}

export function getRegistrationRequests(page = 1, status = 'pending') {
  return request<{ success: boolean; data: { requests: RegistrationRequest[]; total: number; page: number; limit: number } }>(
    'GET',
    `/registration/admin/requests?page=${page}&limit=20&status=${status}`
  );
}

export function approveRegistration(id: number) {
  return request<{ success: boolean; message?: string }>('POST', `/registration/admin/requests/${id}/approve`);
}

/** 驳回：后端要求 comment 必填非空 */
export function rejectRegistration(id: number, comment: string) {
  return request<{ success: boolean; message?: string }>('POST', `/registration/admin/requests/${id}/reject`, { comment });
}
