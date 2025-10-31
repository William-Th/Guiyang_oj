const { query } = require('../database/connection');

/**
 * Activity Model
 * Represents both assessment (测评) and practice (练习) activities
 */
class Activity {
  /**
   * Validate time limit configuration
   * @param {Object} activityData - Activity data to validate
   * @throws {Error} If time limit configuration is invalid
   */
  static validateTimeLimitConfig(activityData) {
    const { time_limit_type, timeLimitType, start_time, startTime, end_time, endTime, duration } = activityData;

    // Support both naming conventions
    const type = time_limit_type || timeLimitType || 'unlimited';
    const st = start_time || startTime;
    const et = end_time || endTime;

    if (!['unlimited', 'scheduled', 'timed'].includes(type)) {
      throw new Error('Invalid time_limit_type. Must be: unlimited, scheduled, or timed');
    }

    if (type === 'unlimited') {
      if (st || et || duration) {
        throw new Error('Unlimited type cannot have start_time, end_time, or duration');
      }
    }

    if (type === 'scheduled') {
      if (!st || !et) {
        throw new Error('Scheduled type must have both start_time and end_time');
      }
      if (duration) {
        throw new Error('Scheduled type cannot have duration');
      }
      if (new Date(et) <= new Date(st)) {
        throw new Error('end_time must be after start_time');
      }
    }

    if (type === 'timed') {
      if (!duration || duration <= 0) {
        throw new Error('Timed type must have a positive duration (in minutes)');
      }
      if (st || et) {
        throw new Error('Timed type cannot have start_time or end_time');
      }
    }
  }
  /**
   * Find all activities with optional filters
   * @param {Object} filters - Filter criteria
   * @param {string} filters.subject - Subject filter
   * @param {string} filters.grade - Grade filter
   * @param {string} filters.status - Status filter
   * @param {string} filters.type - Activity type: 'assessment' or 'practice'
   * @param {string} filters.ability_level - Ability level: L1-L7
   * @param {string} filters.scope - Scope filter
   * @param {number} filters.created_by - Creator user ID
   * @returns {Promise<Array>} Array of activities
   */
  static async findAll(filters = {}) {
    let whereClause = 'WHERE status != $1';
    let params = ['cancelled'];
    let paramCount = 1;

    if (filters.subject) {
      whereClause += ` AND subject = $${++paramCount}`;
      params.push(filters.subject);
    }

    if (filters.grade) {
      whereClause += ` AND grade = $${++paramCount}`;
      params.push(filters.grade);
    }

    if (filters.status) {
      whereClause += ` AND status = $${++paramCount}`;
      params.push(filters.status);
    }

    if (filters.type) {
      whereClause += ` AND type = $${++paramCount}`;
      params.push(filters.type);
    }

    if (filters.ability_level) {
      whereClause += ` AND ability_level = $${++paramCount}`;
      params.push(filters.ability_level);
    }

    if (filters.scope) {
      whereClause += ` AND scope = $${++paramCount}`;
      params.push(filters.scope);
    }

    if (filters.created_by) {
      whereClause += ` AND created_by = $${++paramCount}`;
      params.push(filters.created_by);
    }

    const result = await query(`
      SELECT id, title, description, subject, grade, start_time, end_time,
             duration, total_score, pass_score, status, type, ability_level,
             scope, allow_retake, max_attempts, is_official, created_by, created_at,
             time_limit_type
      FROM activities
      ${whereClause}
      ORDER BY created_at DESC
    `, params);

    return result.rows;
  }

  /**
   * Find activity by ID
   * @param {number} id - Activity ID
   * @returns {Promise<Object|null>} Activity object or null
   */
  static async findById(id) {
    const result = await query(`
      SELECT id, title, description, subject, grade, start_time, end_time,
             duration, total_score, pass_score, status, type, ability_level,
             scope, allow_retake, max_attempts, is_official, target_audience,
             certificate_config, created_by, created_at, updated_at,
             time_limit_type
      FROM activities
      WHERE id = $1
    `, [id]);

    return result.rows[0];
  }

  /**
   * Find activity by ID with associated questions
   * @param {number} id - Activity ID
   * @returns {Promise<Object|null>} Activity with questions or null
   */
  static async findByIdWithQuestions(id) {
    const activityResult = await query(`
      SELECT id, title, description, subject, grade, start_time, end_time,
             duration, total_score, pass_score, status, type, ability_level,
             scope, allow_retake, max_attempts, is_official, target_audience,
             certificate_config, time_limit_type
      FROM activities
      WHERE id = $1
    `, [id]);

    if (activityResult.rows.length === 0) {
      return null;
    }

    const questionsResult = await query(`
      SELECT id, type, content, options, correct_answer, score, order_no, difficulty, explanation
      FROM questions
      WHERE activity_id = $1
      ORDER BY order_no ASC
    `, [id]);

    const activity = activityResult.rows[0];
    activity.questions = questionsResult.rows;

    return activity;
  }

  /**
   * Create a new activity
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} Created activity
   */
  static async create(activityData) {
    const {
      title,
      description,
      subject,
      grade,
      startTime,
      endTime,
      duration,
      totalScore,
      passScore,
      createdBy,
      type = 'practice',
      abilityLevel,
      ability_level,  // Support both naming conventions
      scope,
      allowRetake,
      allow_retake,   // Support both naming conventions
      maxAttempts,
      max_attempts,   // Support both naming conventions
      isOfficial,
      is_official,    // Support both naming conventions
      targetAudience,
      target_audience, // Support both naming conventions
      certificateConfig,
      certificate_config, // Support both naming conventions
      timeLimitType,
      time_limit_type  // Support both naming conventions
    } = activityData;

    // Use snake_case values if camelCase is not provided
    const finalAbilityLevel = abilityLevel || ability_level;
    const finalAllowRetake = allowRetake !== undefined ? allowRetake : (allow_retake !== undefined ? allow_retake : false);
    const finalMaxAttempts = maxAttempts || max_attempts || 1;
    const finalIsOfficial = isOfficial !== undefined ? isOfficial : (is_official !== undefined ? is_official : false);
    const finalTargetAudience = targetAudience || target_audience || { grades: [], schools: [], classes: [] };
    const finalCertificateConfig = certificateConfig || certificate_config || { enabled: false, template: null };
    const finalTimeLimitType = time_limit_type || timeLimitType || 'unlimited';

    // For backward compatibility: if unlimited type, clear time-related fields
    let finalStartTime = startTime;
    let finalEndTime = endTime;
    let finalDuration = duration;

    if (finalTimeLimitType === 'unlimited') {
      finalStartTime = null;
      finalEndTime = null;
      finalDuration = null;
    }

    // Validate time limit configuration before INSERT
    this.validateTimeLimitConfig({
      time_limit_type: finalTimeLimitType,
      start_time: finalStartTime,
      end_time: finalEndTime,
      duration: finalDuration
    });

    const result = await query(`
      INSERT INTO activities (
        title, description, subject, grade, start_time, end_time,
        duration, total_score, pass_score, created_by, type, ability_level,
        scope, allow_retake, max_attempts, is_official, target_audience,
        certificate_config, time_limit_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, title, subject, grade, start_time, end_time, duration, total_score,
                pass_score, status, type, ability_level, scope, is_official, allow_retake,
                max_attempts, created_at, time_limit_type
    `, [
      title, description, subject, grade, finalStartTime, finalEndTime, finalDuration,
      totalScore, passScore, createdBy, type, finalAbilityLevel, scope, finalAllowRetake,
      finalMaxAttempts, finalIsOfficial, JSON.stringify(finalTargetAudience),
      JSON.stringify(finalCertificateConfig), finalTimeLimitType
    ]);

    return result.rows[0];
  }

  /**
   * Update activity status
   * @param {number} id - Activity ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated activity
   */
  static async updateStatus(id, status) {
    const result = await query(`
      UPDATE activities
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, status
    `, [status, id]);

    return result.rows[0];
  }

  /**
   * Get available activities for a student
   * @param {number} studentId - Student user ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of available activities
   */
  static async getAvailableForStudent(studentId, filters = {}) {
    let additionalWhere = '';
    let params = [studentId];
    let paramCount = 1;

    if (filters.type) {
      additionalWhere += ` AND a.type = $${++paramCount}`;
      params.push(filters.type);
    }

    if (filters.ability_level) {
      additionalWhere += ` AND a.ability_level = $${++paramCount}`;
      params.push(filters.ability_level);
    }

    if (filters.subject) {
      additionalWhere += ` AND a.subject = $${++paramCount}`;
      params.push(filters.subject);
    }

    if (filters.grade) {
      additionalWhere += ` AND a.grade = $${++paramCount}`;
      params.push(filters.grade);
    }

    const result = await query(`
      SELECT a.id, a.title, a.subject, a.grade, a.start_time, a.end_time,
             a.duration, a.total_score, a.status, a.type, a.ability_level,
             a.is_official, a.allow_retake, a.max_attempts, a.time_limit_type,
             sa.status as student_status, sa.attempt_number
      FROM activities a
      LEFT JOIN student_activities sa ON a.id = sa.activity_id AND sa.student_id = $1
      WHERE a.status IN ('published', 'ongoing')
        AND (sa.id IS NULL OR sa.status = 'registered' OR (a.allow_retake = true AND sa.attempt_number < a.max_attempts))
        ${additionalWhere}
      ORDER BY a.start_time ASC
    `, params);

    return result.rows;
  }

  /**
   * Get student's activity history
   * @param {number} studentId - Student user ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of student activities
   */
  static async getStudentHistory(studentId, filters = {}) {
    let additionalWhere = '';
    let params = [studentId];
    let paramCount = 1;

    if (filters.type) {
      additionalWhere += ` AND a.type = $${++paramCount}`;
      params.push(filters.type);
    }

    if (filters.ability_level) {
      additionalWhere += ` AND a.ability_level = $${++paramCount}`;
      params.push(filters.ability_level);
    }

    const result = await query(`
      SELECT a.id, a.title, a.subject, a.type, a.ability_level, a.is_official,
             sa.status, sa.score, sa.submitted_at, sa.attempt_number, sa.is_retake
      FROM student_activities sa
      JOIN activities a ON sa.activity_id = a.id
      WHERE sa.student_id = $1
        ${additionalWhere}
      ORDER BY sa.submitted_at DESC
    `, params);

    return result.rows;
  }

  /**
   * Get activities created by a user
   * @param {number} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of activities
   */
  static async getByCreator(userId, filters = {}) {
    let additionalWhere = '';
    let params = [userId];
    let paramCount = 1;

    if (filters.type) {
      additionalWhere += ` AND type = $${++paramCount}`;
      params.push(filters.type);
    }

    if (filters.status) {
      additionalWhere += ` AND status = $${++paramCount}`;
      params.push(filters.status);
    }

    const result = await query(`
      SELECT id, title, subject, grade, type, ability_level, scope, status,
             total_score, is_official, created_at, updated_at,
             (SELECT COUNT(*) FROM student_activities WHERE activity_id = activities.id) as participant_count
      FROM activities
      WHERE created_by = $1
        ${additionalWhere}
      ORDER BY created_at DESC
    `, params);

    return result.rows;
  }

  /**
   * Update activity
   * @param {number} id - Activity ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated activity
   */
  static async update(id, updateData) {
    const {
      title,
      description,
      startTime,
      endTime,
      duration,
      totalScore,
      passScore,
      abilityLevel,
      allowRetake,
      maxAttempts,
      targetAudience,
      certificateConfig,
      timeLimitType
    } = updateData;

    // If time limit type is being updated, validate the configuration
    if (timeLimitType) {
      // Get current activity to merge with update data
      const currentActivity = await this.findById(id);
      if (!currentActivity) {
        throw new Error('Activity not found');
      }

      const mergedData = {
        time_limit_type: timeLimitType,
        start_time: startTime !== undefined ? startTime : currentActivity.start_time,
        end_time: endTime !== undefined ? endTime : currentActivity.end_time,
        duration: duration !== undefined ? duration : currentActivity.duration
      };

      this.validateTimeLimitConfig(mergedData);
    }

    const result = await query(`
      UPDATE activities
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        duration = COALESCE($5, duration),
        total_score = COALESCE($6, total_score),
        pass_score = COALESCE($7, pass_score),
        ability_level = COALESCE($8, ability_level),
        allow_retake = COALESCE($9, allow_retake),
        max_attempts = COALESCE($10, max_attempts),
        target_audience = COALESCE($11, target_audience),
        certificate_config = COALESCE($12, certificate_config),
        time_limit_type = COALESCE($13, time_limit_type),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      title,
      description,
      startTime,
      endTime,
      duration,
      totalScore,
      passScore,
      abilityLevel,
      allowRetake,
      maxAttempts,
      targetAudience ? JSON.stringify(targetAudience) : null,
      certificateConfig ? JSON.stringify(certificateConfig) : null,
      timeLimitType,
      id
    ]);

    return result.rows[0];
  }

  /**
   * Check if a student is eligible to participate in an activity
   * @param {number} activityId - Activity ID
   * @param {number} studentId - Student user ID
   * @returns {Promise<Object>} Eligibility status and reason
   */
  static async checkStudentEligibility(activityId, studentId) {
    // 1. Get activity details
    const activity = await this.findById(activityId);

    if (!activity) {
      return {
        eligible: false,
        reason: '活动不存在',
        attemptsUsed: 0
      };
    }

    // 2. Check if activity is published
    if (activity.status !== 'published' && activity.status !== 'ongoing') {
      return {
        eligible: false,
        reason: '活动未发布或已结束',
        attemptsUsed: 0
      };
    }

    // 3. Check time range
    const now = new Date();
    if (activity.start_time && now < new Date(activity.start_time)) {
      return {
        eligible: false,
        reason: '活动尚未开始',
        attemptsUsed: 0
      };
    }
    if (activity.end_time && now > new Date(activity.end_time)) {
      return {
        eligible: false,
        reason: '活动已结束',
        attemptsUsed: 0
      };
    }

    // 4. Check target audience (if specified)
    if (activity.target_audience) {
      const targetAudience = activity.target_audience;

      // Get student details
      const studentResult = await query(`
        SELECT u.id, s.grade, s.school_id, s.class
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        WHERE u.id = $1
      `, [studentId]);

      if (studentResult.rows.length === 0) {
        return {
          eligible: false,
          reason: '学生信息不存在',
          attemptsUsed: 0
        };
      }

      const student = studentResult.rows[0];

      // Check grade restriction
      if (targetAudience.grades && targetAudience.grades.length > 0) {
        if (!targetAudience.grades.includes(student.grade)) {
          return {
            eligible: false,
            reason: '不符合目标年级要求',
            attemptsUsed: 0
          };
        }
      }

      // Check school restriction
      if (targetAudience.schools && targetAudience.schools.length > 0) {
        if (!targetAudience.schools.includes(student.school_id)) {
          return {
            eligible: false,
            reason: '不符合目标学校要求',
            attemptsUsed: 0
          };
        }
      }

      // Check class restriction
      if (targetAudience.classes && targetAudience.classes.length > 0) {
        if (!targetAudience.classes.includes(student.class)) {
          return {
            eligible: false,
            reason: '不符合目标班级要求',
            attemptsUsed: 0
          };
        }
      }
    }

    // 5. Check attempt limit
    const attemptResult = await query(`
      SELECT COUNT(*) as attempt_count
      FROM student_activities
      WHERE student_id = $1 AND activity_id = $2 AND status = 'submitted'
    `, [studentId, activityId]);

    const attemptsUsed = parseInt(attemptResult.rows[0].attempt_count);
    const maxAttempts = activity.max_attempts || 1;

    if (attemptsUsed >= maxAttempts) {
      return {
        eligible: false,
        reason: `已达到最大尝试次数（${maxAttempts}次）`,
        attemptsUsed
      };
    }

    // Check if student has an in-progress attempt
    const inProgressResult = await query(`
      SELECT id
      FROM student_activities
      WHERE student_id = $1 AND activity_id = $2 AND status = 'in_progress'
    `, [studentId, activityId]);

    if (inProgressResult.rows.length > 0) {
      return {
        eligible: false,
        reason: '已有进行中的活动，请先完成或退出',
        attemptsUsed
      };
    }

    // All checks passed
    return {
      eligible: true,
      reason: '符合参加条件',
      attemptsUsed
    };
  }

  /**
   * Get activity statistics
   * @param {number} id - Activity ID
   * @returns {Promise<Object>} Activity statistics
   */
  static async getStatistics(id) {
    const result = await query(`
      SELECT
        COUNT(DISTINCT sa.student_id) as total_participants,
        COUNT(DISTINCT CASE WHEN sa.status = 'completed' THEN sa.student_id END) as completed_count,
        AVG(CASE WHEN sa.status = 'completed' THEN sa.score END) as average_score,
        MAX(CASE WHEN sa.status = 'completed' THEN sa.score END) as highest_score,
        MIN(CASE WHEN sa.status = 'completed' THEN sa.score END) as lowest_score,
        a.pass_score,
        COUNT(DISTINCT CASE
          WHEN sa.status = 'completed' AND sa.score >= a.pass_score
          THEN sa.student_id
        END) as passed_count
      FROM activities a
      LEFT JOIN student_activities sa ON a.id = sa.activity_id
      WHERE a.id = $1
      GROUP BY a.id, a.pass_score
    `, [id]);

    if (result.rows.length === 0) {
      return {
        total_participants: 0,
        completed_count: 0,
        average_score: 0,
        pass_rate: 0,
        highest_score: 0,
        lowest_score: 0
      };
    }

    const stats = result.rows[0];
    const total_participants = parseInt(stats.total_participants) || 0;
    const completed_count = parseInt(stats.completed_count) || 0;
    const average_score = parseFloat(stats.average_score) || 0;
    const highest_score = parseFloat(stats.highest_score) || 0;
    const lowest_score = parseFloat(stats.lowest_score) || 0;
    const passed_count = parseInt(stats.passed_count) || 0;

    return {
      total_participants,
      completed_count,
      average_score: Math.round(average_score * 10) / 10, // Round to 1 decimal
      pass_rate: completed_count > 0 ? Math.round((passed_count / completed_count) * 100) : 0,
      highest_score: Math.round(highest_score * 10) / 10,
      lowest_score: Math.round(lowest_score * 10) / 10
    };
  }

  /**
   * Delete activity (soft delete by setting status to 'cancelled')
   * @param {number} id - Activity ID
   * @returns {Promise<Object>} Deleted activity
   */
  static async delete(id) {
    return this.updateStatus(id, 'cancelled');
  }
}

module.exports = Activity;
