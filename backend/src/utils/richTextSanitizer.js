/**
 * 富文本消毒工具（服务端）
 *
 * 题干/解析支持富文本（HTML）后，所有写入 question_bank / question_drafts 的
 * content、explanation 必须经过 sanitizeRichText 白名单消毒，防止存储型 XSS。
 * 展示端（RichTextViewer）另有 DOMPurify 二次防护。
 */
const sanitizeHtmlLib = require('sanitize-html');

const RICH_TEXT_OPTIONS = {
  allowedTags: [
    'p', 'br', 'hr', 'img', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
    'sub', 'sup', 'span', 'div', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5',
    'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'a', 'video', 'source', 'figure', 'figcaption', 'mark', 'font'
  ],
  allowedAttributes: {
    '*': ['style'],
    img: ['src', 'alt', 'width', 'height'],
    a: ['href', 'target', 'rel'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    ol: ['start'],
    font: ['color'],
    video: ['src', 'controls', 'width', 'height', 'poster'],
    source: ['src', 'type']
  },
  allowedSchemes: ['http', 'https'],
  // 富文本粘贴的截图通常为 base64 内嵌图片
  allowedSchemesByTag: { img: ['http', 'https', 'data'], video: ['http', 'https'], source: ['http', 'https'] },
  transformTags: {
    a: sanitizeHtmlLib.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' })
  }
};

/** 白名单消毒富文本 HTML；纯文本原样透出（非字符串直接返回） */
function sanitizeRichText(html) {
  if (typeof html !== 'string' || !html) return html;
  return sanitizeHtmlLib(html, RICH_TEXT_OPTIONS);
}

/** 剥离 HTML 标签还原纯文本（导出 Excel / 生成摘要时使用） */
function htmlToPlainText(text) {
  if (typeof text !== 'string') return text || '';
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const MAX_RICH_TEXT_LENGTH = 200000; // 约 20 万字符，防止粘贴超大 base64 图片撑爆存储

/** 校验富文本长度，超限返回错误信息，否则返回 null */
function checkRichTextLength(text, label) {
  if (typeof text !== 'string' || !text) return null;
  if (text.length > MAX_RICH_TEXT_LENGTH) {
    return label + '过长，请压缩图片或精简内容后重试';
  }
  return null;
}

module.exports = { sanitizeRichText, htmlToPlainText, checkRichTextLength, MAX_RICH_TEXT_LENGTH };
