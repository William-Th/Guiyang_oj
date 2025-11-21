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
      FROM question_bank q
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
      JOIN question_bank q ON a.question_id = q.id
      JOIN student_activities sa ON a.student_exam_id = sa.id
      JOIN activity_questions aq ON sa.activity_id = aq.activity_id AND a.question_id = aq.question_id
      WHERE a.student_exam_id = $1
      ORDER BY aq.order_index ASC
    `, [studentExamId]);

    return result.rows;
  }
}

module.exports = Answer;