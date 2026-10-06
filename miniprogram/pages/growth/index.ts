import { getStreak } from '../../services/api';
import { getUser, requireLogin } from '../../utils/auth';

Page({
  data: {
    streakDays: 0,
  },

  onShow() {
    if (!requireLogin()) return;
    // 家长不使用学生成长页，弹回看板
    if ((getUser()?.role ?? '') === 'parent') {
      wx.switchTab({ url: '/pages/parent/index' });
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
