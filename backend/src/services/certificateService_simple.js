const moment = require('moment');
const path = require('path');
const fs = require('fs').promises;
// const { v4: uuidv4 } = require('uuid');

class SimpleCertificateService {
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

  // 生成简单的HTML证书（暂时不生成PDF）
  async generateCertificateHTML(data) {
    const { studentName, examName, examDate, score, certNumber, issueDate } = data;
    const gradeInfo = this.getGradeLevel(score);
        
    const formattedExamDate = moment(examDate).format('YYYY年MM月DD日');
    const formattedIssueDate = moment(issueDate).format('YYYY年MM月DD日');

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
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .main-title {
            font-size: 36px;
            color: #1890FF;
            font-weight: bold;
            margin: 0;
            letter-spacing: 4px;
        }
        
        .sub-title {
            font-size: 28px;
            color: #FFD700;
            font-weight: bold;
            margin: 10px 0;
            letter-spacing: 2px;
        }
        
        .content {
            text-align: center;
            margin: 50px 0;
            line-height: 2;
            font-size: 20px;
        }
        
        .student-name {
            color: #1890FF;
            font-weight: bold;
            font-size: 24px;
        }
        
        .exam-name {
            color: #722ED1;
            font-weight: 600;
        }
        
        .score {
            font-size: 28px;
            font-weight: bold;
            color: ${gradeInfo.color};
        }
        
        .footer {
            position: absolute;
            bottom: 40px;
            left: 40px;
            right: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .cert-info {
            text-align: left;
            font-size: 14px;
            color: #666;
        }
        
        .issuer {
            text-align: right;
            font-size: 16px;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <h1 class="main-title">贵阳市小学生能力测评</h1>
            <h2 class="sub-title">认证证书</h2>
        </div>
        
        <div class="content">
            <p>兹证明 <span class="student-name">${studentName}</span> 同学</p>
            <p>在 <span class="exam-name">${examName}</span> 测评中表现优异</p>
            <br>
            <p>考试日期：${formattedExamDate}</p>
            <p>获得成绩：<span class="score">${score}分 (${gradeInfo.level})</span></p>
            <p>证书编号：${certNumber}</p>
        </div>
        
        <div class="footer">
            <div class="cert-info">
                <div>颁发日期：${formattedIssueDate}</div>
                <div>验证网址：exam.guiyang.edu.cn</div>
            </div>
            <div class="issuer">
                <div style="font-weight: bold;">贵阳市教育局</div>
                <div>电子签章</div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  // 暂时返回HTML文件路径，而不是PDF
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

module.exports = new SimpleCertificateService();