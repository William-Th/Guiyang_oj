import { getStreak } from '../../services/api';
import { getUser, requireLogin } from '../../utils/auth';

Page({
  data: {
    streakDays: 0,
  },

  onShow() {
    if (!requireLogin()) return;
    // 成长页仅学生使用：家长回看板、管理员回管理工作台
    const role = getUser()?.role ?? '';
    if (role !== 'student') {
      if (role === 'parent') wx.reLaunch({ url: '/pages/parent/index' });
      else wx.switchTab({ url: '/pages/home/index' });
      return;
    }
(
  this as unknown as { getTabBar?: () => { setActive?: (p: string) => void } | undefined }
).getTabBar?.()?.setActive?.('/pages/growth/index');
    getStreak()
      .then((res) => this.setData({ streakDays: res.data?.current_streak ?? 0 }))
      .catch(() => {
        /* 画像摘要允许降级 */
      });
  },

  /** 成长子页导航：已上线路径在此登记，其余提示开发中 */
  onFeature(e: WechatMiniprogram.CustomEvent) {
    const path = String(e.currentTarget.dataset.path ?? '');
    const available: Record<string, boolean> = {
      '/packages/smart/pages/flow/index': true,
      '/packages/growth/pages/points/index': true,
      '/packages/growth/pages/achievements/index': true,
      '/packages/growth/pages/ranking/index': true,
      '/packages/growth/pages/wrong-questions/index': true,
      '/packages/growth/pages/statistics/index': true,
      '/packages/growth/pages/shop/index': true,
    };
    if (path && available[path]) {
      wx.navigateTo({ url: path });
      return;
    }
    wx.showToast({ title: '该功能将在后续版本开放', icon: 'none' });
  },
});
