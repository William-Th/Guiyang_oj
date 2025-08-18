const path = require('path');
const fs = require('fs').promises;

class BasicCertificateService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads/certificates');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  // 生成证书编号
  generateCertNumber() {
    const year = new Date().getFullYear();
    const randomNum = Math.random().toString(36).substr(2, 8).toUpperCase();
    return `GY-${year}-${randomNum}`;
  }

  // 根据分数获取等级
  getGradeLevel(score) {
    if (score >= 90) return { level: '优秀', color: '#ff6b6b' };
    if (score >= 80) return { level: '良好', color: '#4ecdc4' };
    if (score >= 70) return { level: '及格', color: '#45b7d1' };
    return { level: '待提高', color: '#96ceb4' };
  }

  // 格式化日期
  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }

  // 生成证书数据
  async createCertificateData(student, exam, score) {
    const certNumber = this.generateCertNumber();
    const issueDate = new Date();

    return {
      studentName: student.real_name || student.username,
      examName: exam.title,
      examDate: exam.start_time,
      score: score,
      certNumber: certNumber,
      issueDate: issueDate
    };
  }

  // 生成简单的HTML证书
  async generateCertificateHTML(data) {
    const { studentName, examName, examDate, score, certNumber, issueDate } = data;
    const gradeInfo = this.getGradeLevel(score);
        
    const formattedExamDate = this.formatDate(examDate);
    const formattedIssueDate = this.formatDate(issueDate);

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测评证书 - ${certNumber}</title>
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
            border-left: 4px solid ${gradeInfo.color};
        }
        
        .score {
            font-size: 32px;
            font-weight: bold;
            color: ${gradeInfo.color};
        }
        
        .grade {
            font-size: 20px;
            color: ${gradeInfo.color};
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
        
        @media print {
            body { 
                background: white; 
                padding: 0; 
            }
            .certificate {
                box-shadow: none;
                border: 2px solid #000;
            }
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
                    兹证明 <span class="student-name">${studentName}</span> 同学<br>
                    在 <span class="exam-name">${examName}</span> 测评中表现优异
                </div>
                
                <div class="score-section">
                    <div>考试日期：${formattedExamDate}</div>
                    <div>获得成绩：<span class="score">${score}分</span> (<span class="grade">${gradeInfo.level}</span>)</div>
                    <div>证书编号：${certNumber}</div>
                </div>
            </div>
            
            <div class="footer">
                <div class="cert-info">
                    <div>颁发日期：${formattedIssueDate}</div>
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
    
    <script>
        // 自动打印功能（可选）
        function printCertificate() {
            window.print();
        }
        
        // 页面加载完成后可选择打印
        // window.onload = function() {
        //     if (confirm('是否打印证书？')) {
        //         printCertificate();
        //     }
        // }
    </script>
</body>
</html>`;
  }

  // 生成证书文件
  async generateCertificateFile(data) {
    const html = await this.generateCertificateHTML(data);
    const fileName = `certificate_${data.certNumber}.html`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.writeFile(filePath, html);

    return {
      fileName,
      filePath,
      relativePath: `/uploads/certificates/${fileName}`
    };
  }
}

module.exports = new BasicCertificateService();