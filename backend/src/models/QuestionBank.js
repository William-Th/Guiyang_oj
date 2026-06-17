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
   * 设置/取消隐藏（A2）
   * @param {number} id - 发布记录ID
   * @param {boolean} isHidden - 是否隐藏
   * @param {number} _userId - 操作人ID（预留审计）
   * @returns {Promise<Object>} 更新后的记录
   */
  static async setHidden(id, isHidden, _userId) {
    const sql = `
      UPDATE question_bank
      SET is_hidden = $1
      WHERE id = $2 AND is_active = true
      RETURNING id, draft_id, scope, status, is_hidden
    `;
    const result = await query(sql, [!!isHidden, id]);
    return result.rows[0];
  }

  /**
   * 判断 scope 是否为区级（A1 提级校验用）
   * 兼容 practice_district（泛区级）与 practice_district_xxx（带区码）
   */
  static _isDistrictScope(scope) {
    if (!scope) return false;
    const s = String(scope);
    return s === 'practice_district' || s.startsWith('practice_district_');
  }

  /**
   * 申请提级（区级→市级），创建提级申请（待市级审核）
   * @param {number} bankId - 源区级发布记录ID
   * @param {number} requestedBy - 发起人ID
   * @returns {Promise<Object>} 提级申请记录
   */
  static async requestPromotion(bankId, requestedBy) {
    const source = await query(
      'SELECT * FROM question_bank WHERE id = $1 AND is_active = true',
      [bankId]
    );
    const src = source.rows[0];
    if (!src) {
      throw new Error('源题目不存在');
    }
    if (!QuestionBank._isDistrictScope(src.scope)) {
      throw new Error('仅区级题目可申请提级到市级');
    }

    // 不能重复申请（已有待审或已通过）
    const exist = await query(
      `SELECT id FROM question_promotions
       WHERE draft_id = $1 AND to_scope = 'practice_municipal'
         AND status IN ('pending', 'approved')`,
      [src.draft_id]
    );
    if (exist.rows[0]) {
      throw new Error('该题目已提交提级申请或已提级到市级');
    }

    const ins = await query(
      `INSERT INTO question_promotions
         (draft_id, source_bank_id, from_scope, to_scope, requested_by)
       VALUES ($1, $2, $3, 'practice_municipal', $4)
       RETURNING *`,
      [src.draft_id, bankId, src.scope, requestedBy]
    );
    return ins.rows[0];
  }

  /**
   * 市级管理员审核提级申请
   * @param {number} promotionId - 提级申请ID
   * @param {number} reviewerId - 审核人ID
   * @param {Object} opts - { approve, comment }
   * @returns {Promise<Object>} { promotion, target }
   */
  static async approvePromotion(promotionId, reviewerId, opts = {}) {
    const { approve, comment } = opts;
    const r = await query('SELECT * FROM question_promotions WHERE id = $1', [promotionId]);
    const p = r.rows[0];
    if (!p) {
      throw new Error('提级申请不存在');
    }
    if (p.status !== 'pending') {
      throw new Error('该申请已处理');
    }

    if (approve) {
      const src = await query(
        'SELECT published_by FROM question_bank WHERE id = $1',
        [p.source_bank_id]
      );
      const publishedBy = (src.rows[0] && src.rows[0].published_by) || p.requested_by;
      // 建市级发布记录（复用 publish，内部校验重复发布）
      const target = await QuestionBank.publish({
        draft_id: p.draft_id,
        scope: 'practice_municipal',
        published_by: publishedBy,
        reviewer_id: reviewerId,
        status: 'published'
      });
      await query(
        `UPDATE question_promotions
         SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP,
             review_comment = $2, target_bank_id = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [reviewerId, comment || '', target.id, promotionId]
      );
      return { promotion: { id: promotionId, status: 'approved' }, target };
    }

    await query(
      `UPDATE question_promotions
       SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP,
           review_comment = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [reviewerId, comment || '', promotionId]
    );
    return { promotion: { id: promotionId, status: 'rejected' } };
  }

  /**
   * 市级管理员主动提级（直接生效）
   * @param {number} bankId - 源区级发布记录ID
   * @param {number} adminId - 操作管理员ID
   * @returns {Promise<Object>} { promotion, target }
   */
  static async adminPromote(bankId, adminId) {
    const source = await query(
      'SELECT * FROM question_bank WHERE id = $1 AND is_active = true',
      [bankId]
    );
    const src = source.rows[0];
    if (!src) {
      throw new Error('源题目不存在');
    }
    if (!QuestionBank._isDistrictScope(src.scope)) {
      throw new Error('仅区级题目可提级到市级');
    }

    const target = await QuestionBank.publish({
      draft_id: src.draft_id,
      scope: 'practice_municipal',
      published_by: src.published_by || null,
      reviewer_id: adminId,
      status: 'published'
    });

    const ins = await query(
      `INSERT INTO question_promotions
         (draft_id, source_bank_id, from_scope, to_scope, requested_by,
          status, reviewed_by, reviewed_at, target_bank_id)
       VALUES ($1, $2, $3, 'practice_municipal', $4, 'approved', $5, CURRENT_TIMESTAMP, $6)
       RETURNING *`,
      [src.draft_id, bankId, src.scope, src.published_by || adminId, adminId, target.id]
    );
    return { promotion: ins.rows[0], target };
  }

  /**
   * 提级申请列表（市级管理员审核用）
   * @param {Object} filters - { status, limit, offset }
   * @returns {Promise<Array>} 申请列表
   */
  static async listPromotions(filters = {}) {
    let sql = `
      SELECT p.*,
             qd.subject, qd.content, qd.grade, qd.type,
             u1.real_name AS requester_name,
             u2.real_name AS reviewer_name
      FROM question_promotions p
      JOIN question_drafts qd ON p.draft_id = qd.id
      LEFT JOIN users u1 ON p.requested_by = u1.id
      LEFT JOIN users u2 ON p.reviewed_by = u2.id
      WHERE 1=1
    `;
    const values = [];
    let c = 0;
    if (filters.status) {
      c += 1;
      sql += ` AND p.status = $${c}`;
      values.push(filters.status);
    }
    sql += ' ORDER BY p.requested_at DESC';
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
   * 构建 A2 隐藏题库可见性过滤片段
   * 规则：市级及以上管理员可见所有隐藏题；其余角色仅可见自己创建/审核的隐藏题；
   *       未提供 userId 时仅返回非隐藏题目（保守策略）。
   * @param {Object} userInfo - 用户信息
   * @param {number} startCount - 起始参数编号
   * @returns {Object} { sql, params, count }
   */
  static _buildHiddenFilter(userInfo, startCount) {
    const role = userInfo && userInfo.userRole;
    const canViewAll = role === 'system_admin' || role === 'municipal_admin';
    if (canViewAll) {
      return { sql: '', params: [], count: 0 };
    }
    const userId = userInfo && userInfo.userId;
    if (!userId) {
      return { sql: ' AND is_hidden = false', params: [], count: 0 };
    }
    const p1 = startCount + 1;
    const p2 = startCount + 2;
    return {
      sql: ` AND (is_hidden = false OR created_by = $${p1} OR reviewer_id = $${p2})`,
      params: [userId, userId],
      count: 2
    };
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

    // A2 隐藏题库可见性过滤
    const hiddenFilter = QuestionBank._buildHiddenFilter(userInfo, paramCount);
    sql += hiddenFilter.sql;
    values.push(...hiddenFilter.params);
    paramCount += hiddenFilter.count;

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

    // A2 隐藏题库可见性过滤（与 findAll 一致）
    const hiddenFilter = QuestionBank._buildHiddenFilter(userInfo, paramCount);
    sql += hiddenFilter.sql;
    values.push(...hiddenFilter.params);
    paramCount += hiddenFilter.count;

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
