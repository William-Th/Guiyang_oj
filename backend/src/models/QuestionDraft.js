const { query } = require('../database/connection');

/**
 * QuestionDraft Model
 * 题目草稿模型 - 存储题目的原始内容，可多次发布到不同范围
 */
class QuestionDraft {
  /**
   * 创建题目草稿
   * @param {Object} draftData - 草稿数据
   * @returns {Promise<Object>} 创建的草稿
   */
  static async create(draftData) {
    const {
      type,
      subject,
      grade,
      content,
      options,
      correct_answer,
      suggested_score,
      level,
      difficulty,
      explanation,
      tags,
      image_url,
      created_by,
      abilities,
      knowledge_points,
      // Programming question fields
      code_template,
      time_limit,
      memory_limit,
      judge_mode,
      special_judge_code,
      supported_languages
    } = draftData;

    const sql = `
      INSERT INTO question_drafts
      (type, subject, grade, content, options, correct_answer, suggested_score, level,
       difficulty, explanation, tags, image_url, created_by, abilities, knowledge_points,
       code_template, time_limit, memory_limit, judge_mode, special_judge_code, supported_languages)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;

    const values = [
      type,
      subject,
      grade,
      content,
      JSON.stringify(options),
      JSON.stringify(correct_answer),
      suggested_score || 5,
      level || 'L1',
      difficulty || 'medium',
      explanation,
      tags,
      image_url,
      created_by,
      abilities || [],
      knowledge_points || [],
      // Programming question fields (only set for code type)
      type === 'code' ? code_template : null,
      type === 'code' ? (time_limit || 1000) : null,
      type === 'code' ? (memory_limit || 256) : null,
      type === 'code' ? (judge_mode || 'standard') : null,
      type === 'code' ? special_judge_code : null,
      type === 'code' ? (supported_languages || ['cpp']) : null
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * 根据ID查询草稿
   * @param {number} id - 草稿ID
   * @returns {Promise<Object>} 草稿详情
   */
  static async findById(id) {
    const sql = `
      SELECT
        qd.*,
        u.real_name as creator_name
      FROM question_drafts qd
      LEFT JOIN users u ON qd.created_by = u.id
      WHERE qd.id = $1 AND qd.is_active = true
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  /**
   * 更新草稿
   * @param {number} id - 草稿ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新后的草稿
   */
  static async update(id, updateData) {
    const {
      type,
      subject,
      grade,
      content,
      options,
      correct_answer,
      suggested_score,
      level,
      difficulty,
      explanation,
      tags,
      image_url,
      abilities,
      knowledge_points,
      // Programming question fields
      code_template,
      time_limit,
      memory_limit,
      judge_mode,
      special_judge_code,
      supported_languages
    } = updateData;

    const sql = `
      UPDATE question_drafts
      SET
        type = COALESCE($1, type),
        subject = COALESCE($2, subject),
        grade = COALESCE($3, grade),
        content = COALESCE($4, content),
        options = COALESCE($5, options),
        correct_answer = COALESCE($6, correct_answer),
        suggested_score = COALESCE($7, suggested_score),
        level = COALESCE($8, level),
        difficulty = COALESCE($9, difficulty),
        explanation = COALESCE($10, explanation),
        tags = COALESCE($11, tags),
        image_url = COALESCE($12, image_url),
        abilities = COALESCE($13, abilities),
        knowledge_points = COALESCE($14, knowledge_points),
        code_template = COALESCE($15, code_template),
        time_limit = COALESCE($16, time_limit),
        memory_limit = COALESCE($17, memory_limit),
        judge_mode = COALESCE($18, judge_mode),
        special_judge_code = COALESCE($19, special_judge_code),
        supported_languages = COALESCE($20, supported_languages),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $21 AND is_active = true
      RETURNING *
    `;

    const values = [
      type,
      subject,
      grade,
      content,
      options ? JSON.stringify(options) : null,
      correct_answer ? JSON.stringify(correct_answer) : null,
      suggested_score,
      level,
      difficulty,
      explanation,
      tags,
      image_url,
      abilities,
      knowledge_points,
      code_template,
      time_limit,
      memory_limit,
      judge_mode,
      special_judge_code,
      supported_languages,
      id
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * 软删除草稿
   * @param {number} id - 草稿ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async delete(id) {
    const sql = `
      UPDATE question_drafts
      SET is_active = false
      WHERE id = $1
    `;
    const result = await query(sql, [id]);
    return result.rowCount > 0;
  }

  /**
   * 获取我的草稿列表
   * @param {number} userId - 用户ID
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>} 草稿列表
   */
  static async getMyDrafts(userId, filters = {}) {
    let sql = `
      SELECT
        qd.*,
        u.real_name as creator_name
      FROM question_drafts qd
      LEFT JOIN users u ON qd.created_by = u.id
      WHERE qd.created_by = $1 AND qd.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM question_bank qb
          WHERE qb.draft_id = qd.id AND qb.is_active = true
        )
    `;
    const values = [userId];
    let paramCount = 1;

    // 筛选条件
    if (filters.subject) {
      paramCount++;
      sql += ` AND qd.subject = $${paramCount}`;
      values.push(filters.subject);
    }

    if (filters.grade) {
      paramCount++;
      sql += ` AND qd.grade = $${paramCount}`;
      values.push(filters.grade);
    }

    if (filters.type) {
      paramCount++;
      sql += ` AND qd.type = $${paramCount}`;
      values.push(filters.type);
    }

    if (filters.difficulty) {
      paramCount++;
      sql += ` AND qd.difficulty = $${paramCount}`;
      values.push(filters.difficulty);
    }

    if (filters.level) {
      paramCount++;
      sql += ` AND qd.level = $${paramCount}`;
      values.push(filters.level);
    }

    // 搜索（题目内容）
    if (filters.search) {
      paramCount++;
      sql += ` AND qd.content ILIKE $${paramCount}`;
      values.push(`%${filters.search}%`);
    }

    // 排序
    sql += ' ORDER BY qd.created_at DESC';

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
   * 统计我的草稿数量
   * @param {number} userId - 用户ID
   * @param {Object} filters - 筛选条件
   * @returns {Promise<number>} 草稿数量
   */
  static async countMyDrafts(userId, filters = {}) {
    let sql = `
      SELECT COUNT(*) as count
      FROM question_drafts qd
      WHERE qd.created_by = $1 AND qd.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM question_bank qb
          WHERE qb.draft_id = qd.id AND qb.is_active = true
        )
    `;
    const values = [userId];
    let paramCount = 1;

    // 筛选条件（与getMyDrafts相同）
    if (filters.subject) {
      paramCount++;
      sql += ` AND qd.subject = $${paramCount}`;
      values.push(filters.subject);
    }

    if (filters.grade) {
      paramCount++;
      sql += ` AND qd.grade = $${paramCount}`;
      values.push(filters.grade);
    }

    if (filters.type) {
      paramCount++;
      sql += ` AND qd.type = $${paramCount}`;
      values.push(filters.type);
    }

    if (filters.difficulty) {
      paramCount++;
      sql += ` AND qd.difficulty = $${paramCount}`;
      values.push(filters.difficulty);
    }

    if (filters.level) {
      paramCount++;
      sql += ` AND qd.level = $${paramCount}`;
      values.push(filters.level);
    }

    if (filters.search) {
      paramCount++;
      sql += ` AND qd.content ILIKE $${paramCount}`;
      values.push(`%${filters.search}%`);
    }

    const result = await query(sql, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * 获取草稿的发布记录
   * @param {number} draftId - 草稿ID
   * @returns {Promise<Array>} 发布记录列表
   */
  static async getPublications(draftId) {
    const sql = `
      SELECT
        qb.id,
        qb.scope,
        qb.status,
        qb.question_code,
        qb.usage_count,
        qb.success_rate,
        qb.published_at,
        qb.published_by,
        d.name as district_name,
        d.code as district_code,
        s.name as school_name,
        u.real_name as publisher_name
      FROM question_bank qb
      LEFT JOIN districts d ON qb.district_id = d.id
      LEFT JOIN schools s ON qb.school_id = s.id
      LEFT JOIN users u ON qb.published_by = u.id
      WHERE qb.draft_id = $1 AND qb.is_active = true
      ORDER BY qb.published_at DESC
    `;
    const result = await query(sql, [draftId]);
    return result.rows;
  }

  /**
   * 检查草稿是否已发布到指定范围
   * @param {number} draftId - 草稿ID
   * @param {string} scope - 发布范围
   * @returns {Promise<boolean>} 是否已发布
   */
  static async isPublishedToScope(draftId, scope) {
    const sql = `
      SELECT EXISTS (
        SELECT 1 FROM question_bank
        WHERE draft_id = $1 AND scope = $2 AND is_active = true
      ) as exists
    `;
    const result = await query(sql, [draftId, scope]);
    return result.rows[0].exists;
  }

  /**
   * 更新发布计数
   * @param {number} draftId - 草稿ID
   * @returns {Promise<void>}
   */
  static async updatePublishCount(draftId) {
    const sql = `
      UPDATE question_drafts
      SET publish_count = (
        SELECT COUNT(*) FROM question_bank
        WHERE draft_id = $1 AND is_active = true
      )
      WHERE id = $1
    `;
    await query(sql, [draftId]);
  }

  /**
   * 克隆草稿（用于"修订"已发布题目）
   * @param {number} draftId - 原草稿ID
   * @param {number} createdBy - 克隆者用户ID
   * @returns {Promise<Object>} 新草稿
   */
  static async cloneFrom(draftId, createdBy) {
    const original = await this.findById(draftId);
    if (!original) {
      throw new Error('原草稿不存在');
    }

    // 复制所有内容字段，创建新草稿
    const clonedData = {
      type: original.type,
      subject: original.subject,
      grade: original.grade,
      content: original.content,
      options: original.options,
      correct_answer: original.correct_answer,
      suggested_score: original.suggested_score,
      level: original.level,
      difficulty: original.difficulty,
      explanation: original.explanation,
      tags: original.tags,
      image_url: original.image_url,
      abilities: original.abilities,
      knowledge_points: original.knowledge_points,
      created_by: createdBy,
      // 编程题字段
      code_template: original.code_template,
      time_limit: original.time_limit,
      memory_limit: original.memory_limit,
      judge_mode: original.judge_mode,
      special_judge_code: original.special_judge_code,
      supported_languages: original.supported_languages
    };

    return this.create(clonedData);
  }

  /**
   * 批量获取草稿（用于迁移或管理）
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>} 草稿列表
   */
  static async findAll(filters = {}) {
    let sql = `
      SELECT
        qd.*,
        u.real_name as creator_name
      FROM question_drafts qd
      LEFT JOIN users u ON qd.created_by = u.id
      WHERE qd.is_active = true
    `;
    const values = [];
    let paramCount = 0;

    if (filters.subject) {
      paramCount++;
      sql += ` AND qd.subject = $${paramCount}`;
      values.push(filters.subject);
    }

    if (filters.grade) {
      paramCount++;
      sql += ` AND qd.grade = $${paramCount}`;
      values.push(filters.grade);
    }

    if (filters.created_by) {
      paramCount++;
      sql += ` AND qd.created_by = $${paramCount}`;
      values.push(filters.created_by);
    }

    sql += ' ORDER BY qd.created_at DESC';

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
   * 获取我的提交（已提交审核的题目）
   * @param {number} userId - 用户ID
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>} 提交列表
   */
  static async getMySubmissions(userId, filters = {}) {
    const { query } = require('../database/connection');
    const DISTRICT_CODES = require('../config/districts').DISTRICT_CODES;

    let sql = `
      SELECT
        qb.id as submission_id,
        qb.draft_id,
        qb.scope,
        qb.status,
        qb.reviewer_id,
        qb.review_comment,
        qb.reviewed_at,
        qb.published_at as submitted_at,
        qd.id,
        qd.type,
        qd.subject,
        qd.grade,
        qd.level,
        qd.content,
        qd.difficulty,
        qd.suggested_score,
        qd.abilities,
        qd.knowledge_points,
        qd.created_at as draft_created_at,
        reviewer.real_name as reviewer_name,
        reviewer.username as reviewer_username
      FROM question_bank qb
      INNER JOIN question_drafts qd ON qb.draft_id = qd.id
      LEFT JOIN users reviewer ON qb.reviewer_id = reviewer.id
      WHERE qb.published_by = $1 AND qb.is_active = true
    `;
    const values = [userId];
    let paramCount = 1;

    // 筛选条件
    if (filters.status) {
      paramCount++;
      sql += ` AND qb.status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.subject) {
      paramCount++;
      sql += ` AND qd.subject = $${paramCount}`;
      values.push(filters.subject);
    }

    if (filters.type) {
      paramCount++;
      sql += ` AND qd.type = $${paramCount}`;
      values.push(filters.type);
    }

    // 搜索（题目内容）
    if (filters.search) {
      paramCount++;
      sql += ` AND qd.content ILIKE $${paramCount}`;
      values.push(`%${filters.search}%`);
    }

    sql += ' ORDER BY qb.published_at DESC';

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

    // 格式化返回数据
    return result.rows.map(row => {
      // 格式化scope文本
      let scopeText = row.scope;
      if (row.scope === 'assessment') {
        scopeText = '测评题库';
      } else if (row.scope === 'practice_municipal') {
        scopeText = '市级练习';
      } else if (row.scope.startsWith('practice_district_')) {
        const districtCode = row.scope.replace('practice_district_', '');
        const district = DISTRICT_CODES[districtCode];
        scopeText = district ? `区级练习-${district.name}` : row.scope;
      } else if (row.scope.startsWith('practice_school_')) {
        scopeText = '校级练习';
      }

      // 格式化状态文本
      let statusText = row.status;
      let statusColor = 'default';
      if (row.status === 'pending_review') {
        statusText = '待审核';
        statusColor = 'orange';
      } else if (row.status === 'published') {
        statusText = '已通过';
        statusColor = 'green';
      } else if (row.status === 'inactive') {
        statusText = '已拒绝';
        statusColor = 'red';
      }

      return {
        submission_id: row.submission_id,
        draft_id: row.draft_id,
        id: row.id, // 草稿ID
        type: row.type,
        subject: row.subject,
        grade: row.grade,
        level: row.level,
        content: row.content,
        difficulty: row.difficulty,
        suggested_score: row.suggested_score,
        abilities: row.abilities,
        knowledge_points: row.knowledge_points,
        scope: row.scope,
        scope_text: scopeText,
        status: row.status,
        status_text: statusText,
        status_color: statusColor,
        reviewer_id: row.reviewer_id,
        reviewer_name: row.reviewer_name,
        review_comment: row.review_comment,
        reviewed_at: row.reviewed_at,
        submitted_at: row.submitted_at,
        draft_created_at: row.draft_created_at
      };
    });
  }

  /**
   * 统计我的提交数量
   * @param {number} userId - 用户ID
   * @param {Object} filters - 筛选条件
   * @returns {Promise<number>} 提交数量
   */
  static async countMySubmissions(userId, filters = {}) {
    const { query } = require('../database/connection');

    let sql = `
      SELECT COUNT(*) as count
      FROM question_bank qb
      INNER JOIN question_drafts qd ON qb.draft_id = qd.id
      WHERE qb.published_by = $1 AND qb.is_active = true
    `;
    const values = [userId];
    let paramCount = 1;

    // 筛选条件
    if (filters.status) {
      paramCount++;
      sql += ` AND qb.status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.subject) {
      paramCount++;
      sql += ` AND qd.subject = $${paramCount}`;
      values.push(filters.subject);
    }

    if (filters.type) {
      paramCount++;
      sql += ` AND qd.type = $${paramCount}`;
      values.push(filters.type);
    }

    const result = await query(sql, values);
    return parseInt(result.rows[0].count);
  }
}

module.exports = QuestionDraft;
