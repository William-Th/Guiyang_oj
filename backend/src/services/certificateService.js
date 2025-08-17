const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const moment = require('moment');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class CertificateService {
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

    // 生成二维码
    async generateQRCode(certNumber) {
        const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${certNumber}`;
        return await QRCode.toDataURL(verifyUrl, {
            width: 120,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
    }

    // 根据分数获取等级
    getGradeLevel(score) {
        if (score >= 90) return { level: '优秀', color: '#ff6b6b' };
        if (score >= 80) return { level: '良好', color: '#4ecdc4' };
        if (score >= 70) return { level: '及格', color: '#45b7d1' };
        return { level: '待提高', color: '#96ceb4' };
    }

    // 生成证书HTML模板
    async generateCertificateHTML(data) {
        const { studentName, examName, examDate, score, certNumber, issueDate } = data;
        const qrCodeDataURL = await this.generateQRCode(certNumber);
        const gradeInfo = this.getGradeLevel(score);
        
        const formattedExamDate = moment(examDate).format('YYYY年MM月DD日');
        const formattedIssueDate = moment(issueDate).format('YYYY年MM月DD日');

        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测评证书</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;700&display=swap');
        
        body {
            margin: 0;
            padding: 40px;
            font-family: 'Noto Serif SC', serif;
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
        
        .certificate::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border: 2px solid #1890FF;
            border-radius: 12px;
            pointer-events: none;
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
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #1890FF, #722ED1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        
        .qr-code {
            width: 100px;
            height: 100px;
        }
        
        .qr-code img {
            width: 100%;
            height: 100%;
        }
        
        .title-section {
            text-align: center;
            margin: 20px 0;
        }
        
        .main-title {
            font-size: 36px;
            color: #1890FF;
            font-weight: 700;
            margin: 0;
            letter-spacing: 4px;
        }
        
        .sub-title {
            font-size: 28px;
            color: #FFD700;
            font-weight: 700;
            margin: 10px 0;
            letter-spacing: 2px;
        }
        
        .english-title {
            font-size: 18px;
            color: #666;
            font-style: italic;
            margin: 5px 0;
        }
        
        .certificate-content {
            text-align: center;
            margin: 30px 0;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .student-info {
            font-size: 24px;
            line-height: 2;
            color: #333;
        }
        
        .student-name {
            color: #1890FF;
            font-weight: 700;
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
            font-weight: 700;
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
        
        .decorative-element {
            position: absolute;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #FFD700, #FFA502);
            border-radius: 50%;
            opacity: 0.3;
        }
        
        .decorative-element.top-left {
            top: 60px;
            left: 60px;
        }
        
        .decorative-element.top-right {
            top: 60px;
            right: 60px;
        }
        
        .decorative-element.bottom-left {
            bottom: 60px;
            left: 60px;
        }
        
        .decorative-element.bottom-right {
            bottom: 60px;
            right: 60px;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="watermark">贵阳教育</div>
        <div class="decorative-element top-left"></div>
        <div class="decorative-element top-right"></div>
        <div class="decorative-element bottom-left"></div>
        <div class="decorative-element bottom-right"></div>
        
        <div class="content">
            <div class="header">
                <div class="logo">贵阳</div>
                <div class="qr-code">
                    <img src="${qrCodeDataURL}" alt="验证二维码">
                </div>
            </div>
            
            <div class="title-section">
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
</body>
</html>`;
    }

    // 生成PDF证书
    async generateCertificatePDF(data) {
        const html = await this.generateCertificateHTML(data);
        const fileName = `certificate_${data.certNumber}.pdf`;
        const filePath = path.join(this.uploadDir, fileName);

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            await page.pdf({
                path: filePath,
                format: 'A4',
                landscape: true,
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });

            return {
                fileName,
                filePath,
                relativePath: `/uploads/certificates/${fileName}`
            };
        } finally {
            await browser.close();
        }
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
}

module.exports = new CertificateService();