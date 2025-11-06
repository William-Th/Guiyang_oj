/**
 * Student Registration Routes
 * 学生注册申请和审核管理路由
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../database/connection');
const bcrypt = require('bcryptjs');
const ConfigService = require('../services/configService');
const logger = require('../utils/logger');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/registration/student
 * 学生注册申请
 *
 * Request Body:
 * {
 *   phone: string,        // 11位手机号
 *   realName: string,     // 真实姓名
 *   birthDate: string,    // 出生日期 (YYYY-MM-DD)
 *   idCardLast4: string,  // 身份证后4位
 *   districtCode: string, // 区县代码
 *   schoolCode: string,   // 学校代码
 *   grade: string         // 年级
 * }
 */
router.post('/student', async (req, res) => {
  const {
    phone,
    realName,
    birthDate,
    idCardLast4,
    districtCode,
    schoolCode,
    grade
  } = req.body;

  try {
    // 1. 输入验证
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确，必须是11位数字且以1开头'
      });
    }

    if (!realName || realName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: '姓名不能为空，且至少2个字符'
      });
    }

    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return res.status(400).json({
        success: false,
        message: '出生日期格式不正确，格式应为YYYY-MM-DD'
      });
    }

    if (!idCardLast4 || !/^\d{4}$/.test(idCardLast4)) {
      return res.status(400).json({
        success: false,
        message: '身份证后4位格式不正确，必须是4位数字'
      });
    }

    if (!districtCode) {
      return res.status(400).json({
        success: false,
        message: '请选择区县'
      });
    }

    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: '请选择学校'
      });
    }

    // 2. 验证配置文件中的区县和学校是否存在
    if (!ConfigService.isValidDistrictCode(districtCode)) {
      return res.status(400).json({
        success: false,
        message: '选择的区县不存在'
      });
    }

    if (!ConfigService.isValidSchoolCode(schoolCode)) {
      return res.status(400).json({
        success: false,
        message: '选择的学校不存在'
      });
    }

    // 3. 验证学校是否属于所选区县
    if (!ConfigService.isSchoolInDistrict(schoolCode, districtCode)) {
      return res.status(400).json({
        success: false,
        message: '选择的学校不属于所选区县'
      });
    }

    // 4. 检查手机号是否已注册
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该手机号已被注册'
      });
    }

    // 5. 检查是否已有待审核的申请
    const existingRequest = await pool.query(
      'SELECT id FROM student_registration_requests WHERE phone = $1 AND status = $2',
      [phone, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '您的注册申请正在审核中，请耐心等待'
      });
    }

    // 6. 获取区县和学校的详细信息
    const district = ConfigService.getDistrictByCode(districtCode);
    const school = ConfigService.getSchoolByCode(schoolCode);

    // 7. 查询学校和区县的数据库ID
    const districtResult = await pool.query(
      'SELECT id FROM districts WHERE code = $1',
      [districtCode]
    );

    const schoolResult = await pool.query(
      'SELECT id FROM schools WHERE code = $1',
      [schoolCode]
    );

    const districtId = districtResult.rows[0]?.id || null;
    const schoolId = schoolResult.rows[0]?.id || null;

    // 8. 创建注册申请记录
    const insertResult = await pool.query(
      `INSERT INTO student_registration_requests (
        phone, real_name, birth_date, id_card_last4,
        district_id, district_code, district_name,
        school_id, school_code, school_name, grade,
        status, current_reviewer_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        phone,
        realName,
        birthDate,
        idCardLast4,
        districtId,
        districtCode,
        district.name,
        schoolId,
        schoolCode,
        school.name,
        grade || null,
        'pending',
        2 // 初始审核层级为校级管理员
      ]
    );

    const requestId = insertResult.rows[0].id;

    // 9. 记录审核日志
    await pool.query(
      'SELECT log_registration_action($1, $2, $3, $4, $5, $6)',
      [
        requestId,
        'submitted',
        null, // 学生自己提交，没有操作人
        0,    // 系统级别
        `学生${realName}提交注册申请`,
        JSON.stringify({ phone, school: school.name })
      ]
    );

    logger.info('Student registration request submitted', {
      requestId,
      phone,
      realName,
      school: school.name
    });

    res.status(201).json({
      success: true,
      message: '注册申请已提交，请等待学校管理员审核',
      data: {
        id: requestId,
        estimatedReviewTime: '3个工作日内'
      }
    });
  } catch (error) {
    logger.error('Error submitting student registration', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: '提交注册申请失败，请稍后重试'
    });
  }
});

/**
 * GET /api/registration/config/districts
 * 获取所有区县配置
 */
router.get('/config/districts', (req, res) => {
  try {
    const config = ConfigService.getDistricts();
    res.json({
      success: true,
      data: config.districts || []
    });
  } catch (error) {
    logger.error('Error fetching districts config', { error: error.message });
    res.status(500).json({
      success: false,
      message: '获取区县配置失败'
    });
  }
});

/**
 * GET /api/registration/config/schools/:districtCode
 * 获取指定区县的学校列表
 */
router.get('/config/schools/:districtCode', (req, res) => {
  try {
    const { districtCode } = req.params;
    const schools = ConfigService.getSchoolsByDistrict(districtCode);

    res.json({
      success: true,
      data: schools
    });
  } catch (error) {
    logger.error('Error fetching schools by district', {
      error: error.message,
      districtCode: req.params.districtCode
    });

    res.status(500).json({
      success: false,
      message: '获取学校列表失败'
    });
  }
});

/**
 * GET /api/registration/status/:phone
 * 查询注册申请状态（学生用）
 */
router.get('/status/:phone', async (req, res) => {
  try {
    const { phone } = req.params;

    const result = await pool.query(
      `SELECT
        id, phone, real_name, school_name, grade,
        status, current_reviewer_level,
        submitted_at, reviewed_at, review_comment
      FROM student_registration_requests
      WHERE phone = $1
      ORDER BY submitted_at DESC
      LIMIT 1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到注册申请记录'
      });
    }

    const request = result.rows[0];
    const statusMap = {
      pending: '审核中',
      approved: '已批准',
      rejected: '已拒绝'
    };

    res.json({
      success: true,
      data: {
        ...request,
        statusText: statusMap[request.status] || request.status
      }
    });
  } catch (error) {
    logger.error('Error fetching registration status', {
      error: error.message,
      phone: req.params.phone
    });

    res.status(500).json({
      success: false,
      message: '查询申请状态失败'
    });
  }
});

/**
 * GET /api/registration/admin/requests
 * 获取待审核申请列表（管理员用）
 * 需要认证中间件
 */
router.get('/admin/requests', authMiddleware, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    // 从JWT token获取管理员信息
    const adminUser = req.user;
    const { role, id: userId } = adminUser;

    // 根据管理员角色构建查询条件
    let whereClause = 'WHERE status = $1';
    const queryParams = [status];
    let paramIndex = 2;

    // 添加搜索条件（支持按手机号或姓名搜索）
    if (search && search.trim()) {
      whereClause += ` AND (phone LIKE $${paramIndex} OR real_name LIKE $${paramIndex})`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // 校级管理员只能看到自己学校的注册申请
    if (role === 'school_admin') {
      // 查询管理员所属学校
      const adminPermResult = await pool.query(
        'SELECT school_id FROM admin_permissions WHERE user_id = $1',
        [userId]
      );

      if (adminPermResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '未找到学校权限信息'
        });
      }

      const schoolId = adminPermResult.rows[0].school_id;

      // 获取学校代码
      const schoolResult = await pool.query(
        'SELECT code FROM schools WHERE id = $1',
        [schoolId]
      );

      if (schoolResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '学校信息不存在'
        });
      }

      const schoolCode = schoolResult.rows[0].code;
      whereClause += ` AND school_code = $${paramIndex}`;
      queryParams.push(schoolCode);
      paramIndex++;
    }
    // 区级管理员只能看到本区已超时3天的申请
    else if (role === 'district_admin') {
      // 查询管理员所属区县
      const adminPermResult = await pool.query(
        'SELECT district_id FROM admin_permissions WHERE user_id = $1',
        [userId]
      );

      if (adminPermResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '未找到区县权限信息'
        });
      }

      const districtId = adminPermResult.rows[0].district_id;

      // 过滤条件：属于该区县 AND 已超过3天
      whereClause += ` AND district_id = $${paramIndex}`;
      queryParams.push(districtId);
      paramIndex++;

      whereClause += ' AND (submitted_at + INTERVAL \'3 days\' < CURRENT_TIMESTAMP OR last_escalated_at + INTERVAL \'3 days\' < CURRENT_TIMESTAMP)';
    }
    // 市级/系统管理员可以看到所有申请

    const result = await pool.query(
      `SELECT
        id, phone, real_name, birth_date, id_card_last4,
        district_code, district_name, school_code, school_name, grade,
        status, current_reviewer_level,
        submitted_at, last_escalated_at, reviewed_at, review_comment
      FROM student_registration_requests
      ${whereClause}
      ORDER BY submitted_at ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const countQuery = `SELECT COUNT(*) FROM student_registration_requests ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);

    res.json({
      success: true,
      data: {
        requests: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching registration requests', {
      error: error.message,
      user: req.user
    });

    res.status(500).json({
      success: false,
      message: '获取申请列表失败'
    });
  }
});

/**
 * POST /api/registration/admin/requests/:id/approve
 * 批准注册申请（管理员用）
 * 需要认证中间件
 */
router.post('/admin/requests/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 获取申请信息
    const requestResult = await client.query(
      'SELECT * FROM student_registration_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: '申请记录不存在'
      });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `该申请已被${request.status === 'approved' ? '批准' : '拒绝'}，无法重复操作`
      });
    }

    // 2. 生成初始密码: 身份证后4位 + 出生年月（YYMM）
    // 例如：身份证后4位0157，出生日期2014-05-15，密码为01571405
    const birthDate = new Date(request.birth_date);
    const birthYear = birthDate.getFullYear().toString().slice(-2); // 取年份后2位
    const birthMonth = String(birthDate.getMonth() + 1).padStart(2, '0'); // 月份补0
    const initialPassword = request.id_card_last4 + birthYear + birthMonth;
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    // 3. 创建学生用户账号
    const userResult = await client.query(
      `INSERT INTO users (
        username, password, role, real_name, phone, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        request.phone,          // 使用手机号作为用户名
        hashedPassword,
        'student',
        request.real_name,
        request.phone,
        'active'
      ]
    );

    const studentUserId = userResult.rows[0].id;

    // 4. 查找学校ID
    const schoolResult = await client.query(
      'SELECT id FROM schools WHERE code = $1',
      [request.school_code]
    );

    if (schoolResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: '学校代码无效'
      });
    }

    const schoolId = schoolResult.rows[0].id;

    // 5. 创建学生记录
    await client.query(
      `INSERT INTO students (
        user_id, school_id, grade
      ) VALUES ($1, $2, $3)`,
      [studentUserId, schoolId, request.grade]
    );

    // 6. 更新申请状态
    await client.query(
      `UPDATE student_registration_requests
       SET status = 'approved',
           student_user_id = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by = $2,
           review_comment = $3
       WHERE id = $4`,
      [studentUserId, null, comment || '申请已批准', id]
    );

    // 7. 记录审核日志
    await client.query(
      'SELECT log_registration_action($1, $2, $3, $4, $5, $6)',
      [
        id,
        'approved',
        null, // TODO: 从JWT获取管理员ID
        request.current_reviewer_level,
        comment || '注册申请已批准，学生账号已创建',
        JSON.stringify({
          studentUserId,
          initialPassword: '(hidden)' // 不记录明文密码
        })
      ]
    );

    await client.query('COMMIT');

    logger.info('Registration request approved', {
      requestId: id,
      studentUserId,
      phone: request.phone
    });

    res.json({
      success: true,
      message: '注册申请已批准，学生账号已创建',
      data: {
        studentUserId,
        username: request.phone,
        initialPassword: initialPassword // 返回给管理员，可通知学生
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error approving registration request', {
      error: error.message,
      stack: error.stack,
      requestId: id
    });

    res.status(500).json({
      success: false,
      message: '批准申请失败: ' + error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/registration/admin/requests/:id/reject
 * 拒绝注册申请（管理员用）
 * 需要认证中间件
 */
router.post('/admin/requests/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  if (!comment || comment.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '拒绝原因不能为空'
    });
  }

  try {
    // 1. 获取申请信息
    const requestResult = await pool.query(
      'SELECT * FROM student_registration_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '申请记录不存在'
      });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `该申请已被${request.status === 'approved' ? '批准' : '拒绝'}，无法重复操作`
      });
    }

    // 2. 更新申请状态为拒绝
    await pool.query(
      `UPDATE student_registration_requests
       SET status = 'rejected',
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by = $1,
           review_comment = $2
       WHERE id = $3`,
      [null, comment, id] // TODO: 从JWT获取管理员ID
    );

    // 3. 记录审核日志
    await pool.query(
      'SELECT log_registration_action($1, $2, $3, $4, $5, $6)',
      [
        id,
        'rejected',
        null, // TODO: 从JWT获取管理员ID
        request.current_reviewer_level,
        comment,
        null
      ]
    );

    logger.info('Registration request rejected', {
      requestId: id,
      phone: request.phone,
      reason: comment
    });

    res.json({
      success: true,
      message: '注册申请已拒绝'
    });
  } catch (error) {
    logger.error('Error rejecting registration request', {
      error: error.message,
      requestId: id
    });

    res.status(500).json({
      success: false,
      message: '拒绝申请失败'
    });
  }
});

/**
 * GET /api/registration/admin/requests/:id/history
 * 查看审核历史（管理员用）
 */
router.get('/admin/requests/:id/history', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. 获取申请基本信息
    const requestResult = await pool.query(
      'SELECT * FROM student_registration_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '申请记录不存在'
      });
    }

    // 2. 获取审核历史日志
    const historyResult = await pool.query(
      `SELECT
        id, action, action_by, action_level,
        comment, metadata, created_at
      FROM registration_audit_log
      WHERE request_id = $1
      ORDER BY created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        request: requestResult.rows[0],
        history: historyResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching registration history', {
      error: error.message,
      requestId: id
    });

    res.status(500).json({
      success: false,
      message: '获取审核历史失败'
    });
  }
});

module.exports = router;
