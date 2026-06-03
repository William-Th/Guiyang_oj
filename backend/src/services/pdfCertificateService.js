const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs').promises;

/**
 * PDF 证书生成服务
 * 使用 PDFKit 生成中文证书 PDF（无需 Puppeteer，适合 Docker Alpine 环境）
 */
class PDFCertificateService {
  /**
   * 生成证书 PDF 并返回 Buffer（用于直接下载）
   * @param {Object} certificateData - 证书数据
   * @returns {Promise<Buffer>}
   */
  async generatePDFBuffer(certificateData) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 60, right: 60 }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this._renderCertificate(doc, certificateData);
      doc.end();
    });
  }

  /**
   * 生成证书 PDF 文件并保存到磁盘
   * @param {Object} certificateData - 证书数据
   * @returns {Promise<{fileName, filePath, relativePath}>}
   */
  async generatePDF(certificateData) {
    const pdfBuffer = await this.generatePDFBuffer(certificateData);

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

  /**
   * 渲染证书内容到 PDFDocument
   * @param {PDFDocument} doc
   * @param {Object} data
   */
  _renderCertificate(doc, data) {
    const pageW = doc.page.width;
    const pageH = doc.page.height;

    // ---------- 外边框 ----------
    doc
      .lineWidth(4)
      .strokeColor('#B8860B')
      .rect(30, 20, pageW - 60, pageH - 40)
      .stroke();

    // 内边框（装饰）
    doc
      .lineWidth(1)
      .strokeColor('#DAA520')
      .rect(40, 30, pageW - 80, pageH - 60)
      .stroke();

    // ---------- 顶部标题区域 ----------
    doc
      .fontSize(14)
      .fillColor('#888888')
      .text('GUISYANG CITY PRIMARY SCHOOL ASSESSMENT', 0, 52, { align: 'center' });

    doc
      .fontSize(32)
      .fillColor('#1890FF')
      .text('贵阳市小学生能力测评', 0, 72, { align: 'center' });

    doc
      .fontSize(24)
      .fillColor('#DAA520')
      .text('— 认证证书 —', 0, 110, { align: 'center' });

    // 分隔线
    const lineY = 145;
    doc
      .moveTo(120, lineY)
      .lineTo(pageW - 120, lineY)
      .lineWidth(1)
      .strokeColor('#DAA520')
      .stroke();

    // ---------- 正文区域 ----------
    const contentY = 170;
    doc
      .fontSize(16)
      .fillColor('#333333')
      .text('兹证明', 80, contentY, { align: 'center' });

    // 学生姓名（突出显示）
    doc
      .fontSize(26)
      .fillColor('#1890FF')
      .text(data.studentName || '学生', 0, contentY + 30, { align: 'center' });

    doc
      .fontSize(16)
      .fillColor('#333333')
      .text('同学', 0, contentY + 60, { align: 'center' });

    // 测评信息
    doc
      .fontSize(15)
      .fillColor('#555555')
      .text(`在「${data.examName || '测评活动'}」中表现优异，成绩合格`, 80, contentY + 90, { align: 'center' });

    // ---------- 成绩区域（带背景框） ----------
    const scoreBoxY = contentY + 130;
    const scoreBoxH = 70;
    const scoreBoxW = 400;
    const scoreBoxX = (pageW - scoreBoxW) / 2;

    doc
      .fillColor('#f0f7ff')
      .roundedRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 8)
      .fill();

    doc
      .lineWidth(2)
      .strokeColor('#1890FF')
      .roundedRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 8)
      .stroke();

    const gradeInfo = this._getGradeLevel(data.score);

    doc
      .fontSize(14)
      .fillColor('#666666')
      .text('获得成绩：', scoreBoxX + 20, scoreBoxY + 12, { continued: true })
      .fontSize(28)
      .fillColor('#4ecdc4')
      .text(`${data.score || 0} 分`);

    doc
      .fontSize(14)
      .fillColor('#666666')
      .text('等级评定：', scoreBoxX + 20, scoreBoxY + 44, { continued: true })
      .fillColor(gradeInfo.color)
      .text(gradeInfo.label);

    // ---------- 底部信息 ----------
    const footerY = pageH - 80;

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

    // 右侧颁发机构
    doc
      .fontSize(14)
      .fillColor('#333333')
      .text('贵阳市教育局', pageW - 260, footerY, { align: 'right', width: 200 });

    // 印章（圆形模拟）
    const stampX = pageW - 120;
    const stampY = footerY + 20;
    const stampR = 22;

    doc
      .lineWidth(2)
      .strokeColor('#cc0000')
      .circle(stampX, stampY, stampR)
      .stroke();

    doc
      .fontSize(9)
      .fillColor('#cc0000')
      .text('贵阳教育', stampX - 16, stampY - 5, { width: 32, align: 'center' });
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
  async generateBothFormats(certificateData) {
    const uploadsDir = path.join(__dirname, '../../uploads/certificates');
    await fs.mkdir(uploadsDir, { recursive: true });

    // 保存 HTML
    const htmlContent = this.generateCertificateHTML(certificateData);
    const htmlFileName = `certificate_${certificateData.certNumber}.html`;
    const htmlFilePath = path.join(uploadsDir, htmlFileName);
    await fs.writeFile(htmlFilePath, htmlContent, 'utf8');

    // 生成 PDF
    const pdfResult = await this.generatePDF(certificateData);

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
