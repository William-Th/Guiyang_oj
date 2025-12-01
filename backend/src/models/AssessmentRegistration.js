/**
 * AssessmentRegistration Model
 * 测评报名管理模型 - 学生报名记录管理
 */

const { query, getClient } = require('../database/connection');

class AssessmentRegistration {
  /**
   * 创建报名记录
   * @param {Object} registrationData - 报名数据
   * @returns {Object} 创建的报名记录
   */
  static async create(registrationData) {
    const {
      activity_id,
      student_id,
      location_id = null,
      status = 'confirmed'
    } = registrationData;

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 检查是否已报名
      const existingCheck = await client.query(`
        SELECT id FROM assessment_registrations
        WHERE activity_id = $1 AND student_id = $2
      `, [activity_id, student_id]);

      if (existingCheck.rows.length > 0) {
        throw new Error('您已报名该测评，请勿重复报名');
      }

      // 如果有测评点，检查容量
      if (location_id) {
        const capacityCheck = await client.query(`
          SELECT id, capacity, registered_count
          FROM assessment_locations
          WHERE id = $1 AND is_active = true
          FOR UPDATE
        `, [location_id]);

        if (!capacityCheck.rows[0]) {
          throw new Error('所选测评点不存在或已停用');
        }

        const { capacity, registered_count } = capacityCheck.rows[0];
        if (registered_count >= capacity) {
          throw new Error('所选测评点名额已满，请选择其他测评点');
        }
      }

      // 创建报名记录
      const result = await client.query(`
        INSERT INTO assessment_registrations (
          activity_id, student_id, location_id, status,
          confirmed_at
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        activity_id, student_id, location_id, status,
        status === 'confirmed' ? new Date() : null
      ]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 根据ID查找报名记录
   * @param {number} id - 报名记录ID
   * @returns {Object|null} 报名记录
   */
  static async findById(id) {
    const result = await query(`
      SELECT ar.*,
             a.title as activity_title,
             a.subject,
             a.grade,
             a.ability_level,
             a.type as activity_type,
             a.start_time as exam_start_time,
             a.end_time as exam_end_time,
             al.name as location_name,
             al.address as location_address,
             al.exam_date,
             al.exam_time_start,
             al.exam_time_end,
             al.check_in_time,
             al.contact_name as location_contact_name,
             al.contact_phone as location_contact_phone,
             u.real_name as student_name,
             u.phone as student_phone,
             s.name as school_name,
             st.grade as student_grade,
             st.class_name as student_class
      FROM assessment_registrations ar
      LEFT JOIN activities a ON ar.activity_id = a.id
      LEFT JOIN assessment_locations al ON ar.location_id = al.id
      LEFT JOIN users u ON ar.student_id = u.id
      LEFT JOIN students st ON u.id = st.user_id
      LEFT JOIN schools s ON st.school_id = s.id
      WHERE ar.id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  /**
   * 根据活动ID和学生ID查找报名记录
   * @param {number} activityId - 活动ID
   * @param {number} studentId - 学生ID
   * @returns {Object|null} 报名记录
   */
  static async findByActivityAndStudent(activityId, studentId) {
    const result = await query(`
      SELECT ar.*,
             al.name as location_name,
             al.address as location_address,
             al.exam_date,
             al.exam_time_start,
             al.exam_time_end,
             al.check_in_time
      FROM assessment_registrations ar
      LEFT JOIN assessment_locations al ON ar.location_id = al.id
      WHERE ar.activity_id = $1 AND ar.student_id = $2
    `, [activityId, studentId]);

    return result.rows[0] || null;
  }

  /**
   * 获取学生的所有报名记录
   * @param {number} studentId - 学生ID
   * @param {Object} options - 查询选项
   * @returns {Array} 报名记录列表
   */
  static async findByStudentId(studentId, options = {}) {
    const { status, upcoming = false, limit, offset } = options;

    let sql = `
      SELECT ar.*,
             a.title as activity_title,
             a.subject,
             a.grade,
             a.ability_level,
             a.type as activity_type,
             a.status as activity_status,
             a.start_time as exam_start_time,
             a.end_time as exam_end_time,
             al.name as location_name,
             al.address as location_address,
             al.exam_date,
             al.exam_time_start,
             al.exam_time_end,
             al.check_in_time
      FROM assessment_registrations ar
      LEFT JOIN activities a ON ar.activity_id = a.id
      LEFT JOIN assessment_locations al ON ar.location_id = al.id
      WHERE ar.student_id = $1
    `;
    const params = [studentId];

    if (status) {
      params.push(status);
      sql += ` AND ar.status = $${params.length}`;
    }

    if (upcoming) {
      sql += ' AND (a.start_time > NOW() OR a.status = \'published\')';
    }

    sql += ' ORDER BY ar.registered_at DESC';

    if (limit) {
      params.push(limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (offset) {
      params.push(offset);
      sql += ` OFFSET $${params.length}`;
    }

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * 获取活动的所有报名记录
   * @param {number} activityId - 活动ID
   * @param {Object} options - 查询选项
   * @returns {Object} 报名记录列表和统计
   */
  static async findByActivityId(activityId, options = {}) {
    const {
      status,
      locationId,
      schoolId,
      grade,
      page = 1,
      pageSize = 20,
      search
    } = options;

    let countSql = `
      SELECT COUNT(*) as total
      FROM assessment_registrations ar
      LEFT JOIN users u ON ar.student_id = u.id
      LEFT JOIN students st ON u.id = st.user_id
      WHERE ar.activity_id = $1
    `;

    let sql = `
      SELECT ar.*,
             u.real_name as student_name,
             u.phone as student_phone,
             st.grade as student_grade,
             st.class as student_class,
             s.name as school_name,
             s.id as school_id,
             al.name as location_name,
             al.address as location_address
      FROM assessment_registrations ar
      LEFT JOIN users u ON ar.student_id = u.id
      LEFT JOIN students st ON u.id = st.user_id
      LEFT JOIN schools s ON st.school_id = s.id
      LEFT JOIN assessment_locations al ON ar.location_id = al.id
      WHERE ar.activity_id = $1
    `;

    const params = [activityId];
    let filterIndex = 1;

    const addFilter = (condition, value) => {
      params.push(value);
      filterIndex++;
      const filter = condition.replace('?', `$${filterIndex}`);
      sql += ` AND ${filter}`;
      countSql += ` AND ${filter}`;
    };

    if (status) {
      addFilter('ar.status = ?', status);
    }

    if (locationId) {
      addFilter('ar.location_id = ?', locationId);
    }

    if (schoolId) {
      addFilter('st.school_id = ?', schoolId);
    }

    if (grade) {
      addFilter('st.grade = ?', grade);
    }

    if (search) {
      addFilter('(u.real_name ILIKE ? OR u.phone ILIKE ?)', `%${search}%`);
      params.push(`%${search}%`);
    }

    // 获取总数
    const countResult = await query(countSql, params.slice(0, filterIndex + 1));
    const total = parseInt(countResult.rows[0].total);

    // 分页
    sql += ' ORDER BY ar.registered_at DESC';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await query(sql, params);

    return {
      registrations: result.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * 取消报名
   * @param {number} id - 报名记录ID
   * @param {Object} cancelData - 取消信息
   * @returns {Object|null} 更新后的记录
   */
  static async cancel(id, cancelData = {}) {
    const { reason, cancelledBy } = cancelData;

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 获取当前记录（加锁）
      const current = await client.query(`
        SELECT ar.*, a.registration_end_time, a.status as activity_status
        FROM assessment_registrations ar
        JOIN activities a ON ar.activity_id = a.id
        WHERE ar.id = $1
        FOR UPDATE
      `, [id]);

      if (!current.rows[0]) {
        throw new Error('报名记录不存在');
      }

      const record = current.rows[0];

      if (record.status === 'cancelled') {
        throw new Error('报名已取消');
      }

      if (record.status === 'completed') {
        throw new Error('测评已完成，无法取消');
      }

      if (record.activity_status === 'ongoing' || record.activity_status === 'finished') {
        throw new Error('测评已开始或已结束，无法取消');
      }

      // 更新状态
      const result = await client.query(`
        UPDATE assessment_registrations
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancel_reason = $2,
            cancelled_by = $3
        WHERE id = $1
        RETURNING *
      `, [id, reason, cancelledBy]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 更新报名状态
   * @param {number} id - 报名记录ID
   * @param {string} status - 新状态
   * @param {Object} extra - 额外信息
   * @returns {Object|null} 更新后的记录
   */
  static async updateStatus(id, status, extra = {}) {
    const { reviewedBy, reviewNotes, studentActivityId } = extra;

    let sql = 'UPDATE assessment_registrations SET status = $1';
    const params = [status];
    let paramIndex = 2;

    if (status === 'confirmed') {
      sql += ', confirmed_at = NOW()';
    }

    if (reviewedBy) {
      sql += `, reviewed_at = NOW(), reviewed_by = $${paramIndex}`;
      params.push(reviewedBy);
      paramIndex++;
    }

    if (reviewNotes) {
      sql += `, review_notes = $${paramIndex}`;
      params.push(reviewNotes);
      paramIndex++;
    }

    if (studentActivityId) {
      sql += `, student_activity_id = $${paramIndex}`;
      params.push(studentActivityId);
      paramIndex++;
    }

    params.push(id);
    sql += ` WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, params);
    return result.rows[0] || null;
  }

  /**
   * 获取活动报名统计
   * @param {number} activityId - 活动ID
   * @returns {Object} 统计信息
   */
  static async getStatistics(activityId) {
    const result = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
      FROM assessment_registrations
      WHERE activity_id = $1
    `, [activityId]);

    return result.rows[0];
  }

  /**
   * 获取按测评点分组的统计
   * @param {number} activityId - 活动ID
   * @returns {Array} 各测评点统计
   */
  static async getStatisticsByLocation(activityId) {
    const result = await query(`
      SELECT
        al.id as location_id,
        al.name as location_name,
        al.capacity,
        al.registered_count,
        COUNT(ar.id) as total_registrations,
        COUNT(CASE WHEN ar.status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN ar.status = 'cancelled' THEN 1 END) as cancelled
      FROM assessment_locations al
      LEFT JOIN assessment_registrations ar ON al.id = ar.location_id
      WHERE al.activity_id = $1
      GROUP BY al.id, al.name, al.capacity, al.registered_count
      ORDER BY al.name
    `, [activityId]);

    return result.rows;
  }

  /**
   * 获取按学校分组的统计
   * @param {number} activityId - 活动ID
   * @returns {Array} 各学校统计
   */
  static async getStatisticsBySchool(activityId) {
    const result = await query(`
      SELECT
        s.id as school_id,
        s.name as school_name,
        COUNT(ar.id) as total,
        COUNT(CASE WHEN ar.status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN ar.status = 'cancelled' THEN 1 END) as cancelled
      FROM assessment_registrations ar
      JOIN users u ON ar.student_id = u.id
      JOIN students st ON u.id = st.user_id
      JOIN schools s ON st.school_id = s.id
      WHERE ar.activity_id = $1
      GROUP BY s.id, s.name
      ORDER BY total DESC
    `, [activityId]);

    return result.rows;
  }

  /**
   * 检查报名资格
   * @param {number} activityId - 活动ID
   * @param {number} studentId - 学生ID
   * @returns {Object} 资格检查结果
   */
  static async checkEligibility(activityId, studentId) {
    const result = {
      eligible: true,
      reasons: [],
      requireLocation: false,
      alreadyRegistered: false,
      registration: null
    };

    // 获取活动信息
    const activityResult = await query(`
      SELECT a.*,
             a.registration_enabled,
             a.registration_start_time,
             a.registration_end_time,
             a.max_participants,
             a.require_location
      FROM activities a
      WHERE a.id = $1
    `, [activityId]);

    if (!activityResult.rows[0]) {
      result.eligible = false;
      result.reasons.push('测评活动不存在');
      return result;
    }

    const activity = activityResult.rows[0];

    // 检查活动类型
    if (activity.type !== 'assessment') {
      result.eligible = false;
      result.reasons.push('该活动不是测评类型');
      return result;
    }

    // 检查活动状态
    if (activity.status !== 'published') {
      result.eligible = false;
      result.reasons.push('测评尚未发布或已结束');
      return result;
    }

    // 检查报名是否开启
    if (!activity.registration_enabled) {
      result.eligible = false;
      result.reasons.push('该测评未开启报名');
      return result;
    }

    // 检查报名时间
    const now = new Date();
    if (activity.registration_start_time && new Date(activity.registration_start_time) > now) {
      result.eligible = false;
      result.reasons.push('报名尚未开始');
    }

    if (activity.registration_end_time && new Date(activity.registration_end_time) < now) {
      result.eligible = false;
      result.reasons.push('报名已截止');
    }

    // 检查是否已报名
    const existingReg = await this.findByActivityAndStudent(activityId, studentId);
    if (existingReg) {
      result.alreadyRegistered = true;
      result.registration = existingReg;
      if (existingReg.status !== 'cancelled') {
        result.eligible = false;
        result.reasons.push('您已报名该测评');
      }
    }

    // 获取学生信息
    const studentResult = await query(`
      SELECT u.*, st.grade, st.class_name, st.school_id, s.district_id
      FROM users u
      JOIN students st ON u.id = st.user_id
      JOIN schools s ON st.school_id = s.id
      WHERE u.id = $1 AND u.role = 'student' AND u.status = 'active'
    `, [studentId]);

    if (!studentResult.rows[0]) {
      result.eligible = false;
      result.reasons.push('学生账号不存在或未激活');
      return result;
    }

    const student = studentResult.rows[0];

    // 检查年级限制
    if (activity.target_audience?.grades?.length > 0) {
      if (!activity.target_audience.grades.includes(student.grade)) {
        result.eligible = false;
        result.reasons.push(`该测评仅限 ${activity.target_audience.grades.join('、')} 参加`);
      }
    }

    // 检查学校限制
    if (activity.target_audience?.schools?.length > 0) {
      if (!activity.target_audience.schools.includes(student.school_id)) {
        result.eligible = false;
        result.reasons.push('您的学校不在该测评范围内');
      }
    }

    // 检查报名人数限制（L1-L3）
    if (activity.max_participants && !activity.require_location) {
      const countResult = await query(`
        SELECT COUNT(*) as count
        FROM assessment_registrations
        WHERE activity_id = $1 AND status = 'confirmed'
      `, [activityId]);

      if (parseInt(countResult.rows[0].count) >= activity.max_participants) {
        result.eligible = false;
        result.reasons.push('报名人数已满');
      }
    }

    // 判断是否需要选择测评点
    result.requireLocation = activity.require_location ||
      ['L4', 'L5', 'L6', 'L7'].includes(activity.ability_level);

    return result;
  }

  /**
   * 批量更新报名状态
   * @param {Array} ids - 报名记录ID数组
   * @param {string} status - 新状态
   * @param {Object} extra - 额外信息
   * @returns {number} 更新的记录数
   */
  static async bulkUpdateStatus(ids, status, extra = {}) {
    if (!ids || ids.length === 0) return 0;

    const { reviewedBy, reason } = extra;

    let sql = 'UPDATE assessment_registrations SET status = $1';
    const params = [status];
    let paramIndex = 2;

    if (status === 'confirmed') {
      sql += ', confirmed_at = NOW()';
    }

    if (status === 'cancelled') {
      sql += ', cancelled_at = NOW()';
      if (reason) {
        sql += `, cancel_reason = $${paramIndex}`;
        params.push(reason);
        paramIndex++;
      }
    }

    if (reviewedBy) {
      sql += `, reviewed_at = NOW(), reviewed_by = $${paramIndex}`;
      params.push(reviewedBy);
      paramIndex++;
    }

    params.push(ids);
    sql += ` WHERE id = ANY($${paramIndex}) RETURNING id`;

    const result = await query(sql, params);
    return result.rowCount;
  }
}

module.exports = AssessmentRegistration;
