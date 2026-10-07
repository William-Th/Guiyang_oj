/**
 * 学生答题链路契约（已对后端 backend/src/routes/studentActivities.js 逐一核实）：
 * start → questions → my-answers(恢复) → answers(逐题保存) → submit(空body，状态机幂等) → result。
 */
import { request } from '../utils/request';

const BASE = '/student/activities';

// ---------- 列表 ----------

export interface StudentActivityItem {
  id: number;
  title: string;
  type?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  time_limit_type?: string;
  total_score?: number;
  question_count?: number;
  my_status?: string; // in_progress | submitted | graded
  my_score?: number;
  attempt_number?: number;
  max_attempts?: number;
  allow_retake?: boolean;
  [key: string]: unknown;
}

export function getStudentPracticeList() {
  return request<{ success: boolean; practices: StudentActivityItem[] }>('GET', `${BASE}/practice`).then(
    (res) => res.practices ?? []
  );
}

export function getStudentAssessmentList() {
  return request<{ success: boolean; assessments: StudentActivityItem[] }>('GET', `${BASE}/assessment`).then(
    (res) => res.assessments ?? []
  );
}

// ---------- 答题链路 ----------

export interface QuestionRaw {
  activity_question_id?: number;
  question_id: number;
  id?: number;
  order_index?: number;
  max_score?: number;
  question_code?: string;
  type: string; // single | multiple | true_false | blank | essay | matching | code
  content?: string;
  options?: unknown;
  difficulty?: string;
  image_url?: string | null;
  code_template?: string | null;
  supported_languages?: string[];
  [key: string]: unknown;
}

export interface RegistrableAssessment {
  id: number;
  title: string;
  subject?: string;
  grade?: string;
  end_time?: string;
  registration_end_time?: string;
}

/** 可报名测评（报名窗口内、未报名；语义与家长端 registrable 一致） */
export function getRegistrableAssessments() {
  return request<{ success: boolean; data: RegistrableAssessment[] }>(
    'GET',
    '/student/activities/registrable-assessments'
  );
}

export interface RegistrationEligibility {
  eligible: boolean;
  reasons?: string[];
  requireLocation?: boolean;
  locations?: { id: number; name?: string; address?: string }[];
}

export function checkRegistrationEligibility(activityId: number) {
  // 注意：该接口字段平铺（无 data 包裹）：{success, eligible, reasons, requireLocation, locations}
  return request<{ success: boolean } & RegistrationEligibility>(
    'GET',
    `/activities/${activityId}/registration/eligibility`
  );
}

/** 学生自助报名；需测评点的活动带 location_id */
export function registerAssessment(activityId: number, locationId?: number) {
  return request<{ success: boolean; message?: string }>(
    'POST',
    `/activities/${activityId}/self-register`,
    locationId ? { location_id: locationId } : {}
  );
}

export function startActivity(id: number) {
  // source 埋点：移动端练习占比统计（student_activities.start_source，计划书目标3）
  return request<{
    success: boolean;
    message?: string;
    is_continue?: boolean;
    student_activity_id: number;
    started_at: string;
    deadline: string | null;
    attempt_number: number;
  }>('POST', `${BASE}/${id}/start`, { source: 'mp' });
}

export function getActivityQuestions(id: number) {
  return request<{
    success: boolean;
    activity?: { title?: string; [key: string]: unknown };
    questions: QuestionRaw[];
  }>('GET', `${BASE}/${id}/questions`);
}

export interface SavedAnswer {
  id: number;
  question_id: number;
  answer: string;
  score?: number;
  grading_status?: string;
  feedback?: string | null;
  updated_at?: string;
}

export function getMyAnswers(id: number) {
  return request<{ success: boolean; student_activity_id: number; status: string; answers: SavedAnswer[] }>(
    'GET',
    `${BASE}/${id}/my-answers`
  );
}

/** 逐题保存：answer 格式按题型——single 存字母串，multiple 存字母数组，true_false 存 "true"/"false"，其余存纯文本 */
export function saveAnswer(id: number, questionId: number, answer: unknown) {
  return request<{ success: boolean; answer_id: number; saved_at: string }>('POST', `${BASE}/${id}/answers`, {
    questionId,
    answer,
  });
}

/** 交卷不带答案（答案已逐题保存）；后端按 attempt 状态机幂等，重复提交返回 403 */
export function submitActivity(id: number) {
  return request<{ success: boolean; message: string; student_activity_id: number }>('POST', `${BASE}/${id}/submit`, {});
}

// ---------- 结果 ----------

export interface ResultAnswer {
  id: number;
  question_id: number;
  my_answer: string | null;
  score: number;
  is_correct?: boolean;
  grading_status?: string;
  feedback?: string | null;
  question_code?: string;
  question_type: string;
  question_content?: string;
  question_options?: unknown;
  correct_answer?: unknown;
  question_explanation?: string | null;
  question_difficulty?: string;
  max_score?: number;
  [key: string]: unknown;
}

export interface ActivityResult {
  can_show_answers: boolean;
  show_answers_reason?: string;
  result_publish_time?: string | null;
  student_activity: {
    id: number;
    status: string;
    grading_status?: string;
    score: number;
    original_score?: number;
    rank?: number;
    started_at?: string;
    submit_time?: string;
    attempt_number?: number;
    activity_title?: string;
    activity_type?: string;
    activity_total_score?: number;
  };
  statistics: {
    total_questions: number;
    answered_questions: number;
    auto_graded_questions: number;
    manual_graded_questions: number;
    pending_questions: number;
    correct_questions: number;
  };
  answers: ResultAnswer[];
}

export function getActivityResult(id: number) {
  return request<ActivityResult & { success: boolean }>('GET', `${BASE}/${id}/result`);
}

// ---------- 测评报名（复用 /api/assessmentRegistration） ----------

export interface MyRegistration {
  id: number;
  activity_id: number;
  status?: string; // registered | cancelled
  registered_at?: string;
  activity_title?: string;
  subject?: string;
  grade?: string;
  activity_status?: string;
  exam_start_time?: string;
  location_name?: string;
  address?: string;
  exam_date?: string;
  exam_time_start?: string;
  exam_time_end?: string;
  [key: string]: unknown;
}

export function getMyRegistrations() {
  return request<{ success: boolean; registrations: MyRegistration[] }>('GET', '/assessments/my-registrations').then(
    (res) => res.registrations ?? []
  );
}

export function cancelRegistration(activityId: number) {
  return request<{ success: boolean; message?: string }>('POST', `/activities/${activityId}/register/cancel`, {});
}
