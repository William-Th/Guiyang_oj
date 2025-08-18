const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const path = require('path');
const fs = require('fs').promises;

// 简单的内存存储限速器
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15分钟
const MAX_ATTEMPTS = 10; // 15分钟内最多10次验证

// 清理过期的限速记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.firstAttempt > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000); // 每5分钟清理一次

// 限速中间件
const verifyRateLimit = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, {
      count: 1,
      firstAttempt: now
    });
    return next();
  }
  
  const data = rateLimitMap.get(clientIP);
  
  // 如果超过时间窗口，重置计数
  if (now - data.firstAttempt > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(clientIP, {
      count: 1,
      firstAttempt: now
    });
    return next();
  }
  
  // 检查是否超过限制
  if (data.count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      valid: false,
      message: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - data.firstAttempt)) / 1000)
    });
  }
  
  // 增加计数
  data.count++;
  next();
};

// 公开的证书下载端点（无需认证）
router.get('/download/:certNumber', async (req, res) => {
  try {
    const { certNumber } = req.params;
    
    // 验证证书是否存在于数据库
    const certificate = await Certificate.findByCertNumber(certNumber);
    if (!certificate) {
      return res.status(404).json({ message: '证书不存在' });
    }

    // 构建文件路径
    const filePath = path.join(__dirname, '../../uploads/certificates', `certificate_${certNumber}.html`);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: '证书文件不存在' });
    }

    // 设置响应头并发送文件
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="certificate_${certNumber}.html"`);
    res.sendFile(filePath);

  } catch (error) {
    console.error('下载证书失败:', error);
    res.status(500).json({ message: '下载证书失败', error: error.message });
  }
});

// 公开的证书验证端点（无需认证）- 带限速保护
router.get('/verify/:certNumber', verifyRateLimit, async (req, res) => {
  try {
    const { certNumber } = req.params;
        
    const result = await Certificate.verifyCertificate(certNumber);
        
    if (!result.valid) {
      return res.status(404).json({ 
        valid: false, 
        message: result.message 
      });
    }

    res.json({
      valid: true,
      message: '证书验证成功',
      certificate: result.certificate
    });

  } catch (error) {
    console.error('验证证书失败:', error);
    res.status(500).json({ message: '验证证书失败', error: error.message });
  }
});

// 测试用的创建证书端点
router.post('/test/create', async (req, res) => {
  try {
    const certificateService = require('../services/certificateService_basic');
        
    // 创建测试证书数据
    const testData = {
      studentName: '张三',
      examName: '2025年春季数学能力测评',
      examDate: new Date('2025-03-15'),
      score: 85,
      certNumber: certificateService.generateCertNumber(),
      issueDate: new Date()
    };

    // 生成证书文件
    const fileResult = await certificateService.generateCertificateFile(testData);
    const gradeInfo = certificateService.getGradeLevel(testData.score);

    // 保存到数据库
    const certificate = await Certificate.create({
      student_id: 4, // 使用存在的学生ID
      exam_id: 1,    // 使用存在的考试ID
      cert_no: testData.certNumber,
      issue_date: testData.issueDate,
      level: gradeInfo.level,
      file_url: fileResult.relativePath,
      score: testData.score
    });

    res.json({
      message: '测试证书创建成功',
      certificate: {
        ...certificate,
        download_url: `/api/certificate/download/${certificate.cert_no}`,
        verify_url: `/api/certificate/verify/${certificate.cert_no}`
      }
    });

  } catch (error) {
    console.error('创建测试证书失败:', error);
    res.status(500).json({ message: '创建测试证书失败', error: error.message });
  }
});

module.exports = router;