import { getPointsSummary, getPointTransactions, PointTransaction } from '../../../../services/growth';
import { getPointsAccount } from '../../../../services/api';
import { getUser, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

Page({
  data: {
    loading: true,
    account: { current_points: 0, total_points: 0, spent_points: 0 },
    summary: { todayEarned: 0, weekEarned: 0, totalEarned: 0, totalSpent: 0 },
    list: [] as (PointTransaction & { created_at: string })[],
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
      const [accountRes, summaryRes, txRes] = await Promise.all([
        getPointsAccount(user.id),
        getPointsSummary(user.id).catch(() => null),
        getPointTransactions(user.id, 30).catch(() => null),
      ]);
      this.setData({
        account: {
          current_points: accountRes.data?.current_points ?? 0,
          total_points: accountRes.data?.total_points ?? 0,
          spent_points: accountRes.data?.spent_points ?? 0,
        },
        summary: summaryRes?.data ?? { todayEarned: 0, weekEarned: 0, totalEarned: 0, totalSpent: 0 },
        list: (txRes?.data ?? []).map((t) => ({
          ...t,
          created_at: String(t.created_at ?? '').slice(5, 16).replace('T', ' '),
        })),
      });
    } catch (err) {
      toastError(err, '积分数据加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },
});
