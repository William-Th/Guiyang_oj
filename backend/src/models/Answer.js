const { query, getClient } = require('../database/connection');

class Answer {
  static async saveAnswers(studentExamId, answers) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      const savedAnswers = [];
      for (const answer of answers) {
        const result = await client.query(`
          INSERT INTO answers (student_exam_id, question_id, answer)
          VALUES ($1, $2, $3)
          ON CONFLICT (student_exam_id, question_id) 
          DO UPDATE SET answer = EXCLUDED.answer, updated_at = CURRENT_TIMESTAMP
          RETURNING id, question_id, answer, created_at
        `, [studentExamId, answer.questionId, answer.answer]);
        
        savedAnswers.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return savedAnswers;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async gradeAnswers(studentExamId) {
    const result = await query(`
      UPDATE answers a 
      SET is_correct = (
        CASE 
          WHEN q.type IN ('single', 'multiple') THEN 
            a.answer = q.correct_answer
          ELSE 
            NULL -- Manual grading needed for essay/code questions
        END
      ),
      score = (
        CASE 
          WHEN q.type IN ('single', 'multiple') AND a.answer = q.correct_answer THEN 
            q.score
          WHEN q.type IN ('single', 'multiple') AND a.answer != q.correct_answer THEN 
            0
          ELSE 
            NULL -- Manual grading needed
        END
      )
      FROM questions q
      WHERE a.question_id = q.id AND a.student_exam_id = $1
      RETURNING a.id, a.question_id, a.is_correct, a.score
    `, [studentExamId]);
    
    return result.rows;
  }

  static async calculateTotalScore(studentExamId) {
    const result = await query(`
      SELECT COALESCE(SUM(score), 0) as total_score
      FROM answers 
      WHERE student_exam_id = $1 AND score IS NOT NULL
    `, [studentExamId]);
    
    return result.rows[0]?.total_score || 0;
  }

  static async getAnswersByStudentExam(studentExamId) {
    const result = await query(`
      SELECT a.id, a.question_id, a.answer, a.is_correct, a.score,
             q.content as question_content, q.type as question_type,
             q.correct_answer, q.explanation
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.student_exam_id = $1
      ORDER BY q.order_no ASC
    `, [studentExamId]);
    
    return result.rows;
  }
}

module.exports = Answer;