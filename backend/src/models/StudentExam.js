const { query } = require('../database/connection');

class StudentExam {
  static async register(studentId, examId, sessionId = null) {
    const result = await query(`
      INSERT INTO student_activities (student_id, activity_id, session_id, status)
      VALUES ($1, $2, $3, 'registered')
      RETURNING id, student_id, activity_id, status, created_at
    `, [studentId, examId, sessionId]);

    return result.rows[0];
  }

  static async start(studentId, examId, ipAddress) {
    // First, get activity details to determine time limit type
    const activityResult = await query(`
      SELECT time_limit_type, duration, end_time
      FROM activities
      WHERE id = $1
    `, [examId]);

    if (activityResult.rows.length === 0) {
      throw new Error('Activity not found');
    }

    const activity = activityResult.rows[0];
    let timeLimitDeadline = null;

    // Calculate time_limit_deadline based on time_limit_type
    if (activity.time_limit_type === 'scheduled') {
      // For scheduled activities, deadline is the activity's end_time
      timeLimitDeadline = activity.end_time;
    } else if (activity.time_limit_type === 'timed') {
      // For timed activities, deadline is current time + duration (in minutes)
      // PostgreSQL: CURRENT_TIMESTAMP + INTERVAL '30 minutes'
      const durationMinutes = activity.duration || 60;
      const deadlineQuery = await query(`SELECT CURRENT_TIMESTAMP + INTERVAL '${durationMinutes} minutes' AS deadline`);
      timeLimitDeadline = deadlineQuery.rows[0].deadline;
    }
    // For 'unlimited' type, timeLimitDeadline remains null

    // Update student_activities with started_at and time_limit_deadline
    const result = await query(`
      UPDATE student_activities
      SET status = 'in_progress',
          start_time = CURRENT_TIMESTAMP,
          started_at = CURRENT_TIMESTAMP,
          time_limit_deadline = $4,
          ip_address = $3
      WHERE student_id = $1 AND activity_id = $2 AND status = 'registered'
      RETURNING id, start_time, started_at, time_limit_deadline, status
    `, [studentId, examId, ipAddress, timeLimitDeadline]);

    return result.rows[0];
  }

  static async submit(studentId, examId, score) {
    const result = await query(`
      UPDATE student_activities
      SET status = 'submitted',
          submit_time = CURRENT_TIMESTAMP,
          score = $3
      WHERE student_id = $1 AND activity_id = $2 AND status = 'in_progress'
      RETURNING id, submit_time, score, status
    `, [studentId, examId, score]);

    return result.rows[0];
  }

  static async findByStudentAndExam(studentId, examId) {
    const result = await query(`
      SELECT id, student_id, activity_id, session_id, status, start_time,
             submit_time, score, rank, created_at
      FROM student_activities
      WHERE student_id = $1 AND activity_id = $2
    `, [studentId, examId]);

    return result.rows[0];
  }

  static async getStudentExamHistory(studentId) {
    const result = await query(`
      SELECT se.*, e.title, e.subject, e.grade, e.total_score, e.pass_score
      FROM student_activities se
      JOIN activities e ON se.activity_id = e.id
      WHERE se.student_id = $1
      ORDER BY se.created_at DESC
    `, [studentId]);

    return result.rows;
  }
}

module.exports = StudentExam;