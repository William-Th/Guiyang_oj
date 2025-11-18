const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/achievements');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳_随机数.扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'achievement-' + uniqueSuffix + ext);
  }
});

// 文件过滤器 - 只允许图片
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif, webp)'));
  }
};

// 配置multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

/**
 * 上传成就图标
 * POST /api/upload/achievement-icon
 * 需要管理员权限
 */
router.post('/achievement-icon', authMiddleware, upload.single('icon'), async (req, res) => {
  try {
    // 权限检查
    const allowedRoles = ['system_admin', 'municipal_admin'];
    if (!allowedRoles.includes(req.user.role)) {
      // 删除已上传的文件
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: '没有权限上传图标'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未选择文件'
      });
    }

    // 返回文件URL路径
    const fileUrl = `/uploads/achievements/${req.file.filename}`;

    logger.info('Achievement icon uploaded', {
      userId: req.user.id,
      filename: req.file.filename,
      size: req.file.size
    });

    res.json({
      success: true,
      message: '图标上传成功',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size
      }
    });
  } catch (error) {
    logger.error('Upload achievement icon error:', error);

    // 删除已上传的文件
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        logger.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || '上传失败'
    });
  }
});

/**
 * 删除成就图标
 * DELETE /api/upload/achievement-icon/:filename
 * 需要管理员权限
 */
router.delete('/achievement-icon/:filename', authMiddleware, async (req, res) => {
  try {
    // 权限检查
    const allowedRoles = ['system_admin', 'municipal_admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '没有权限删除图标'
      });
    }

    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 删除文件
    fs.unlinkSync(filePath);

    logger.info('Achievement icon deleted', {
      userId: req.user.id,
      filename
    });

    res.json({
      success: true,
      message: '图标删除成功'
    });
  } catch (error) {
    logger.error('Delete achievement icon error:', error);
    res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
});

module.exports = router;
