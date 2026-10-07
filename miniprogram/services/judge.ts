/**
 * 判题服务契约（对后端 src/routes/judge.js + judge-service 核实）：
 * - submit → { data: { submissionId } }，轮询 status 直到终态（pending/judging 之外）；
 * - 终态 status：AC 通过 / WA 答案错误 / CE 编译错误 / TLE 超时 / RE 运行时错误 等；
 * - 编程题答案 = JSON.stringify({ submissionId, questionId, timestamp })，交卷后评分按 submissionId 拉判题分。
 */
import { request } from '../utils/request';

export interface JudgeLanguage {
  id: string;
  name: string;
  extension: string;
}

export interface SampleCase {
  input?: string;
  output?: string;
  description?: string;
}

export interface TestResult {
  index?: number;
  passed?: boolean;
  status?: string;
  input?: string;
  expected_output?: string;
  actual_output?: string;
  time_used?: number;
}

export interface JudgeStatus {
  submissionId: number;
  status: string;
  score?: number;
  totalScore?: number;
  compileOutput?: string | null;
  executionTime?: number | null;
  testResults?: TestResult[] | null;
  submittedAt?: string;
  judgedAt?: string;
}

export function getLanguages() {
  return request<{ success: boolean; data: JudgeLanguage[] }>('GET', '/judge/languages', undefined, {
    auth: false,
  });
}

export function getSamples(questionId: number) {
  return request<{ success: boolean; data: SampleCase[] }>(
    'GET',
    `/judge/testcases/${questionId}/samples`,
    undefined,
    { auth: false }
  );
}

export function submitCode(data: { questionId: number; activityId?: number; code: string; language: string }) {
  return request<{ success: boolean; data: { submissionId: number } }>('POST', '/judge/submit', data);
}

export function getStatus(submissionId: number) {
  return request<{ success: boolean; data: JudgeStatus }>('GET', `/judge/status/${submissionId}`);
}
