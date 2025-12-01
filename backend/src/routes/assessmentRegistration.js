/**
 * Assessment Registration Routes
 * 测评报名相关API路由
 */

const express = require('express');
const router = express.Router();
const { body, param, query: _queryValidator, validationResult } = require('express-validator');
const { authMiddleware, requireRole, optionalAuth } = require('../middleware/auth');
const AssessmentLocation = require('../models/AssessmentLocation');
const AssessmentRegistration = require('../models/AssessmentRegistration');
const Activity = require('../models/Activity');
const { query } = require('../database/connection');
const notificationService = require('../services/NotificationService');

// ============================================
// 测评点管理API (管理员)
// ============================================

/**
 * 获取活动的测评点列表
 * GET /api/activities/:activityId/locations
 */
router.get('/activities/:activityId/locations',
  optionalAuth,
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { activityId } = req.params;
      const { active_only, available_only, district_id } = req.query;

      const locations = await AssessmentLocation.findByActivityId(activityId, {
        activeOnly: active_only === 'true',
        availableOnly: available_only === 'true',
        districtId: district_id ? parseInt(district_id) : null
      });

      res.json({
        success: true,
        locations
      });
    } catch (error) {
      console.error('Get locations error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 获取单个测评点详情
 * GET /api/locations/:id
 */
router.get('/locations/:id',
  optionalAuth,
  param('id').isInt().withMessage('测评点ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const location = await AssessmentLocation.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ success: false, message: '测评点不存在' });
      }

      res.json({ success: true, location });
    } catch (error) {
      console.error('Get location error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 创建测评点
 * POST /api/activities/:activityId/locations
 */
router.post('/activities/:activityId/locations',
  authMiddleware,
  requireRole(['district_admin', 'municipal_admin', 'system_admin']),
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  body('name').trim().notEmpty().withMessage('测评点名称不能为空'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('容量必须是正整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { activityId } = req.params;

      // 检查活动是否存在且为测评类型
      const activity = await Activity.findById(activityId);
      if (!activity) {
        return res.status(404).json({ success: false, message: '活动不存在' });
      }

      if (activity.type !== 'assessment') {
        return res.status(400).json({ success: false, message: '只有测评类型的活动可以添加测评点' });
      }

      const location = await AssessmentLocation.create({
        activity_id: activityId,
        ...req.body,
        created_by: req.user.userId
      });

      // 自动设置活动需要测评点
      await query(`
        UPDATE activities SET require_location = true WHERE id = $1
      `, [activityId]);

      res.status(201).json({
        success: true,
        message: '测评点创建成功',
        location
      });
    } catch (error) {
      console.error('Create location error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 批量创建测评点
 * POST /api/activities/:activityId/locations/batch
 */
router.post('/activities/:activityId/locations/batch',
  authMiddleware,
  requireRole(['district_admin', 'municipal_admin', 'system_admin']),
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  body('locations').isArray({ min: 1 }).withMessage('至少需要一个测评点'),
  body('locations.*.name').trim().notEmpty().withMessage('测评点名称不能为空'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { activityId } = req.params;
      const { locations } = req.body;

      // 检查活动
      const activity = await Activity.findById(activityId);
      if (!activity) {
        return res.status(404).json({ success: false, message: '活动不存在' });
      }

      if (activity.type !== 'assessment') {
        return res.status(400).json({ success: false, message: '只有测评类型的活动可以添加测评点' });
      }

      const createdLocations = await AssessmentLocation.bulkCreate(
        activityId,
        locations,
        req.user.userId
      );

      // 自动设置活动需要测评点
      await query(`
        UPDATE activities SET require_location = true WHERE id = $1
      `, [activityId]);

      res.status(201).json({
        success: true,
        message: `成功创建 ${createdLocations.length} 个测评点`,
        locations: createdLocations
      });
    } catch (error) {
      console.error('Batch create locations error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 更新测评点
 * PUT /api/locations/:id
 */
router.put('/locations/:id',
  authMiddleware,
  requireRole(['district_admin', 'municipal_admin', 'system_admin']),
  param('id').isInt().withMessage('测评点ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const location = await AssessmentLocation.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ success: false, message: '测评点不存在' });
      }

      const updated = await AssessmentLocation.update(req.params.id, req.body);

      res.json({
        success: true,
        message: '测评点更新成功',
        location: updated
      });
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 删除测评点
 * DELETE /api/locations/:id
 */
router.delete('/locations/:id',
  authMiddleware,
  requireRole(['district_admin', 'municipal_admin', 'system_admin']),
  param('id').isInt().withMessage('测评点ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const location = await AssessmentLocation.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ success: false, message: '测评点不存在' });
      }

      await AssessmentLocation.delete(req.params.id);

      res.json({
        success: true,
        message: '测评点删除成功'
      });
    } catch (error) {
      console.error('Delete location error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * 获取活动测评点统计
 * GET /api/activities/:activityId/locations/statistics
 */
router.get('/activities/:activityId/locations/statistics',
  authMiddleware,
  requireRole(['teacher', 'school_admin', 'district_admin', 'municipal_admin', 'system_admin']),
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const statistics = await AssessmentLocation.getStatistics(req.params.activityId);

      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      console.error('Get location statistics error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ============================================
// 学生报名API
// ============================================

/**
 * 检查报名资格
 * GET /api/activities/:activityId/registration/eligibility
 */
router.get('/activities/:activityId/registration/eligibility',
  authMiddleware,
  requireRole(['student']),
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const eligibility = await AssessmentRegistration.checkEligibility(
        req.params.activityId,
        req.user.userId
      );

      // 如果需要测评点，获取可用的测评点
      if (eligibility.requireLocation && eligibility.eligible) {
        eligibility.locations = await AssessmentLocation.findByActivityId(
          req.params.activityId,
          { availableOnly: true }
        );
      }

      res.json({
        success: true,
        ...eligibility
      });
    } catch (error) {
      console.error('Check eligibility error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 提交报名
 * POST /api/activities/:activityId/register
 */
router.post('/activities/:activityId/register',
  authMiddleware,
  requireRole(['student']),
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  body('location_id').optional().isInt().withMessage('测评点ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const activityId = parseInt(req.params.activityId);
      const studentId = req.user.userId;
      const { location_id } = req.body;

      // 检查资格
      const eligibility = await AssessmentRegistration.checkEligibility(activityId, studentId);

      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          message: eligibility.reasons.join('; ')
        });
      }

      // 如果需要测评点但未选择
      if (eligibility.requireLocation && !location_id) {
        return res.status(400).json({
          success: false,
          message: '该测评需要选择测评点'
        });
      }

      // 如果不需要测评点但提供了
      if (!eligibility.requireLocation && location_id) {
        return res.status(400).json({
          success: false,
          message: '该测评为线上测评，无需选择测评点'
        });
      }

      // 创建报名
      const registration = await AssessmentRegistration.create({
        activity_id: activityId,
        student_id: studentId,
        location_id: location_id || null,
        status: 'confirmed'
      });

      // 获取完整的报名信息
      const fullRegistration = await AssessmentRegistration.findById(registration.id);

      // 发送报名确认通知（异步，不阻塞响应）
      notificationService.sendRegistrationConfirmed(fullRegistration).catch(err => {
        console.error('Failed to send registration notification:', err);
      });

      res.status(201).json({
        success: true,
        message: eligibility.requireLocation
          ? '报名成功！请按时到达测评点参加测评。'
          : '报名成功！请在测评时间登录系统参加测评。',
        registration: fullRegistration
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * 取消报名
 * POST /api/activities/:activityId/register/cancel
 */
router.post('/activities/:activityId/register/cancel',
  authMiddleware,
  requireRole(['student']),
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  body('reason').optional().trim(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const activityId = parseInt(req.params.activityId);
      const studentId = req.user.userId;
      const { reason } = req.body;

      // 查找报名记录
      const registration = await AssessmentRegistration.findByActivityAndStudent(activityId, studentId);

      if (!registration) {
        return res.status(404).json({ success: false, message: '未找到报名记录' });
      }

      // 取消报名
      await AssessmentRegistration.cancel(registration.id, {
        reason,
        cancelledBy: studentId
      });

      res.json({
        success: true,
        message: '报名已取消'
      });
    } catch (error) {
      console.error('Cancel registration error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * 获取我的报名列表
 * GET /api/assessments/my-registrations
 */
router.get('/assessments/my-registrations',
  authMiddleware,
  requireRole(['student']),
  async (req, res) => {
    try {
      const { status, upcoming, limit, offset } = req.query;

      const registrations = await AssessmentRegistration.findByStudentId(req.user.userId, {
        status,
        upcoming: upcoming === 'true',
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : null
      });

      res.json({
        success: true,
        registrations
      });
    } catch (error) {
      console.error('Get my registrations error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 获取我在某个活动的报名状态
 * GET /api/activities/:activityId/my-registration
 */
router.get('/activities/:activityId/my-registration',
  authMiddleware,
  requireRole(['student']),
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const registration = await AssessmentRegistration.findByActivityAndStudent(
        req.params.activityId,
        req.user.userId
      );

      res.json({
        success: true,
        registered: !!registration,
        registration
      });
    } catch (error) {
      console.error('Get my registration error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ============================================
// 管理员报名管理API
// ============================================

/**
 * 获取活动报名列表
 * GET /api/activities/:activityId/registrations
 */
router.get('/activities/:activityId/registrations',
  authMiddleware,
  requireRole(['teacher', 'school_admin', 'district_admin', 'municipal_admin', 'system_admin']),
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { status, location_id, school_id, grade, page, page_size, search } = req.query;

      const result = await AssessmentRegistration.findByActivityId(req.params.activityId, {
        status,
        locationId: location_id ? parseInt(location_id) : null,
        schoolId: school_id ? parseInt(school_id) : null,
        grade,
        page: page ? parseInt(page) : 1,
        pageSize: page_size ? parseInt(page_size) : 20,
        search
      });

      // 获取统计数据
      const statistics = await AssessmentRegistration.getStatistics(req.params.activityId);

      res.json({
        success: true,
        ...result,
        statistics
      });
    } catch (error) {
      console.error('Get registrations error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 获取报名统计（按测评点/学校分组）
 * GET /api/activities/:activityId/registrations/statistics
 */
router.get('/activities/:activityId/registrations/statistics',
  authMiddleware,
  requireRole(['teacher', 'school_admin', 'district_admin', 'municipal_admin', 'system_admin']),
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const activityId = req.params.activityId;

      const [overall, byLocation, bySchool] = await Promise.all([
        AssessmentRegistration.getStatistics(activityId),
        AssessmentRegistration.getStatisticsByLocation(activityId),
        AssessmentRegistration.getStatisticsBySchool(activityId)
      ]);

      res.json({
        success: true,
        statistics: {
          overall,
          byLocation,
          bySchool
        }
      });
    } catch (error) {
      console.error('Get registration statistics error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 批量操作报名
 * POST /api/activities/:activityId/registrations/batch
 */
router.post('/activities/:activityId/registrations/batch',
  authMiddleware,
  requireRole(['school_admin', 'district_admin', 'municipal_admin', 'system_admin']),
  param('activityId').isInt().withMessage('活动ID必须是整数'),
  body('action').isIn(['confirm', 'cancel', 'reject']).withMessage('无效的操作类型'),
  body('registration_ids').isArray({ min: 1 }).withMessage('至少选择一个报名记录'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { action, registration_ids, reason } = req.body;

      let status;
      switch (action) {
      case 'confirm':
        status = 'confirmed';
        break;
      case 'cancel':
        status = 'cancelled';
        break;
      case 'reject':
        status = 'rejected';
        break;
      }

      const updatedCount = await AssessmentRegistration.bulkUpdateStatus(
        registration_ids,
        status,
        { reviewedBy: req.user.userId, reason }
      );

      // 批量发送通知（异步，不阻塞响应）
      (async () => {
        try {
          for (const regId of registration_ids) {
            const registration = await AssessmentRegistration.findById(regId);
            if (registration) {
              switch (action) {
              case 'confirm':
                await notificationService.sendRegistrationConfirmed(registration);
                break;
              case 'cancel':
                await notificationService.sendRegistrationCancelled(registration, reason);
                break;
              case 'reject':
                await notificationService.sendRegistrationRejected(registration, reason);
                break;
              }
            }
          }
        } catch (err) {
          console.error('Failed to send batch registration notifications:', err);
        }
      })();

      res.json({
        success: true,
        message: `成功更新 ${updatedCount} 条报名记录`,
        updatedCount
      });
    } catch (error) {
      console.error('Batch update registrations error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * 管理员取消学生报名
 * DELETE /api/registrations/:id
 */
router.delete('/registrations/:id',
  authMiddleware,
  requireRole(['school_admin', 'district_admin', 'municipal_admin', 'system_admin']),
  param('id').isInt().withMessage('报名ID必须是整数'),
  body('reason').optional().trim(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const registration = await AssessmentRegistration.findById(req.params.id);
      if (!registration) {
        return res.status(404).json({ success: false, message: '报名记录不存在' });
      }

      const cancelReason = req.body.reason || '管理员取消';

      await AssessmentRegistration.cancel(req.params.id, {
        reason: cancelReason,
        cancelledBy: req.user.userId
      });

      // 发送取消通知（异步，不阻塞响应）
      notificationService.sendRegistrationCancelled(registration, cancelReason).catch(err => {
        console.error('Failed to send cancel registration notification:', err);
      });

      res.json({
        success: true,
        message: '报名已取消'
      });
    } catch (error) {
      console.error('Admin cancel registration error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * 获取可报名的测评列表
 * GET /api/assessments/available
 */
router.get('/assessments/available',
  authMiddleware,
  requireRole(['student']),
  async (req, res) => {
    try {
      const { subject, grade: _grade, ability_level, page, page_size } = req.query;
      const studentId = req.user.userId;

      // 获取学生信息
      const studentResult = await query(`
        SELECT st.grade, st.school_id, s.district_id
        FROM users u
        JOIN students st ON u.id = st.user_id
        JOIN schools s ON st.school_id = s.id
        WHERE u.id = $1
      `, [studentId]);

      const student = studentResult.rows[0];

      // 构建查询
      let sql = `
        SELECT a.*,
               CASE
                 WHEN a.ability_level IN ('L1', 'L2', 'L3') THEN true
                 ELSE false
               END as is_online,
               ar.id as registration_id,
               ar.status as registration_status,
               ar.location_id,
               al.name as location_name
        FROM activities a
        LEFT JOIN assessment_registrations ar ON a.id = ar.activity_id AND ar.student_id = $1
        LEFT JOIN assessment_locations al ON ar.location_id = al.id
        WHERE a.type = 'assessment'
          AND a.status = 'published'
          AND a.registration_enabled = true
      `;
      const params = [studentId];
      let paramIndex = 2;

      if (subject) {
        sql += ` AND a.subject = $${paramIndex}`;
        params.push(subject);
        paramIndex++;
      }

      if (ability_level) {
        sql += ` AND a.ability_level = $${paramIndex}`;
        params.push(ability_level);
        paramIndex++;
      }

      // 根据学生年级和范围筛选
      if (student) {
        // 可以添加更多筛选逻辑
      }

      sql += ' ORDER BY a.registration_end_time ASC, a.created_at DESC';

      // 分页
      const pageNum = page ? parseInt(page) : 1;
      const pageSizeNum = page_size ? parseInt(page_size) : 20;
      const offset = (pageNum - 1) * pageSizeNum;

      params.push(pageSizeNum, offset);
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

      const result = await query(sql, params);

      // 处理结果，添加报名状态信息
      const assessments = result.rows.map(a => ({
        ...a,
        can_register: !a.registration_id ||
          (a.registration_status === 'cancelled'),
        registration_deadline: a.registration_end_time
      }));

      res.json({
        success: true,
        assessments
      });
    } catch (error) {
      console.error('Get available assessments error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
