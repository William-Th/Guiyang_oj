const { query } = require('../database/connection');

const MAX_REPORTS_PER_QUESTION = 5;  // 累计纠错上限（封顶）
const NOTIFY_THRESHOLD = 3;          // 达此累计提醒上级

/**
 * ErrorReport Model (C5 题目纠错)
 * 单学生单题 1 次；题目维度累计 5 次封顶；3 次提醒区级。
 */
class ErrorReport {
  /**
   * 统计题目累计纠错次数（所有状态）
   */
  static async countByQuestion(questionId) {
    const r = await query(
      'SELECT COUNT(*) AS count FROM question_error_reports WHERE question_id = $1',
      [questionId]
    );
    return parseInt(r.rows[0].count, 10);
  }

  /**
   * 学生提交纠错
   * @param {Object} data - { questionId, draftId, reporterId, errorType, errorDescription }
   * @returns {Promise<Object>} { report, totalReports, notifySuperior }
   */
  static async create(data = {}) {
    const {
      questionId,
      draftId,
      reporterId,
      errorType,
      errorDescription
    } = data;
    if (!questionId || !reporterId || !errorType || !errorDescription) {
      throw new Error('questionId/reporterId/errorType/errorDescription 必填');
    }

    // 封顶校验
    const total = await ErrorReport.countByQuestion(questionId);
    if (total >= MAX_REPORTS_PER_QUESTION) {
      throw new Error(`该题累计纠错已达上限（${MAX_REPORTS_PER_QUESTION}次），请等待出题人修订`);
    }

    // 创建（单学生单题 UNIQUE 由 DB 约束兜底）
    const r = await query(
      `INSERT INTO question_error_reports
         (question_id, draft_id, reporter_id, error_type, error_description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [questionId, draftId || null, reporterId, errorType, errorDescription]
    );
    const report = r.rows[0];

    const newTotal = total + 1;
    return {
      report,
      totalReports: newTotal,
      notifySuperior: newTotal >= NOTIFY_THRESHOLD,
      frozen: newTotal >= MAX_REPORTS_PER_QUESTION
    };
  }

  /**
   * 按ID查纠错记录
   */
  static async findById(id) {
    const r = await query(
      `SELECT er.*, qd.content, qd.subject, qd.grade, qd.type
       FROM question_error_reports er
       LEFT JOIN question_drafts qd ON er.draft_id = qd.id
       WHERE er.id = $1`,
      [id]
    );
    return r.rows[0];
  }

  /**
   * 纠错列表（出题人/审核人/管理员查看待处理）
   * @param {Object} filters - { status, questionId, handlerRole, limit, offset }
   * @returns {Promise<Array>}
   */
  static async list(filters = {}) {
    let sql = `
      SELECT er.*,
             qd.content, qd.subject, qd.grade, qd.type,
             u.real_name AS reporter_name,
             hu.real_name AS handler_name
      FROM question_error_reports er
      LEFT JOIN question_bank qb ON er.question_id = qb.id
      LEFT JOIN question_drafts qd ON COALESCE(er.draft_id, qb.draft_id) = qd.id
      LEFT JOIN users u ON er.reporter_id = u.id
      LEFT JOIN users hu ON er.handler_id = hu.id
      WHERE 1=1
    `;
    const values = [];
    let c = 0;
    if (filters.status) {
      c += 1;
      sql += ` AND er.status = $${c}`;
      values.push(filters.status);
    }
    if (filters.questionId) {
      c += 1;
      sql += ` AND er.question_id = $${c}`;
      values.push(filters.questionId);
    }
    sql += ' ORDER BY er.created_at DESC';
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
    const r = await query(sql, values);
    return r.rows;
  }

  /**
   * 处理纠错（出题人/审核人/管理员）
   */
  static async handle(id, handlerId, action, comment) {
    const r = await query(
      `UPDATE question_error_reports
       SET status = $1, handler_id = $2, handle_comment = $3,
           handled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND status = 'pending'
       RETURNING *`,
      [action, handlerId, comment || '', id]
    );
    return r.rows[0];
  }

  /**
   * 判断用户是否有权处理某题纠错（出题人/审核人/上级管理员）
   * @param {Object} question - question_bank 记录（含 created_by/reviewer_id）
   * @param {Object} user
   */
  static canHandle(question, user) {
    if (!question) return false;
    const role = user.role;
    if (role === 'system_admin' || role === 'municipal_admin' ||
        role === 'district_admin' || role === 'school_admin') {
      return true;
    }
    if (question.created_by === user.id || question.reviewer_id === user.id) {
      return true;
    }
    return false;
  }

  static get MAX_REPORTS_PER_QUESTION() { return MAX_REPORTS_PER_QUESTION; }
  static get NOTIFY_THRESHOLD() { return NOTIFY_THRESHOLD; }
}

module.exports = ErrorReport;
