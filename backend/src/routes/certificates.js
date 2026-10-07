const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const {
  generateCertificate,
  downloadCertificatePDF,
  verifyCertificate,
  getStudentCertificates,
  getExamCertificates,
  batchGenerateCertificates,
  getCertificateStatistics
} = require('../controllers/certificateController');
const designController = require('../controllers/certificateDesignController');

// 公开路由：证书验证（无需登录）
router.get('/verify/:certNumber', verifyCertificate);

// 公开路由：证书下载为PDF（无需登录，通过证书编号）
router.get('/download/:certNumber', downloadCertificatePDF);

// 需要登录的路由
router.use(authMiddleware);

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

// ---------- 证书自定义设计（管理端） ----------
router.get('/designs', requireAdmin, designController.list);
router.post('/designs', requireAdmin, designController.create);
router.get('/designs/:id/preview', requireAdmin, designController.preview);
router.put('/designs/:id', requireAdmin, designController.update);
router.put('/designs/:id/default', requireAdmin, designController.setDefault);
router.delete('/designs/:id', requireAdmin, designController.remove);

module.exports = router;