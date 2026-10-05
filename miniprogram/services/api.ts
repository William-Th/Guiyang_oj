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
  /** 后端 student_streaks 表为 snake_case 字段 */
  current_streak?: number;
  max_streak?: number;
  last_correct_at?: string | null;
  [key: string]: unknown;
}

export function getStreak() {
  return request<{ success: boolean; data: StreakInfo }>('GET', '/points/streak');
}

export interface PointsAccount {
  current_points?: number;
  total_points?: number;
  spent_points?: number;
  frozen_points?: number;
  [key: string]: unknown;
}

/** 积分账户（后端惰性初始化，新学生也返回零账户） */
export function getPointsAccount(studentId: number) {
  return request<{ success: boolean; data: PointsAccount }>('GET', `/points/account/${studentId}`);
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

// ---------- 学生注册（审核制，与 web 端同构；接口公开无需登录） ----------

export interface DistrictOption {
  code: string;
  name: string;
  [key: string]: unknown;
}

export interface SchoolOption {
  code: string;
  name: string;
  [key: string]: unknown;
}

export function getDistricts() {
  return request<{ success: boolean; data: DistrictOption[] }>('GET', '/registration/config/districts', undefined, { auth: false });
}

export function getSchools(districtCode: string) {
  return request<{ success: boolean; data: SchoolOption[] }>('GET', `/registration/config/schools/${districtCode}`, undefined, { auth: false });
}

export interface RegistrationPayload {
  phone: string;
  realName: string;
  birthDate: string;
  idCardLast4: string;
  districtCode: string;
  schoolCode: string;
  grade?: string;
}

/** 成功后 data.inquiryCode 仅本次返回，必须引导用户保存 */
export function submitRegistration(payload: RegistrationPayload) {
  return request<{ success: boolean; message: string; data: { id: number; estimatedReviewTime: string; inquiryCode: string } }>(
    'POST',
    '/registration/student',
    payload as unknown as Record<string, unknown>,
    { auth: false }
  );
}

export interface RegistrationStatusInfo {
  id: number;
  school_name?: string;
  grade?: string | null;
  status: string;
  current_reviewer_level?: number;
  submitted_at?: string;
  reviewed_at?: string;
  review_comment?: string | null;
  statusText: string;
}

export function queryRegistrationStatus(phone: string, inquiryCode: string) {
  return request<{ success: boolean; data: RegistrationStatusInfo }>(
    'POST',
    '/registration/status',
    { phone, inquiryCode },
    { auth: false }
  );
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
