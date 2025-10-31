/**
 * Auto Grading Service
 * 自动判题服务
 *
 * Handles automatic grading for objective questions:
 * - Single choice (single)
 * - Multiple choice (multiple)
 * - Fill in the blank (fill_blank)
 *
 * Subjective questions (short_answer, programming) are left for manual grading
 */

const { query } = require('../database/connection');
const logger = require('../utils/logger');

class AutoGradingService {
  /**
   * Auto-grade a student's activity submission
   * @param {number} studentActivityId - The student_activities.id
   * @returns {Promise<Object>} Grading result
   */
  static async autoGradeActivity(studentActivityId) {
    try {
      logger.info(`Starting auto-grading for student_activity: ${studentActivityId}`);

      // Get all answers for this activity
      const answersResult = await query(`
        SELECT
          a.id as answer_id,
          a.question_id,
          a.answer as student_answer,
          qb.type as question_type,
          qb.correct_answer,
          aq.score as max_score
        FROM answers a
        JOIN question_bank qb ON a.question_id = qb.id
        JOIN activity_questions aq ON aq.question_id = a.question_id
        JOIN student_activities sa ON a.student_exam_id = sa.id
        WHERE a.student_exam_id = $1
          AND a.grading_status = 'pending'
      `, [studentActivityId]);

      if (answersResult.rows.length === 0) {
        logger.info(`No pending answers to grade for student_activity: ${studentActivityId}`);
        return {
          success: true,
          graded_count: 0,
          message: 'No pending answers to grade'
        };
      }

      let gradedCount = 0;
      let totalScore = 0;
      let hasSubjectiveQuestions = false;

      // Grade each answer
      for (const answer of answersResult.rows) {
        const { answer_id, question_type, student_answer, correct_answer, max_score } = answer;

        // Check if this is an objective question
        // Normalize question types: blank = fill_blank, true_false = single
        const normalizedType = question_type === 'blank' ? 'fill_blank' :
                               question_type === 'true_false' ? 'single' : question_type;

        if (['single', 'multiple', 'fill_blank'].includes(normalizedType)) {
          const gradingResult = await this.gradeQuestion(
            normalizedType,
            student_answer,
            correct_answer,
            max_score
          );

          // Update answer with grading result
          await query(`
            UPDATE answers
            SET
              is_correct = $1,
              score = $2,
              auto_score = $2,
              grading_status = 'auto_graded',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [gradingResult.isCorrect, gradingResult.score, answer_id]);

          totalScore += gradingResult.score;
          gradedCount++;

          logger.debug(`Graded answer ${answer_id}: ${gradingResult.isCorrect ? 'correct' : 'incorrect'}, score: ${gradingResult.score}`);
        } else {
          // Subjective question - leave for manual grading
          hasSubjectiveQuestions = true;
          logger.debug(`Answer ${answer_id} is subjective (${question_type}), skipping auto-grading`);
        }
      }

      // Update student_activities with total score and grading status
      let gradingStatus = 'auto_graded';
      if (hasSubjectiveQuestions) {
        gradingStatus = 'partial_graded';
      } else {
        gradingStatus = 'completed';
      }

      await query(`
        UPDATE student_activities
        SET
          score = $1,
          grading_status = $2::VARCHAR,
          status = CASE
            WHEN $2::VARCHAR = 'completed' THEN 'graded'
            ELSE status
          END
        WHERE id = $3
      `, [totalScore, gradingStatus, studentActivityId]);

      logger.info(`Auto-grading completed for student_activity ${studentActivityId}: ${gradedCount} questions graded, total score: ${totalScore}, status: ${gradingStatus}`);

      return {
        success: true,
        graded_count: gradedCount,
        total_score: totalScore,
        grading_status: gradingStatus,
        has_subjective_questions: hasSubjectiveQuestions
      };

    } catch (error) {
      logger.error('Auto-grading error:', error);
      throw error;
    }
  }

  /**
   * Grade a single question
   * @param {string} questionType - Question type
   * @param {string} studentAnswer - Student's answer
   * @param {string|Object} correctAnswer - Correct answer (JSON string or object)
   * @param {number} maxScore - Maximum score for this question
   * @returns {Object} Grading result
   */
  static gradeQuestion(questionType, studentAnswer, correctAnswer, maxScore) {
    try {
      // Parse correct answer if it's JSON
      let parsedCorrectAnswer = correctAnswer;
      if (typeof correctAnswer === 'string' && correctAnswer.startsWith('{')) {
        try {
          parsedCorrectAnswer = JSON.parse(correctAnswer);
        } catch (e) {
          logger.warn('Failed to parse correct_answer as JSON, using as string');
        }
      }

      switch (questionType) {
        case 'single':
          return this.gradeSingleChoice(studentAnswer, parsedCorrectAnswer, maxScore);

        case 'multiple':
          return this.gradeMultipleChoice(studentAnswer, parsedCorrectAnswer, maxScore);

        case 'fill_blank':
          return this.gradeFillBlank(studentAnswer, parsedCorrectAnswer, maxScore);

        default:
          return {
            isCorrect: false,
            score: 0,
            message: 'Unsupported question type for auto-grading'
          };
      }
    } catch (error) {
      logger.error('Grade question error:', error);
      return {
        isCorrect: false,
        score: 0,
        message: 'Grading error'
      };
    }
  }

  /**
   * Grade single choice question
   * @param {string} studentAnswer - Student's answer (e.g., "A", "B", "C", "D")
   * @param {string|Object} correctAnswer - Correct answer
   * @param {number} maxScore - Maximum score
   * @returns {Object} Grading result
   */
  static gradeSingleChoice(studentAnswer, correctAnswer, maxScore) {
    // Normalize answers (trim and uppercase)
    const normalizedStudent = (studentAnswer || '').trim().toUpperCase();
    let normalizedCorrect;

    if (typeof correctAnswer === 'object' && correctAnswer.answer) {
      normalizedCorrect = correctAnswer.answer.trim().toUpperCase();
    } else {
      normalizedCorrect = (correctAnswer || '').trim().toUpperCase();
    }

    const isCorrect = normalizedStudent === normalizedCorrect;

    return {
      isCorrect,
      score: isCorrect ? parseFloat(maxScore) : 0
    };
  }

  /**
   * Grade multiple choice question
   * @param {string} studentAnswer - Student's answer (e.g., "A,B,C" or JSON array)
   * @param {string|Object} correctAnswer - Correct answer
   * @param {number} maxScore - Maximum score
   * @returns {Object} Grading result
   */
  static gradeMultipleChoice(studentAnswer, correctAnswer, maxScore) {
    try {
      // Parse student answer
      let studentOptions = [];
      if (typeof studentAnswer === 'string') {
        if (studentAnswer.startsWith('[')) {
          studentOptions = JSON.parse(studentAnswer);
        } else {
          studentOptions = studentAnswer.split(',').map(s => s.trim().toUpperCase());
        }
      } else if (Array.isArray(studentAnswer)) {
        studentOptions = studentAnswer.map(s => String(s).trim().toUpperCase());
      }

      // Parse correct answer
      let correctOptions = [];
      if (typeof correctAnswer === 'object' && correctAnswer.answer) {
        correctOptions = Array.isArray(correctAnswer.answer)
          ? correctAnswer.answer.map(s => String(s).trim().toUpperCase())
          : correctAnswer.answer.split(',').map(s => s.trim().toUpperCase());
      } else if (typeof correctAnswer === 'string') {
        if (correctAnswer.startsWith('[')) {
          correctOptions = JSON.parse(correctAnswer).map(s => String(s).trim().toUpperCase());
        } else {
          correctOptions = correctAnswer.split(',').map(s => s.trim().toUpperCase());
        }
      } else if (Array.isArray(correctAnswer)) {
        correctOptions = correctAnswer.map(s => String(s).trim().toUpperCase());
      }

      // Sort both arrays for comparison
      studentOptions.sort();
      correctOptions.sort();

      // Check if arrays are equal
      const isCorrect = JSON.stringify(studentOptions) === JSON.stringify(correctOptions);

      return {
        isCorrect,
        score: isCorrect ? parseFloat(maxScore) : 0
      };
    } catch (error) {
      logger.error('Grade multiple choice error:', error);
      return {
        isCorrect: false,
        score: 0
      };
    }
  }

  /**
   * Grade fill in the blank question
   * @param {string} studentAnswer - Student's answer
   * @param {string|Object} correctAnswer - Correct answer (supports multiple answers separated by |)
   * @param {number} maxScore - Maximum score
   * @returns {Object} Grading result
   */
  static gradeFillBlank(studentAnswer, correctAnswer, maxScore) {
    try {
      // Normalize student answer
      const normalizedStudent = (studentAnswer || '').trim().toLowerCase();

      // Parse correct answer - supports multiple correct answers
      let correctAnswers = [];
      if (typeof correctAnswer === 'object' && correctAnswer.answer) {
        correctAnswers = [correctAnswer.answer];
        if (correctAnswer.alternatives) {
          correctAnswers = correctAnswers.concat(correctAnswer.alternatives);
        }
      } else if (typeof correctAnswer === 'string') {
        // Support format: "answer1|answer2|answer3"
        correctAnswers = correctAnswer.split('|').map(a => a.trim());
      }

      // Normalize all correct answers
      const normalizedCorrectAnswers = correctAnswers.map(a => a.toLowerCase());

      // Check for exact match
      let isCorrect = normalizedCorrectAnswers.includes(normalizedStudent);

      // If not exact match, check for keyword match (optional, can be configured)
      if (!isCorrect && correctAnswer.keyword_match) {
        // Check if student answer contains all required keywords
        const keywords = correctAnswer.keywords || [];
        isCorrect = keywords.every(keyword =>
          normalizedStudent.includes(keyword.toLowerCase())
        );
      }

      return {
        isCorrect,
        score: isCorrect ? parseFloat(maxScore) : 0
      };
    } catch (error) {
      logger.error('Grade fill blank error:', error);
      return {
        isCorrect: false,
        score: 0
      };
    }
  }

  /**
   * Re-grade a specific answer (used when correct_answer is updated)
   * @param {number} answerId - The answer.id to re-grade
   * @returns {Promise<Object>} Re-grading result
   */
  static async regradeAnswer(answerId) {
    try {
      // Get answer details
      const answerResult = await query(`
        SELECT
          a.id as answer_id,
          a.question_id,
          a.answer as student_answer,
          qb.type as question_type,
          qb.correct_answer,
          aq.score as max_score,
          a.student_exam_id
        FROM answers a
        JOIN question_bank qb ON a.question_id = qb.id
        JOIN activity_questions aq ON aq.question_id = a.question_id
        WHERE a.id = $1
      `, [answerId]);

      if (answerResult.rows.length === 0) {
        throw new Error('Answer not found');
      }

      const answer = answerResult.rows[0];

      // Normalize question type
      const normalizedType = answer.question_type === 'blank' ? 'fill_blank' :
                            answer.question_type === 'true_false' ? 'single' : answer.question_type;

      // Only re-grade objective questions
      if (!['single', 'multiple', 'fill_blank'].includes(normalizedType)) {
        return {
          success: false,
          message: 'Only objective questions can be re-graded automatically'
        };
      }

      // Grade the question
      const gradingResult = this.gradeQuestion(
        normalizedType,
        answer.student_answer,
        answer.correct_answer,
        answer.max_score
      );

      // Update answer
      await query(`
        UPDATE answers
        SET
          is_correct = $1,
          score = $2,
          auto_score = $2,
          grading_status = 'auto_graded',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [gradingResult.isCorrect, gradingResult.score, answerId]);

      // Recalculate total score for student_activity
      await this.recalculateTotalScore(answer.student_exam_id);

      logger.info(`Re-graded answer ${answerId}: ${gradingResult.isCorrect ? 'correct' : 'incorrect'}, score: ${gradingResult.score}`);

      return {
        success: true,
        is_correct: gradingResult.isCorrect,
        score: gradingResult.score
      };
    } catch (error) {
      logger.error('Re-grade answer error:', error);
      throw error;
    }
  }

  /**
   * Recalculate total score for a student_activity
   * @param {number} studentActivityId - The student_activities.id
   * @returns {Promise<number>} New total score
   */
  static async recalculateTotalScore(studentActivityId) {
    try {
      // Sum all scored answers
      const scoreResult = await query(`
        SELECT COALESCE(SUM(score), 0) as total_score
        FROM answers
        WHERE student_exam_id = $1
          AND score IS NOT NULL
      `, [studentActivityId]);

      const totalScore = parseFloat(scoreResult.rows[0].total_score);

      // Update student_activities
      await query(`
        UPDATE student_activities
        SET score = $1
        WHERE id = $2
      `, [totalScore, studentActivityId]);

      logger.info(`Recalculated total score for student_activity ${studentActivityId}: ${totalScore}`);

      return totalScore;
    } catch (error) {
      logger.error('Recalculate total score error:', error);
      throw error;
    }
  }
}

module.exports = AutoGradingService;
