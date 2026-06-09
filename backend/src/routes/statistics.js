const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/statistics/student/abilities
 * Get student ability statistics
 * Query params:
 *   - subject: (optional) Filter by subject
 *   - ability: (optional) Filter by specific ability
 */
router.get('/student/abilities', authMiddleware, async (req, res) => {
  try {
    // student_activities.student_id 存的是 users.id，直接用 req.user.id
    const studentId = req.user.id;
    const { subject, ability } = req.query;

    let sql = `
      SELECT
        ability,
        subject,
        total_questions,
        correct_count,
        accuracy_rate,
        avg_score,
        last_activity_time
      FROM v_student_ability_realtime
      WHERE student_id = $1
    `;
    const params = [studentId];
    let paramIndex = 2;

    if (subject) {
      sql += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }

    if (ability) {
      sql += ` AND ability = $${paramIndex}`;
      params.push(ability);
      paramIndex++;
    }

    sql += ' ORDER BY subject, ability';

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get student abilities error:', error);
    res.status(500).json({
      success: false,
      error: '获取能力统计失败'
    });
  }
});

/**
 * GET /api/statistics/student/knowledge-points
 * Get student knowledge point statistics
 * Query params:
 *   - subject: (optional) Filter by subject
 *   - knowledge_point: (optional) Filter by specific knowledge point
 */
router.get('/student/knowledge-points', authMiddleware, async (req, res) => {
  try {
    // student_activities.student_id 存的是 users.id，直接用 req.user.id
    const studentId = req.user.id;
    const { subject, knowledge_point } = req.query;

    let sql = `
      SELECT
        knowledge_point,
        subject,
        total_questions,
        correct_count,
        accuracy_rate,
        avg_score,
        last_activity_time
      FROM v_student_knowledge_realtime
      WHERE student_id = $1
    `;
    const params = [studentId];
    let paramIndex = 2;

    if (subject) {
      sql += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }

    if (knowledge_point) {
      sql += ` AND knowledge_point = $${paramIndex}`;
      params.push(knowledge_point);
      paramIndex++;
    }

    sql += ' ORDER BY subject, knowledge_point';

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get student knowledge points error:', error);
    res.status(500).json({
      success: false,
      error: '获取知识点统计失败'
    });
  }
});

/**
 * GET /api/statistics/student/overview
 * Get student learning overview (summary statistics)
 */
router.get('/student/overview', authMiddleware, async (req, res) => {
  try {
    // v_student_learning_overview 中的 student_id 是 users.id（即 student_activities.student_id），
    // 而非 students.id，因此直接使用 req.user.id 查询
    const sql = `
      SELECT
        total_activities,
        completed_activities,
        avg_score,
        total_study_seconds,
        last_activity_time,
        first_activity_time
      FROM v_student_learning_overview
      WHERE student_id = $1
    `;

    const result = await query(sql, [req.user.id]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          total_activities: 0,
          completed_activities: 0,
          avg_score: 0,
          total_study_seconds: 0,
          last_activity_time: null,
          first_activity_time: null
        }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get student overview error:', error);
    res.status(500).json({
      success: false,
      error: '获取学习概况失败'
    });
  }
});

/**
 * GET /api/statistics/teacher/school-abilities
 * Get school-level ability statistics (for teachers)
 * Requires teacher role
 * Query params:
 *   - subject: (optional) Filter by subject
 *   - ability: (optional) Filter by specific ability
 *   - grade: (optional) Filter by grade
 */
router.get('/teacher/school-abilities', authMiddleware, async (req, res) => {
  try {
    // Verify user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: '只有教师可以访问学校统计数据'
      });
    }

    // Get teacher's school_id
    const teacherSql = 'SELECT school_id FROM teachers WHERE user_id = $1';
    const teacherResult = await query(teacherSql, [req.user.id]);

    if (teacherResult.rows.length === 0 || !teacherResult.rows[0].school_id) {
      return res.status(400).json({
        success: false,
        error: '未找到教师关联的学校信息'
      });
    }

    const schoolId = teacherResult.rows[0].school_id;
    const { subject, ability, grade } = req.query;

    let sql = `
      SELECT
        ability,
        subject,
        grade,
        student_count,
        total_attempts,
        correct_count,
        accuracy_rate,
        avg_score,
        last_activity_time
      FROM v_school_ability_realtime
      WHERE school_id = $1
    `;
    const params = [schoolId];
    let paramIndex = 2;

    if (subject) {
      sql += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }

    if (ability) {
      sql += ` AND ability = $${paramIndex}`;
      params.push(ability);
      paramIndex++;
    }

    if (grade) {
      sql += ` AND grade = $${paramIndex}`;
      params.push(grade);
      paramIndex++;
    }

    sql += ' ORDER BY subject, grade, ability';

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows,
      school_id: schoolId
    });
  } catch (error) {
    console.error('Get school abilities error:', error);
    res.status(500).json({
      success: false,
      error: '获取学校能力统计失败'
    });
  }
});

/**
 * GET /api/statistics/teacher/district-abilities
 * Get district-level ability statistics (for district administrators)
 * Requires district admin permissions
 * Query params:
 *   - subject: (optional) Filter by subject
 *   - ability: (optional) Filter by specific ability
 *   - grade: (optional) Filter by grade
 */
router.get('/teacher/district-abilities', authMiddleware, async (req, res) => {
  try {
    // Verify user has district-level or municipal-level permissions
    const permissionSql = `
      SELECT district_id, scope_level
      FROM teacher_permissions
      WHERE user_id = $1
        AND permission_type IN ('practice_district_review', 'practice_municipal_review', 'assessment_review')
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      LIMIT 1
    `;
    const permissionResult = await query(permissionSql, [req.user.id]);

    if (permissionResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '只有区级或市级管理员可以访问区域统计数据'
      });
    }

    const { district_id: districtId, scope_level: scopeLevel } = permissionResult.rows[0];
    const { subject, ability, grade } = req.query;

    // Build base query
    let sql = `
      SELECT
        ability,
        subject,
        grade,
        school_count,
        student_count,
        total_attempts,
        correct_count,
        accuracy_rate,
        avg_score,
        last_activity_time
      FROM v_district_ability_realtime
    `;

    const params = [];
    let paramIndex = 1;
    const conditions = [];

    // District-level users can only see their own district
    // Municipal-level users can see all districts
    if (scopeLevel === 'district' && districtId) {
      conditions.push(`district_id = $${paramIndex}`);
      params.push(districtId);
      paramIndex++;
    }

    if (subject) {
      conditions.push(`subject = $${paramIndex}`);
      params.push(subject);
      paramIndex++;
    }

    if (ability) {
      conditions.push(`ability = $${paramIndex}`);
      params.push(ability);
      paramIndex++;
    }

    if (grade) {
      conditions.push(`grade = $${paramIndex}`);
      params.push(grade);
      paramIndex++;
    }

    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY subject, grade, ability';

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows,
      district_id: districtId
    });
  } catch (error) {
    console.error('Get district abilities error:', error);
    res.status(500).json({
      success: false,
      error: '获取区域能力统计失败'
    });
  }
});

module.exports = router;
