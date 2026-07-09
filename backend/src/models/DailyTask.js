const { pool } = require('../database/connection');

/**
 * DailyTask Model - 日常任务模型
 * 管理日常任务定义和学生任务进度
 */
class DailyTask {
  /**
   * 获取所有活跃的日常任务
   * @param {Object} options - 查询选项
   * @param {string} options.category - 任务类别 (daily/weekly/monthly)
   * @param {string} options.taskType - 任务类型 (login/practice/exam/social)
   * @param {boolean} options.activeOnly - 只返回活跃任务
   * @returns {Promise<Array>} 任务列表
   */
  static async getAllTasks({ category = null, taskType = null, activeOnly = true } = {}) {
    try {
      let query = `
        SELECT
          task_id,
          task_code,
          task_name,
          task_desc,
          task_icon,
          category,
          task_type,
          points_reward,
          bonus_points,
          target_value,
          progress_type,
          reset_period,
          reset_time,
          trigger_condition,
          is_active,
          display_order,
          valid_from,
          valid_to,
          created_at,
          updated_at
        FROM daily_tasks
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (activeOnly) {
        query += ' AND is_active = true';
      }

      if (category) {
        query += ` AND category = $${paramCount}`;
        params.push(category);
        paramCount++;
      }

      if (taskType) {
        query += ` AND task_type = $${paramCount}`;
        params.push(taskType);
        paramCount++;
      }

      // Check valid date range
      query += ' AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)';
      query += ' AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)';

      query += ' ORDER BY display_order ASC, task_id ASC';

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取单个任务
   * @param {number} taskId - 任务ID
   * @returns {Promise<Object|null>} 任务对象或null
   */
  static async getTaskById(taskId) {
    try {
      const result = await pool.query(
        'SELECT * FROM daily_tasks WHERE task_id = $1',
        [taskId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching task by ID:', error);
      throw error;
    }
  }

  /**
   * 根据任务代码获取任务
   * @param {string} taskCode - 任务代码
   * @returns {Promise<Object|null>} 任务对象或null
   */
  static async getTaskByCode(taskCode) {
    try {
      const result = await pool.query(
        'SELECT * FROM daily_tasks WHERE task_code = $1',
        [taskCode]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching task by code:', error);
      throw error;
    }
  }

  /**
   * 创建新任务
   * @param {Object} taskData - 任务数据
   * @returns {Promise<Object>} 创建的任务对象
   */
  static async createTask(taskData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        taskCode,
        taskName,
        taskDesc,
        taskIcon,
        category,
        taskType,
        pointsReward,
        bonusPoints = 0,
        targetValue,
        progressType,
        resetPeriod,
        resetTime = '00:00:00',
        triggerCondition,
        isActive = true,
        displayOrder = 0,
        validFrom = null,
        validTo = null
      } = taskData;

      const result = await client.query(
        `INSERT INTO daily_tasks (
          task_code, task_name, task_desc, task_icon,
          category, task_type, points_reward, bonus_points,
          target_value, progress_type, reset_period, reset_time,
          trigger_condition, is_active, display_order,
          valid_from, valid_to
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          taskCode, taskName, taskDesc, taskIcon,
          category, taskType, pointsReward, bonusPoints,
          targetValue, progressType, resetPeriod, resetTime,
          JSON.stringify(triggerCondition), isActive, displayOrder,
          validFrom, validTo
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating task:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 更新任务
   * @param {number} taskId - 任务ID
   * @param {Object} taskData - 更新的数据
   * @returns {Promise<Object>} 更新后的任务对象
   */
  static async updateTask(taskId, taskData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let paramCount = 1;

      const fieldMap = {
        taskName: 'task_name',
        taskDesc: 'task_desc',
        taskIcon: 'task_icon',
        category: 'category',
        taskType: 'task_type',
        pointsReward: 'points_reward',
        bonusPoints: 'bonus_points',
        targetValue: 'target_value',
        progressType: 'progress_type',
        resetPeriod: 'reset_period',
        resetTime: 'reset_time',
        triggerCondition: 'trigger_condition',
        isActive: 'is_active',
        displayOrder: 'display_order',
        validFrom: 'valid_from',
        validTo: 'valid_to'
      };

      Object.keys(taskData).forEach(key => {
        if (fieldMap[key]) {
          fields.push(`${fieldMap[key]} = $${paramCount}`);

          // Handle JSON fields
          if (key === 'triggerCondition') {
            values.push(JSON.stringify(taskData[key]));
          } else {
            values.push(taskData[key]);
          }
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(taskId);
      const query = `
        UPDATE daily_tasks
        SET ${fields.join(', ')}
        WHERE task_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating task:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 删除任务
   * @param {number} taskId - 任务ID
   * @returns {Promise<boolean>} 是否成功删除
   */
  static async deleteTask(taskId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'DELETE FROM daily_tasks WHERE task_id = $1',
        [taskId]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting task:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取学生的任务进度
   * @param {number} studentId - 学生ID
   * @param {Object} options - 查询选项
   * @param {string} options.category - 任务类别
   * @param {Date} options.periodStart - 周期开始日期
   * @param {Date} options.periodEnd - 周期结束日期
   * @returns {Promise<Array>} 任务进度列表
   */
  static async getStudentTaskProgress(studentId, { category = null, periodStart = null, periodEnd = null } = {}) {
    try {
      let query = `
        SELECT
          stp.progress_id,
          stp.student_id,
          stp.task_id,
          stp.current_value,
          stp.target_value,
          stp.completion_rate,
          stp.is_completed,
          stp.completed_at,
          stp.points_awarded,
          stp.bonus_awarded,
          stp.period_start,
          stp.period_end,
          stp.reset_count,
          dt.task_code,
          dt.task_name,
          dt.task_desc,
          dt.task_icon,
          dt.category,
          dt.task_type,
          dt.points_reward,
          dt.bonus_points,
          dt.progress_type
        FROM student_task_progress stp
        JOIN daily_tasks dt ON stp.task_id = dt.task_id
        WHERE stp.student_id = $1
      `;

      const params = [studentId];
      let paramCount = 2;

      if (category) {
        query += ` AND dt.category = $${paramCount}`;
        params.push(category);
        paramCount++;
      }

      if (periodStart) {
        query += ` AND stp.period_start = $${paramCount}`;
        params.push(periodStart);
        paramCount++;
      }

      if (periodEnd) {
        query += ` AND stp.period_end = $${paramCount}`;
        params.push(periodEnd);
        paramCount++;
      }

      query += ' ORDER BY dt.display_order ASC, stp.task_id ASC';

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching student task progress:', error);
      throw error;
    }
  }

  /**
   * 更新任务进度
   * @param {number} studentId - 学生ID
   * @param {number} taskId - 任务ID
   * @param {number} incrementValue - 增加的进度值
   * @param {Date} periodStart - 周期开始日期
   * @param {Date} periodEnd - 周期结束日期
   * @returns {Promise<Object>} 更新后的进度对象
   */
  static async updateTaskProgress(studentId, taskId, incrementValue, periodStart, periodEnd) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get task definition
      const taskResult = await client.query(
        'SELECT * FROM daily_tasks WHERE task_id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.rows[0];

      // Check if progress record exists
      const progressResult = await client.query(
        `SELECT * FROM student_task_progress
         WHERE student_id = $1 AND task_id = $2 AND period_start = $3`,
        [studentId, taskId, periodStart]
      );

      let progress;

      if (progressResult.rows.length === 0) {
        // Create new progress record
        const insertResult = await client.query(
          `INSERT INTO student_task_progress (
            student_id, task_id, current_value, target_value,
            period_start, period_end, reset_count
          ) VALUES ($1, $2, $3, $4, $5, $6, 0)
          RETURNING *`,
          [studentId, taskId, incrementValue, task.target_value, periodStart, periodEnd]
        );
        progress = insertResult.rows[0];
      } else {
        // Update existing progress
        const updateResult = await client.query(
          `UPDATE student_task_progress
           SET current_value = current_value + $1
           WHERE student_id = $2 AND task_id = $3 AND period_start = $4
           RETURNING *`,
          [incrementValue, studentId, taskId, periodStart]
        );
        progress = updateResult.rows[0];
      }

      // Check if task just completed
      if (progress.is_completed && !progressResult.rows[0]?.is_completed) {
        // Award points
        await this.awardTaskPoints(client, studentId, taskId, progress);

        // Record completion history
        await client.query(
          `INSERT INTO task_completion_history (
            student_id, task_id, completed_value, target_value,
            points_earned, bonus_earned, period_start, period_end,
            completion_time, streak_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)`,
          [
            studentId,
            taskId,
            progress.current_value,
            progress.target_value,
            progress.points_awarded,
            progress.bonus_awarded,
            periodStart,
            periodEnd,
            progress.reset_count + 1
          ]
        );
      }

      await client.query('COMMIT');
      return progress;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating task progress:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 发放任务积分
   * @param {Object} client - 数据库客户端
   * @param {number} studentId - 学生ID
   * @param {number} taskId - 任务ID
   * @param {Object} progress - 进度对象
   * @returns {Promise<void>}
   */
  static async awardTaskPoints(client, studentId, taskId, progress) {
    try {
      // Get task details
      const taskResult = await client.query(
        'SELECT * FROM daily_tasks WHERE task_id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.rows[0];

      // Calculate points
      let pointsToAward = task.points_reward;
      let bonusToAward = 0;

      // Check for streak bonus
      if (progress.reset_count >= 2 && task.bonus_points > 0) {
        bonusToAward = task.bonus_points;
      }

      const totalPoints = pointsToAward + bonusToAward;

      // Update progress with awarded points
      await client.query(
        `UPDATE student_task_progress
         SET points_awarded = $1, bonus_awarded = $2
         WHERE student_id = $3 AND task_id = $4 AND period_start = $5`,
        [pointsToAward, bonusToAward, studentId, taskId, progress.period_start]
      );

      // Award points to student
      // Check if student_points record exists
      const pointsResult = await client.query(
        'SELECT * FROM student_points WHERE student_id = $1',
        [studentId]
      );

      if (pointsResult.rows.length === 0) {
        // Create new record
        await client.query(
          `INSERT INTO student_points (student_id, total_points, current_points)
           VALUES ($1, $2, $2)`,
          [studentId, totalPoints]
        );
      } else {
        // Update existing record
        await client.query(
          `UPDATE student_points
           SET total_points = total_points + $1,
               current_points = current_points + $1
           WHERE student_id = $2`,
          [totalPoints, studentId]
        );
      }

      // Record transaction
      await client.query(
        `INSERT INTO points_transactions (
          student_id, points_change, transaction_type,
          source_type, source_id, description, balance_after
        )
        SELECT
          $1, $2, 'daily_task', 'daily_task', $3, $4,
          (SELECT current_points FROM student_points WHERE student_id = $1)`,
        [
          studentId,
          totalPoints,
          taskId,
          `完成任务: ${task.task_name}`
        ]
      );
    } catch (error) {
      console.error('Error awarding task points:', error);
      throw error;
    }
  }

  /**
   * 重置学生任务进度（用于每日/每周/每月重置）
   * @param {string} resetPeriod - 重置周期 (daily/weekly/monthly)
   * @returns {Promise<number>} 重置的记录数
   */
  static async resetTaskProgress(resetPeriod) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate new period dates
      const now = new Date();
      let periodStart, periodEnd;

      if (resetPeriod === 'daily') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 1);
      } else if (resetPeriod === 'weekly') {
        const dayOfWeek = now.getDay() || 7;
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - dayOfWeek + 1);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
      } else if (resetPeriod === 'monthly') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      // Mark old progress as historical (by updating period_end if needed)
      // Then create new progress records for active students

      const result = await client.query(
        `UPDATE student_task_progress
         SET reset_count = reset_count + 1
         WHERE task_id IN (
           SELECT task_id FROM daily_tasks WHERE reset_period = $1 AND is_active = true
         )
         AND period_end < CURRENT_DATE`,
        [resetPeriod]
      );

      await client.query('COMMIT');
      return result.rowCount;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error resetting task progress:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = DailyTask;
