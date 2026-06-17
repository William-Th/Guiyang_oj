const { pool } = require('../../database/connection');
const PointsPolicy = require('../points/PointsPolicy');

// 超过此时长未答对，连胜归零（视为非连续会话）
const RESET_INTERVAL_MS = 2 * 60 * 60 * 1000;

/**
 * StreakService (D2 连胜机制)
 * 连续答对累计，答错或超时归零；达 step 倍数触发连胜奖励（复用 PointsPolicy.awardStreak）
 */
class StreakService {
  /**
   * 查询学生连胜
   */
  static async get(studentId) {
    const { query } = require('../../database/connection');
    const r = await query('SELECT * FROM student_streaks WHERE student_id = $1', [studentId]);
    return r.rows[0] || { student_id: studentId, current_streak: 0, max_streak: 0, last_correct_at: null };
  }

  /**
   * 记录一次答题结果（对/错），更新连胜并触发奖励
   * @returns {Promise<Object>} { current_streak, max_streak, awarded }
   */
  static async recordResult(studentId, correct) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // 确保行存在
      await client.query(
        'INSERT INTO student_streaks (student_id) VALUES ($1) ON CONFLICT (student_id) DO NOTHING',
        [studentId]
      );
      const r = await client.query(
        'SELECT * FROM student_streaks WHERE student_id = $1 FOR UPDATE',
        [studentId]
      );
      const row = r.rows[0];
      const now = Date.now();
      let currentStreak = row.current_streak || 0;

      // 超时归零
      if (row.last_correct_at && (now - new Date(row.last_correct_at).getTime()) > RESET_INTERVAL_MS) {
        currentStreak = 0;
      }

      let awarded = 0;
      if (correct) {
        currentStreak += 1;
        const maxStreak = Math.max(row.max_streak || 0, currentStreak);
        await client.query(
          `UPDATE student_streaks
           SET current_streak = $1, max_streak = $2, last_correct_at = CURRENT_TIMESTAMP
           WHERE student_id = $3`,
          [currentStreak, maxStreak, studentId]
        );
        await client.query('COMMIT');
        // 达步长倍数发奖
        const res = await PointsPolicy.awardStreak(studentId, currentStreak);
        awarded = res.awarded;
        return { current_streak: currentStreak, max_streak: maxStreak, awarded };
      }

      await client.query(
        'UPDATE student_streaks SET current_streak = 0 WHERE student_id = $1',
        [studentId]
      );
      await client.query('COMMIT');
      return { current_streak: 0, max_streak: row.max_streak || 0, awarded: 0 };
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (err) { /* ignore */ }
      throw e;
    } finally {
      client.release();
    }
  }
}

StreakService.RESET_INTERVAL_MS = RESET_INTERVAL_MS;
module.exports = StreakService;
