/**
 * MP Routes — 小程序聚合接口（计划书第8章，只读包装现有服务，零新表）
 *
 * Endpoints:
 * - GET /home - 首页一次聚合：连胜/积分/未读数/今日推题进度/进行中练习数
 *   （替代小程序端 4-5 个串行请求，支撑首屏 <1.5s 性能预算）
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { query } = require('../database/connection');
const StreakService = require('../services/streak/StreakService');
const StudentPoints = require('../models/StudentPoints');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');

router.get(
  '/home',
  authMiddleware,
  requireRole(['student']),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const [streak, account, notifyCount, annCount, dailyDone, ongoingPractices] = await Promise.all([
        StreakService.get(userId),
        StudentPoints.getPointsAccount(userId).catch(() => null),
        Notification.getUnreadCount(userId).catch(() => 0),
        Announcement.getUnreadCount({ id: userId, role: req.user.role }).catch(() => 0),
        query(
          `SELECT COALESCE(SUM(cardinality(question_ids)), 0)::int AS done
           FROM daily_question_sets
           WHERE student_id = $1 AND stat_date = CURRENT_DATE`,
          [userId]
        ),
        query(
          `SELECT COUNT(*)::int AS cnt
           FROM student_activities sa
           JOIN activities a ON a.id = sa.activity_id
           WHERE sa.student_id = $1 AND sa.status = 'in_progress' AND a.status = 'published'`,
          [userId]
        )
      ]);

      res.json({
        success: true,
        data: {
          streak: {
            current: streak?.current_streak ?? 0,
            max: streak?.max_streak ?? 0,
            lastCorrectAt: streak?.last_correct_at ?? null
          },
          points: account?.current_points ?? 0,
          unread: (notifyCount || 0) + (annCount || 0),
          daily: { done: dailyDone.rows[0]?.done ?? 0, target: 10 },
          ongoingPractices: ongoingPractices.rows[0]?.cnt ?? 0
        }
      });
    } catch (error) {
      console.error('MP home aggregate error:', error);
      res.status(500).json({ success: false, message: '获取首页数据失败' });
    }
  }
);

/**
 * 订阅消息配额上报：前端 requestSubscribeMessage 后调用
 * body: { templateKey: 'streak'|'deadline', accepted: boolean }
 * 接受 → 配额+1（上限 5，一次性订阅语义）；拒绝 → 清零
 */
router.post(
  '/subscribe-record',
  authMiddleware,
  requireRole(['student']),
  async (req, res) => {
    try {
      const { templateKey, accepted } = req.body || {};
      const key = String(templateKey || '');
      if (!['streak', 'deadline'].includes(key)) {
        return res.status(400).json({ success: false, message: '未知的订阅模板' });
      }
      const sql = accepted
        ? `INSERT INTO mp_subscribe_quota (user_id, template_key, quota) VALUES ($1, $2, 1)
           ON CONFLICT (user_id, template_key) DO UPDATE SET quota = LEAST(mp_subscribe_quota.quota + 1, 5), updated_at = CURRENT_TIMESTAMP`
        : `INSERT INTO mp_subscribe_quota (user_id, template_key, quota) VALUES ($1, $2, 0)
           ON CONFLICT (user_id, template_key) DO UPDATE SET quota = 0, updated_at = CURRENT_TIMESTAMP`;
      await query(sql, [req.user.id, key]);
      res.json({ success: true });
    } catch (error) {
      console.error('Subscribe record error:', error);
      res.status(500).json({ success: false, message: '记录订阅状态失败' });
    }
  }
);

module.exports = router;
