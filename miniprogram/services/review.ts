/**
 * 题目审核契约（对后端 src/routes/questionReview.js 核实）：
 * - /question-review/pending 只返回「指定审核人=当前用户」的待审题——审核主体是教师，
 *   由出题人提交时指定，不走管理员权限体系；
 * - 通过即发布（question_bank.status→published 并生成题目编码），驳回必须填审核意见
 *   （status→inactive，可凭原草稿重新提交）；
 * - 响应 meta 附带我方审核统计（approved/rejected/通过率）。
 */
import { request } from '../utils/request';

export interface PendingQuestion {
  /** question_bank.id，审核动作的路径参数（不是 draft_id） */
  id: number;
  draft_id: number;
  /** 待审时后端返回 DRAFT-{draft_id} 占位 */
  question_code: string;
  type: string;
  subject: string;
  grade: string;
  /** 学段等级（L2-L5），直接透传展示 */
  level?: string;
  /** 富文本 HTML 串，rich-text nodes 直收（与答题页同约定） */
  content: string;
  options?: unknown;
  correct_answer?: unknown;
  suggested_score?: number;
  difficulty?: string;
  explanation?: string;
  knowledge_points?: string[];
  image_url?: string;
  scope: string[];
  creator_name?: string;
  submitted_at?: string;
}

export interface ReviewPendingMeta {
  count: number;
  approved_count: number;
  rejected_count: number;
  approval_rate: number;
}

export function getPendingQuestions() {
  return request<{ success: boolean; data: PendingQuestion[]; meta: ReviewPendingMeta }>(
    'GET',
    '/question-review/pending'
  );
}

export function reviewQuestion(id: number, status: 'approved' | 'rejected', comment?: string) {
  return request<{ success: boolean; message?: string }>(
    'POST',
    `/question-review/${id}/review`,
    { status, comment: comment ?? '' }
  );
}
