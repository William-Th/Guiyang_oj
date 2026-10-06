import {
  AdminDashboardStats,
  getAdminDashboardStats,
  getMpHome,
  getRegistrationRequests,
  getStreak,
  getUnreadCount,
} from '../../services/api';
import { getPendingTeachingClasses } from '../../services/admin';
import { getUser, requireLogin } from '../../utils/auth';

const GRID_ITEMS = [
  { icon: 'star-o', text: '智能练习', path: '/packages/smart/pages/flow/index' },
  { icon: 'gem-o', text: '积分', path: '/packages/growth/pages/points/index' },
  { icon: 'medal-o', text: '成就', path: '/packages/growth/pages/achievements/index' },
  { icon: 'fire-o', text: '排行榜', path: '/packages/growth/pages/ranking/index' },
  { icon: 'bookmark-o', text: '错题本', path: '/packages/growth/pages/wrong-questions/index' },
  { icon: 'chart-trending-o', text: '统计', path: '/packages/growth/pages/statistics/index' },
];

const AVAILABLE_PATHS = new Set(GRID_ITEMS.map((item) => item.path).filter(Boolean));

Page({
  data: {
    role: 'student',
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
    // 管理工作台（管理员角色时本 tab 渲染工作台；数据按各级管理员权限自动限定范围）
    adminStats: null as AdminDashboardStats | null,
    pendingCount: 0,
    adminLoading: false,
  },

  onShow() {
    if (!requireLogin()) return;
    const user = getUser();
    const role = user?.role ?? 'student';
    (
      this as unknown as { getTabBar?: () => { setActive?: (p: string) => void } | undefined }
    ).getTabBar?.()?.setActive?.('/pages/home/index');
    const hour = new Date().getHours();
    const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

    if (role === 'parent') {
      wx.reLaunch({ url: '/pages/parent/index' });
      return;
    }
    if (role.includes('admin')) {
      this.setData({
        role: 'admin',
        greeting,
        realName: user?.realName || user?.username || '',
      });
      this.loadAdminData();
      return;
    }
    this.setData({ role: 'student', greeting, realName: user?.realName || user?.username || '' });
    this.loadData();
  },

  /** 管理工作台数据：统计/待办角标（校级本校、区级本区、市级全局，由后端按权限范围过滤） */
  async loadAdminData() {
    this.setData({ adminLoading: true });
    try {
      const [statsRes, regRes, clsRes] = await Promise.all([
        getAdminDashboardStats(),
        getRegistrationRequests(1, 'pending').catch(() => null),
        getPendingTeachingClasses().catch(() => null),
      ]);
      this.setData({
        adminStats: statsRes,
        pendingCount: (regRes?.data?.total ?? 0) + (clsRes?.length ?? 0),
      });
    } catch (err) {
      wx.showToast({ title: '工作台数据加载失败', icon: 'none' });
    } finally {
      this.setData({ adminLoading: false });
    }
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
    wx.navigateTo({ url: '/packages/smart/pages/flow/index' });
  },

  goPractice() {
    wx.switchTab({ url: '/pages/practice/index' });
  },

  onNotice() {
    wx.showToast({ title: '通知中心将在后续版本开放', icon: 'none' });
  },

  goApprovals() {
    wx.navigateTo({ url: '/packages/admin/pages/approvals/index' });
  },

  goUsers() {
    wx.navigateTo({ url: '/packages/admin/pages/users/index' });
  },

  onFeature(e: WechatMiniprogram.CustomEvent) {
    const path = String(e.currentTarget.dataset.path ?? '');
    if (path && AVAILABLE_PATHS.has(path)) {
      wx.navigateTo({ url: path });
      return;
    }
    wx.showToast({ title: '该功能将在后续版本开放', icon: 'none' });
  },
});
