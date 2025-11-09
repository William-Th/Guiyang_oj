const cron = require('node-cron');
const leaderboardService = require('./LeaderboardService');
const logger = require('../../utils/logger');

/**
 * 排行榜定时任务
 * 每小时更新一次排行榜
 */

let cronTask = null;

/**
 * 启动排行榜定时任务
 */
function startLeaderboardCron() {
  // 每小时的第5分钟执行（避免和其他定时任务冲突）
  const schedule = '5 * * * *'; // 每小时的第5分钟

  cronTask = cron.schedule(schedule, async () => {
    try {
      logger.info('Running scheduled leaderboard generation');
      await leaderboardService.generateAllLeaderboards();
      logger.info('Scheduled leaderboard generation completed');
    } catch (error) {
      logger.error('Leaderboard generation failed:', error);
    }
  }, {
    timezone: 'Asia/Shanghai'
  });

  logger.info('Leaderboard cron job started', {
    schedule: '每小时第5分钟',
    timezone: 'Asia/Shanghai'
  });

  return cronTask;
}

/**
 * 停止排行榜定时任务
 */
function stopLeaderboardCron(task) {
  if (task) {
    task.stop();
    logger.info('Leaderboard cron job stopped');
  }
}

module.exports = {
  startLeaderboardCron,
  stopLeaderboardCron
};
