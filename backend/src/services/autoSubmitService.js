/**
 * Auto Submit Service
 * Automatically submits student activities that have exceeded their time limit
 *
 * Handles two time limit scenarios:
 * 1. Scheduled activities (end_time): Activities with fixed time windows
 * 2. Timed activities (time_limit_deadline): Activities with per-student time limits
 */

const cron = require('node-cron');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Auto-submit expired student activities
 * Runs every minute to check for activities that need to be submitted
 */
async function autoSubmitExpiredActivities() {
  try {
    // Find all in-progress activities that have exceeded their time limit
    // time_limit_deadline is set when student starts the activity
    const result = await query(`
      SELECT sa.id, sa.student_id, sa.activity_id, sa.time_limit_deadline,
             a.title, a.time_limit_type
      FROM student_activities sa
      JOIN activities a ON sa.activity_id = a.id
      WHERE sa.status = 'in_progress'
        AND sa.time_limit_deadline IS NOT NULL
        AND sa.time_limit_deadline <= NOW()
      ORDER BY sa.time_limit_deadline ASC
    `);

    if (result.rows.length === 0) {
      logger.debug('Auto-submit check: No expired activities found');
      return;
    }

    logger.info('Auto-submit check: Found expired activities', {
      count: result.rows.length,
      activities: result.rows.map(r => ({
        studentActivityId: r.id,
        activityId: r.activity_id,
        studentId: r.student_id,
        deadline: r.time_limit_deadline,
        type: r.time_limit_type
      }))
    });

    // Auto-submit each expired activity
    let successCount = 0;
    let failCount = 0;

    for (const record of result.rows) {
      try {
        // Calculate score for all answered questions
        const answersResult = await query(`
          SELECT SUM(score) as total_score
          FROM answers
          WHERE student_activity_id = $1
        `, [record.id]);

        const totalScore = answersResult.rows[0].total_score || 0;

        // Update student_activity status to completed
        await query(`
          UPDATE student_activities
          SET status = 'completed',
              score = $1,
              submitted_at = NOW(),
              updated_at = NOW()
          WHERE id = $2
        `, [totalScore, record.id]);

        successCount++;
        logger.info('Auto-submitted activity', {
          studentActivityId: record.id,
          activityId: record.activity_id,
          studentId: record.student_id,
          score: totalScore,
          title: record.title
        });
      } catch (error) {
        failCount++;
        logger.error('Failed to auto-submit activity', {
          studentActivityId: record.id,
          activityId: record.activity_id,
          studentId: record.student_id,
          error: error.message,
          stack: error.stack
        });
      }
    }

    logger.info('Auto-submit batch completed', {
      total: result.rows.length,
      success: successCount,
      failed: failCount
    });

  } catch (error) {
    logger.error('Auto-submit service error', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Start the auto-submit cron job
 * Runs every minute: '* * * * *'
 */
function startAutoSubmitCron() {
  // Schedule cron job to run every minute
  const task = cron.schedule('* * * * *', async () => {
    logger.debug('Auto-submit cron job triggered');
    await autoSubmitExpiredActivities();
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });

  logger.info('Auto-submit cron job started', {
    schedule: 'Every minute',
    timezone: 'Asia/Shanghai'
  });

  return task;
}

/**
 * Stop the auto-submit cron job
 * @param {Object} task - The cron task to stop
 */
function stopAutoSubmitCron(task) {
  if (task) {
    task.stop();
    logger.info('Auto-submit cron job stopped');
  }
}

/**
 * Manually trigger auto-submit (for testing)
 */
async function triggerManualAutoSubmit() {
  logger.info('Manual auto-submit triggered');
  await autoSubmitExpiredActivities();
}

module.exports = {
  startAutoSubmitCron,
  stopAutoSubmitCron,
  triggerManualAutoSubmit,
  autoSubmitExpiredActivities
};
