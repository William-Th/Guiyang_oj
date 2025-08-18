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
      difficulty,
      explanation,
      tags,
      image_url,
      created_by,
      category_id
    } = questionData;

    const sql = `
      INSERT INTO question_bank 
      (type, subject, grade, content, options, correct_answer, score, 
       difficulty, explanation, tags, image_url, created_by, category_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      type,
      subject,
      grade,
      content,
      JSON.stringify(options),
      JSON.stringify(correct_answer),
      score || 1,
      difficulty,
      explanation,
      tags,
      image_url,
      created_by,
      category_id
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
      'correct_answer', 'score', 'difficulty', 'explanation', 
      'tags', 'image_url', 'category_id'
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
}

module.exports = QuestionBank;