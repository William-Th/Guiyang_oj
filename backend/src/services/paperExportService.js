const puppeteer = require('puppeteer');
const PaperGenerationService = require('./paperGenerationService');

/**
 * PaperExportService (C2)
 * 组卷导出 PDF：用 puppeteer 渲染 HTML → PDF（中文无障碍）。
 */
class PaperExportService {
  /**
   * 将题目列表渲染为 HTML
   * @param {Object} activity
   * @param {Array} questions
   * @param {Object} paperStats
   * @returns {string}
   */
  static _renderHTML(activity, questions, paperStats) {
    const escapeHtml = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const stripTags = (s) => String(s == null ? '' : s).replace(/<[^>]*>/g, '');

    const typeMap = {
      single: '单选题', multiple: '多选题', blank: '填空题',
      true_false: '判断题', essay: '问答题', code: '编程题', matching: '匹配题'
    };

    const qHTML = (questions || []).map((q, i) => {
      const content = stripTags(q.content);
      const typeText = typeMap[q.type] || q.type || '';
      let optionsHTML = '';
      if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
        optionsHTML = Object.entries(q.options).map(([k, v]) =>
          `<div class="opt">${escapeHtml(k)}. ${escapeHtml(stripTags(v))}</div>`
        ).join('');
      } else if (Array.isArray(q.options)) {
        optionsHTML = q.options.map((v, idx) =>
          `<div class="opt">${String.fromCharCode(65 + idx)}. ${escapeHtml(stripTags(v))}</div>`
        ).join('');
      }
      const imgHTML = q.image_url
        ? `<div class="img"><img src="${escapeHtml(q.image_url)}" /></div>` : '';
      return `
        <div class="q">
          <div class="qhead">${i + 1}. 【${escapeHtml(typeText)}】 <span class="score">（${q.score || ''}分）</span></div>
          <div class="qcontent">${escapeHtml(content)}</div>
          ${imgHTML}
          ${optionsHTML}
          <div class="blank">答：</div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif;padding:32px;color:#222;}
      h1{font-size:22px;text-align:center;margin:0 0 6px;}
      .meta{text-align:center;color:#666;font-size:13px;margin-bottom:18px;border-bottom:1px solid #eee;padding-bottom:10px;}
      .q{margin:14px 0;page-break-inside:avoid;}
      .qhead{font-weight:bold;margin-bottom:4px;}
      .score{color:#888;font-weight:normal;font-size:13px;}
      .qcontent{margin:4px 0;line-height:1.7;}
      .opt{margin:2px 0 2px 18px;line-height:1.6;}
      .blank{margin-top:8px;border-bottom:1px dashed #aaa;height:28px;}
      .img img{max-width:100%;max-height:240px;}
      .footer{margin-top:24px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee;padding-top:8px;}
    </style></head><body>
      <h1>${escapeHtml(activity.title || '练习卷')}</h1>
      <div class="meta">
        科目：${escapeHtml(activity.subject || '-')}&nbsp;|&nbsp;年级：${escapeHtml(activity.grade || '-')}
        ${paperStats && paperStats.totalScore ? `&nbsp;|&nbsp;总分：${paperStats.totalScore}` : ''}
      </div>
      ${qHTML || '<div>暂无题目</div>'}
      <div class="footer">由贵阳市小学生测评平台生成 · 共 ${questions ? questions.length : 0} 题</div>
    </body></html>`;
  }

  /**
   * 生成试卷 PDF（输出到 res 流）
   * @param {number} activityId
   * @param {Object} user
   * @param {Object} res - Express response
   */
  static async exportPaperPDF(activityId, user, res) {
    const paper = await PaperGenerationService.getActivityPaper(activityId, user);
    const html = PaperExportService._renderHTML(paper.activity, paper.questions, paper.paperStats);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="paper-${activityId}.pdf"`);
      res.end(pdfBuffer);
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = PaperExportService;
