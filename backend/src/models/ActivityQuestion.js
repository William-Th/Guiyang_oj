const { query } = require('../database/connection');

/**
 * ActivityQuestion Model
 * Manages the relationship between activities and questions (paper generation system)
 */
class ActivityQuestion {
  /**
   * Add a question to an activity
   * @param {Object} data - Question data
   * @param {number} data.activityId - Activity ID
   * @param {number} data.questionId - Question ID
   * @param {number} data.orderIndex - Order in the paper
   * @param {number} data.score - Score for this question
   * @returns {Promise<Object>} Created activity question
   */
  static async addQuestion(data) {
    const {
      activityId,
      questionId,
      orderIndex,
      score
    } = data;

    const result = await query(`
      INSERT INTO activity_questions (activity_id, question_id, order_index, score)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [activityId, questionId, orderIndex, score]);

    return result.rows[0];
  }

  /**
   * Add multiple questions to an activity (batch insert)
   * @param {number} activityId - Activity ID
   * @param {Array} questions - Array of question objects
   * @returns {Promise<Array>} Created activity questions
   */
  static async addQuestions(activityId, questions) {
    if (!questions || questions.length === 0) {
      return [];
    }

    // Build batch insert query
    const values = [];
    const params = [];
    let paramCount = 0;

    questions.forEach((q, index) => {
      const { questionId, score } = q;
      const orderIndex = index + 1; // Start from 1

      values.push(`($${++paramCount}, $${++paramCount}, $${++paramCount}, $${++paramCount})`);
      params.push(activityId, questionId, orderIndex, score);
    });

    const result = await query(`
      INSERT INTO activity_questions (activity_id, question_id, order_index, score)
      VALUES ${values.join(', ')}
      RETURNING *
    `, params);

    return result.rows;
  }

  /**
   * Remove a question from an activity
   * @param {number} activityId - Activity ID
   * @param {number} questionId - Question ID
   * @returns {Promise<Object>} Deleted activity question
   */
  static async removeQuestion(activityId, questionId) {
    const result = await query(`
      DELETE FROM activity_questions
      WHERE activity_id = $1 AND question_id = $2
      RETURNING *
    `, [activityId, questionId]);

    // Reorder remaining questions
    if (result.rows.length > 0) {
      await this.reorderQuestions(activityId);
    }

    return result.rows[0];
  }

  /**
   * Remove all questions from an activity
   * @param {number} activityId - Activity ID
   * @returns {Promise<number>} Number of questions removed
   */
  static async removeAllQuestions(activityId) {
    const result = await query(`
      DELETE FROM activity_questions
      WHERE activity_id = $1
    `, [activityId]);

    return result.rowCount;
  }

  /**
   * Update question order in an activity
   * @param {number} activityId - Activity ID
   * @param {number} questionId - Question ID
   * @param {number} newOrderIndex - New order index
   * @returns {Promise<Object>} Updated activity question
   */
  static async updateQuestionOrder(activityId, questionId, newOrderIndex) {
    const result = await query(`
      UPDATE activity_questions
      SET order_index = $1, updated_at = CURRENT_TIMESTAMP
      WHERE activity_id = $2 AND question_id = $3
      RETURNING *
    `, [newOrderIndex, activityId, questionId]);

    return result.rows[0];
  }

  /**
   * Update question score in an activity
   * @param {number} activityId - Activity ID
   * @param {number} questionId - Question ID
   * @param {number} newScore - New score
   * @returns {Promise<Object>} Updated activity question
   */
  static async updateQuestionScore(activityId, questionId, newScore) {
    const result = await query(`
      UPDATE activity_questions
      SET score = $1, updated_at = CURRENT_TIMESTAMP
      WHERE activity_id = $2 AND question_id = $3
      RETURNING *
    `, [newScore, activityId, questionId]);

    return result.rows[0];
  }

  /**
   * Reorder questions sequentially after deletion
   * @param {number} activityId - Activity ID
   * @returns {Promise<void>}
   */
  static async reorderQuestions(activityId) {
    await query(`
      WITH ordered_questions AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY order_index) as new_index
        FROM activity_questions
        WHERE activity_id = $1
      )
      UPDATE activity_questions aq
      SET order_index = oq.new_index, updated_at = CURRENT_TIMESTAMP
      FROM ordered_questions oq
      WHERE aq.id = oq.id
    `, [activityId]);
  }

  /**
   * Get all questions for an activity (with question details)
   * Uses question_bank_with_draft view to get complete question information
   * @param {number} activityId - Activity ID
   * @returns {Promise<Array>} Array of questions with details
   */
  static async getActivityQuestions(activityId) {
    const result = await query(`
      SELECT
        aq.id as activity_question_id,
        aq.activity_id,
        aq.question_id,
        aq.order_index,
        aq.score,
        qb.question_code,
        qb.type,
        qb.content,
        qb.options,
        qb.correct_answer,
        qb.difficulty,
        qb.subject,
        qb.grade,
        qb.knowledge_points,
        qb.level,
        qb.suggested_score,
        qb.scope
      FROM activity_questions aq
      INNER JOIN question_bank_with_draft qb ON aq.question_id = qb.id
      WHERE aq.activity_id = $1
      ORDER BY aq.order_index ASC
    `, [activityId]);

    return result.rows;
  }

  /**
   * Get activity paper statistics
   * Uses question_bank_with_draft view to get complete question information
   * @param {number} activityId - Activity ID
   * @returns {Promise<Object>} Paper statistics
   */
  static async getActivityPaperStats(activityId) {
    const result = await query(`
      SELECT
        a.id as activity_id,
        a.title,
        a.type,
        a.subject,
        a.paper_status,
        a.total_score,
        a.question_count,
        COUNT(DISTINCT CASE WHEN qb.type = 'single' THEN aq.id END) as single_choice_count,
        COUNT(DISTINCT CASE WHEN qb.type = 'multiple' THEN aq.id END) as multiple_choice_count,
        COUNT(DISTINCT CASE WHEN qb.type = 'blank' THEN aq.id END) as blank_count,
        COUNT(DISTINCT CASE WHEN qb.type = 'essay' THEN aq.id END) as essay_count,
        COUNT(DISTINCT CASE WHEN qb.type = 'code' THEN aq.id END) as code_count,
        COUNT(DISTINCT CASE WHEN qb.difficulty = 'easy' THEN aq.id END) as easy_count,
        COUNT(DISTINCT CASE WHEN qb.difficulty = 'medium' THEN aq.id END) as medium_count,
        COUNT(DISTINCT CASE WHEN qb.difficulty = 'hard' THEN aq.id END) as hard_count
      FROM activities a
      LEFT JOIN activity_questions aq ON a.id = aq.activity_id
      LEFT JOIN question_bank_with_draft qb ON aq.question_id = qb.id
      WHERE a.id = $1
      GROUP BY a.id, a.title, a.type, a.subject, a.paper_status, a.total_score, a.question_count
    `, [activityId]);

    return result.rows[0] || null;
  }

  /**
   * Get available questions for an activity (not yet added)
   * Uses question_bank_with_draft view which joins question_bank with question_drafts
   * to get complete question information including subject, grade, level, etc.
   *
   * @param {number} activityId - Activity ID
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of available questions
   */
  static async getAvailableQuestions(activityId, filters = {}) {
    // Get activity info to filter by subject and grade
    const activityResult = await query(`
      SELECT subject, grade FROM activities WHERE id = $1
    `, [activityId]);

    if (activityResult.rows.length === 0) {
      return [];
    }

    const activity = activityResult.rows[0];

    // Use question_bank_with_draft view instead of question_bank table
    // This view joins question_bank with question_drafts to get complete question info
    let whereClause = `
      WHERE qb.status = 'published'
        AND qb.is_active = true
        AND qb.subject = $1
        AND qb.grade = $2
        AND qb.id NOT IN (
          SELECT question_id FROM activity_questions WHERE activity_id = $3
        )
    `;
    let params = [activity.subject, activity.grade, activityId];
    let paramCount = 3;

    // Additional filters
    if (filters.type) {
      whereClause += ` AND qb.type = $${++paramCount}`;
      params.push(filters.type);
    }

    if (filters.difficulty) {
      whereClause += ` AND qb.difficulty = $${++paramCount}`;
      params.push(filters.difficulty);
    }

    if (filters.level) {
      whereClause += ` AND qb.level = $${++paramCount}`;
      params.push(filters.level);
    }

    if (filters.knowledge_point) {
      whereClause += ` AND $${++paramCount} = ANY(qb.knowledge_points)`;
      params.push(filters.knowledge_point);
    }

    if (filters.search) {
      whereClause += ` AND (qb.content ILIKE $${++paramCount} OR qb.question_code ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    const result = await query(`
      SELECT
        qb.id,
        qb.question_code,
        qb.type,
        qb.content,
        qb.difficulty,
        qb.level,
        qb.suggested_score,
        qb.knowledge_points,
        qb.subject,
        qb.grade,
        qb.scope
      FROM question_bank_with_draft qb
      ${whereClause}
      ORDER BY qb.question_code DESC
      LIMIT 100
    `, params);

    return result.rows;
  }

  /**
   * Check if a question exists in an activity
   * @param {number} activityId - Activity ID
   * @param {number} questionId - Question ID
   * @returns {Promise<boolean>} True if question exists
   */
  static async questionExists(activityId, questionId) {
    const result = await query(`
      SELECT id FROM activity_questions
      WHERE activity_id = $1 AND question_id = $2
    `, [activityId, questionId]);

    return result.rows.length > 0;
  }

  /**
   * Get next order index for an activity
   * @param {number} activityId - Activity ID
   * @returns {Promise<number>} Next order index
   */
  static async getNextOrderIndex(activityId) {
    const result = await query(`
      SELECT COALESCE(MAX(order_index), 0) + 1 as next_index
      FROM activity_questions
      WHERE activity_id = $1
    `, [activityId]);

    return result.rows[0].next_index;
  }

  /**
   * Batch update question orders
   * @param {number} activityId - Activity ID
   * @param {Array} orderUpdates - Array of {questionId, orderIndex}
   * @returns {Promise<Array>} Updated activity questions
   */
  static async batchUpdateOrders(activityId, orderUpdates) {
    if (!orderUpdates || orderUpdates.length === 0) {
      return [];
    }

    // Use a transaction for atomic updates
    const _client = await query('BEGIN');

    try {
      const updatedQuestions = [];

      for (const update of orderUpdates) {
        const result = await query(`
          UPDATE activity_questions
          SET order_index = $1, updated_at = CURRENT_TIMESTAMP
          WHERE activity_id = $2 AND question_id = $3
          RETURNING *
        `, [update.orderIndex, activityId, update.questionId]);

        if (result.rows.length > 0) {
          updatedQuestions.push(result.rows[0]);
        }
      }

      await query('COMMIT');
      return updatedQuestions;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Update score for a question in an activity
   * @param {number} activityId - Activity ID
   * @param {number} questionId - Question ID
   * @param {Object} updates - Updates {score}
   * @returns {Promise<Object>} Updated activity question
   */
  static async updateQuestion(activityId, questionId, updates) {
    const { score } = updates;

    const result = await query(`
      UPDATE activity_questions
      SET
        score = COALESCE($1, score),
        updated_at = CURRENT_TIMESTAMP
      WHERE activity_id = $2 AND question_id = $3
      RETURNING *
    `, [score, activityId, questionId]);

    return result.rows[0];
  }
}

module.exports = ActivityQuestion;
