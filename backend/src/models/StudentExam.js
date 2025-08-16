const { query } = require('../database/connection');

class StudentExam {
  static async register(studentId, examId, sessionId = null) {
    const result = await query(`
      INSERT INTO student_exams (student_id, exam_id, session_id, status)
      VALUES ($1, $2, $3, 'registered')
      RETURNING id, student_id, exam_id, status, created_at
    `, [studentId, examId, sessionId]);
    
    return result.rows[0];
  }

  static async start(studentId, examId, ipAddress) {
    const result = await query(`
      UPDATE student_exams 
      SET status = 'in_progress', 
          start_time = CURRENT_TIMESTAMP,
          ip_address = $3
      WHERE student_id = $1 AND exam_id = $2 AND status = 'registered'
      RETURNING id, start_time, status
    `, [studentId, examId, ipAddress]);
    
    return result.rows[0];
  }

  static async submit(studentId, examId, score) {
    const result = await query(`
      UPDATE student_exams 
      SET status = 'submitted', 
          submit_time = CURRENT_TIMESTAMP,
          score = $3
      WHERE student_id = $1 AND exam_id = $2 AND status = 'in_progress'
      RETURNING id, submit_time, score, status
    `, [studentId, examId, score]);
    
    return result.rows[0];
  }

  static async findByStudentAndExam(studentId, examId) {
    const result = await query(`
      SELECT id, student_id, exam_id, session_id, status, start_time, 
             submit_time, score, rank, created_at
      FROM student_exams 
      WHERE student_id = $1 AND exam_id = $2
    `, [studentId, examId]);
    
    return result.rows[0];
  }

  static async getStudentExamHistory(studentId) {
    const result = await query(`
      SELECT se.*, e.title, e.subject, e.grade, e.total_score, e.pass_score
      FROM student_exams se
      JOIN exams e ON se.exam_id = e.id
      WHERE se.student_id = $1
      ORDER BY se.created_at DESC
    `, [studentId]);
    
    return result.rows;
  }
}

module.exports = StudentExam;