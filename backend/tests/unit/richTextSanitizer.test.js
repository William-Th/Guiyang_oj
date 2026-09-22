const { sanitizeRichText, htmlToPlainText } = require('../../src/utils/richTextSanitizer');

describe('richTextSanitizer', () => {
  describe('sanitizeRichText', () => {
    test('保留白名单内的排版标签', () => {
      const clean = sanitizeRichText('<p><strong>加粗</strong><em>斜体</em><table><tr><td>1</td></tr></table></p>');
      expect(clean).toContain('<strong>加粗</strong>');
      expect(clean).toContain('<em>斜体</em>');
      expect(clean).toContain('<table>');
      expect(clean).toContain('<td>1</td>');
    });

    test('移除 script 标签与事件属性（存储型 XSS）', () => {
      const dirty = '<p onclick="evil()">题目<script>alert(1)</script><img src="x.png" onerror="evil()"></p>';
      const clean = sanitizeRichText(dirty);
      expect(clean).not.toMatch(/script|onerror|onclick/i);
      expect(clean).toContain('<img src="x.png"');
    });

    test('链接强制追加 rel/target 防钓鱼', () => {
      const clean = sanitizeRichText('<a href="https://example.com">链接</a>');
      expect(clean).toMatch(/rel="noopener noreferrer nofollow"/);
      expect(clean).toMatch(/target="_blank"/);
    });

    test('纯文本原样透出，不受影响', () => {
      expect(sanitizeRichText('1 + 1 = 2')).toBe('1 + 1 = 2');
    });

    test('非字符串输入直接返回', () => {
      expect(sanitizeRichText(null)).toBeNull();
      expect(sanitizeRichText(undefined)).toBeUndefined();
    });
  });

  describe('htmlToPlainText', () => {
    test('剥离标签并保留段落换行', () => {
      expect(htmlToPlainText('<p>第一段</p><p>第二段</p>')).toBe('第一段\n第二段');
    });

    test('br 转换行、解码常见实体', () => {
      expect(htmlToPlainText('a<br>b &lt;3 &amp; more')).toBe('a\nb <3 & more');
    });

    test('纯文本原样返回', () => {
      expect(htmlToPlainText('普通文本')).toBe('普通文本');
      expect(htmlToPlainText('')).toBe('');
    });
  });
});
