const express = require('express');
const router = express.Router();
const QuestionBank = require('../models/QuestionBank');
const QuestionCategory = require('../models/QuestionCategory');
const ImportLog = require('../models/ImportLog');
const ConfigService = require('../services/configService');
const questionCodeService = require('../services/questionCodeService');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// Configuration endpoints - Get abilities
router.get('/config/abilities', authMiddleware, async (req, res) => {
  try {
    const abilities = ConfigService.getAbilities();
    res.json({ success: true, data: abilities });
  } catch (error) {
    console.error('Error fetching abilities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get knowledge points for a specific subject
router.get('/config/knowledge-points/:subject', authMiddleware, async (req, res) => {
  try {
    const knowledgePoints = ConfigService.getKnowledgePointsBySubject(req.params.subject);
    res.json({ success: true, data: knowledgePoints });
  } catch (error) {
    console.error('Error fetching knowledge points:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all knowledge points (for all subjects)
router.get('/config/knowledge-points', authMiddleware, async (req, res) => {
  try {
    const allKnowledgePoints = ConfigService.getAllKnowledgePoints();
    res.json({ success: true, data: allKnowledgePoints });
  } catch (error) {
    console.error('Error fetching all knowledge points:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get formatted scope text (将scope代码转换为中文显示)
// Query params: scopes - comma-separated scope values (e.g., "practice_municipal,practice_district_YY")
router.get('/config/scopes', authMiddleware, async (req, res) => {
  try {
    const { scopes } = req.query;
    if (!scopes) {
      return res.json({ success: true, data: {} });
    }

    const scopeList = Array.isArray(scopes) ? scopes : scopes.split(',');
    const { query } = require('../database/connection');
    const DISTRICT_CODES = require('../config/districts').DISTRICT_CODES;

    const result = {};

    for (const scope of scopeList) {
      const s = scope.trim();
      if (!s) continue;

      let text = s;

      if (s === 'assessment') {
        text = '测评题库';
      } else if (s === 'practice_municipal') {
        text = '市级练习';
      } else if (s.startsWith('practice_district_')) {
        // 区级练习 - practice_district_YY -> "区级练习-云岩区"
        const districtCode = s.replace('practice_district_', '');
        const district = DISTRICT_CODES[districtCode];
        text = district ? `区级练习-${district.name}` : s;
      } else if (s.startsWith('practice_school_')) {
        // 校级练习 - practice_school_1 -> "校级练习-贵阳市第一小学"
        const schoolId = parseInt(s.replace('practice_school_', ''));
        if (!isNaN(schoolId)) {
          const schoolResult = await query(
            'SELECT name FROM schools WHERE id = $1',
            [schoolId]
          );
          if (schoolResult.rows.length > 0) {
            text = `校级练习-${schoolResult.rows[0].name}`;
          }
        }
      } else if (s.startsWith('school_')) {
        // 学校 - school_1 -> "贵阳市第一小学"
        const schoolId = parseInt(s.replace('school_', ''));
        if (!isNaN(schoolId)) {
          const schoolResult = await query(
            'SELECT name FROM schools WHERE id = $1',
            [schoolId]
          );
          if (schoolResult.rows.length > 0) {
            text = schoolResult.rows[0].name;
          }
        }
      }

      result[s] = text;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching scope texts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all questions from the bank (支持 scope 过滤、区县筛选和权限控制)
router.get('/bank', authMiddleware, async (req, res) => {
  try {
    // 构建筛选条件
    const filters = {
      scope: req.query.scope, // 范围：assessment, practice_municipal, practice_district, practice_school
      district_code: req.query.district_code, // 区县代码（仅系统/市级管理员可用）
      subject: req.query.subject,
      grade: req.query.grade,
      difficulty: req.query.difficulty,
      type: req.query.type,
      level: req.query.level,
      status: req.query.status,
      search: req.query.search, // 搜索题目内容或编码
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    };

    // 构建用户信息（用于权限控制）
    const User = require('../models/User');
    const userDetail = await User.getDetailedProfile(req.user.id);

    const userInfo = {
      userRole: userDetail.admin?.permission_type || userDetail.role || 'teacher',
      districtId: userDetail.district_id || userDetail.teacher?.district_id,
      districtCode: userDetail.district_code || userDetail.teacher?.district_code,
      schoolId: userDetail.school_id || userDetail.teacher?.school_id
    };

    // 查询题目列表（带权限控制）
    const [questions, total] = await Promise.all([
      QuestionBank.findAll(filters, userInfo),
      QuestionBank.countAll(filters, userInfo)
    ]);

    res.json({
      success: true,
      data: questions,
      meta: {
        count: questions.length,
        total: total,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
        scope: filters.scope || 'all',
        district_code: filters.district_code || null
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's available scopes
router.get('/my-scopes', authMiddleware, async (req, res) => {
  try {
    // 🔧 使用 User.getDetailedProfile 获取用户详细信息
    const User = require('../models/User');
    const userDetail = await User.getDetailedProfile(req.user.id);

    const userInfo = {
      userRole: userDetail.admin?.permission_type || userDetail.role || 'teacher',
      districtId: userDetail.district_id || userDetail.teacher?.district_id || userDetail.admin?.district_id,
      districtCode: userDetail.district_code || userDetail.teacher?.district_code || userDetail.admin?.district_code,
      schoolId: userDetail.school_id || userDetail.teacher?.school_id || userDetail.admin?.school_id
    };

    // 🔧 调试日志：查看学校管理员的信息
    console.log('[DEBUG] /my-scopes userInfo:', JSON.stringify(userInfo, null, 2));

    const scopes = await QuestionBank.getAvailableScopes(userInfo);

    res.json({
      success: true,
      data: scopes,
      meta: {
        count: scopes.length,
        user_role: userInfo.userRole
      }
    });
  } catch (error) {
    console.error('Error fetching available scopes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search questions
router.get('/bank/search', authMiddleware, async (req, res) => {
  try {
    const { q, subject, grade } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: '请输入搜索关键词' });
    }

    const questions = await QuestionBank.searchQuestions(q, { subject, grade });
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error searching questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a single question by ID
// Supports both question_drafts.id (from POST /bank) and question_bank.id (published)
// Priority: question_drafts.id first (since POST /bank returns draft_id)
router.get('/bank/:id', authMiddleware, async (req, res) => {
  try {
    let question = null;
    const QuestionDraft = require('../models/QuestionDraft');

    // First try to find by question_drafts.id (since POST /bank returns draft_id)
    const draft = await QuestionDraft.findById(req.params.id);
    if (draft) {
      // Return draft - include is_published flag
      question = {
        ...draft,
        is_published: false,
        status: draft.status || 'draft'
      };
    }

    // If no draft found, try question_bank.id (for backwards compatibility with published questions)
    if (!question) {
      question = await QuestionBank.findById(req.params.id);
      if (question) {
        question.is_published = true;
      }
    }

    if (!question) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }

    res.json({ success: true, data: question });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a single question by code
router.get('/bank/code/:code', authMiddleware, async (req, res) => {
  try {
    const question = await questionCodeService.getQuestionByCode(req.params.code);

    if (!question) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }

    res.json({ success: true, data: question });
  } catch (error) {
    console.error('Error fetching question by code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Parse question code to get info
router.get('/code/parse/:code', authMiddleware, async (req, res) => {
  try {
    const codeInfo = questionCodeService.parseQuestionCode(req.params.code);
    res.json({ success: true, data: codeInfo });
  } catch (error) {
    console.error('Error parsing question code:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Create a new question (teacher/admin only)
router.post('/bank', authMiddleware, async (req, res) => {
  try {
    // Check if user is teacher or admin role
    const isTeacherOrAdmin = ['teacher', 'school_admin', 'district_admin',
      'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'].includes(req.user.role);

    if (!isTeacherOrAdmin) {
      return res.status(403).json({ success: false, error: '无权限：只有教师和管理员可以创建题目' });
    }

    const questionData = {
      ...req.body,
      created_by: req.user.id
    };

    // Validate question based on type
    const validationError = validateQuestion(questionData);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const question = await QuestionBank.create(questionData);
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a question (teacher/admin only, or question creator)
router.put('/bank/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is teacher or admin role
    const isTeacherOrAdmin = ['teacher', 'school_admin', 'district_admin',
      'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'].includes(req.user.role);

    if (!isTeacherOrAdmin) {
      return res.status(403).json({ success: false, error: '无权限：只有教师和管理员可以更新题目' });
    }

    // Get the existing question to check ownership
    const existingQuestion = await QuestionBank.findById(req.params.id);

    if (!existingQuestion) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }

    // Check permission: system_admin can update all, others can only update their own questions
    const isSystemAdmin = req.user.role === 'system_admin';
    const isCreator = existingQuestion.created_by === req.user.id;

    if (!isSystemAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        error: '无权限：您只能更新自己创建的题目。系统管理员可以更新所有题目。'
      });
    }

    // Validate question if type is being changed
    if (req.body.type) {
      const validationError = validateQuestion(req.body);
      if (validationError) {
        return res.status(400).json({ success: false, error: validationError });
      }
    }

    const question = await QuestionBank.update(req.params.id, req.body);

    res.json({ success: true, data: question });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a question (system_admin can delete all, others can only delete their own)
router.delete('/bank/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is teacher or admin role
    const isTeacherOrAdmin = ['teacher', 'school_admin', 'district_admin',
      'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'].includes(req.user.role);

    if (!isTeacherOrAdmin) {
      return res.status(403).json({ success: false, error: '无权限：只有教师和管理员可以删除题目' });
    }

    // Get the existing question to check ownership
    const existingQuestion = await QuestionBank.findById(req.params.id);

    if (!existingQuestion) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }

    // Check permission: system_admin can delete all, others can only delete their own questions
    const isSystemAdmin = req.user.role === 'system_admin';
    const isCreator = existingQuestion.created_by === req.user.id;

    if (!isSystemAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        error: '无权限：您只能删除自己创建的题目。系统管理员可以删除所有题目。'
      });
    }

    await QuestionBank.delete(req.params.id);

    res.json({ success: true, message: '题目删除成功' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add questions to an exam
router.post('/exam/:examId/questions', authMiddleware, async (req, res) => {
  try {
    // Check if user is teacher or admin role
    const isTeacherOrAdmin = ['teacher', 'school_admin', 'district_admin',
      'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'].includes(req.user.role);

    if (!isTeacherOrAdmin) {
      return res.status(403).json({ success: false, error: '无权限：只有教师和管理员可以添加题目到考试' });
    }

    const { questionIds, scores } = req.body;
    
    if (!questionIds || !Array.isArray(questionIds)) {
      return res.status(400).json({ success: false, error: '请提供题目ID列表' });
    }

    const questions = await QuestionBank.addToExam(req.params.examId, questionIds, scores);
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error adding questions to exam:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get questions for an exam
router.get('/exam/:examId/questions', authMiddleware, async (req, res) => {
  try {
    const questions = await QuestionBank.getExamQuestions(req.params.examId);
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error fetching exam questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import questions from file
router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    // Check if user is teacher or admin role
    const isTeacherOrAdmin = ['teacher', 'school_admin', 'district_admin',
      'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'].includes(req.user.role);

    if (!isTeacherOrAdmin) {
      return res.status(403).json({ success: false, error: '无权限：只有教师和管理员可以导入题目' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: '未上传文件' });
    }

    const batchId = uuidv4();
    const fileType = req.file.mimetype.includes('csv') ? 'csv' : 'excel';
    
    let questions = [];
    
    if (fileType === 'csv') {
      questions = await parseCSV(req.file.path);
    } else {
      questions = await parseExcel(req.file.path);
    }

    // Import questions and track results
    const results = await importQuestions(questions, req.user.id, batchId);
    
    // Log the import
    const importLog = await ImportLog.create({
      batch_id: batchId,
      file_name: req.file.originalname,
      file_type: fileType,
      total_rows: questions.length,
      successful_rows: results.successful,
      failed_rows: results.failed,
      error_details: results.errors,
      imported_by: req.user.id
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        batchId,
        totalRows: questions.length,
        successful: results.successful,
        failed: results.failed,
        errors: results.errors,
        importLog
      }
    });
  } catch (error) {
    console.error('Error importing questions:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get import template
router.get('/import/template', (req, res) => {
  const templatePath = path.join(__dirname, '../..', 'templates', 'question_template.csv');
  res.download(templatePath, 'question_import_template.csv', (err) => {
    if (err) {
      console.error('Error downloading template:', err);
      res.status(404).json({ success: false, error: '模板文件不存在' });
    }
  });
});

// Export questions to Excel/CSV
router.get('/export', authMiddleware, async (req, res) => {
  try {
    // 支持的导出格式：excel, csv
    const format = req.query.format || 'excel';
    if (!['excel', 'csv'].includes(format)) {
      return res.status(400).json({ success: false, error: '不支持的导出格式' });
    }

    // 构建筛选条件（与查询接口保持一致）
    const filters = {
      scope: req.query.scope,
      district_code: req.query.district_code,
      subject: req.query.subject,
      grade: req.query.grade,
      difficulty: req.query.difficulty,
      type: req.query.type,
      level: req.query.level,
      status: req.query.status,
      search: req.query.search,
      // 导出时不限制数量，获取所有符合条件的题目
      limit: 100000,
      offset: 0
    };

    // 构建用户信息（用于权限控制）
    const User = require('../models/User');
    const userDetail = await User.getDetailedProfile(req.user.id);

    const userInfo = {
      userRole: userDetail.admin?.permission_type || userDetail.role || 'teacher',
      districtId: userDetail.district_id || userDetail.teacher?.district_id,
      districtCode: userDetail.district_code || userDetail.teacher?.district_code,
      schoolId: userDetail.school_id || userDetail.teacher?.school_id
    };

    // 查询题目列表（带权限控制）
    const [questions] = await Promise.all([
      QuestionBank.findAll(filters, userInfo)
    ]);

    if (!questions || questions.length === 0) {
      return res.status(404).json({ success: false, error: '没有符合条件的题目' });
    }

    // 准备导出数据
    const exportData = questions.map(q => {
      // 解析JSON字段（数据库返回的可能是JSON字符串或已解析的对象）
      let options = [];
      try {
        options = typeof q.options === 'string' ? JSON.parse(q.options || '[]') : (q.options || []);
        if (!Array.isArray(options)) options = [];
      } catch (e) {
        options = [];
      }

      let tags = [];
      try {
        tags = typeof q.tags === 'string' ? JSON.parse(q.tags || '[]') : (q.tags || []);
        if (!Array.isArray(tags)) tags = [];
      } catch (e) {
        tags = [];
      }

      let abilities = [];
      try {
        abilities = typeof q.abilities === 'string' ? JSON.parse(q.abilities || '[]') : (q.abilities || []);
        if (!Array.isArray(abilities)) abilities = [];
      } catch (e) {
        abilities = [];
      }

      let knowledgePoints = [];
      try {
        knowledgePoints = typeof q.knowledge_points === 'string' ? JSON.parse(q.knowledge_points || '[]') : (q.knowledge_points || []);
        if (!Array.isArray(knowledgePoints)) knowledgePoints = [];
      } catch (e) {
        knowledgePoints = [];
      }

      // scope可能是字符串或数组
      let scopeValue = '';
      if (Array.isArray(q.scope)) {
        scopeValue = q.scope.join(', ');
      } else if (q.scope) {
        scopeValue = String(q.scope);
      }

      let correctAnswer = q.correct_answer;
      try {
        if (typeof q.correct_answer === 'string') {
          correctAnswer = JSON.parse(q.correct_answer || 'null');
        } else {
          correctAnswer = q.correct_answer;
        }
      } catch (e) {
        correctAnswer = q.correct_answer;
      }

      return {
        '题目编码': q.question_code || '',
        '题型': getQuestionTypeText(q.type),
        '科目': q.subject || '',
        '年级': q.grade || '',
        '级别': q.level || '',
        '题目内容': q.content || '',
        '选项': Array.isArray(options) ? options.join(' | ') : '',
        '正确答案': formatCorrectAnswer(correctAnswer, q.type),
        '解析': q.explanation || '',
        '难度': getDifficultyText(q.difficulty),
        '分值': q.score || q.suggested_score || 0,
        '标签': Array.isArray(tags) ? tags.join(', ') : '',
        '能力': Array.isArray(abilities) ? abilities.join(', ') : '',
        '知识点': Array.isArray(knowledgePoints) ? knowledgePoints.join(', ') : '',
        '题库范围': scopeValue,
        '出题人': q.creator_name || '',
        '审核人': q.reviewer_name || '',
        '使用次数': q.usage_count || 0,
        '创建时间': q.created_at ? new Date(q.created_at).toLocaleString('zh-CN') : ''
      };
    });

    // 生成文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = format === 'excel'
      ? `题目导出_${timestamp}.xlsx`
      : `题目导出_${timestamp}.csv`;

    if (format === 'excel') {
      // 生成Excel文件（支持多个Sheet）
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '题目列表');

      // 设置列宽
      worksheet['!cols'] = [
        { wch: 15 }, // 题目编码
        { wch: 10 }, // 题型
        { wch: 10 }, // 科目
        { wch: 10 }, // 年级
        { wch: 8 },  // 级别
        { wch: 50 }, // 题目内容
        { wch: 30 }, // 选项
        { wch: 20 }, // 正确答案
        { wch: 30 }, // 解析
        { wch: 10 }, // 难度
        { wch: 8 },  // 分值
        { wch: 20 }, // 标签
        { wch: 20 }, // 能力
        { wch: 20 }, // 知识点
        { wch: 30 }, // 题库范围
        { wch: 15 }, // 出题人
        { wch: 15 }, // 审核人
        { wch: 10 }, // 使用次数
        { wch: 20 } // 创建时间
      ];

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(buffer);
    } else {
      // 生成CSV文件
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      // 添加UTF-8 BOM以确保Excel正确显示中文
      res.send('\uFEFF' + csv);
    }

    console.log(`Export successful: ${questions.length} questions exported as ${format}`);
  } catch (error) {
    console.error('Error exporting questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions for export
function getQuestionTypeText(type) {
  const types = {
    single: '单选题',
    multiple: '多选题',
    blank: '填空题',
    true_false: '判断题',
    essay: '问答题',
    code: '编程题',
    matching: '匹配题'
  };
  return types[type] || type;
}

function getDifficultyText(difficulty) {
  const texts = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  };
  return texts[difficulty] || difficulty;
}

function formatCorrectAnswer(answer, type) {
  if (answer === null || answer === undefined || answer === '') return '';

  switch (type) {
  case 'multiple':
    if (Array.isArray(answer)) return answer.join(', ');
    if (typeof answer === 'string') return answer;
    return String(answer);
  case 'blank':
    if (Array.isArray(answer)) return answer.join(' | ');
    if (typeof answer === 'string') return answer;
    return String(answer);
  case 'true_false':
    if (typeof answer === 'boolean') return answer ? '正确' : '错误';
    if (answer === 'true' || answer === 't') return '正确';
    if (answer === 'false' || answer === 'f') return '错误';
    return String(answer);
  case 'single':
    // 答案可能是 A, B, C, D 或索引 0, 1, 2, 3
    if (typeof answer === 'number') {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      return letters[answer] || String(answer);
    }
    return String(answer);
  default:
    return typeof answer === 'object' ? JSON.stringify(answer) : String(answer);
  }
}

// Question Categories Routes

// Get all categories
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const categories = await QuestionCategory.findAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get category hierarchy
router.get('/categories/hierarchy', authMiddleware, async (req, res) => {
  try {
    const hierarchy = await QuestionCategory.getHierarchy();
    res.json({ success: true, data: hierarchy });
  } catch (error) {
    console.error('Error fetching category hierarchy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new category
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    // Check if user is teacher or admin role
    const isTeacherOrAdmin = ['teacher', 'school_admin', 'district_admin',
      'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'].includes(req.user.role);

    if (!isTeacherOrAdmin) {
      return res.status(403).json({ success: false, error: '无权限：只有教师和管理员可以创建分类' });
    }

    const category = await QuestionCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to validate questions
function validateQuestion(question) {
  const { type, content, correct_answer } = question;

  if (!type || !content) {
    return '题目类型和内容不能为空';
  }

  switch (type) {
  case 'single':
    if (!question.options || question.options.length < 2) {
      return '单选题必须至少有2个选项';
    }
    if (!correct_answer) {
      return '单选题必须有正确答案';
    }
    break;

  case 'multiple':
    if (!question.options || question.options.length < 2) {
      return '多选题必须至少有2个选项';
    }
    if (!correct_answer || !Array.isArray(correct_answer) || correct_answer.length === 0) {
      return '多选题必须至少有一个正确答案';
    }
    break;

  case 'blank':
    if (!correct_answer || (Array.isArray(correct_answer) && correct_answer.length === 0)) {
      return '填空题必须至少有一个正确答案';
    }
    break;

  case 'true_false':
    if (typeof correct_answer !== 'boolean') {
      return '判断题的正确答案必须是布尔值';
    }
    break;

  case 'essay':
  case 'code':
    // These don't require a correct answer as they're manually graded
    break;

  default:
    return '无效的题目类型';
  }

  return null;
}

// Helper function to parse CSV
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const questions = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        questions.push(parseQuestionRow(row));
      })
      .on('end', () => resolve(questions))
      .on('error', reject);
  });
}

// Helper function to parse Excel
async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return data.map(parseQuestionRow);
}

// Helper function to parse question row
function parseQuestionRow(row) {
  const question = {
    type: row.type || row['题型'] || 'single',
    subject: row.subject || row['科目'],
    grade: row.grade || row['年级'],
    content: row.content || row['题目内容'],
    difficulty: row.difficulty || row['难度'] || 'medium',
    explanation: row.explanation || row['解析'],
    score: parseInt(row.score || row['分值']) || 1,
    tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
    abilities: row.abilities || row['能力'] ? (row.abilities || row['能力']).split(',').map(a => a.trim()) : [],
    knowledge_points: row.knowledge_points || row['知识点'] ? (row.knowledge_points || row['知识点']).split(',').map(k => k.trim()) : []
  };

  // Parse options and correct answer based on type
  if (row.options || row['选项']) {
    const optionsStr = row.options || row['选项'];
    question.options = optionsStr.split('|').map(o => o.trim());
  }

  const answerStr = row.correct_answer || row['正确答案'];

  switch (question.type) {
  case 'multiple':
    question.correct_answer = answerStr ? answerStr.split(',').map(a => a.trim()) : [];
    break;
  case 'blank':
    question.correct_answer = answerStr ? answerStr.split('|').map(a => a.trim()) : [];
    break;
  case 'true_false':
    question.correct_answer = answerStr?.toLowerCase() === 'true' || answerStr === '正确';
    break;
  default:
    question.correct_answer = answerStr;
  }

  return question;
}

// Helper function to import questions
async function importQuestions(questions, userId, batchId) {
  let successful = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < questions.length; i++) {
    try {
      const question = questions[i];
      question.created_by = userId;
      question.import_batch_id = batchId;

      const validationError = validateQuestion(question);
      if (validationError) {
        throw new Error(validationError);
      }

      await QuestionBank.create(question);
      successful++;
    } catch (error) {
      failed++;
      errors.push({
        row: i + 1,
        error: error.message
      });
    }
  }

  return { successful, failed, errors };
}

module.exports = router;