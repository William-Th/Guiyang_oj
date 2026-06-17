const { query } = require('../database/connection');

/**
 * WrongQuestion Model (D4 错题集)
 * 答错自动入库，支持按科目/知识点筛选、重做、移除、标记掌握
 */
class WrongQuestion {
  /**
   * 答错时入库（幂等 upsert：已存在则 error_count++）
   * @param {Object} data - { studentId, questionId, draftId, subject, knowledgePoints, difficulty, sourceActivityId }
   * @returns {Promise<Object>} 入库后的记录
   */
  static async addIfWrong(data = {}) {
    const {
      studentId,
      questionId,
      draftId,
      subject,
      knowledgePoints,
      difficulty,
      sourceActivityId
    } = data;
    if (!studentId || !questionId) {
      throw new Error('studentId 与 questionId 必填');
    }

    const sql = `
      INSERT INTO student_wrong_questions
        (student_id, question_id, draft_id, subject, knowledge_points, difficulty,
         error_count, first_wrong_at, last_wrong_at, source_activity_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $7, 'active')
      ON CONFLICT (student_id, question_id)
      DO UPDATE SET
        error_count = student_wrong_questions.error_count + 1,
        last_wrong_at = CURRENT_TIMESTAMP,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await query(sql, [
      studentId,
      questionId,
      draftId || null,
      subject || null,
      knowledgePoints || [],
      difficulty || null,
      sourceActivityId || null
    ]);
    return result.rows[0];
  }

  /**
   * 重做时计数 +1（用于错题重做积分上限判断）
   * @param {number} studentId
   * @param {number} questionId
   * @returns {Promise<Object|null>}
   */
  static async incReviewCount(studentId, questionId) {
    const result = await query(
      `UPDATE student_wrong_questions
       SET review_count = review_count + 1,
           last_reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $1 AND question_id = $2
       RETURNING *`,
      [studentId, questionId]
    );
    return result.rows[0];
  }

  /**
   * 查询学生错题列表（带筛选/分页）
   * @param {number} studentId
   * @param {Object} filters - { subject, status, limit, offset }
   * @returns {Promise<Array>}
   */
  static async listByStudent(studentId, filters = {}) {
    let sql = `
      SELECT wq.*,
             qd.content, qd.options, qd.correct_answer, qd.type, qd.explanation,
             qd.image_url, qd.level
      FROM student_wrong_questions wq
      JOIN question_bank qb ON wq.question_id = qb.id
      JOIN question_drafts qd ON qb.draft_id = qd.id
      WHERE wq.student_id = $1
    `;
    const values = [studentId];
    let c = 1;
    if (filters.subject) {
      c += 1;
      sql += ` AND wq.subject = $${c}`;
      values.push(filters.subject);
    }
    if (filters.status) {
      c += 1;
      sql += ` AND wq.status = $${c}`;
      values.push(filters.status);
    } else {
      sql += ' AND wq.status = \'active\'';
    }
    sql += ' ORDER BY wq.last_wrong_at DESC';
    if (filters.limit) {
      c += 1;
      sql += ` LIMIT $${c}`;
      values.push(filters.limit);
      if (filters.offset) {
        c += 1;
        sql += ` OFFSET $${c}`;
        values.push(filters.offset);
      }
    }
    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * 统计错题数量
   * @param {number} studentId
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  static async countByStudent(studentId, filters = {}) {
    let sql = `
      SELECT COUNT(*) AS count
      FROM student_wrong_questions
      WHERE student_id = $1
    `;
    const values = [studentId];
    let c = 1;
    if (filters.subject) {
      c += 1;
      sql += ` AND subject = $${c}`;
      values.push(filters.subject);
    }
    if (filters.status) {
      c += 1;
      sql += ` AND status = $${c}`;
      values.push(filters.status);
    } else {
      sql += ' AND status = \'active\'';
    }
    const result = await query(sql, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * 标记为已掌握
   */
  static async markMastered(studentId, questionId) {
    const result = await query(
      `UPDATE student_wrong_questions
       SET status = 'mastered', updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $1 AND question_id = $2
       RETURNING *`,
      [studentId, questionId]
    );
    return result.rows[0];
  }

  /**
   * 移除错题
   */
  static async remove(studentId, questionId) {
    const result = await query(
      `UPDATE student_wrong_questions
       SET status = 'removed', updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $1 AND question_id = $2
       RETURNING *`,
      [studentId, questionId]
    );
    return result.rows[0];
  }

  /**
   * 根据学生+题目查询（重做时校验）
   */
  static async findByStudentAndQuestion(studentId, questionId) {
    const result = await query(
      `SELECT * FROM student_wrong_questions
       WHERE student_id = $1 AND question_id = $2`,
      [studentId, questionId]
    );
    return result.rows[0];
  }
}

module.exports = WrongQuestion;
