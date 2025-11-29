const { query } = require('../database/connection');

/**
 * TeachingClass Model
 * Represents virtual teaching classes that can span across physical classes, schools, or districts
 */
class TeachingClass {
  /**
   * Create a new teaching class (draft status)
   * @param {Object} data - Teaching class data
   * @param {string} data.name - Class name
   * @param {string} data.description - Class description
   * @param {string} data.scope - Scope: school/district/municipal
   * @param {number} data.school_id - School ID (required for school scope)
   * @param {number} data.district_id - District ID (required for district scope)
   * @param {string} data.subject - Subject (optional)
   * @param {string} data.grade - Grade (optional)
   * @param {string} data.academic_year - Academic year
   * @param {number} data.created_by - Creator user ID
   * @returns {Promise<Object>} Created teaching class
   */
  static async create(data) {
    const {
      name,
      description,
      scope,
      school_id,
      district_id,
      subject,
      grade,
      academic_year,
      created_by
    } = data;

    // Validate scope-specific requirements
    if (scope === 'school' && !school_id) {
      throw new Error('school_id is required for school scope');
    }
    if (scope === 'district' && !district_id) {
      throw new Error('district_id is required for district scope');
    }

    const sql = `
      INSERT INTO teaching_classes (
        name, description, scope, school_id, district_id,
        subject, grade, academic_year, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
      RETURNING *
    `;

    const result = await query(sql, [
      name,
      description || null,
      scope,
      school_id || null,
      district_id || null,
      subject || null,
      grade || null,
      academic_year,
      created_by
    ]);

    // Add creator as teacher with 'creator' role
    if (result.rows[0]) {
      await this.addTeacher(result.rows[0].id, created_by, 'creator');
    }

    return result.rows[0];
  }

  /**
   * Find teaching class by ID
   * @param {number} id - Teaching class ID
   * @returns {Promise<Object|null>} Teaching class or null
   */
  static async findById(id) {
    const sql = `
      SELECT tc.*,
             s.name AS school_name,
             d.name AS district_name,
             u.real_name AS creator_name,
             au.real_name AS approver_name
      FROM teaching_classes tc
      LEFT JOIN schools s ON tc.school_id = s.id
      LEFT JOIN districts d ON tc.district_id = d.id
      LEFT JOIN users u ON tc.created_by = u.id
      LEFT JOIN users au ON tc.approved_by = au.id
      WHERE tc.id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all teaching classes with filters
   * @param {Object} filters - Filter criteria
   * @param {string} filters.scope - Scope filter
   * @param {string} filters.status - Status filter
   * @param {number} filters.school_id - School ID filter
   * @param {number} filters.district_id - District ID filter
   * @param {number} filters.created_by - Creator filter
   * @param {string} filters.academic_year - Academic year filter
   * @param {number} filters.limit - Result limit
   * @param {number} filters.offset - Result offset
   * @returns {Promise<Array>} Array of teaching classes
   */
  static async findAll(filters = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (filters.scope) {
      whereClause += ` AND tc.scope = $${++paramCount}`;
      params.push(filters.scope);
    }

    if (filters.status) {
      whereClause += ` AND tc.status = $${++paramCount}`;
      params.push(filters.status);
    }

    if (filters.school_id) {
      whereClause += ` AND tc.school_id = $${++paramCount}`;
      params.push(filters.school_id);
    }

    if (filters.district_id) {
      whereClause += ` AND tc.district_id = $${++paramCount}`;
      params.push(filters.district_id);
    }

    if (filters.created_by) {
      whereClause += ` AND tc.created_by = $${++paramCount}`;
      params.push(filters.created_by);
    }

    if (filters.academic_year) {
      whereClause += ` AND tc.academic_year = $${++paramCount}`;
      params.push(filters.academic_year);
    }

    // For teacher filter - classes where user is a teacher
    if (filters.teacher_user_id) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM teaching_class_teachers tct
        JOIN teachers t ON tct.teacher_id = t.id
        WHERE tct.teaching_class_id = tc.id
          AND t.user_id = $${++paramCount}
          AND tct.is_active = TRUE
      )`;
      params.push(filters.teacher_user_id);
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const sql = `
      SELECT tc.*,
             s.name AS school_name,
             d.name AS district_name,
             u.real_name AS creator_name,
             (SELECT COUNT(*) FROM teaching_class_members tcm
              WHERE tcm.teaching_class_id = tc.id AND tcm.is_active = TRUE) AS student_count,
             (SELECT COUNT(*) FROM teaching_class_teachers tct
              WHERE tct.teaching_class_id = tc.id AND tct.is_active = TRUE) AS teacher_count,
             (SELECT COUNT(*) FROM teaching_class_activities tca
              WHERE tca.teaching_class_id = tc.id) AS activity_count
      FROM teaching_classes tc
      LEFT JOIN schools s ON tc.school_id = s.id
      LEFT JOIN districts d ON tc.district_id = d.id
      LEFT JOIN users u ON tc.created_by = u.id
      ${whereClause}
      ORDER BY tc.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    params.push(limit, offset);
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Count teaching classes with filters
   * @param {Object} filters - Same filters as findAll
   * @returns {Promise<number>} Count
   */
  static async count(filters = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (filters.scope) {
      whereClause += ` AND scope = $${++paramCount}`;
      params.push(filters.scope);
    }

    if (filters.status) {
      whereClause += ` AND status = $${++paramCount}`;
      params.push(filters.status);
    }

    if (filters.school_id) {
      whereClause += ` AND school_id = $${++paramCount}`;
      params.push(filters.school_id);
    }

    if (filters.district_id) {
      whereClause += ` AND district_id = $${++paramCount}`;
      params.push(filters.district_id);
    }

    if (filters.created_by) {
      whereClause += ` AND created_by = $${++paramCount}`;
      params.push(filters.created_by);
    }

    const sql = `SELECT COUNT(*) AS total FROM teaching_classes ${whereClause}`;
    const result = await query(sql, params);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Update teaching class (only allowed in draft status)
   * @param {number} id - Teaching class ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated teaching class
   */
  static async update(id, data) {
    const teachingClass = await this.findById(id);
    if (!teachingClass) {
      throw new Error('Teaching class not found');
    }
    if (teachingClass.status !== 'draft') {
      throw new Error('Can only update teaching class in draft status');
    }

    const allowedFields = ['name', 'description', 'subject', 'grade', 'academic_year'];
    const updates = [];
    const params = [];
    let paramCount = 0;

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${++paramCount}`);
        params.push(data[field]);
      }
    }

    if (updates.length === 0) {
      return teachingClass;
    }

    params.push(id);
    const sql = `
      UPDATE teaching_classes
      SET ${updates.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await query(sql, params);
    return result.rows[0];
  }

  /**
   * Delete teaching class (only allowed in draft status)
   * @param {number} id - Teaching class ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id) {
    const teachingClass = await this.findById(id);
    if (!teachingClass) {
      throw new Error('Teaching class not found');
    }
    if (teachingClass.status !== 'draft') {
      throw new Error('Can only delete teaching class in draft status');
    }

    const sql = 'DELETE FROM teaching_classes WHERE id = $1';
    await query(sql, [id]);
    return true;
  }

  /**
   * Submit teaching class for approval
   * @param {number} id - Teaching class ID
   * @returns {Promise<Object>} Updated teaching class
   */
  static async submitForApproval(id) {
    const teachingClass = await this.findById(id);
    if (!teachingClass) {
      throw new Error('Teaching class not found');
    }
    if (teachingClass.status !== 'draft' && teachingClass.status !== 'rejected') {
      throw new Error('Can only submit draft or rejected teaching class for approval');
    }

    // Determine initial reviewer level based on scope
    let reviewerLevel;
    switch (teachingClass.scope) {
    case 'school':
      reviewerLevel = 'school';
      break;
    case 'district':
      reviewerLevel = 'district';
      break;
    case 'municipal':
      reviewerLevel = 'municipal';
      break;
    default:
      throw new Error('Invalid scope');
    }

    const sql = `
      UPDATE teaching_classes
      SET status = 'pending',
          submitted_at = CURRENT_TIMESTAMP,
          current_reviewer_level = $1,
          rejection_reason = NULL
      WHERE id = $2
      RETURNING *
    `;

    const result = await query(sql, [reviewerLevel, id]);
    return result.rows[0];
  }

  /**
   * Approve teaching class
   * @param {number} id - Teaching class ID
   * @param {number} reviewerId - Reviewer user ID
   * @param {string} reviewerLevel - Reviewer level: school/district/municipal
   * @param {string} comment - Approval comment
   * @returns {Promise<Object>} Updated teaching class
   */
  static async approve(id, reviewerId, reviewerLevel, comment = null) {
    const teachingClass = await this.findById(id);
    if (!teachingClass) {
      throw new Error('Teaching class not found');
    }
    if (teachingClass.status !== 'pending') {
      throw new Error('Teaching class is not pending approval');
    }

    // Update teaching class
    const sql = `
      UPDATE teaching_classes
      SET status = 'approved',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [reviewerId, id]);

    // Record approval
    await this.addApprovalRecord(id, reviewerId, 'approve', reviewerLevel, comment);

    return result.rows[0];
  }

  /**
   * Reject teaching class
   * @param {number} id - Teaching class ID
   * @param {number} reviewerId - Reviewer user ID
   * @param {string} reviewerLevel - Reviewer level
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated teaching class
   */
  static async reject(id, reviewerId, reviewerLevel, reason) {
    const teachingClass = await this.findById(id);
    if (!teachingClass) {
      throw new Error('Teaching class not found');
    }
    if (teachingClass.status !== 'pending') {
      throw new Error('Teaching class is not pending approval');
    }
    if (!reason) {
      throw new Error('Rejection reason is required');
    }

    const sql = `
      UPDATE teaching_classes
      SET status = 'rejected',
          rejection_reason = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [reason, id]);

    // Record rejection
    await this.addApprovalRecord(id, reviewerId, 'reject', reviewerLevel, reason);

    return result.rows[0];
  }

  /**
   * Escalate teaching class to higher level
   * @param {number} id - Teaching class ID
   * @param {string} fromLevel - Current level
   * @param {string} toLevel - Target level
   * @returns {Promise<Object>} Updated teaching class
   */
  static async escalate(id, fromLevel, toLevel) {
    const sql = `
      UPDATE teaching_classes
      SET current_reviewer_level = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [toLevel, id]);

    // Record escalation (system action)
    await this.addApprovalRecord(id, null, 'escalate', fromLevel, `Auto-escalated from ${fromLevel} to ${toLevel} due to timeout`);

    return result.rows[0];
  }

  /**
   * Get pending teaching classes for a reviewer
   * @param {string} reviewerLevel - Reviewer level: school/district/municipal
   * @param {Object} filters - Additional filters (school_id, district_id)
   * @returns {Promise<Array>} Pending teaching classes
   */
  static async getPendingForReviewer(reviewerLevel, filters = {}) {
    let whereClause = 'WHERE tc.status = \'pending\' AND tc.current_reviewer_level = $1';
    const params = [reviewerLevel];
    let paramCount = 1;

    // School level admin can only see their school's classes
    if (reviewerLevel === 'school' && filters.school_id) {
      whereClause += ` AND tc.school_id = $${++paramCount}`;
      params.push(filters.school_id);
    }

    // District level admin can only see their district's classes
    if (reviewerLevel === 'district' && filters.district_id) {
      whereClause += ` AND (tc.district_id = $${++paramCount} OR tc.school_id IN (
        SELECT id FROM schools WHERE district_id = $${paramCount}
      ))`;
      params.push(filters.district_id);
    }

    const sql = `
      SELECT tc.*,
             s.name AS school_name,
             d.name AS district_name,
             u.real_name AS creator_name,
             EXTRACT(DAY FROM (CURRENT_TIMESTAMP - tc.submitted_at)) AS pending_days
      FROM teaching_classes tc
      LEFT JOIN schools s ON tc.school_id = s.id
      LEFT JOIN districts d ON tc.district_id = d.id
      LEFT JOIN users u ON tc.created_by = u.id
      ${whereClause}
      ORDER BY tc.submitted_at ASC
    `;

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Add approval record
   * @private
   */
  static async addApprovalRecord(teachingClassId, reviewerId, action, reviewerLevel, comment) {
    const sql = `
      INSERT INTO teaching_class_approvals (
        teaching_class_id, reviewer_id, action, reviewer_level, comment
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await query(sql, [teachingClassId, reviewerId, action, reviewerLevel, comment]);
    return result.rows[0];
  }

  /**
   * Get approval history
   * @param {number} teachingClassId - Teaching class ID
   * @returns {Promise<Array>} Approval records
   */
  static async getApprovalHistory(teachingClassId) {
    const sql = `
      SELECT tca.*,
             u.real_name AS reviewer_name
      FROM teaching_class_approvals tca
      LEFT JOIN users u ON tca.reviewer_id = u.id
      WHERE tca.teaching_class_id = $1
      ORDER BY tca.created_at ASC
    `;
    const result = await query(sql, [teachingClassId]);
    return result.rows;
  }

  // ========== Student Management ==========

  /**
   * Add student to teaching class
   * @param {number} teachingClassId - Teaching class ID
   * @param {number} studentId - Student ID
   * @returns {Promise<Object>} Member record
   */
  static async addStudent(teachingClassId, studentId) {
    // Check if already a member
    const existingCheck = await query(
      'SELECT * FROM teaching_class_members WHERE teaching_class_id = $1 AND student_id = $2',
      [teachingClassId, studentId]
    );

    if (existingCheck.rows.length > 0) {
      // Reactivate if inactive
      if (!existingCheck.rows[0].is_active) {
        const sql = `
          UPDATE teaching_class_members
          SET is_active = TRUE, removed_at = NULL, joined_at = CURRENT_TIMESTAMP
          WHERE teaching_class_id = $1 AND student_id = $2
          RETURNING *
        `;
        const result = await query(sql, [teachingClassId, studentId]);
        return result.rows[0];
      }
      throw new Error('Student is already a member of this class');
    }

    const sql = `
      INSERT INTO teaching_class_members (teaching_class_id, student_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await query(sql, [teachingClassId, studentId]);
    return result.rows[0];
  }

  /**
   * Add multiple students to teaching class
   * @param {number} teachingClassId - Teaching class ID
   * @param {Array<number>} studentIds - Student IDs
   * @returns {Promise<Object>} Result with success count and errors
   */
  static async addStudentsBatch(teachingClassId, studentIds) {
    const results = { success: 0, errors: [] };

    for (const studentId of studentIds) {
      try {
        await this.addStudent(teachingClassId, studentId);
        results.success++;
      } catch (error) {
        results.errors.push({ studentId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Remove student from teaching class
   * @param {number} teachingClassId - Teaching class ID
   * @param {number} studentId - Student ID
   * @returns {Promise<boolean>} Success
   */
  static async removeStudent(teachingClassId, studentId) {
    const sql = `
      UPDATE teaching_class_members
      SET is_active = FALSE, removed_at = CURRENT_TIMESTAMP
      WHERE teaching_class_id = $1 AND student_id = $2
      RETURNING *
    `;
    const result = await query(sql, [teachingClassId, studentId]);
    if (result.rows.length === 0) {
      throw new Error('Student is not a member of this class');
    }
    return true;
  }

  /**
   * Get students in teaching class
   * @param {number} teachingClassId - Teaching class ID
   * @param {boolean} activeOnly - Only active members
   * @returns {Promise<Array>} Students
   */
  static async getStudents(teachingClassId, activeOnly = true) {
    let whereClause = 'WHERE tcm.teaching_class_id = $1';
    if (activeOnly) {
      whereClause += ' AND tcm.is_active = TRUE';
    }

    const sql = `
      SELECT s.*,
             u.username,
             u.real_name,
             u.phone,
             sch.name AS school_name,
             tcm.joined_at,
             tcm.is_active
      FROM teaching_class_members tcm
      JOIN students s ON tcm.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN schools sch ON s.school_id = sch.id
      ${whereClause}
      ORDER BY u.real_name ASC
    `;
    const result = await query(sql, [teachingClassId]);
    return result.rows;
  }

  // ========== Teacher Management ==========

  /**
   * Add teacher to teaching class
   * @param {number} teachingClassId - Teaching class ID
   * @param {number} userIdOrTeacherId - User ID or Teacher ID
   * @param {string} role - Role: creator/teacher/assistant
   * @returns {Promise<Object>} Teacher record
   */
  static async addTeacher(teachingClassId, userIdOrTeacherId, role = 'teacher') {
    // First try to find teacher by user_id
    let teacherResult = await query('SELECT id FROM teachers WHERE user_id = $1', [userIdOrTeacherId]);

    let teacherId;
    if (teacherResult.rows.length > 0) {
      teacherId = teacherResult.rows[0].id;
    } else {
      // Check if it's already a teacher_id
      teacherResult = await query('SELECT id FROM teachers WHERE id = $1', [userIdOrTeacherId]);
      if (teacherResult.rows.length > 0) {
        teacherId = userIdOrTeacherId;
      } else {
        throw new Error('Teacher not found');
      }
    }

    const sql = `
      INSERT INTO teaching_class_teachers (teaching_class_id, teacher_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (teaching_class_id, teacher_id)
      DO UPDATE SET role = $3, is_active = TRUE
      RETURNING *
    `;
    const result = await query(sql, [teachingClassId, teacherId, role]);
    return result.rows[0];
  }

  /**
   * Get teachers in teaching class
   * @param {number} teachingClassId - Teaching class ID
   * @returns {Promise<Array>} Teachers
   */
  static async getTeachers(teachingClassId) {
    const sql = `
      SELECT t.*,
             u.username,
             u.real_name,
             u.phone,
             tct.role,
             tct.assigned_at,
             tct.is_active
      FROM teaching_class_teachers tct
      JOIN teachers t ON tct.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE tct.teaching_class_id = $1 AND tct.is_active = TRUE
      ORDER BY tct.role ASC, u.real_name ASC
    `;
    const result = await query(sql, [teachingClassId]);
    return result.rows;
  }

  // ========== Activity Management ==========

  /**
   * Add activity to teaching class
   * @param {number} teachingClassId - Teaching class ID
   * @param {number} activityId - Activity ID
   * @param {number} assignedBy - User ID who assigned
   * @param {Object} options - Additional options (deadline, is_required)
   * @returns {Promise<Object>} Activity association record
   */
  static async addActivity(teachingClassId, activityId, assignedBy, options = {}) {
    const sql = `
      INSERT INTO teaching_class_activities (
        teaching_class_id, activity_id, assigned_by, deadline, is_required
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (teaching_class_id, activity_id) DO UPDATE
      SET deadline = $4, is_required = $5
      RETURNING *
    `;
    const result = await query(sql, [
      teachingClassId,
      activityId,
      assignedBy,
      options.deadline || null,
      options.is_required || false
    ]);
    return result.rows[0];
  }

  /**
   * Remove activity from teaching class
   * @param {number} teachingClassId - Teaching class ID
   * @param {number} activityId - Activity ID
   * @returns {Promise<boolean>} Success
   */
  static async removeActivity(teachingClassId, activityId) {
    const sql = `
      DELETE FROM teaching_class_activities
      WHERE teaching_class_id = $1 AND activity_id = $2
    `;
    await query(sql, [teachingClassId, activityId]);
    return true;
  }

  /**
   * Get activities for teaching class
   * @param {number} teachingClassId - Teaching class ID
   * @returns {Promise<Array>} Activities
   */
  static async getActivities(teachingClassId) {
    const sql = `
      SELECT a.*,
             tca.assigned_at,
             tca.deadline,
             tca.is_required,
             u.real_name AS assigned_by_name
      FROM teaching_class_activities tca
      JOIN activities a ON tca.activity_id = a.id
      LEFT JOIN users u ON tca.assigned_by = u.id
      WHERE tca.teaching_class_id = $1
      ORDER BY tca.assigned_at DESC
    `;
    const result = await query(sql, [teachingClassId]);
    return result.rows;
  }

  // ========== Statistics ==========

  /**
   * Get teaching class statistics
   * @param {number} teachingClassId - Teaching class ID
   * @returns {Promise<Object>} Statistics
   */
  static async getStatistics(teachingClassId) {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM teaching_class_members
         WHERE teaching_class_id = $1 AND is_active = TRUE) AS student_count,
        (SELECT COUNT(*) FROM teaching_class_teachers
         WHERE teaching_class_id = $1 AND is_active = TRUE) AS teacher_count,
        (SELECT COUNT(*) FROM teaching_class_activities
         WHERE teaching_class_id = $1) AS activity_count
    `;
    const result = await query(sql, [teachingClassId]);
    return result.rows[0];
  }

  // ========== Timeout Escalation ==========

  /**
   * Find teaching classes that need escalation (pending > 7 days)
   * @returns {Promise<Array>} Teaching classes to escalate
   */
  static async findPendingTimeoutClasses() {
    const sql = `
      SELECT *
      FROM teaching_classes
      WHERE status = 'pending'
        AND submitted_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
        AND current_reviewer_level != 'municipal'
    `;
    const result = await query(sql);
    return result.rows;
  }

  /**
   * Process timeout escalations
   * @returns {Promise<Object>} Results
   */
  static async processTimeoutEscalations() {
    const pendingClasses = await this.findPendingTimeoutClasses();
    const results = { escalated: 0, errors: [] };

    for (const tc of pendingClasses) {
      try {
        let toLevel;
        switch (tc.current_reviewer_level) {
        case 'school':
          toLevel = 'district';
          break;
        case 'district':
          toLevel = 'municipal';
          break;
        default:
          continue;
        }

        await this.escalate(tc.id, tc.current_reviewer_level, toLevel);
        results.escalated++;
      } catch (error) {
        results.errors.push({ id: tc.id, error: error.message });
      }
    }

    return results;
  }
}

module.exports = TeachingClass;
