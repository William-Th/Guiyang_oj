/**
 * 管理端服务层（计划书 5.6"随时看+快速批"）。
 * 拒绝字段名三家各异：注册/纠错=comment，教学班=reason，题目审核不进管理端（指定审核人制）。
 */
import { request } from '../utils/request';

// ---------- 教学班审批 ----------

export interface PendingTeachingClass {
  id: number;
  name: string;
  scope?: string;
  subject?: string;
  grade?: string;
  academic_year?: string;
  status?: string;
  school_name?: string;
  district_name?: string;
  creator_name?: string;
  pending_days?: number;
  submitted_at?: string;
  [key: string]: unknown;
}

/** 无分页参数，按当前管理员权限范围过滤（校级本校/区级本区/市级全部） */
export function getPendingTeachingClasses() {
  return request<{ success: boolean; reviewer_level?: string; data: PendingTeachingClass[] }>(
    'GET',
    '/teaching-classes/admin/pending'
  ).then((res) => res.data ?? []);
}

export function approveTeachingClass(id: number, comment?: string) {
  return request<{ success: boolean; message?: string }>('POST', `/teaching-classes/${id}/approve`, { comment });
}

/** 后端要求 reason 必填 */
export function rejectTeachingClass(id: number, reason: string) {
  return request<{ success: boolean; message?: string }>('POST', `/teaching-classes/${id}/reject`, { reason });
}
