const cron = require('node-cron');
const DailyQuestionService = require('./DailyQuestionService');
const logger = require('../../utils/logger');
const { runWithAdvisoryLock } = require('../distributedLock');

/**
 * 每日推题定时任务（D3）
 * 每日凌晨预热近期活跃学生的每日题集；学生首次打开时也会即时生成。
 */

let cronTask = null;

function startDailyQuestionCron() {
  // 每日凌晨 3:07 执行（避开整点高峰）
  const schedule = '7 3 * * *';

  cronTask = cron.schedule(schedule, async () => {
    try {
      logger.info('Running scheduled daily question warmup');
      let warmedStudents = 0;
      const ran = await runWithAdvisoryLock('daily-question-warmup', async () => {
        warmedStudents = await DailyQuestionService.warmupRecentStudents();
      });
      if (ran) {
        logger.info(`Daily question warmup completed: ${warmedStudents} students`);
      }
    } catch (error) {
      logger.error('Daily question warmup failed:', error);
    }
  }, {
    timezone: 'Asia/Shanghai'
  });

  logger.info('Daily question cron job started', {
    schedule: '每日03:07',
    timezone: 'Asia/Shanghai'
  });

  return cronTask;
}

function stopDailyQuestionCron(task) {
  if (task) {
    task.stop();
    logger.info('Daily question cron job stopped');
  }
}

module.exports = {
  startDailyQuestionCron,
  stopDailyQuestionCron
};
