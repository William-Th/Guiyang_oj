const { query, pool } = require('../../database/connection');
const StudentPoints = require('../../models/StudentPoints');

// Strategy cache (5 min)
let _policyCache = null;
let _policyCacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * PointsPolicy Service (B1)
 * 刷题积分策略：难度基础分 + 收益递减 + 单难度上限 + 每日总上限 + 错题重做折扣
 * 策略值来自 points_policy 表（可后台调整）。
 *
 * 收益递减：第k题积分 = base / (1 + λ·k)，k = 当日该难度已答对题数
 */
class PointsPolicy {
  /**
   * 加载策略配置（带缓存）
   * @returns {Promise<Object>} policy map
   */
  static async load() {
    const now = Date.now();
    if (_policyCache && now - _policyCacheAt < CACHE_TTL) {
      return _policyCache;
    }
    const r = await query('SELECT policy_key, policy_value FROM points_policy');
    const map = {};
    r.rows.forEach((row) => {
      map[row.policy_key] = parseFloat(row.policy_value);
    });
    _policyCache = map;
    _policyCacheAt = now;
    return map;
  }

  /**
   * 清除缓存（后台改策略后调用）
   */
  static clearCache() {
    _policyCache = null;
    _policyCacheAt = 0;
  }

  /**
   * 答对一题发放积分（含收益递减与上限）
   * @param {number} studentId - 学生ID
   * @param {Object} ctx - { difficulty, isRedo, sourceId, sourceType, description }
   * @returns {Promise<Object>} { awarded, capped, difficulty }
   */
  static async awardForCorrectAnswer(studentId, ctx = {}) {
    const policy = await PointsPolicy.load();
    const difficulty = ctx.difficulty || 'medium';
    const base = policy[`${difficulty}_base`];
    const lambda = policy.decay_lambda != null ? policy.decay_lambda : 0.15;
    const cap = policy[`${difficulty}_daily_cap`];
    const totalCap = policy.daily_total_cap;
    const redoRatio = policy.wrong_redo_ratio != null ? policy.wrong_redo_ratio : 0.5;

    // 幂等：同一答案记录(source_id)只发一次答题积分，防止重判重复发分
    if (ctx.sourceId) {
      const dup = await query(
        `SELECT 1 FROM points_transactions
         WHERE student_id = $1 AND source_id = $2
           AND transaction_type IN ('practice', 'wrong_redo')
         LIMIT 1`,
        [studentId, ctx.sourceId]
      );
      if (dup.rows[0]) {
        return { awarded: 0, capped: false, duplicate: true, difficulty };
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 锁定当日该难度计数行（不存在则建）
      const dailyRes = await client.query(
        `INSERT INTO student_points_daily (student_id, stat_date, difficulty)
         VALUES ($1, CURRENT_DATE, $2)
         ON CONFLICT (student_id, stat_date, difficulty)
         DO UPDATE SET student_id = student_points_daily.student_id
         RETURNING *`,
        [studentId, difficulty]
      );
      const daily = dailyRes.rows[0];

      // 当日全部难度累计已得积分
      const totalRes = await client.query(
        `SELECT COALESCE(SUM(earned_points), 0) AS t
         FROM student_points_daily
         WHERE student_id = $1 AND stat_date = CURRENT_DATE`,
        [studentId]
      );
      const todayTotal = parseInt(totalRes.rows[0].t, 10) || 0;

      // 收益递减：第k题（k = 本次之前已答对数）
      const basePoints = base != null ? base : 1;
      let points = Math.floor(basePoints / (1 + lambda * (daily.correct_count || 0)));
      if (ctx.isRedo) {
        points = Math.floor(points * redoRatio);
      }
      if (points < 0) points = 0;

      // 单难度每日上限
      if (cap != null && (daily.earned_points + points) > cap) {
        points = Math.max(0, cap - daily.earned_points);
      }
      // 每日总上限
      if (totalCap != null && (todayTotal + points) > totalCap) {
        points = Math.max(0, totalCap - todayTotal);
      }

      // 更新计数（无论是否给分，都计入做题数）
      await client.query(
        `UPDATE student_points_daily
         SET correct_count = correct_count + 1,
             earned_points = earned_points + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [points, daily.id]
      );

      await client.query('COMMIT');

      // 发放到积分账户（独立事务）
      if (points > 0) {
        await StudentPoints.addPoints(studentId, points, ctx.isRedo ? 'wrong_redo' : 'practice', {
          sourceId: ctx.sourceId || null,
          sourceType: ctx.sourceType || 'question',
          description: ctx.description || (ctx.isRedo ? '错题重做奖励' : '答题奖励')
        });
      }

      return {
        awarded: points,
        capped: points === 0,
        difficulty,
        dailyEarned: (daily.earned_points || 0) + points,
        dailyCap: cap
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * 连胜奖励（配合 D2，每达到 streak_step 连胜发 streak_bonus）
   * 注：连胜计数存储与接入随 D2 实现，此处提供发放能力。
   * @param {number} studentId
   * @param {number} streakCount - 当前连胜数
   * @returns {Promise<Object>} { awarded, streak }
   */
  static async awardStreak(studentId, streakCount) {
    const policy = await PointsPolicy.load();
    const step = policy.streak_step || 5;
    const bonus = policy.streak_bonus || 5;
    if (!streakCount || streakCount % step !== 0 || streakCount <= 0) {
      return { awarded: 0, streak: streakCount };
    }
    const times = Math.floor(streakCount / step);
    const points = bonus * times;
    await StudentPoints.addPoints(studentId, points, 'streak', {
      sourceType: 'streak',
      description: `连胜${streakCount}题奖励`
    });
    return { awarded: points, streak: streakCount };
  }
}

module.exports = PointsPolicy;
