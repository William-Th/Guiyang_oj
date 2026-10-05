import { getMpHome, getStreak, getUnreadCount } from '../../services/api';
import { getUser, requireLogin } from '../../utils/auth';

const GRID_ITEMS = [
  { icon: 'star-o', text: '智能练习' },
  { icon: 'gem-o', text: '积分' },
  { icon: 'medal-o', text: '成就' },
  { icon: 'fire-o', text: '排行榜' },
  { icon: 'bookmark-o', text: '错题本' },
  { icon: 'chart-trending-o', text: '统计' },
];

Page({
  data: {
    greeting: '',
    realName: '',
    statusText: '',
    streakDays: 0,
    maxStreak: 0,
    points: 0,
    unread: 0,
    dailyDone: 0,
    dailyTarget: 10,
    gridItems: GRID_ITEMS,
  },

  onShow() {
    if (!requireLogin()) return;
    this.updateTabBar();
    const user = getUser();
    const hour = new Date().getHours();
    const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
    this.setData({ greeting, realName: user?.realName || user?.username || '' });
    this.loadData();
  },

  updateTabBar() {
    const tabBar = (
      this as unknown as { getTabBar?: () => { setData: (d: Record<string, unknown>) => void } }
    ).getTabBar?.();
    tabBar?.setData({ selected: 0 });
  },

  /** 首选 /api/mp/home 一次聚合（首屏预算）；聚合不可用时降级为多接口并行 */
  async loadData() {
    try {
      const res = await getMpHome();
      const d = res.data;
      this.setData({
        streakDays: d.streak?.current ?? 0,
        maxStreak: d.streak?.max ?? 0,
        points: d.points ?? 0,
        unread: d.unread ?? 0,
        dailyDone: d.daily?.done ?? 0,
        dailyTarget: d.daily?.target ?? 10,
        statusText: this.isCheckedToday(d.streak?.lastCorrectAt)
          ? '今日已打卡，保持住连胜'
          : '今天还没打卡，练一题就有连胜',
      });
      return;
    } catch {
      /* 降级 */
    }

    const user = getUser();
    const [streak, unread] = await Promise.all([
      getStreak().catch(() => null),
      getUnreadCount().catch(() => null),
    ]);
    const streakData = streak?.data;
    this.setData({
      // 后端 student_streaks 表为 snake_case 字段（current_streak/max_streak/last_correct_at）
      streakDays: streakData?.current_streak ?? 0,
      maxStreak: streakData?.max_streak ?? 0,
      unread: unread?.count?.total ?? 0,
      statusText: this.isCheckedToday(streakData?.last_correct_at)
        ? '今日已打卡，保持住连胜'
        : '今天还没打卡，练一题就有连胜',
    });
  },

  isCheckedToday(lastCorrectAt?: string | null): boolean {
    if (!lastCorrectAt) return false;
    const d = new Date(lastCorrectAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  },

  onStartDaily() {
    // 智能练习单题流（packages/smart）随 M2 落地
    wx.showToast({ title: '智能练习将在后续版本开放', icon: 'none' });
  },

  goPractice() {
    wx.switchTab({ url: '/pages/practice/index' });
  },

  onNotice() {
    wx.showToast({ title: '通知中心将在后续版本开放', icon: 'none' });
  },

  onFeature() {
    wx.showToast({ title: '该功能将在后续版本开放', icon: 'none' });
  },
});
