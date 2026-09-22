import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { looksLikeHtml, decodeEntities } from '@/utils/richText';
import './rich-text.css';

interface RichTextViewerProps {
  content?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 富文本展示组件
 *
 * - HTML 内容：经 DOMPurify 白名单消毒后渲染（防止 XSS）
 * - 历史纯文本：按原文渲染并保留换行
 */
const RichTextViewer: React.FC<RichTextViewerProps> = ({ content, className, style }) => {
  const isHtml = looksLikeHtml(content);

  const sanitizedHtml = useMemo(() => {
    if (!content || !isHtml) return '';
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        'p', 'br', 'hr', 'img', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
        'sub', 'sup', 'span', 'div', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5',
        'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'a', 'video', 'source', 'figure', 'figcaption', 'mark', 'font',
      ],
      ALLOWED_ATTR: ['src', 'alt', 'href', 'target', 'rel', 'width', 'height', 'colspan', 'rowspan', 'start', 'class', 'controls', 'poster'],
      KEEP_CONTENT: true,
      ALLOW_DATA_ATTR: false,
    });
  }, [content, isHtml]);

  if (!content) return null;

  if (!isHtml) {
    return (
      <div
        className={`rich-text-viewer rich-text-viewer--plain${className ? ` ${className}` : ''}`}
        style={style}
      >
        {decodeEntities(content)}
      </div>
    );
  }

  return (
    <div
      className={`rich-text-viewer${className ? ` ${className}` : ''}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default RichTextViewer;
