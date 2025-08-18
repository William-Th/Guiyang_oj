const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  generateCertificate,
  downloadCertificate,
  verifyCertificate,
  getStudentCertificates,
  getExamCertificates,
  batchGenerateCertificates,
  getCertificateStatistics
} = require('../controllers/certificateController');

// 公开路由：证书验证（无需登录）
router.get('/verify/:certNumber', verifyCertificate);

// 公开路由：证书下载（无需登录，通过证书编号）
router.get('/download/:certNumber', downloadCertificate);

// 需要登录的路由
router.use(auth);

// 生成单个证书
router.post('/generate/:studentExamId', generateCertificate);

// 获取学生证书列表
router.get('/student/:studentId', getStudentCertificates);

// 获取考试证书列表（教师/管理员）
router.get('/exam/:examId', getExamCertificates);

// 批量生成证书（教师/管理员）
router.post('/batch/:examId', batchGenerateCertificates);

// 获取证书统计信息（教师/管理员）
router.get('/statistics', getCertificateStatistics);

module.exports = router;