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
const EventEmitter = require('./EventEmitter');
const fetch = require('node-fetch');

// Judge service URL
const JUDGE_SERVICE_URL = process.env.JUDGE_SERVICE_URL || 'http://judge-service:3002';

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
        JOIN question_bank_with_draft qb ON a.question_id = qb.id
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
        // Normalize question types: blank → fill_blank
        const normalizedType = question_type === 'blank' ? 'fill_blank' : question_type;

        if (['single', 'multiple', 'fill_blank', 'true_false'].includes(normalizedType)) {
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
        } else if (question_type === 'code') {
          // Programming question - submit to judge service
          const codeResult = await this.gradeCodeQuestion(
            studentActivityId,
            answer.question_id,
            student_answer,
            max_score
          );

          if (codeResult.success) {
            // Update answer with grading result
            await query(`
              UPDATE answers
              SET
                is_correct = $1,
                score = $2,
                auto_score = $2,
                grading_status = 'auto_graded',
                feedback = $3,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = $4
            `, [codeResult.isCorrect, codeResult.score, codeResult.feedback, answer_id]);

            totalScore += codeResult.score;
            gradedCount++;

            logger.debug(`Graded code answer ${answer_id}: ${codeResult.status}, score: ${codeResult.score}`);
          } else {
            // Judge service failed, mark as pending for manual review
            hasSubjectiveQuestions = true;
            logger.warn(`Code grading failed for answer ${answer_id}: ${codeResult.error}`);
          }
        } else {
          // Subjective question (essay) - leave for manual grading
          hasSubjectiveQuestions = true;
          logger.debug(`Answer ${answer_id} is subjective (${question_type}), skipping auto-grading`);
        }
      }

      // Update student_activities with total score and grading status
      // 全客观题 → auto_graded（仍出现在教师评卷列表供复核与确认完成）
      // 含主观题 → partial_graded（等待教师人工批改）
      // 最终 completed 状态由教师手动点击"完成评卷"触发，此处不直接置为 completed
      const gradingStatus = hasSubjectiveQuestions ? 'partial_graded' : 'auto_graded';

      await query(`
        UPDATE student_activities
        SET
          score = $1,
          grading_status = $2::VARCHAR
        WHERE id = $3
      `, [totalScore, gradingStatus, studentActivityId]);

      logger.info(`Auto-grading completed for student_activity ${studentActivityId}: ${gradedCount} questions graded, total score: ${totalScore}, status: ${gradingStatus}`);

      // Emit completion event if grading is complete (no subjective questions)
      // 注：grading_status 此处为 auto_graded（仍需老师在评卷列表确认），
      // 但语义上判分已完成，应触发成就/积分等下游事件
      if (!hasSubjectiveQuestions) {
        try {
          // Fetch additional context for the event
          const contextResult = await query(`
            SELECT
              sa.student_id,
              sa.activity_id,
              sa.start_time,
              sa.submit_time,
              a.type as activity_type,
              a.subject,
              a.grade as grade_level,
              a.total_score as max_possible_score,
              (SELECT COUNT(*) FROM answers WHERE student_exam_id = sa.id) as total_questions,
              (SELECT COUNT(*) FROM answers WHERE student_exam_id = sa.id AND is_correct = true) as correct_answers
            FROM student_activities sa
            JOIN activities a ON sa.activity_id = a.id
            WHERE sa.id = $1
          `, [studentActivityId]);

          if (contextResult.rows.length > 0) {
            const ctx = contextResult.rows[0];

            // Calculate duration in seconds
            const duration = ctx.start_time && ctx.submit_time
              ? Math.floor((new Date(ctx.submit_time) - new Date(ctx.start_time)) / 1000)
              : null;

            // Emit activity completed event
            await EventEmitter.emitActivityCompleted(
              ctx.student_id,
              ctx.activity_id,
              {
                score: totalScore,
                totalQuestions: ctx.total_questions,
                correctAnswers: ctx.correct_answers,
                completedAt: ctx.submit_time || new Date().toISOString(),
                duration,
                activityType: ctx.activity_type,
                subject: ctx.subject,
                gradeLevel: ctx.grade_level
              }
            );

            // Determine grade level and emit high score event if applicable
            const scorePercentage = ctx.max_possible_score > 0
              ? (totalScore / ctx.max_possible_score) * 100
              : 0;

            let gradeLevel = null;
            if (scorePercentage >= 90) {
              gradeLevel = 'gold';
            } else if (scorePercentage >= 80) {
              gradeLevel = 'silver';
            } else if (scorePercentage >= 70) {
              gradeLevel = 'bronze';
            }

            // Emit high score event if student achieved bronze or higher
            if (gradeLevel) {
              await EventEmitter.emitHighScore(
                ctx.student_id,
                ctx.activity_id,
                totalScore,
                gradeLevel
              );
            }

            logger.info(`Events emitted for student_activity ${studentActivityId}: completed, ${gradeLevel ? `high_score (${gradeLevel})` : 'no high score'}`);
          }
        } catch (eventError) {
          // Don't fail the grading if event emission fails
          logger.error('Failed to emit completion events:', eventError);
        }
      }

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

      case 'true_false':
        return this.gradeTrueFalse(studentAnswer, parsedCorrectAnswer, maxScore);

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
   * Grade true/false question
   * 判断题判题，兼容多种表达形式：
   *   true/false, 1/0, 对/错, 是/否, 正确/错误, T/F, Y/N
   * @param {string|boolean|number} studentAnswer - 学生答案
   * @param {string|boolean|number|Object} correctAnswer - 正确答案
   * @param {number} maxScore - 满分
   * @returns {Object} Grading result
   */
  static gradeTrueFalse(studentAnswer, correctAnswer, maxScore) {
    const TRUE_VALUES = new Set(['true', '1', '对', '是', '正确', 't', 'y', 'yes']);
    const FALSE_VALUES = new Set(['false', '0', '错', '否', '错误', 'f', 'n', 'no']);

    const normalize = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      // 处理对象形式 { answer: ... }
      if (typeof value === 'object' && value.answer !== undefined) {
        return normalize(value.answer);
      }
      // 数组形式（如 ["true"]）取第一个
      if (Array.isArray(value)) {
        return value.length > 0 ? normalize(value[0]) : null;
      }
      const s = String(value).trim().toLowerCase();
      if (TRUE_VALUES.has(s)) return true;
      if (FALSE_VALUES.has(s)) return false;
      return null;
    };

    const studentBool = normalize(studentAnswer);
    const correctBool = normalize(correctAnswer);

    // 任一无法识别 → 判为错（避免误判）
    if (studentBool === null || correctBool === null) {
      return {
        isCorrect: false,
        score: 0,
        message: '判断题答案格式无法识别'
      };
    }

    const isCorrect = studentBool === correctBool;
    return {
      isCorrect,
      score: isCorrect ? parseFloat(maxScore) : 0
    };
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
        JOIN question_bank_with_draft qb ON a.question_id = qb.id
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

  /**
   * Grade a programming question by submitting to judge service
   * @param {number} studentActivityId - Student activity ID
   * @param {number} questionId - Question ID (question_bank.id)
   * @param {string} sourceCode - Student's source code (may be JSON with code and language)
   * @param {number} maxScore - Maximum score for this question
   * @returns {Promise<Object>} Grading result
   */
  static async gradeCodeQuestion(studentActivityId, questionId, sourceCode, maxScore) {
    try {
      // Parse source code - it might be JSON with code and language
      let code = sourceCode;
      let language = 'cpp';

      if (sourceCode && sourceCode.startsWith('{')) {
        try {
          const parsed = JSON.parse(sourceCode);
          code = parsed.code || sourceCode;
          language = parsed.language || 'cpp';
        } catch (e) {
          // Not JSON, use as-is
        }
      }

      if (!code || code.trim() === '') {
        return {
          success: true,
          isCorrect: false,
          score: 0,
          status: 'no_submission',
          feedback: 'No code submitted'
        };
      }

      // Get question draft ID from question_bank
      const questionResult = await query(`
        SELECT qb.draft_id, qd.time_limit, qd.memory_limit
        FROM question_bank qb
        JOIN question_drafts qd ON qb.draft_id = qd.id
        WHERE qb.id = $1
      `, [questionId]);

      if (questionResult.rows.length === 0) {
        return {
          success: false,
          error: '题目不存在'
        };
      }

      const { draft_id, time_limit, memory_limit } = questionResult.rows[0];

      // Submit to judge service
      logger.info(`Submitting code to judge service for question ${questionId}`);

      const response = await fetch(`${JUDGE_SERVICE_URL}/api/judge/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: draft_id, // Use draft_id for test cases lookup
          studentActivityId,
          code,
          language,
          timeLimit: time_limit || 1000,
          memoryLimit: memory_limit || 256
        })
      });

      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.message || 'Judge service error'
        };
      }

      // Poll for result (judge is async)
      const submissionId = result.data.submissionId;
      const judgeResult = await this.pollJudgeResult(submissionId);

      if (!judgeResult) {
        return {
          success: false,
          error: '判题超时'
        };
      }

      // Calculate score based on test results
      const earnedScore = judgeResult.score || 0;
      const isAccepted = judgeResult.status === 'AC' || judgeResult.status === 'accepted';

      // Generate feedback
      let feedback = '';
      if (judgeResult.status === 'AC' || judgeResult.status === 'accepted') {
        feedback = 'All test cases passed!';
      } else if (judgeResult.status === 'CE' || judgeResult.status === 'compile_error') {
        feedback = 'Compile error: ' + (judgeResult.compileOutput || '').substring(0, 500);
      } else if (judgeResult.status === 'WA' || judgeResult.status === 'wrong_answer') {
        const passed = judgeResult.testResults?.filter(t => t.status === 'AC').length || 0;
        const total = judgeResult.testResults?.length || 0;
        feedback = `Wrong answer. Passed ${passed}/${total} test cases.`;
      } else if (judgeResult.status === 'TLE' || judgeResult.status === 'time_limit') {
        feedback = 'Time limit exceeded';
      } else if (judgeResult.status === 'MLE' || judgeResult.status === 'memory_limit') {
        feedback = 'Memory limit exceeded';
      } else if (judgeResult.status === 'RE' || judgeResult.status === 'runtime_error') {
        feedback = 'Runtime error';
      } else if (judgeResult.status === 'partial') {
        const passed = judgeResult.testResults?.filter(t => t.status === 'AC').length || 0;
        const total = judgeResult.testResults?.length || 0;
        feedback = `Partial score. Passed ${passed}/${total} test cases.`;
      } else {
        feedback = `Judge result: ${judgeResult.status}`;
      }

      // Save to code_submissions table
      try {
        await query(`
          INSERT INTO code_submissions
          (student_activity_id, question_id, student_id, source_code, language,
           status, score, total_score, time_used, memory_used, compile_output, judge_result)
          SELECT $1, $2, sa.student_id, $3, $4, $5, $6, $7, $8, $9, $10, $11
          FROM student_activities sa WHERE sa.id = $1
        `, [
          studentActivityId,
          questionId,
          code,
          language,
          judgeResult.status,
          earnedScore,
          maxScore,
          judgeResult.executionTime || null,
          judgeResult.memoryUsed || null,
          judgeResult.compileOutput || null,
          JSON.stringify(judgeResult.testResults || [])
        ]);
      } catch (saveError) {
        logger.warn('Failed to save code submission:', saveError.message);
      }

      return {
        success: true,
        isCorrect: isAccepted,
        score: earnedScore,
        status: judgeResult.status,
        feedback,
        testResults: judgeResult.testResults
      };

    } catch (error) {
      logger.error('Grade code question error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Poll judge service for submission result
   * @param {number} submissionId - Submission ID
   * @returns {Promise<Object|null>} Judge result or null if timeout
   */
  static async pollJudgeResult(submissionId) {
    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${JUDGE_SERVICE_URL}/api/judge/status/${submissionId}`);
        const result = await response.json();

        if (result.success && result.data) {
          const status = result.data.status;
          // Check if judging is complete
          if (status !== 'pending' && status !== 'judging') {
            return result.data;
          }
        }
      } catch (error) {
        logger.warn(`Poll attempt ${attempts} failed:`, error.message);
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    logger.warn(`Judging timeout for submission ${submissionId} after ${maxAttempts} seconds`);
    return null;
  }
}

module.exports = AutoGradingService;
