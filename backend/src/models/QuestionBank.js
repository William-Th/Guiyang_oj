const { query, getClient } = require('../database/connection');

class QuestionBank {
  static async create(questionData) {
    const {
      type,
      subject,
      grade,
      content,
      options,
      correct_answer,
      score,
      suggested_score,
      level,
      difficulty,
      explanation,
      tags,
      image_url,
      created_by,
      category_id,
      abilities,
      knowledge_points,
      status
    } = questionData;

    const sql = `
      INSERT INTO question_bank
      (type, subject, grade, content, options, correct_answer, score, suggested_score, level,
       difficulty, explanation, tags, image_url, created_by, category_id,
       abilities, knowledge_points, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      type,
      subject,
      grade,
      content,
      JSON.stringify(options),
      JSON.stringify(correct_answer),
      score || suggested_score || 5,
      suggested_score || 5,
      level || 'L1',
      difficulty,
      explanation,
      tags,
      image_url,
      created_by,
      category_id,
      abilities || [],
      knowledge_points || [],
      status || 'draft'
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findById(id) {
    const sql = 'SELECT * FROM question_bank WHERE id = $1 AND is_active = true';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM question_bank WHERE is_active = true';
    const values = [];
    let paramCount = 0;

    // 默认只显示已发布的题目，除非指定了status或created_by过滤
    if (!filters.status && !filters.created_by) {
      sql += ` AND status = 'published'`;
    }

    if (filters.status) {
      paramCount++;
      sql += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.created_by) {
      paramCount++;
      sql += ` AND created_by = $${paramCount}`;
      values.push(filters.created_by);
    }

    if (filters.level) {
      paramCount++;
      sql += ` AND level = $${paramCount}`;
      values.push(filters.level);
    }

    if (filters.scope && filters.scope.length > 0) {
      paramCount++;
      sql += ` AND scope && $${paramCount}`;
      values.push(filters.scope);
    }

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

    if (filters.difficulty) {
      paramCount++;
      sql += ` AND difficulty = $${paramCount}`;
      values.push(filters.difficulty);
    }

    if (filters.type) {
      paramCount++;
      sql += ` AND type = $${paramCount}`;
      values.push(filters.type);
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++;
      sql += ` AND tags && $${paramCount}`;
      values.push(filters.tags);
    }

    if (filters.category_id) {
      paramCount++;
      sql += ` AND category_id = $${paramCount}`;
      values.push(filters.category_id);
    }

    if (filters.abilities && filters.abilities.length > 0) {
      paramCount++;
      sql += ` AND abilities && $${paramCount}`;
      values.push(filters.abilities);
    }

    if (filters.knowledge_points && filters.knowledge_points.length > 0) {
      paramCount++;
      sql += ` AND knowledge_points && $${paramCount}`;
      values.push(filters.knowledge_points);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      sql += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      sql += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await query(sql, values);
    return result.rows;
  }

  static async update(id, updateData) {
    const allowedFields = [
      'type', 'subject', 'grade', 'content', 'options',
      'correct_answer', 'score', 'suggested_score', 'level', 'difficulty', 'explanation',
      'tags', 'image_url', 'category_id', 'abilities', 'knowledge_points',
      'status', 'scope', 'reviewer_id', 'review_comment', 'reviewed_at',
      'published_at', 'published_by'
    ];

    const updates = [];
    const values = [];
    let paramCount = 0;

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        paramCount++;
        updates.push(`${field} = $${paramCount}`);

        if (field === 'options' || field === 'correct_answer') {
          values.push(JSON.stringify(updateData[field]));
        } else {
          values.push(updateData[field]);
        }
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    updates.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `
      UPDATE question_bank 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async delete(id) {
    const sql = 'UPDATE question_bank SET is_active = false WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async addToExam(examId, questionIds, scores = {}) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      const insertedQuestions = [];
      
      for (let i = 0; i < questionIds.length; i++) {
        const questionId = questionIds[i];
        const scoreValue = scores[questionId] || null;
        
        const sql = `
          INSERT INTO exam_questions (exam_id, question_bank_id, order_no, score)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (exam_id, question_bank_id) 
          DO UPDATE SET order_no = $3, score = $4
          RETURNING *
        `;
        
        const result = await client.query(sql, [examId, questionId, i + 1, scoreValue]);
        insertedQuestions.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return insertedQuestions;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getExamQuestions(examId) {
    const sql = `
      SELECT 
        eq.*,
        qb.type,
        qb.subject,
        qb.content,
        qb.options,
        qb.correct_answer,
        qb.difficulty,
        qb.explanation,
        qb.image_url,
        COALESCE(eq.score, qb.score) as final_score
      FROM exam_questions eq
      JOIN question_bank qb ON eq.question_bank_id = qb.id
      WHERE eq.exam_id = $1 AND qb.is_active = true
      ORDER BY eq.order_no
    `;
    
    const result = await query(sql, [examId]);
    return result.rows;
  }

  static async incrementUsageCount(id) {
    const sql = `
      UPDATE question_bank 
      SET usage_count = usage_count + 1 
      WHERE id = $1
      RETURNING usage_count
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async updateSuccessRate(id, totalAttempts, correctAttempts) {
    const successRate = totalAttempts > 0 ? (correctAttempts / totalAttempts * 100).toFixed(2) : 0;
    
    const sql = `
      UPDATE question_bank 
      SET success_rate = $1 
      WHERE id = $2
      RETURNING success_rate
    `;
    
    const result = await query(sql, [successRate, id]);
    return result.rows[0];
  }

  static async searchQuestions(searchTerm, filters = {}) {
    let sql = `
      SELECT * FROM question_bank
      WHERE is_active = true
      AND (content ILIKE $1 OR explanation ILIKE $1)
    `;

    const values = [`%${searchTerm}%`];
    let paramCount = 1;

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

    sql += ' ORDER BY usage_count DESC, created_at DESC LIMIT 50';

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * 提交题目审核
   */
  static async submitForReview(id, reviewerId, scope) {
    const sql = `
      UPDATE question_bank
      SET status = 'pending_review',
          reviewer_id = $2,
          scope = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [id, reviewerId, scope]);
    return result.rows[0];
  }

  /**
   * 审核题目（通过/拒绝）
   */
  static async reviewQuestion(id, reviewerId, status, comment) {
    const sql = `
      UPDATE question_bank
      SET status = $2,
          review_comment = $3,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND reviewer_id = $4
      RETURNING *
    `;

    const result = await query(sql, [id, status, comment, reviewerId]);
    return result.rows[0];
  }

  /**
   * 发布题目
   */
  static async publishQuestion(id, publishedBy) {
    const sql = `
      UPDATE question_bank
      SET status = 'published',
          published_at = CURRENT_TIMESTAMP,
          published_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [id, publishedBy]);
    return result.rows[0];
  }

  /**
   * 获取我的草稿
   */
  static async getMyDrafts(userId) {
    const sql = `
      SELECT * FROM question_bank
      WHERE created_by = $1
      AND status = 'draft'
      AND is_active = true
      ORDER BY updated_at DESC
    `;

    const result = await query(sql, [userId]);
    return result.rows;
  }

  /**
   * 获取待审核的题目（审核人视角）
   */
  static async getPendingReviews(reviewerId) {
    const sql = `
      SELECT qb.*, u.real_name as creator_name, u.username as creator_username
      FROM question_bank qb
      JOIN users u ON qb.created_by = u.id
      WHERE qb.reviewer_id = $1
      AND qb.status = 'pending_review'
      AND qb.is_active = true
      ORDER BY qb.created_at DESC
    `;

    const result = await query(sql, [reviewerId]);
    return result.rows;
  }

  /**
   * 获取我提交的审核（创建者视角）
   */
  static async getMySubmissions(userId) {
    const sql = `
      SELECT qb.*,
        u.real_name as reviewer_name,
        u.username as reviewer_username
      FROM question_bank qb
      LEFT JOIN users u ON qb.reviewer_id = u.id
      WHERE qb.created_by = $1
      AND qb.status IN ('pending_review', 'approved', 'rejected')
      AND qb.is_active = true
      ORDER BY qb.updated_at DESC
    `;

    const result = await query(sql, [userId]);
    return result.rows;
  }
}

module.exports = QuestionBank;