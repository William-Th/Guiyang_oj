const { pool } = require('../../database/connection');
const logger = require('../../utils/logger');

/**
 * LeaderboardService - 排行榜生成服务
 * 负责计算和更新各类排行榜
 */
class LeaderboardService {
  /**
   * 生成总积分排行榜
   * @param {string} scope - 范围（null=全局，或school_id/class_id）
   * @param {number} limit - 排名数量
   */
  async generateTotalLeaderboard(scope = null, limit = 100) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      logger.info('Generating total leaderboard', { scope, limit });

      // 构建查询
      let query = `
        SELECT
          sp.student_id,
          s.real_name as student_name,
          sch.school_name,
          s.class_name,
          sp.total_points as points,
          ROW_NUMBER() OVER (ORDER BY sp.total_points DESC, sp.student_id ASC) as rank
        FROM student_points sp
        JOIN students s ON sp.student_id = s.id
        LEFT JOIN schools sch ON s.school_id = sch.id
        WHERE sp.total_points > 0
      `;

      const params = [];
      let paramCount = 1;

      // 添加范围过滤
      if (scope && scope.startsWith('school_')) {
        const schoolId = parseInt(scope.replace('school_', ''));
        query += ` AND s.school_id = $${paramCount}`;
        params.push(schoolId);
        paramCount++;
      } else if (scope && scope.startsWith('class_')) {
        const classId = parseInt(scope.replace('class_', ''));
        query += ` AND s.class_id = $${paramCount}`;
        params.push(classId);
        paramCount++;
      }

      query += ` ORDER BY sp.total_points DESC, sp.student_id ASC LIMIT $${paramCount}`;
      params.push(limit);

      const result = await client.query(query, params);

      // 清除旧的排行榜数据
      await client.query(
        `DELETE FROM leaderboards
         WHERE leaderboard_type = $1 AND (scope = $2 OR (scope IS NULL AND $2 IS NULL))`,
        ['total', scope]
      );

      // 插入新的排行榜数据（使用批量参数化插入）
      if (result.rows.length > 0) {
        const studentIds = result.rows.map(r => r.student_id);
        const studentNames = result.rows.map(r => r.student_name);
        const schoolNames = result.rows.map(r => r.school_name);
        const classNames = result.rows.map(r => r.class_name);
        const pointsArray = result.rows.map(r => r.points);
        const ranks = result.rows.map(r => r.rank);

        await client.query(`
          INSERT INTO leaderboards (
            leaderboard_type, scope, student_id, student_name,
            school_name, class_name, points, rank, rank_change,
            period_start, period_end, last_updated
          )
          SELECT
            'total', $1,
            unnest($2::int[]), unnest($3::text[]),
            unnest($4::text[]), unnest($5::text[]),
            unnest($6::int[]), unnest($7::int[]),
            NULL, NULL, NULL, CURRENT_TIMESTAMP
        `, [scope, studentIds, studentNames, schoolNames, classNames, pointsArray, ranks]);
      }

      await client.query('COMMIT');
      logger.info('Total leaderboard generated', {
        scope,
        count: result.rows.length
      });

      return result.rows.length;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to generate total leaderboard:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 生成周排行榜
   * @param {string} scope - 范围
   * @param {number} limit - 排名数量
   */
  async generateWeeklyLeaderboard(scope = null, limit = 100) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 计算本周起止日期
      const now = new Date();
      const dayOfWeek = now.getDay() || 7; // 周日为7
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek + 1);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      logger.info('Generating weekly leaderboard', {
        scope,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString()
      });

      // 查询本周积分增长
      let query = `
        WITH weekly_points AS (
          SELECT
            pt.student_id,
            SUM(pt.points_change) as week_points
          FROM points_transactions pt
          WHERE pt.points_change > 0
            AND pt.created_at >= $1
            AND pt.created_at <= $2
          GROUP BY pt.student_id
        )
        SELECT
          wp.student_id,
          s.real_name as student_name,
          sch.school_name,
          s.class_name,
          wp.week_points as points,
          ROW_NUMBER() OVER (ORDER BY wp.week_points DESC, wp.student_id ASC) as rank
        FROM weekly_points wp
        JOIN students s ON wp.student_id = s.id
        LEFT JOIN schools sch ON s.school_id = sch.id
        WHERE wp.week_points > 0
      `;

      const params = [weekStart, weekEnd];
      let paramCount = 3;

      // 添加范围过滤
      if (scope && scope.startsWith('school_')) {
        const schoolId = parseInt(scope.replace('school_', ''));
        query += ` AND s.school_id = $${paramCount}`;
        params.push(schoolId);
        paramCount++;
      } else if (scope && scope.startsWith('class_')) {
        const classId = parseInt(scope.replace('class_', ''));
        query += ` AND s.class_id = $${paramCount}`;
        params.push(classId);
        paramCount++;
      }

      query += ` ORDER BY wp.week_points DESC, wp.student_id ASC LIMIT $${paramCount}`;
      params.push(limit);

      const result = await client.query(query, params);

      // 清除旧的周排行榜数据
      await client.query(
        `DELETE FROM leaderboards
         WHERE leaderboard_type = $1
           AND (scope = $2 OR (scope IS NULL AND $2 IS NULL))
           AND period_start = $3`,
        ['weekly', scope, weekStart]
      );

      // 插入新的排行榜数据（使用批量参数化插入）
      if (result.rows.length > 0) {
        const studentIds = result.rows.map(r => r.student_id);
        const studentNames = result.rows.map(r => r.student_name);
        const schoolNames = result.rows.map(r => r.school_name);
        const classNames = result.rows.map(r => r.class_name);
        const pointsArray = result.rows.map(r => r.points);
        const ranks = result.rows.map(r => r.rank);

        await client.query(`
          INSERT INTO leaderboards (
            leaderboard_type, scope, student_id, student_name,
            school_name, class_name, points, rank, rank_change,
            period_start, period_end, last_updated
          )
          SELECT
            'weekly', $1,
            unnest($2::int[]), unnest($3::text[]),
            unnest($4::text[]), unnest($5::text[]),
            unnest($6::int[]), unnest($7::int[]),
            NULL, $8, $9, CURRENT_TIMESTAMP
        `, [scope, studentIds, studentNames, schoolNames, classNames, pointsArray, ranks, weekStart.toISOString(), weekEnd.toISOString()]);
      }

      await client.query('COMMIT');
      logger.info('Weekly leaderboard generated', {
        scope,
        count: result.rows.length
      });

      return result.rows.length;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to generate weekly leaderboard:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 生成月排行榜
   * @param {string} scope - 范围
   * @param {number} limit - 排名数量
   */
  async generateMonthlyLeaderboard(scope = null, limit = 100) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 计算本月起止日期
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      logger.info('Generating monthly leaderboard', {
        scope,
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString()
      });

      // 查询本月积分增长
      let query = `
        WITH monthly_points AS (
          SELECT
            pt.student_id,
            SUM(pt.points_change) as month_points
          FROM points_transactions pt
          WHERE pt.points_change > 0
            AND pt.created_at >= $1
            AND pt.created_at <= $2
          GROUP BY pt.student_id
        )
        SELECT
          mp.student_id,
          s.real_name as student_name,
          sch.school_name,
          s.class_name,
          mp.month_points as points,
          ROW_NUMBER() OVER (ORDER BY mp.month_points DESC, mp.student_id ASC) as rank
        FROM monthly_points mp
        JOIN students s ON mp.student_id = s.id
        LEFT JOIN schools sch ON s.school_id = sch.id
        WHERE mp.month_points > 0
      `;

      const params = [monthStart, monthEnd];
      let paramCount = 3;

      // 添加范围过滤
      if (scope && scope.startsWith('school_')) {
        const schoolId = parseInt(scope.replace('school_', ''));
        query += ` AND s.school_id = $${paramCount}`;
        params.push(schoolId);
        paramCount++;
      } else if (scope && scope.startsWith('class_')) {
        const classId = parseInt(scope.replace('class_', ''));
        query += ` AND s.class_id = $${paramCount}`;
        params.push(classId);
        paramCount++;
      }

      query += ` ORDER BY mp.month_points DESC, mp.student_id ASC LIMIT $${paramCount}`;
      params.push(limit);

      const result = await client.query(query, params);

      // 清除旧的月排行榜数据
      await client.query(
        `DELETE FROM leaderboards
         WHERE leaderboard_type = $1
           AND (scope = $2 OR (scope IS NULL AND $2 IS NULL))
           AND period_start = $3`,
        ['monthly', scope, monthStart]
      );

      // 插入新的排行榜数据（使用批量参数化插入）
      if (result.rows.length > 0) {
        const studentIds = result.rows.map(r => r.student_id);
        const studentNames = result.rows.map(r => r.student_name);
        const schoolNames = result.rows.map(r => r.school_name);
        const classNames = result.rows.map(r => r.class_name);
        const pointsArray = result.rows.map(r => r.points);
        const ranks = result.rows.map(r => r.rank);

        await client.query(`
          INSERT INTO leaderboards (
            leaderboard_type, scope, student_id, student_name,
            school_name, class_name, points, rank, rank_change,
            period_start, period_end, last_updated
          )
          SELECT
            'monthly', $1,
            unnest($2::int[]), unnest($3::text[]),
            unnest($4::text[]), unnest($5::text[]),
            unnest($6::int[]), unnest($7::int[]),
            NULL, $8, $9, CURRENT_TIMESTAMP
        `, [scope, studentIds, studentNames, schoolNames, classNames, pointsArray, ranks, monthStart.toISOString(), monthEnd.toISOString()]);
      }

      await client.query('COMMIT');
      logger.info('Monthly leaderboard generated', {
        scope,
        count: result.rows.length
      });

      return result.rows.length;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to generate monthly leaderboard:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 生成所有排行榜
   */
  async generateAllLeaderboards() {
    logger.info('Starting leaderboard generation');

    try {
      // 生成总榜
      await this.generateTotalLeaderboard(null, 100);

      // 生成周榜
      await this.generateWeeklyLeaderboard(null, 100);

      // 生成月榜
      await this.generateMonthlyLeaderboard(null, 100);

      logger.info('All leaderboards generated successfully');
      return true;
    } catch (error) {
      logger.error('Failed to generate all leaderboards:', error);
      return false;
    }
  }
}

// 导出单例
const leaderboardService = new LeaderboardService();
module.exports = leaderboardService;
