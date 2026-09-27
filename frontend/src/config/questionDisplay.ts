/**
 * 题目展示共享配置：题型文案、难度文案与配色。
 * 学生端各页面（智能练习/错题集/练习中心等）统一引用，
 * 避免同一题型在不同页面显示不同文案或不同配色。
 */

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  single: '单选题',
  multiple: '多选题',
  true_false: '判断题',
  blank: '填空题',
  fill_blank: '填空题',
  code: '编程题',
  essay: '问答题',
  matching: '匹配题',
};

export const QUESTION_TYPE_SHORT: Record<string, string> = {
  single: '单选',
  multiple: '多选',
  true_false: '判断',
  blank: '填空',
  fill_blank: '填空',
  code: '编程',
  essay: '问答',
  matching: '匹配',
};

export const DIFFICULTY_META: Record<string, { text: string; color: string }> = {
  easy: { text: '简单', color: 'green' },
  medium: { text: '中等', color: 'orange' },
  hard: { text: '困难', color: 'red' },
};

/** 日期统一展示：2026-09-27T00:00:00.000Z → 2026/9/27 */
export function formatDay(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('zh-CN');
}

/** 日期时间统一展示：→ 2026/9/24 11:12:40 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('zh-CN', { hour12: false });
}
