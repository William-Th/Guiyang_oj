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

// ---------- 微信登录绑定（后端未配置凭据时返回 503 WECHAT_NOT_CONFIGURED） ----------

export interface WechatLoginResponse {
  success: boolean;
  needBind?: boolean;
  bindTicket?: string;
  message?: string;
  token?: string;
  refreshToken?: string;
  user?: UserInfo;
}

export function wechatLogin(code: string) {
  return request<WechatLoginResponse>('POST', '/auth/wechat', { code }, { auth: false });
}

export function wechatBind(bindTicket: string, username: string, password: string) {
  return request<LoginResponse>('POST', '/auth/wechat/bind', { bindTicket, username, password }, { auth: false });
}

/** 订阅消息配额上报（接受累加配额、拒绝清零） */
export function recordSubscribe(templateKey: string, accepted: boolean) {
  return request<{ success: boolean }>('POST', '/mp/subscribe-record', { templateKey, accepted });
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
  // 后端返回 {count: {notifications, announcements, total}}
  return request<{
    success: boolean;
    count: { notifications: number; announcements: number; total: number };
  }>('GET', '/notifications/unread-count');
}

// ---------- 小程序聚合（计划书第8章：/api/mp/home 一次取全，替代首页多请求） ----------

export interface MpHomeData {
  streak: { current: number; max: number; lastCorrectAt: string | null };
  points: number;
  unread: number;
  daily: { done: number; target: number };
  ongoingPractices: number;
}

export function getMpHome() {
  return request<{ success: boolean; data: MpHomeData }>('GET', '/mp/home');
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
  /** 完整 18 位身份证号（后端取末 4 位落库并校验与出生日期一致） */
  idCard: string;
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

/** 方式二：手机号 + 出生日期 + 完整身份证号（无需查询码） */
export function queryRegistrationStatusByIdentity(phone: string, birthDate: string, idCard: string) {
  return request<{ success: boolean; data: RegistrationStatusInfo }>(
    'POST',
    '/registration/status',
    { phone, birthDate, idCard },
    { auth: false }
  );
}

export function queryRegistrationStatus(phone: string, inquiryCode: string) {
  return request<{ success: boolean; data: RegistrationStatusInfo }>(
    'POST',
    '/registration/status',
    { phone, inquiryCode },
    { auth: false }
  );
}

// ---------- 管理端：用户查询（响应外壳为裸 {students|teachers}，无分页，前端过滤） ----------

export interface UserRow {
  id: number;
  username: string;
  real_name?: string | null;
  phone?: string | null;
  status?: string;
  school_name?: string | null;
  grade?: string | null;
  class?: string | null;
  student_no?: string | null;
  [key: string]: unknown;
}

export function getStudentUsers() {
  return request<{ students: UserRow[] }>('GET', '/users/students').then((res) => res.students ?? []);
}

export function getTeacherUsers() {
  return request<{ teachers: UserRow[] }>('GET', '/users/teachers').then((res) => res.teachers ?? []);
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
  // 批准即建号：data.initialPassword 为学生明文初始密码，管理端需转告学生
  return request<{ success: boolean; message?: string; data?: { username?: string; initialPassword?: string } }>(
    'POST',
    `/registration/admin/requests/${id}/approve`
  );
}

/** 驳回：后端要求 comment 必填非空 */
export function rejectRegistration(id: number, comment: string) {
  return request<{ success: boolean; message?: string }>('POST', `/registration/admin/requests/${id}/reject`, { comment });
}
