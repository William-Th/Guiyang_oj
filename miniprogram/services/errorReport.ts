/**
 * 题目纠错契约（对后端 src/routes/errorReports.js 核实）：
 * - 仅学生可提交；questionId 为 question_bank.id（与判题/错题本同侧）；
 * - errorType 枚举 question/answer/explanation/options/other（迁移 046 CHECK）；
 * - 同题重复纠错有防刷上限（frozen=true 表示已达上限）。
 */
import { request } from '../utils/request';

export const ERROR_TYPES: { value: string; label: string }[] = [
  { value: 'question', label: '题目有误' },
  { value: 'answer', label: '答案有误' },
  { value: 'explanation', label: '解析有误' },
  { value: 'options', label: '选项有误' },
  { value: 'other', label: '其他问题' },
];

export function submitErrorReport(data: {
  questionId: number;
  errorType: string;
  errorDescription: string;
}) {
  return request<{
    success: boolean;
    message?: string;
    meta?: { totalReports: number; frozen: boolean };
  }>('POST', '/error-reports', data);
}
