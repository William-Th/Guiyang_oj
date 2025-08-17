const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');

// 公开的证书验证端点（无需认证）
router.get('/verify/:certNumber', async (req, res) => {
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
                download_url: `/uploads/certificates/certificate_${certificate.cert_no}.html`,
                verify_url: `/api/certificate/verify/${certificate.cert_no}`
            }
        });

    } catch (error) {
        console.error('创建测试证书失败:', error);
        res.status(500).json({ message: '创建测试证书失败', error: error.message });
    }
});

module.exports = router;