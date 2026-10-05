import { getStreak } from '../../services/api';
import { requireLogin } from '../../utils/auth';

Page({
  data: {
    streakDays: 0,
  },

  onShow() {
    if (!requireLogin()) return;
    getStreak()
      .then((res) => this.setData({ streakDays: res.data?.currentStreak ?? 0 }))
      .catch(() => {
        /* 画像摘要允许降级 */
      });
  },

  /** 成长子页（积分/成就/商店/排行/错题本/统计）随 M2 落地；已存在的路径在 AVAILABLE 登记后即自动放行 */
  onFeature(e: WechatMiniprogram.CustomEvent) {
    const path = String(e.currentTarget.dataset.path ?? '');
    const available: Record<string, boolean> = {};
    if (path && available[path]) {
      wx.navigateTo({ url: path });
      return;
    }
    wx.showToast({ title: '该功能将在后续版本开放', icon: 'none' });
  },
});
