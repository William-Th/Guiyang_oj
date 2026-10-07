const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs').promises;

/**
 * PDF 证书生成服务
 *
 * 关键（勿改回）：PDFKit 默认 Helvetica 只支持 WinAnsi 编码，写中文必然乱码
 * （历史事故：证书全篇 "€yR›mK<Å"）。必须 doc.font(...) 显式切换为嵌入的
 * 中文字体（Noto Sans SC，OFL 协议，随仓库 assets/fonts 分发）。
 *
 * 自定义设计：渲染完全由 design 配置驱动（见 DEFAULT_DESIGN 结构），
 * 管理端"证书设计"可增改，生成/下载时未指定设计则回退 DEFAULT_DESIGN。
 */

const FONT_DIR = path.join(__dirname, '../../assets/fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'NotoSansSC-Regular.otf');
const FONT_BOLD = path.join(FONT_DIR, 'NotoSansSC-Bold.otf');

/** 默认证书设计：与历史版式一致（金边蓝题），无自定义设计时的兜底 */
const DEFAULT_DESIGN = {
  key: 'default',
  name: '默认设计',
  title: '贵阳市小学生能力测评',
  subtitle: '— 认证证书 —',
  orgName: '贵阳市教育局',
  sealText: '贵阳教育',
  borderColor: '#B8860B',
  innerBorderColor: '#DAA520',
  titleColor: '#1890FF',
  subtitleColor: '#DAA520',
  accentColor: '#1890FF',
  backgroundColor: '#FFFFFF',
  backgroundImageUrl: ''
};

class PDFCertificateService {
  /** 归一化：库里 partial 配置与默认合并，非法值回落 */
  normalizeDesign(design) {
    // 入参两种命名并存：DB 行为下划线（border_color），DEFAULT_DESIGN 为驼峰。
    // 逐字段归一为驼峰，键名不匹配时此处会静默回落默认值（历史 bug：只查驼峰键
    // 导致库里的自定义颜色全部失效）。
    const src = design || {};
    const FIELD_MAP = {
      title: 'title',
      subtitle: 'subtitle',
      name: 'name',
      orgName: 'org_name',
      sealText: 'seal_text',
      borderColor: 'border_color',
      innerBorderColor: 'inner_border_color',
      titleColor: 'title_color',
      subtitleColor: 'subtitle_color',
      accentColor: 'accent_color',
      backgroundColor: 'background_color',
      backgroundImageUrl: 'background_image_url'
    };
    const d = {};
    for (const [camel, snake] of Object.entries(FIELD_MAP)) {
      d[camel] = src[snake] !== undefined ? src[snake] : src[camel];
    }
    for (const k of ['borderColor', 'innerBorderColor', 'titleColor', 'subtitleColor', 'accentColor', 'backgroundColor']) {
      if (typeof d[k] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(d[k])) d[k] = DEFAULT_DESIGN[k];
    }
    for (const k of ['title', 'subtitle', 'orgName', 'sealText', 'name']) {
      if (typeof d[k] !== 'string' || !d[k].trim()) d[k] = DEFAULT_DESIGN[k];
    }
    if (typeof d.backgroundImageUrl !== 'string') d.backgroundImageUrl = '';
    return d;
  }

  /** 注册中文字体并返回文档字体名；字体文件缺失时抛出明确错误 */
  _applyFonts(doc) {
    doc.registerFont('CN', FONT_REGULAR);
    doc.registerFont('CN-Bold', FONT_BOLD);
    doc.font('CN');
  }

  /**
   * 生成证书 PDF 并返回 Buffer（用于直接下载）
   * @param {Object} certificateData - { studentName, examName, score, certNumber, issueDate }
   * @param {Object} [design] - 证书设计配置（缺省用 DEFAULT_DESIGN）
   */
  async generatePDFBuffer(certificateData, design) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        autoFirstPage: true,
        info: { Title: `证书 ${certificateData.certNumber || ''}` }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        this._applyFonts(doc);
        this._renderCertificate(doc, certificateData, this.normalizeDesign(design));
      } catch (err) {
        reject(err);
        return;
      }
      doc.end();
    });
  }

  /**
   * 生成证书 PDF 文件并保存到磁盘
   */
  async generatePDF(certificateData, design) {
    const pdfBuffer = await this.generatePDFBuffer(certificateData, design);

    const fileName = `certificate_${certificateData.certNumber}.pdf`;
    const uploadsDir = path.join(__dirname, '../../uploads/certificates');

    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, pdfBuffer);

    return {
      fileName,
      filePath,
      relativePath: `/uploads/certificates/${fileName}`
    };
  }

  /** 背景：优先铺满背景图（/uploads/... 相对路径），否则纯色底 */
  _drawBackground(doc, design) {
    if (design.backgroundImageUrl) {
      const abs = path.join(__dirname, '../../', String(design.backgroundImageUrl).replace(/^\//, ''));
      if (require('fs').existsSync(abs)) {
        try {
          doc.image(abs, 0, 0, { width: doc.page.width, height: doc.page.height });
          return;
        } catch {
          /* 背景图损坏时退回纯色 */
        }
      }
    }
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(design.backgroundColor);
  }

  /**
   * 渲染证书内容到 PDFDocument（设计配置驱动）
   *
   * 排版约定（勿改回）：所有居中文本一律 x=0 + width=pageW——PDFKit 在省略
   * width 时按「x 到右边距」计算文本区域，x=0 与 x=80 的居中线会差 40pt，
   * 历史事故：姓名与正文两套中心线错位。
   */
  _renderCertificate(doc, data, design) {
    const pageW = doc.page.width;
    const pageH = doc.page.height;

    this._drawBackground(doc, design);

    // ---------- 外/内边框 ----------
    doc
      .lineWidth(4)
      .strokeColor(design.borderColor)
      .rect(30, 20, pageW - 60, pageH - 40)
      .stroke();

    doc
      .lineWidth(1)
      .strokeColor(design.innerBorderColor)
      .rect(40, 30, pageW - 80, pageH - 60)
      .stroke();

    // ---------- 顶部标题区域 ----------
    doc
      .fontSize(14)
      .fillColor('#888888')
      .text('GUISYANG CITY PRIMARY SCHOOL ASSESSMENT', 0, 54, { width: pageW, align: 'center' });

    doc.font('CN-Bold');
    doc
      .fontSize(32)
      .fillColor(design.titleColor)
      .text(design.title, 0, 78, { width: pageW, align: 'center' });
    doc.font('CN');

    doc
      .fontSize(22)
      .fillColor(design.subtitleColor)
      .text(design.subtitle, 0, 122, { width: pageW, align: 'center' });

    // 分隔线
    const lineY = 162;
    doc
      .moveTo(120, lineY)
      .lineTo(pageW - 120, lineY)
      .lineWidth(1)
      .strokeColor(design.subtitleColor)
      .stroke();

    // ---------- 正文区域（垂直居中带：分隔线与页脚之间） ----------
    doc
      .fontSize(16)
      .fillColor('#333333')
      .text('兹证明', 0, 196, { width: pageW, align: 'center' });

    // 姓名与「同学」同行：PDFKit continued 跨字号不按基线对齐（小字会浮到行顶），
    // 这里手动测宽居中拼接，同学按 26pt 行的基线补 8pt 顶偏移
    const studentName = data.studentName || '学生';
    doc.font('CN-Bold').fontSize(26);
    const nameWidth = doc.widthOfString(studentName);
    doc.font('CN').fontSize(16);
    const classmateWidth = doc.widthOfString('同学');
    const rowGap = 8;
    const rowStartX = (pageW - (nameWidth + rowGap + classmateWidth)) / 2;
    const nameY = 228;
    doc
      .font('CN-Bold')
      .fontSize(26)
      .fillColor(design.accentColor)
      .text(studentName, rowStartX, nameY, { width: nameWidth + 4, lineBreak: false });
    doc
      .font('CN')
      .fontSize(16)
      .fillColor('#333333')
      .text('同学', rowStartX + nameWidth + rowGap, nameY + 8, {
        width: classmateWidth + 4,
        lineBreak: false
      });

    doc
      .fontSize(15)
      .fillColor('#555555')
      .text(`在「${data.examName || '测评活动'}」中表现优异，成绩合格`, 0, 288, { width: pageW, align: 'center' });

    // ---------- 成绩区域（带背景框） ----------
    const scoreBoxY = 326;
    const scoreBoxH = 80;
    const scoreBoxW = 420;
    const scoreBoxX = (pageW - scoreBoxW) / 2;

    doc.fillColor('#f0f7ff').roundedRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 8).fill();

    doc
      .lineWidth(2)
      .strokeColor(design.accentColor)
      .roundedRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 8)
      .stroke();

    const gradeInfo = this._getGradeLevel(data.score);

    doc
      .fontSize(14)
      .fillColor('#666666')
      .text('获得成绩：', scoreBoxX + 24, scoreBoxY + 12, { continued: true })
      .fontSize(28)
      .fillColor(design.accentColor)
      .text(`${data.score || 0} 分`);

    doc
      .fontSize(14)
      .fillColor('#666666')
      .text('等级评定：', scoreBoxX + 24, scoreBoxY + 50, { continued: true })
      .fillColor(gradeInfo.color)
      .text(gradeInfo.label);

    // ---------- 底部信息 ----------
    // 注意：PDFKit 文本越过下边距（pageH-40）会静默分页——页脚整体上移，
    // 保证第三行/机构/印章都在首页内（历史 bug：末行+机构+印章被推去第 2 页）
    const footerY = pageH - 96;

    doc
      .fontSize(11)
      .fillColor('#888888')
      .text(`证书编号：${data.certNumber || ''}`, 60, footerY);

    doc
      .fontSize(11)
      .fillColor('#888888')
      .text(`颁发日期：${this._formatDate(data.issueDate || new Date())}`, 60, footerY + 18);

    doc
      .fontSize(11)
      .fillColor('#888888')
      .text('有效期限：长期有效', 60, footerY + 36);

    // 右侧颁发机构（右缘收在内边框内侧）
    doc.font('CN-Bold');
    doc
      .fontSize(14)
      .fillColor('#333333')
      .text(design.orgName, pageW - 320, footerY - 6, { align: 'right', width: 238 });
    doc.font('CN');

    // 印章（圆形模拟，位于机构名下方，互不叠压）
    const stampX = pageW - 117;
    const stampY = footerY + 30;
    const stampR = 22;

    doc
      .lineWidth(2)
      .strokeColor('#cc0000')
      .circle(stampX, stampY, stampR)
      .stroke();

    doc
      .fontSize(9)
      .fillColor('#cc0000')
      .text(design.sealText, stampX - 26, stampY - 5, { width: 52, align: 'center' });
  }

  /**
   * 格式化日期为中文
   */
  _formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
  }

  /**
   * 根据分数获取等级
   */
  _getGradeLevel(score) {
    if (score >= 90) return { label: '优秀', color: '#f5222d' };
    if (score >= 80) return { label: '良好', color: '#1890ff' };
    if (score >= 60) return { label: '及格', color: '#52c41a' };
    return { label: '待提高', color: '#faad14' };
  }

  /**
   * 兼容旧接口
   */
  formatDate(date) {
    return this._formatDate(date);
  }

  getGradeLevel(score) {
    return this._getGradeLevel(score);
  }

  generateCertificateHTML(certificateData) {
    // 保留旧方法以兼容，但不再作为主路径
    const gradeInfo = this._getGradeLevel(certificateData.score);
    return `
    <html><head><meta charset="UTF-8"><title>证书 ${certificateData.certNumber}</title></head>
    <body style="font-family:sans-serif;text-align:center;padding:40px;">
      <h1 style="color:#1890FF;">贵阳市小学生能力测评 - 认证证书</h1>
      <p>兹证明 <strong style="color:#1890FF;font-size:24px;">${certificateData.studentName}</strong> 同学</p>
      <p>在「${certificateData.examName}」中获得 <strong style="color:#4ecdc4;font-size:28px;">${certificateData.score}分</strong>（${gradeInfo.label}）</p>
      <p>证书编号：${certificateData.certNumber}</p>
      <p>颁发日期：${this._formatDate(certificateData.issueDate)}</p>
      <p style="color:#999;font-size:12px;">贵阳市教育局</p>
    </body></html>`;
  }

  /**
   * 同时生成 HTML 和 PDF
   */
  async generateBothFormats(certificateData, design) {
    const uploadsDir = path.join(__dirname, '../../uploads/certificates');
    await fs.mkdir(uploadsDir, { recursive: true });

    // 保存 HTML
    const htmlContent = this.generateCertificateHTML(certificateData);
    const htmlFileName = `certificate_${certificateData.certNumber}.html`;
    const htmlFilePath = path.join(uploadsDir, htmlFileName);
    await fs.writeFile(htmlFilePath, htmlContent, 'utf8');

    // 生成 PDF
    const pdfResult = await this.generatePDF(certificateData, design);

    return {
      html: {
        fileName: htmlFileName,
        filePath: htmlFilePath,
        relativePath: `/uploads/certificates/${htmlFileName}`
      },
      pdf: pdfResult
    };
  }
}

module.exports = new PDFCertificateService();
module.exports.DEFAULT_DESIGN = DEFAULT_DESIGN;
