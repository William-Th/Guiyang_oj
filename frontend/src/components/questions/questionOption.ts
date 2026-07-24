/**
 * 题目选项解析工具
 *
 * 兼容数据库中三种 options 格式（数据来源不同导致不一致）：
 * 1. 字符串数组（已含前缀）: ["A. 12", "B. 15"]            —— single / true_false
 * 2. 对象数组 {label, content}: [{label:"A", content:"12"}] —— multiple
 * 3. 匹配题 {left, right}: [{left:"键盘", right:"输入设备"}] —— matching
 *
 * 统一输出 { label, content }，避免：
 * - 直接渲染对象导致 React #31 崩溃
 * - 字符串已含 "A." 前缀再叠加前缀导致 "A. A. 12" 重复
 */

export interface ParsedOption {
  label: string;
  content: string;
}

export function parseOption(option: any, index: number): ParsedOption {
  if (option == null) return { label: '', content: '' };

  // 字符串：可能是 "A. 12" / "A、12" / "A) 12" / 纯文本
  if (typeof option === 'string') {
    const m = option.match(/^\s*([A-Za-z])\s*[.、)]\s*(.*)$/);
    if (m) return { label: m[1].toUpperCase(), content: m[2] };
    return { label: String.fromCharCode(65 + index), content: option };
  }

  // 对象
  if (typeof option === 'object') {
    // multiple: {label, content}
    if ('content' in option || 'label' in option) {
      return {
        label: option.label ?? String.fromCharCode(65 + index),
        content: option.content ?? '',
      };
    }
    // matching: {left, right}
    if ('left' in option && 'right' in option) {
      return { label: String(option.left ?? ''), content: String(option.right ?? '') };
    }
  }

  return { label: String.fromCharCode(65 + index), content: String(option) };
}

/** 选项单行显示文本，如 "A. 12"；匹配题返回 "键盘. 输入设备" */
export function optionText(option: any, index: number): string {
  const { label, content } = parseOption(option, index);
  if (!content) return label;
  if (!label) return content;
  return `${label}. ${content}`;
}

/**
 * 格式化正确答案用于显示
 * ["A","C"] → "A、C"；"B" → "B"；对象兜底 JSON
 */
export function formatCorrectAnswer(answer: any): string {
  if (answer == null || answer === '') return '';
  if (Array.isArray(answer)) {
    return answer
      .filter((a) => a != null && a !== '')
      .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
      .join('、');
  }
  if (typeof answer === 'object') return JSON.stringify(answer);
  return String(answer);
}
