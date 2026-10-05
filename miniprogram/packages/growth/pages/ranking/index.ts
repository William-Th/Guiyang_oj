import { LeaderboardType, getLeaderboard } from '../../../../services/growth';
import { getUser, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

const FILTERS = [
  { label: '总榜', value: 'total' },
  { label: '周榜', value: 'weekly' },
  { label: '月榜', value: 'monthly' },
];

Page({
  data: {
    filters: FILTERS,
    type: 'total' as LeaderboardType,
    loading: false,
    list: [] as {
      student_id: number;
      rank: number;
      student_name: string;
      schoolName: string;
      className: string;
      points: number;
      isMe: boolean;
    }[],
    myEntry: null as null | { rank: number; points: number },
  },

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  onTypeChange(e: WechatMiniprogram.CustomEvent) {
    const type = String(e.currentTarget.dataset.type) as LeaderboardType;
    this.setData({ type });
    this.load();
  },

  async load() {
    const user = getUser();
    this.setData({ loading: true });
    try {
      const res = await getLeaderboard(this.data.type);
      const list = (res.data ?? []).map((entry) => ({
        student_id: entry.student_id,
        rank: entry.rank,
        student_name: entry.student_name,
        schoolName: entry.school_name ?? '',
        className: entry.class_name ?? '',
        points: entry.points,
        isMe: user ? entry.student_id === user.id : false,
      }));
      const mine = list.find((item) => item.isMe);
      this.setData({
        list,
        myEntry: mine ? { rank: mine.rank, points: mine.points } : null,
      });
    } catch (err) {
      toastError(err, '排行榜加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },
});
