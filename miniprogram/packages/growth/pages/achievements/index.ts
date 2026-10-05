import {
  AchievementItem,
  AchievementProgressItem,
  getMyAchievementProgress,
  getMyAchievements,
} from '../../../../services/growth';
import { getUser, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

Page({
  data: {
    loading: true,
    unlocked: [] as AchievementItem[],
    progress: [] as AchievementProgressItem[],
    rarityText: {
      common: '普通',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说',
    } as Record<string, string>,
  },

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  async load() {
    const user = getUser();
    if (!user) return;
    this.setData({ loading: true });
    try {
      const [unlockedRes, progressRes] = await Promise.all([
        getMyAchievements(user.id),
        getMyAchievementProgress(user.id).catch(() => null),
      ]);
      this.setData({
        unlocked: unlockedRes.data ?? [],
        progress: progressRes?.data ?? [],
      });
    } catch (err) {
      toastError(err, '成就加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },
});
