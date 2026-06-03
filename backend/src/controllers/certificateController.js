const Certificate = require('../models/Certificate');
const StudentExam = require('../models/StudentExam');
const Activity = require('../models/Activity');
const User = require('../models/User');
const certificateService = require('../services/certificateService_basic');


// 生成证书
const generateCertificate = async (req, res) => {
  try {
    const { studentExamId } = req.params;
    const currentUser = req.user;

    // 获取学生考试记录
    const studentExam = await StudentExam.findById(studentExamId);
    if (!studentExam) {
      return res.status(404).json({ message: '考试记录不存在' });
    }

    // 权限检查：只有教师/管理员或学生本人可以生成证书
    if (currentUser.role === 'student' && currentUser.id !== studentExam.student_id) {
      return res.status(403).json({ message: '权限不足' });
    }

    // 检查考试是否已完成
    if (studentExam.status !== 'completed') {
      return res.status(400).json({ message: '考试尚未完成，无法生成证书' });
    }

    // 检查是否已有证书
    const existingCert = await Certificate.findByStudentAndExam(
      studentExam.student_id, 
      studentExam.exam_id
    );
    if (existingCert) {
      return res.status(409).json({ 
        message: '证书已存在',
        certificate: existingCert 
      });
    }

    // 获取学生和活动信息
    const student = await User.findById(studentExam.student_id);
    const exam = await Activity.findById(studentExam.exam_id);
        
    if (!student || !exam) {
      return res.status(404).json({ message: '学生或考试信息不存在' });
    }

    // 生成证书数据
    const certificateData = await certificateService.createCertificateData(
      student, 
      exam, 
      studentExam.score
    );

    // 生成证书文件 (HTML for verification, PDF for download)  
    const fileResult = await certificateService.generateCertificateFile(certificateData);
    
    // Generate PDF version using the new PDF service
    const pdfService = require('../services/pdfCertificateService');
    try {
      await pdfService.generatePDF(certificateData);
    } catch (pdfError) {
      console.warn('PDF generation failed, continuing with HTML only:', pdfError);
    }

    // 获取等级信息
    const gradeInfo = certificateService.getGradeLevel(studentExam.score);

    // 保存证书记录到数据库
    const certificate = await Certificate.create({
      student_id: studentExam.student_id,
      exam_id: studentExam.exam_id,
      cert_no: certificateData.certNumber,
      issue_date: certificateData.issueDate,
      level: gradeInfo.level,
      file_url: fileResult.relativePath,
      score: studentExam.score
    });

    res.status(201).json({
      message: '证书生成成功',
      certificate: {
        ...certificate,
        download_url: `/api/certificates/download/${certificate.cert_no}`
      }
    });

  } catch (error) {
    console.error('生成证书失败:', error);
    res.status(500).json({ message: '生成证书失败' });
  }
};

// 下载证书 (HTML格式，动态生成)
const downloadCertificate = async (req, res) => {
  try {
    const { certNumber } = req.params;

    // 验证证书编号格式 - 防止路径遍历攻击
    if (!/^[A-Z0-9_-]+$/.test(certNumber)) {
      return res.status(400).json({ message: '无效的证书编号格式' });
    }

    const certificate = await Certificate.findByCertNumber(certNumber);
    if (!certificate) {
      return res.status(404).json({ message: '证书不存在' });
    }

    // 获取详情
    const { pool } = require('../database/connection');
    const detailResult = await pool.query(`
      SELECT u.real_name AS student_name, a.title AS exam_name, sa.score
      FROM certificates c
      LEFT JOIN students s ON c.student_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN activities a ON c.exam_id = a.id
      LEFT JOIN student_activities sa ON sa.student_id = c.student_id AND sa.activity_id = c.exam_id
      WHERE c.cert_no = $1
    `, [certNumber]);

    const detail = detailResult.rows[0] || {};

    const pdfService = require('../services/pdfCertificateService');
    const htmlContent = pdfService.generateCertificateHTML({
      certNumber: certNumber,
      studentName: detail.student_name || '学生',
      examName: detail.exam_name || '测评活动',
      score: detail.score || 0,
      issueDate: certificate.issue_date || new Date()
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${certNumber}.html"`);
    res.send(htmlContent);

  } catch (error) {
    console.error('下载证书失败:', error);
    res.status(500).json({ message: '下载证书失败' });
  }
};

// 下载证书 (PDF格式，动态生成)
const downloadCertificatePDF = async (req, res) => {
  try {
    const { certNumber } = req.params;

    // 验证证书编号格式 - 防止路径遍历攻击
    if (!/^[A-Z0-9_-]+$/.test(certNumber)) {
      return res.status(400).json({ message: '无效的证书编号格式' });
    }

    const certificate = await Certificate.findByCertNumber(certNumber);
    if (!certificate) {
      return res.status(404).json({ message: '证书不存在' });
    }

    // 获取学生和活动信息
    const { pool } = require('../database/connection');
    const detailResult = await pool.query(`
      SELECT
        u.real_name AS student_name,
        a.title AS exam_name,
        c.level,
        sa.score
      FROM certificates c
      LEFT JOIN students s ON c.student_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN activities a ON c.exam_id = a.id
      LEFT JOIN student_activities sa ON sa.student_id = c.student_id AND sa.activity_id = c.exam_id
      WHERE c.cert_no = $1
    `, [certNumber]);

    const detail = detailResult.rows[0] || {};

    // 使用 PDFKit 动态生成 PDF
    const pdfService = require('../services/pdfCertificateService');
    const pdfBuffer = await pdfService.generatePDFBuffer({
      certNumber: certNumber,
      studentName: detail.student_name || '学生',
      examName: detail.exam_name || '测评活动',
      score: detail.score || 0,
      issueDate: certificate.issue_date || new Date()
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${certNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('下载证书失败:', error);
    res.status(500).json({ message: '下载证书失败' });
  }
};

// 验证证书
const verifyCertificate = async (req, res) => {
  try {
    const { certNumber } = req.params;
    
    // 验证证书编号格式 - 防止路径遍历攻击
    if (!/^GY-\d{4}-[A-Z0-9]{8}$/.test(certNumber)) {
      return res.status(400).json({ message: '无效的证书编号格式' });
    }
        
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
    res.status(500).json({ message: '验证证书失败' });
  }
};

// 获取学生证书列表
const getStudentCertificates = async (req, res) => {
  try {
    const currentUser = req.user;
    const { studentId } = req.params;

    // 权限检查
    if (currentUser.role === 'student' && currentUser.id.toString() !== studentId) {
      return res.status(403).json({ message: '权限不足' });
    }

    const certificates = await Certificate.findByStudentId(studentId);
        
    res.json({
      message: '获取证书列表成功',
      certificates: certificates.map(cert => ({
        ...cert,
        download_url: `/api/certificates/download/${cert.cert_no}`,
        verify_url: `/api/certificates/verify/${cert.cert_no}`
      }))
    });

  } catch (error) {
    console.error('获取学生证书失败:', error);
    res.status(500).json({ message: '获取学生证书失败' });
  }
};

// 获取考试证书列表（教师/管理员）
const getExamCertificates = async (req, res) => {
  try {
    const { examId } = req.params;
    const currentUser = req.user;

    // 权限检查：只有教师和管理员可以查看
    if (!['teacher', 'admin'].includes(currentUser.role)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const certificates = await Certificate.findByExamId(examId);
        
    res.json({
      message: '获取考试证书列表成功',
      certificates: certificates.map(cert => ({
        ...cert,
        download_url: `/api/certificates/download/${cert.cert_no}`,
        verify_url: `/api/certificates/verify/${cert.cert_no}`
      }))
    });

  } catch (error) {
    console.error('获取考试证书失败:', error);
    res.status(500).json({ message: '获取考试证书失败' });
  }
};

// 批量生成证书
const batchGenerateCertificates = async (req, res) => {
  try {
    const { examId } = req.params;
    const currentUser = req.user;

    // 权限检查：只有教师和管理员可以批量生成
    if (!['teacher', 'admin'].includes(currentUser.role)) {
      return res.status(403).json({ message: '权限不足' });
    }

    // 获取活动信息
    const exam = await Activity.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: '活动不存在' });
    }

    // 获取已完成的学生考试记录
    const studentExams = await StudentExam.findByExamId(examId);
    const completedExams = studentExams.filter(se => se.status === 'completed');

    if (completedExams.length === 0) {
      return res.status(400).json({ message: '没有已完成的考试记录' });
    }

    const results = {
      total: completedExams.length,
      generated: 0,
      skipped: 0,
      errors: []
    };

    for (const studentExam of completedExams) {
      try {
        // 检查是否已有证书
        const existingCert = await Certificate.findByStudentAndExam(
          studentExam.student_id, 
          studentExam.exam_id
        );
                
        if (existingCert) {
          results.skipped++;
          continue;
        }

        // 获取学生信息
        const student = await User.findById(studentExam.student_id);
        if (!student) {
          results.errors.push({
            studentId: studentExam.student_id,
            error: '学生信息不存在'
          });
          continue;
        }

        // 生成证书
        const certificateData = await certificateService.createCertificateData(
          student, 
          exam, 
          studentExam.score
        );

        const fileResult = await certificateService.generateCertificateFile(certificateData);
        const gradeInfo = certificateService.getGradeLevel(studentExam.score);

        await Certificate.create({
          student_id: studentExam.student_id,
          exam_id: studentExam.exam_id,
          cert_no: certificateData.certNumber,
          issue_date: certificateData.issueDate,
          level: gradeInfo.level,
          file_url: fileResult.relativePath,
          score: studentExam.score
        });

        results.generated++;

      } catch (error) {
        results.errors.push({
          studentId: studentExam.student_id,
          error: error.message
        });
      }
    }

    res.json({
      message: '批量生成证书完成',
      results
    });

  } catch (error) {
    console.error('批量生成证书失败:', error);
    res.status(500).json({ message: '批量生成证书失败' });
  }
};

// 获取证书统计信息
const getCertificateStatistics = async (req, res) => {
  try {
    const { examId } = req.query;
    const currentUser = req.user;

    // 权限检查：只有教师和管理员可以查看统计
    if (!['teacher', 'admin'].includes(currentUser.role)) {
      return res.status(403).json({ message: '权限不足' });
    }

    const statistics = await Certificate.getStatistics(examId);
        
    res.json({
      message: '获取证书统计成功',
      statistics: {
        ...statistics,
        excellent_rate: statistics.total_certificates > 0 ? 
          (statistics.excellent_count / statistics.total_certificates * 100).toFixed(2) : 0,
        pass_rate: statistics.total_certificates > 0 ? 
          ((statistics.excellent_count + statistics.good_count + statistics.pass_count) / 
                     statistics.total_certificates * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('获取证书统计失败:', error);
    res.status(500).json({ message: '获取证书统计失败' });
  }
};

module.exports = {
  generateCertificate,
  downloadCertificate,
  downloadCertificatePDF,
  verifyCertificate,
  getStudentCertificates,
  getExamCertificates,
  batchGenerateCertificates,
  getCertificateStatistics
};