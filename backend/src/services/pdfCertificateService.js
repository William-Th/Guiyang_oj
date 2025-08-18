const htmlPdf = require('html-pdf-node');
const path = require('path');
const fs = require('fs').promises;

class PDFCertificateService {
  // Generate PDF from HTML certificate
  async generatePDF(certificateData) {
    try {
      // Generate HTML content
      const htmlContent = this.generateCertificateHTML(certificateData);
      
      // Configure PDF options
      const options = {
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      };

      // Generate PDF buffer
      const pdfBuffer = await htmlPdf.generatePdf({ content: htmlContent }, options);

      // Save PDF file
      const fileName = `certificate_${certificateData.certNumber}.pdf`;
      const uploadsDir = path.join(__dirname, '../../uploads/certificates');
      
      // Ensure directory exists
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const filePath = path.join(uploadsDir, fileName);
      await fs.writeFile(filePath, pdfBuffer);

      return {
        fileName,
        filePath,
        relativePath: `/uploads/certificates/${fileName}`
      };

    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  // Generate HTML content for certificate
  generateCertificateHTML(certificateData) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测评证书 - ${certificateData.certNumber}</title>
    <style>
        body {
            margin: 0;
            padding: 40px;
            font-family: 'SimSun', serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .certificate {
            width: 800px;
            height: 600px;
            background: white;
            border: 8px solid #FFD700;
            border-radius: 20px;
            position: relative;
            padding: 40px;
            box-sizing: border-box;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(24, 144, 255, 0.05);
            font-weight: bold;
            pointer-events: none;
            z-index: 1;
        }
        
        .content {
            position: relative;
            z-index: 2;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .main-title {
            font-size: 36px;
            color: #1890FF;
            font-weight: bold;
            margin: 10px 0;
            letter-spacing: 4px;
        }
        
        .sub-title {
            font-size: 28px;
            color: #FFD700;
            font-weight: bold;
            margin: 10px 0;
            letter-spacing: 2px;
        }
        
        .english-title {
            font-size: 18px;
            color: #666;
            margin: 5px 0;
        }
        
        .certificate-content {
            text-align: center;
            margin: 50px 0;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .student-info {
            font-size: 24px;
            line-height: 2;
            color: #333;
            margin: 20px 0;
        }
        
        .student-name {
            color: #1890FF;
            font-weight: bold;
            font-size: 26px;
        }
        
        .exam-name {
            color: #722ED1;
            font-weight: 600;
        }
        
        .score-section {
            margin: 20px 0;
            padding: 15px;
            background: linear-gradient(135deg, #f5f5f5, #e8f4fd);
            border-radius: 10px;
            border-left: 4px solid #4ecdc4;
        }
        
        .score {
            font-size: 32px;
            font-weight: bold;
            color: #4ecdc4;
        }
        
        .grade {
            font-size: 20px;
            color: #4ecdc4;
            font-weight: 600;
        }
        
        .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 20px;
        }
        
        .cert-info {
            text-align: left;
            font-size: 14px;
            color: #666;
            line-height: 1.8;
        }
        
        .issuer {
            text-align: right;
            font-size: 16px;
            color: #333;
        }
        
        .issuer-name {
            font-size: 18px;
            font-weight: 600;
            color: #1890FF;
        }
        
        .signature {
            width: 60px;
            height: 40px;
            background: linear-gradient(135deg, #1890FF, #722ED1);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="watermark">贵阳教育</div>
        
        <div class="content">
            <div class="header">
                <h1 class="main-title">贵阳市小学生能力测评</h1>
                <h2 class="sub-title">认证证书</h2>
                <p class="english-title">Certificate of Achievement</p>
            </div>
            
            <div class="certificate-content">
                <div class="student-info">
                    兹证明 <span class="student-name">${certificateData.studentName}</span> 同学<br>
                    在 <span class="exam-name">${certificateData.examName}</span> 测评中表现优异
                </div>
                
                <div class="score-section">
                    <div>考试日期：${this.formatDate(certificateData.examDate)}</div>
                    <div>获得成绩：<span class="score">${certificateData.score}分</span> (<span class="grade">${this.getGradeLevel(certificateData.score).level}</span>)</div>
                    <div>证书编号：${certificateData.certNumber}</div>
                </div>
            </div>
            
            <div class="footer">
                <div class="cert-info">
                    <div>颁发日期：${this.formatDate(certificateData.issueDate)}</div>
                    <div>有效期限：长期有效</div>
                    <div>验证网址：exam.guiyang.edu.cn</div>
                </div>
                <div class="issuer">
                    <div class="issuer-name">贵阳市教育局</div>
                    <div class="signature">电子签章</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  // Format date to Chinese format
  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
  }

  // Get grade level based on score
  getGradeLevel(score) {
    if (score >= 90) {
      return { level: '优秀', color: '#f5222d' };
    } else if (score >= 80) {
      return { level: '良好', color: '#1890ff' };
    } else if (score >= 60) {
      return { level: '及格', color: '#52c41a' };
    } else {
      return { level: '待提高', color: '#faad14' };
    }
  }
}

// Export singleton instance
module.exports = new PDFCertificateService();