const { query } = require('../database/connection');

class Exam {
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

    const result = await query(`
      SELECT id, title, description, subject, grade, start_time, end_time, 
             duration, total_score, pass_score, status, created_at
      FROM exams 
      ${whereClause}
      ORDER BY created_at DESC
    `, params);
    
    return result.rows;
  }

  static async findById(id) {
    const result = await query(`
      SELECT id, title, description, subject, grade, start_time, end_time,
             duration, total_score, pass_score, status, created_at
      FROM exams 
      WHERE id = $1
    `, [id]);
    
    return result.rows[0];
  }

  static async findByIdWithQuestions(id) {
    const examResult = await query(`
      SELECT id, title, description, subject, grade, start_time, end_time,
             duration, total_score, pass_score, status
      FROM exams 
      WHERE id = $1
    `, [id]);

    if (examResult.rows.length === 0) {
      return null;
    }

    const questionsResult = await query(`
      SELECT id, type, content, options, score, order_no, difficulty
      FROM questions 
      WHERE exam_id = $1 
      ORDER BY order_no ASC
    `, [id]);

    const exam = examResult.rows[0];
    exam.questions = questionsResult.rows;
    
    return exam;
  }

  static async create(examData) {
    const { title, description, subject, grade, startTime, endTime, duration, totalScore, passScore, createdBy } = examData;
    
    const result = await query(`
      INSERT INTO exams (title, description, subject, grade, start_time, end_time, 
                        duration, total_score, pass_score, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, title, subject, grade, duration, total_score, status, created_at
    `, [title, description, subject, grade, startTime, endTime, duration, totalScore, passScore, createdBy]);
    
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const result = await query(`
      UPDATE exams 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, status
    `, [status, id]);
    
    return result.rows[0];
  }

  static async getAvailableForStudent(studentId) {
    const result = await query(`
      SELECT e.id, e.title, e.subject, e.grade, e.start_time, e.end_time,
             e.duration, e.total_score, e.status,
             se.status as student_status
      FROM exams e
      LEFT JOIN student_exams se ON e.id = se.exam_id AND se.student_id = $1
      WHERE e.status IN ('published', 'ongoing')
        AND (se.id IS NULL OR se.status = 'registered')
      ORDER BY e.start_time ASC
    `, [studentId]);
    
    return result.rows;
  }
}

module.exports = Exam;