/**
 * 家长端契约（/api/parent/*，已核实）：响应外壳 {success, data|error}，
 * 错误字段是 error 而非 message；孩子经 parent_student_relations 关联（管理员建立）。
 */
import { request } from '../utils/request';

export interface ParentChild {
  student_user_id: number;
  relation?: string;
  username?: string;
  real_name?: string;
  grade?: string;
  class?: string;
  student_no?: string;
}

export function getParentChildren() {
  return request<{ success: boolean; data: ParentChild[] }>('GET', '/parent/children');
}

export interface ChildProfile {
  id?: number;
  username?: string;
  real_name?: string;
  grade?: string;
  class?: string;
  student_no?: string;
}

export function getChildProfile(studentId: number) {
  return request<{ success: boolean; data: ChildProfile }>('GET', `/parent/children/${studentId}/profile`);
}

export interface ChildResult {
  activity_id: number;
  title: string;
  subject?: string;
  type?: string;
  score?: number;
  status?: string;
  submit_time?: string | null;
}

export function getChildResults(studentId: number) {
  return request<{ success: boolean; data: ChildResult[] }>('GET', `/parent/children/${studentId}/results`);
}

export interface ChildSubjectStat {
  subject: string;
  total_questions: number;
  correct_count: number;
  /** numeric 字符串，0-1 小数 */
  accuracy_rate: string;
}

export function getChildStats(studentId: number) {
  return request<{ success: boolean; data: ChildSubjectStat[] }>('GET', `/parent/children/${studentId}/stats`);
}

export interface RegistrableAssessment {
  id: number;
  title: string;
  subject?: string;
  grade?: string;
  end_time?: string | null;
}

export function getRegistrableAssessments(studentId: number) {
  return request<{ success: boolean; data: RegistrableAssessment[] }>(
    'GET',
    `/parent/children/${studentId}/registrable-assessments`
  );
}

export function registerForChild(studentId: number, activityId: number) {
  return request<{ success: boolean; message?: string }>(
    'POST',
    `/parent/children/${studentId}/register/${activityId}`,
    {}
  );
}
