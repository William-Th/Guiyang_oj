const { query } = require('../database/connection');
const QuestionDraft = require('./QuestionDraft');
const { generateAndSetQuestionCode } = require('../services/questionCodeService');

/**
 * QuestionBank Model (Redesigned)
 * 题目发布记录模型 - 存储题目的发布记录，一个草稿可以有多条发布记录
 *
 * NEW SEMANTIC (2025-11-22):
 * - question_bank现在是发布记录表，不再直接存储题目内容
 * - 题目内容存储在question_drafts表中
 * - 通过draft_id关联草稿，一个草稿可有多条发布记录
 */
class QuestionBank {
  /**
   * 发布题目（新方法）
   * @param {Object} publishData - 发布数据
   * @returns {Promise<Object>} 发布记录
   */
  static async publish(publishData) {
    const {
      draft_id,
      scope,
      published_by,
      reviewer_id,
      status = 'published' // 校级直接发布，其他需审核则为pending_review
    } = publishData;

    // 检查是否已发布到该范围
    const isDuplicate = await QuestionDraft.isPublishedToScope(draft_id, scope);
    if (isDuplicate) {
      throw new Error('该题目已经发布到此范围，不能重复发布');
    }

    const sql = `
      INSERT INTO question_bank
      (draft_id, scope, published_by, reviewer_id, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [draft_id, scope, published_by, reviewer_id, status];
    const result = await query(sql, values);

    const publishedRecord = result.rows[0];

    // 如果是发布状态，生成题目编码
    if (status === 'published' && publishedRecord) {
      try {
        // 获取草稿的科目信息
        const draft = await QuestionDraft.findById(draft_id);
        if (draft && draft.subject) {
          await generateAndSetQuestionCode(publishedRecord.id, draft.subject);
        }
      } catch (codeError) {
        console.error('Error generating question code:', codeError);
        // 编码生成失败不影响发布
      }
    }

    // 更新草稿的发布计数
    await QuestionDraft.updatePublishCount(draft_id);

    return publishedRecord;
  }

  /**
   * 根据ID查询发布记录（带草稿内容）
   * @param {number} id - 发布记录ID
   * @returns {Promise<Object>} 发布记录详情
   */
  static async findById(id) {
    const sql = `
      SELECT * FROM question_bank_with_draft
      WHERE id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  /**
   * 查询已发布题目列表（带权限控制和区县筛选）
   * @param {Object} filters - 筛选条件
   * @param {Object} userInfo - 用户信息（用于权限控制）
   * @returns {Promise<Array>} 题目列表
   */
  static async findAll(filters = {}, userInfo = {}) {
    let sql = `
      SELECT * FROM question_bank_with_draft
      WHERE is_active = true
    `;
    const values = [];
    let paramCount = 0;

    // 默认只显示已发布的题目
    if (!filters.status) {
      sql += ' AND status = \'published\'';
    } else {
      paramCount++;
      sql += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    // 范围筛选
    if (filters.scope) {
      if (filters.scope === 'practice_district') {
        // 区级题库筛选
        sql += ' AND scope LIKE \'practice_district_%\'';

        // 权限控制：系统/市级管理员可查看所有区县，其他角色只能看自己区域
        const { userRole, districtId } = userInfo;
        const canViewAllDistricts = userRole === 'system_admin' || userRole === 'municipal_admin';

        if (!canViewAllDistricts && districtId) {
          // 非系统/市级管理员：只能看自己区域的题目
          paramCount++;
          sql += ` AND district_id = $${paramCount}`;
          values.push(districtId);
        } else if (canViewAllDistricts && filters.district_code) {
          // 系统/市级管理员：可选择查看特定区域
          paramCount++;
          sql += ` AND district_code = $${paramCount}`;
          values.push(filters.district_code);
        }
        // 如果是系统/市级管理员且未指定district_code，则查看所有区县
      } else if (filters.scope === 'practice_school') {
        // 校级题库筛选
        sql += ' AND scope LIKE \'practice_school_%\'';

        // 如果有schoolId，只显示该学校的题目
        if (userInfo.schoolId) {
          paramCount++;
          sql += ` AND school_id = $${paramCount}`;
          values.push(userInfo.schoolId);
        }
      } else {
        // 其他范围：assessment, practice_municipal
        paramCount++;
        sql += ` AND scope = $${paramCount}`;
        values.push(filters.scope);
      }
    }

    // 科目筛选
    if (filters.subject) {
      paramCount++;
      sql += ` AND subject = $${paramCount}`;
      values.push(filters.subject);
    }

    // 年级筛选
    if (filters.grade) {
      paramCount++;
      sql += ` AND grade = $${paramCount}`;
      values.push(filters.grade);
    }

    // 题型筛选
    if (filters.type) {
      paramCount++;
      sql += ` AND type = $${paramCount}`;
      values.push(filters.type);
    }

    // 难度筛选
    if (filters.difficulty) {
      paramCount++;
      sql += ` AND difficulty = $${paramCount}`;
      values.push(filters.difficulty);
    }

    // 能力等级筛选
    if (filters.level) {
      paramCount++;
      sql += ` AND level = $${paramCount}`;
      values.push(filters.level);
    }

    // 搜索（题目内容或编码）
    if (filters.search) {
      paramCount++;
      sql += ` AND (content ILIKE $${paramCount} OR question_code ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }

    // 排序
    sql += ' ORDER BY published_at DESC';

    // 分页
    if (filters.limit) {
      paramCount++;
      sql += ` LIMIT $${paramCount}`;
      values.push(filters.limit);

      if (filters.offset) {
        paramCount++;
        sql += ` OFFSET $${paramCount}`;
        values.push(filters.offset);
      }
    }

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * 统计已发布题目数量（带权限控制）
   * @param {Object} filters - 筛选条件
   * @param {Object} userInfo - 用户信息
   * @returns {Promise<number>} 题目数量
   */
  static async countAll(filters = {}, userInfo = {}) {
    let sql = `
      SELECT COUNT(*) as count
      FROM question_bank_with_draft
      WHERE is_active = true
    `;
    const values = [];
    let paramCount = 0;

    // 状态筛选
    if (!filters.status) {
      sql += ' AND status = \'published\'';
    } else {
      paramCount++;
      sql += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    // 范围筛选（与findAll相同逻辑）
    if (filters.scope) {
      if (filters.scope === 'practice_district') {
        sql += ' AND scope LIKE \'practice_district_%\'';

        const { userRole, districtId } = userInfo;
        const canViewAllDistricts = userRole === 'system_admin' || userRole === 'municipal_admin';

        if (!canViewAllDistricts && districtId) {
          paramCount++;
          sql += ` AND district_id = $${paramCount}`;
          values.push(districtId);
        } else if (canViewAllDistricts && filters.district_code) {
          paramCount++;
          sql += ` AND district_code = $${paramCount}`;
          values.push(filters.district_code);
        }
      } else if (filters.scope === 'practice_school') {
        sql += ' AND scope LIKE \'practice_school_%\'';

        if (userInfo.schoolId) {
          paramCount++;
          sql += ` AND school_id = $${paramCount}`;
          values.push(userInfo.schoolId);
        }
      } else {
        paramCount++;
        sql += ` AND scope = $${paramCount}`;
        values.push(filters.scope);
      }
    }

    // 其他筛选条件
    if (filters.subject) {
      paramCount++;
      sql += ` AND subject = $${paramCount}`;
      values.push(filters.subject);
    }

    if (filters.grade) {
      paramCount++;
      sql += ` AND grade = $${paramCount}`;
      values.push(filters.grade);
    }

    if (filters.type) {
      paramCount++;
      sql += ` AND type = $${paramCount}`;
      values.push(filters.type);
    }

    if (filters.difficulty) {
      paramCount++;
      sql += ` AND difficulty = $${paramCount}`;
      values.push(filters.difficulty);
    }

    if (filters.level) {
      paramCount++;
      sql += ` AND level = $${paramCount}`;
      values.push(filters.level);
    }

    if (filters.search) {
      paramCount++;
      sql += ` AND (content ILIKE $${paramCount} OR question_code ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }

    const result = await query(sql, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * 更新发布记录状态
   * @param {number} id - 发布记录ID
   * @param {string} status - 新状态
   * @param {Object} extraData - 其他数据（如审核意见）
   * @returns {Promise<Object>} 更新后的记录
   */
  static async updateStatus(id, status, extraData = {}) {
    const { review_comment, reviewer_id } = extraData;

    const sql = `
      UPDATE question_bank
      SET
        status = $1,
        review_comment = COALESCE($2, review_comment),
        reviewer_id = COALESCE($3, reviewer_id),
        reviewed_at = CASE WHEN $1 IN ('published', 'inactive') THEN CURRENT_TIMESTAMP ELSE reviewed_at END
      WHERE id = $4
      RETURNING *
    `;

    const values = [status, review_comment, reviewer_id, id];
    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * 软删除发布记录
   * @param {number} id - 发布记录ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async delete(id) {
    const sql = `
      UPDATE question_bank
      SET is_active = false
      WHERE id = $1
    `;
    const result = await query(sql, [id]);
    return result.rowCount > 0;
  }

  /**
   * 获取用户可访问的题库范围列表
   * @param {Object} userInfo - 用户信息
   * @returns {Promise<Array>} 范围列表
   */
  static async getAvailableScopes(userInfo) {
    const { userRole, districtId, schoolId } = userInfo;
    const scopes = [];

    // 🔧 返回简单的字符串数组，与前端期望的格式一致
    // 所有用户都能访问的范围
    scopes.push('assessment');
    scopes.push('practice_municipal');

    // 区级练习题库
    if (userRole === 'system_admin' || userRole === 'municipal_admin') {
      // 系统/市级管理员可以看到所有区县
      scopes.push('practice_district');
    } else if (districtId) {
      // 区级/校级管理员只能看自己区域
      scopes.push('practice_district');
    }

    // 校级练习题库
    if (schoolId) {
      scopes.push('practice_school');
    }

    return scopes;
  }

  /**
   * 搜索题目（用于组卷）
   * @param {Object} filters - 筛选条件
   * @param {Object} userInfo - 用户信息
   * @returns {Promise<Array>} 题目列表
   */
  static async search(filters, userInfo) {
    // 复用findAll方法，但增加一些组卷特定的筛选
    return this.findAll(filters, userInfo);
  }

  /**
   * 撤回已发布的题目
   * @param {number} id - 发布记录ID
   * @param {number} withdrawnBy - 撤回操作人ID
   * @param {string} reason - 撤回原因
   * @returns {Promise<Object>} 撤回后的记录
   */
  static async withdraw(id, withdrawnBy, reason) {
    const sql = `
      UPDATE question_bank
      SET status = 'inactive',
          withdrawn_by = $1,
          withdrawn_at = CURRENT_TIMESTAMP,
          withdraw_reason = $2
      WHERE id = $3 AND status = 'published'
      RETURNING *
    `;

    const result = await query(sql, [withdrawnBy, reason, id]);
    return result.rows[0];
  }

  // ==================== 兼容性方法（保留旧代码兼容） ====================

  /**
   * @deprecated 使用 QuestionDraft.create() 代替
   * 创建题目草稿（兼容旧代码）
   */
  static async create(questionData) {
    console.warn('QuestionBank.create() is deprecated. Use QuestionDraft.create() instead.');
    const QuestionDraft = require('./QuestionDraft');
    return QuestionDraft.create(questionData);
  }

  /**
   * @deprecated 使用 QuestionDraft.update() 代替
   * 更新题目草稿（兼容旧代码）
   */
  static async update(id, updateData) {
    console.warn('QuestionBank.update() is deprecated. Use QuestionDraft.update() instead.');
    const QuestionDraft = require('./QuestionDraft');
    return QuestionDraft.update(id, updateData);
  }

  /**
   * @deprecated 使用 QuestionDraft.getMyDrafts() 代替
   * 获取我的草稿（兼容旧代码）
   */
  static async getMyDrafts(userId) {
    console.warn('QuestionBank.getMyDrafts() is deprecated. Use QuestionDraft.getMyDrafts() instead.');
    const QuestionDraft = require('./QuestionDraft');
    return QuestionDraft.getMyDrafts(userId);
  }
}

module.exports = QuestionBank;
