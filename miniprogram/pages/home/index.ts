import { getStreak, getUnreadCount } from '../../services/api';
import { getUser, isAdmin, requireLogin } from '../../utils/auth';

Page({
  data: {
    greeting: '',
    realName: '',
    streakDays: 0,
    unread: 0,
    isAdmin: false,
    week: [] as { label: string; today: boolean }[],
  },

  onShow() {
    if (!requireLogin()) return;
    const user = getUser();
    const hour = new Date().getHours();
    const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
    const dayIdx = (new Date().getDay() + 6) % 7; // 周一=0
    const week = ['一', '二', '三', '四', '五', '六', '日'].map((label, i) => ({
      label,
      today: i === dayIdx,
    }));
    this.setData({
      greeting,
      realName: user?.realName || user?.username || '',
      isAdmin: isAdmin(),
      week,
    });
    this.loadData();
  },

  /** 首页数据允许降级：任一接口失败不影响其余展示；M1 换 /api/mp/home 一次聚合 */
  async loadData() {
    const [streak, unread] = await Promise.all([
      getStreak().catch(() => null),
      getUnreadCount().catch(() => null),
    ]);
    this.setData({
      streakDays: streak?.data?.currentStreak ?? 0,
      unread: unread?.count ?? unread?.data?.count ?? 0,
    });
  },

  onStartDaily() {
    // 智能练习单题流（packages/smart）随 M2 落地
    wx.showToast({ title: '智能练习将在后续版本开放', icon: 'none' });
  },

  goPractice() {
    wx.switchTab({ url: '/pages/practice/index' });
  },

  goGrowth() {
    wx.switchTab({ url: '/pages/growth/index' });
  },

  goAdmin() {
    wx.navigateTo({ url: '/packages/admin/pages/home/index' });
  },
});
