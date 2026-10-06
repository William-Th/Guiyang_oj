/**
 * 订阅消息调度器（计划书 6.2/第8章）：
 * - 微信一次性订阅"点一次只能发一条"：前端在推题完成页 requestSubscribeMessage，
 *   接受后上报 /api/mp/subscribe-record 累加配额；本调度器每日 20:05 扫描
 *   "有连胜且今天还没打卡且有配额"的学生发提醒，发送成功扣 1，43101 清零。
 * - 未配置微信凭据或模板 ID 时 start() 直接跳过（优雅降级）。
 * 注意：data 字段名（thing1/thing2）需与小程序后台申请的连胜提醒模板字段一致。
 */
const cron = require('node-cron');
const { query } = require('../../database/connection');
const wechatApi = require('./wechatApi');

async function sendStreakReminders(templateId) {
  const rows = await query(
    `SELECT q.user_id, b.openid, s.current_streak
     FROM mp_subscribe_quota q
     JOIN user_wechat_bindings b ON b.user_id = q.user_id
     JOIN student_streaks s ON s.student_id = q.user_id
     WHERE q.template_key = 'streak' AND q.quota > 0
       AND s.current_streak >= 1
       AND (s.last_correct_at IS NULL OR s.last_correct_at::date < CURRENT_DATE)
     LIMIT 200`
  );
  let sent = 0;
  for (const row of rows.rows) {
    const result = await wechatApi.sendSubscribe(row.openid, templateId, 'packages/smart/pages/flow/index', {
      thing1: { value: '今日推题还没完成' },
      thing2: { value: `连胜 ${row.current_streak} 天，练一题保住它` }
    });
    if (result && result.errcode === 0) {
      sent += 1;
      await query(
        'UPDATE mp_subscribe_quota SET quota = quota - 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND template_key = \'streak\'',
        [row.user_id]
      );
    } else if (result && result.errcode === 43101) {
      // 用户配额已用尽/未订阅：清零，避免每天空扫
      await query(
        'UPDATE mp_subscribe_quota SET quota = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND template_key = \'streak\'',
        [row.user_id]
      );
    }
  }
  console.log(`📅 连胜提醒发送完成：目标 ${rows.rows.length} 人，成功 ${sent} 条`);
  return sent;
}

function start() {
  if (!wechatApi.isConfigured()) {
    console.log('⚠️  微信凭据未配置（WECHAT_APPID/WECHAT_SECRET），订阅消息调度器未启动');
    return;
  }
  const templateId = process.env.MP_SUBSCRIBE_TEMPLATE_STREAK;
  if (!templateId) {
    console.log('⚠️  未配置 MP_SUBSCRIBE_TEMPLATE_STREAK，连胜提醒调度器未启动');
    return;
  }
  cron.schedule('5 20 * * *', () => {
    sendStreakReminders(templateId).catch((err) => console.error('连胜提醒任务失败:', err.message));
  });
  console.log('📅 连胜保级提醒调度器已启动（每日 20:05）');
}

module.exports = { start, sendStreakReminders };
