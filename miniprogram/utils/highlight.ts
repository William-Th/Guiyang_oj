/**
 * 轻量代码高亮（小程序 rich-text 渲染）。
 *
 * 输出为带内联样式的 HTML 片段（rich-text nodes 直接收 HTML 字符串）。
 * 配套样式约定（编辑器页）：
 * - 容器 white-space: pre-wrap、等宽字体——换行/缩进由原文保留；
 * - 颜色体系与深色代码底 (#0f172a) 搭配。
 *
 * 分词策略：按 注释/字符串/预处理/数字/关键字/函数名/普通 顺序切分，
 * 不追求 IDE 级精确，够编辑器实时高亮即可（O(n) 单趟正则）。
 */

const KEYWORDS: Record<string, string[]> = {
  python: [
    'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or',
    'import', 'from', 'as', 'class', 'lambda', 'try', 'except', 'finally', 'with',
    'pass', 'break', 'continue', 'True', 'False', 'None', 'global', 'nonlocal',
    'yield', 'raise', 'assert', 'del', 'is', 'async', 'await',
  ],
  cpp: [
    'include', 'using', 'namespace', 'std', 'int', 'long', 'short', 'char', 'float',
    'double', 'bool', 'void', 'auto', 'const', 'static', 'unsigned', 'signed',
    'struct', 'class', 'enum', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'default', 'break', 'continue', 'new', 'delete', 'sizeof',
    'true', 'false', 'nullptr', 'template', 'typename', 'public', 'private', 'protected',
    'try', 'catch', 'throw', 'operator', 'inline', 'virtual', 'override',
  ],
  c: [
    'include', 'int', 'long', 'short', 'char', 'float', 'double', 'void', 'const',
    'static', 'unsigned', 'signed', 'struct', 'enum', 'union', 'return', 'if',
    'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
    'sizeof', 'typedef', 'extern', 'register', 'volatile', 'goto',
  ],
};

const COLORS = {
  comment: '#64748b',
  string: '#fbbf24',
  number: '#7dd3fc',
  keyword: '#38bdf8',
  preprocessor: '#c084fc',
  fn: '#a5f3a1',
  plain: '#e2e8f0',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function span(color: string, text: string): string {
  return `<span style="color:${color}">${escapeHtml(text)}</span>`;
}

/** 单行注释前缀：python 用 #，cpp/c 用 // */
function lineCommentPrefix(language: string): string {
  return language === 'python' ? '#' : '//';
}

/**
 * 高亮代码 → HTML 字符串。language 不识别时按 plain 渲染（不报错）。
 */
export function highlightCode(code: string, language: string): string {
  const keywords = new Set(KEYWORDS[language] ?? []);
  const commentPrefix = lineCommentPrefix(language);
  const isCppLike = language === 'cpp' || language === 'c';

  // 单趟扫描：注释 → 字符串 → 数字 → 标识符/关键字 → 其他
  // （按语言拼接 pattern：python 无块注释/预处理，cpp/c 无 # 行注释）
  const parts: string[] = [];
  if (isCppLike) {
    parts.push(/\/\*[\s\S]*?\*\//.source); // 块注释
    parts.push(/^[ \t]*#[^\n]*/.source.replace('^', '^')); // 预处理指令（#include 等）
  } else {
    parts.push(`${escapeRegex(commentPrefix)}[^\\n]*`); // # 行注释
  }
  parts.push(
    /"(?:\\.|[^"\\\n])*"?/.source, // 双引号字符串（允许行尾未闭合）
    /'(?:\\.|[^'\\\n])*'?/.source, // 单引号字符/字符串
    /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/.source, // 数字
    /[A-Za-z_]\w*/.source // 标识符/关键字
  );
  const pattern = new RegExp(parts.join('|'), 'gm');

  let out = '';
  let last = 0;
  for (const m of code.matchAll(pattern)) {
    const idx = m.index ?? 0;
    out += span(COLORS.plain, code.slice(last, idx));
    const token = m[0];
    if (token.startsWith(commentPrefix) || (isCppLike && token.startsWith('/*'))) {
      out += span(COLORS.comment, token);
    } else if (token.startsWith('"') || token.startsWith("'")) {
      out += span(COLORS.string, token);
    } else if (isCppLike && token.startsWith('#')) {
      out += span(COLORS.preprocessor, token);
    } else if (/^\d/.test(token)) {
      out += span(COLORS.number, token);
    } else if (keywords.has(token)) {
      out += span(COLORS.keyword, token);
    } else {
      // 函数名：标识符后紧跟 ( 着色
      const rest = code.slice(idx + token.length);
      if (/^\s*\(/.test(rest)) out += span(COLORS.fn, token);
      else out += span(COLORS.plain, token);
    }
    last = idx + token.length;
  }
  out += span(COLORS.plain, code.slice(last));
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 各语言的起步模板：python 用题面给的模板；cpp/c 生成最小骨架 */
export function starterTemplate(language: string, questionTemplate: string): string {
  if (language === 'python') return questionTemplate || '# 在这里编写代码\n';
  if (language === 'cpp') {
    return '#include <iostream>\nusing namespace std;\n\nint main() {\n    // 在这里编写代码\n    return 0;\n}\n';
  }
  if (language === 'c') {
    return '#include <stdio.h>\n\nint main() {\n    // 在这里编写代码\n    return 0;\n}\n';
  }
  return questionTemplate || '';
}
