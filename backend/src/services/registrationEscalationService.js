const cron = require('node-cron');
const { pool } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * 注册申请自动升级服务
 *
 * 功能:
 * - 每小时检查一次待审核的注册申请
 * - 如果申请超过3天未处理，自动升级到上一级管理员
 * - 升级路径: 校级(Level 2) -> 区县级(Level 3) -> 市级(Level 4)
 * - 市级管理员必须处理，不再升级
 */

/**
 * 获取审核层级名称
 * @param {number} level - 审核层级
 * @returns {string} 层级名称
 */
function getLevelName(level) {
  const names = {
    2: '校级管理员',
    3: '区县级管理员',
    4: '市级管理员'
  };
  return names[level] || `Level ${level}`;
}

/**
 * 升级单个注册申请到下一级审核层级
 * @param {Object} request - 注册申请对象
 */
async function escalateRequest(request) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const newLevel = request.current_reviewer_level + 1;

    // 更新申请的审核层级和最后升级时间
    await client.query(`
      UPDATE student_registration_requests
      SET current_reviewer_level = $1,
          last_escalated_at = CURRENT_TIMESTAMP,
          current_reviewer_id = NULL
      WHERE id = $2
    `, [newLevel, request.id]);

    // 记录审核日志
    const comment = `超过3天未审核，自动从${getLevelName(request.current_reviewer_level)}升级到${getLevelName(newLevel)}`;
    const metadata = JSON.stringify({
      from_level: request.current_reviewer_level,
      to_level: newLevel,
      auto: true,
      reason: '3天未处理自动升级'
    });

    await client.query(
      'SELECT log_registration_action($1, $2, $3, $4, $5, $6)',
      [
        request.id,
        'auto_escalated',
        null,  // 系统自动操作，无操作人
        0,     // 系统级别
        comment,
        metadata
      ]
    );

    await client.query('COMMIT');

    logger.info('Registration request auto-escalated', {
      requestId: request.id,
      phone: request.phone,
      fromLevel: request.current_reviewer_level,
      toLevel: newLevel,
      school: request.school_name
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to escalate registration request', {
      requestId: request.id,
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 检查并升级所有超过3天未处理的注册申请
 */
async function escalatePendingRequests() {
  try {
    // 计算3天前的时间戳
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    logger.info('Starting registration escalation check', {
      threeDaysAgo: threeDaysAgo.toISOString()
    });

    // 查找需要升级的申请
    // 条件: status=pending, last_escalated_at < 3天前, current_reviewer_level < 4
    const result = await pool.query(`
      SELECT * FROM student_registration_requests
      WHERE status = 'pending'
        AND last_escalated_at < $1
        AND current_reviewer_level < 4
      ORDER BY submitted_at ASC
    `, [threeDaysAgo]);

    const requestsToEscalate = result.rows;

    if (requestsToEscalate.length === 0) {
      logger.info('No registration requests require escalation');
      return;
    }

    logger.info(`Found ${requestsToEscalate.length} requests requiring escalation`);

    // 逐个升级申请
    let successCount = 0;
    let failureCount = 0;

    for (const request of requestsToEscalate) {
      try {
        await escalateRequest(request);
        successCount++;
      } catch (error) {
        failureCount++;
        logger.error('Error escalating request', {
          requestId: request.id,
          error: error.message
        });
      }
    }

    logger.info('Registration escalation check completed', {
      total: requestsToEscalate.length,
      success: successCount,
      failure: failureCount
    });

  } catch (error) {
    logger.error('Registration escalation check failed', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * 启动定时任务 - 每小时执行一次
 * Cron表达式: '0 * * * *'
 * - 0: 每小时的第0分钟
 * - *: 每小时
 * - *: 每天
 * - *: 每月
 * - *: 每周
 */
function startEscalationCron() {
  // 启动定时任务
  const task = cron.schedule('0 * * * *', () => {
    logger.info('Running scheduled registration escalation check');
    escalatePendingRequests();
  });

  logger.info('Registration escalation cron started', {
    schedule: 'Every hour (0 * * * *)',
    description: 'Auto-escalate registration requests after 3 days'
  });

  return task;
}

/**
 * 停止定时任务
 * @param {Object} task - cron任务对象
 */
function stopEscalationCron(task) {
  if (task) {
    task.stop();
    logger.info('Registration escalation cron stopped');
  }
}

module.exports = {
  startEscalationCron,
  stopEscalationCron,
  escalatePendingRequests  // 导出用于手动触发或测试
};
