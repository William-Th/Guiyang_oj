/**
 * 题目展示/作答格式化工具。
 * 兼容后端 options 三种形态（与 web 端 questionOption.ts 同规则）：
 * 1) 字符串数组且自带前缀 ["A. 12", "B. 15"]
 * 2) 对象数组 [{label:"A", content:"12"}]
 * 3) 匹配题 [{left:"键盘", right:"输入设备"}]（小程序端与 web 一致用文本作答）
 */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface NormalOption {
  letter: string;
  text: string;
}

export const TYPE_TEXT: Record<string, string> = {
  single: '单选题',
  multiple: '多选题',
  true_false: '判断题',
  blank: '填空题',
  essay: '问答题',
  matching: '匹配题',
  code: '编程题',
};

export function parseOptions(raw: unknown): NormalOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    const fallbackLetter = LETTERS[idx] ?? String(idx + 1);
    if (typeof item === 'string') {
      const m = /^([A-Za-z])[.、．:：]\s*(.+)$/.exec(item.trim());
      if (m) return { letter: m[1].toUpperCase(), text: m[2] };
      return { letter: fallbackLetter, text: item };
    }
    const obj = (item ?? {}) as { label?: string; content?: string; text?: string; left?: string; right?: string };
    if (obj.left !== undefined || obj.right !== undefined) {
      return { letter: obj.label ?? fallbackLetter, text: `${obj.left ?? ''} — ${obj.right ?? ''}` };
    }
    return { letter: obj.label ?? fallbackLetter, text: obj.content ?? obj.text ?? '' };
  });
}

/** correct_answer/answer 可能是数组、逗号串、字母串、布尔串——统一拆成字符串数组 */
export function parseLetters(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  const s = String(value).trim();
  if (s.includes(',')) return s.split(',').map((v) => v.trim()).filter(Boolean);
  return [s];
}

function optionTextOf(options: NormalOption[] | undefined, letter: string): string {
  const hit = options?.find((o) => o.letter.toUpperCase() === letter.toUpperCase());
  return hit && hit.text ? `（${hit.text}）` : '';
}

/** 结果页展示“我的作答”：按题型转成人话 */
export function formatAnswerDisplay(type: string, answer: unknown, options?: NormalOption[]): string {
  if (answer === null || answer === undefined || answer === '') return '未作答';
  if (type === 'true_false') return String(answer) === 'true' ? '正确' : '错误';
  if (type === 'multiple') {
    const letters = parseLetters(answer);
    if (!letters.length) return '未作答';
    return letters.map((l) => `${l}${optionTextOf(options, l)}`).join('、');
  }
  if (type === 'single') {
    const letter = parseLetters(answer)[0] ?? String(answer);
    return `${letter}${optionTextOf(options, letter)}`;
  }
  if (type === 'code') {
    try {
      const parsed = JSON.parse(String(answer)) as { submissionId?: number };
      if (parsed?.submissionId) return `编程提交 #${parsed.submissionId}`;
    } catch {
      /* 非 JSON 按原文展示 */
    }
    return String(answer);
  }
  return String(answer);
}

/** 结果页展示“正确答案” */
export function formatCorrectDisplay(type: string, correct: unknown, options?: NormalOption[]): string {
  if (correct === null || correct === undefined || correct === '') return '—';
  if (type === 'true_false') return String(correct) === 'true' ? '正确' : '错误';
  if (type === 'multiple' || (Array.isArray(correct) && type !== 'matching')) {
    return parseLetters(correct)
      .map((l) => `${l}${optionTextOf(options, l)}`)
      .join('、');
  }
  return String(correct);
}
