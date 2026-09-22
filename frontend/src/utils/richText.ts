/**
 * 富文本工具函数
 *
 * 题干 / 解析自 2026-09 起支持富文本（HTML）存储。
 * 旧数据为纯文本（含 \n 换行），展示与预览时需要区分处理。
 */

const HTML_TAG_RE =
  /<\/?(p|div|span|br|hr|img|strong|b|em|i|u|s|strike|del|sub|sup|ol|ul|li|h[1-6]|blockquote|pre|code|table|thead|tbody|tr|td|th|a|video|source|figure|figcaption|mark|font)\b[^<>]*>/i;

/** 判断内容是否为富文本 HTML（区别于历史纯文本数据） */
export function looksLikeHtml(content?: string | null): boolean {
  if (!content) return false;
  return HTML_TAG_RE.test(content);
}

/** 解码常见 HTML 实体（后端消毒会把纯文本中的裸 <、& 转义存库） */
export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** 去除 HTML 标签，返回纯文本（用于表格摘要、搜索过滤、Excel 导出等场景） */
export function stripHtml(content?: string | null): string {
  if (!content) return '';
  if (!looksLikeHtml(content)) return decodeEntities(content);
  try {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    return decodeEntities((doc.body.textContent || '').replace(/[ \t]+/g, ' ')).trim();
  } catch {
    return decodeEntities(content.replace(/<[^>]*>/g, ''));
  }
}

/** 生成纯文本摘要（先剥离 HTML 再截断），用于列表 / 卡片预览 */
export function plainTextPreview(content?: string | null, max = 80): string {
  const plain = stripHtml(content);
  if (!plain) return '';
  return plain.length > max ? plain.slice(0, max) + '…' : plain;
}
