import { getStreak } from '../../services/api';
import { requireLogin } from '../../utils/auth';

Page({
  data: {
    streakDays: 0,
  },

  onShow() {
    if (!requireLogin()) return;
    const tabBar = (
      this as unknown as { getTabBar?: () => { setData: (d: Record<string, unknown>) => void } }
    ).getTabBar?.();
    tabBar?.setData({ selected: 2 });
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
