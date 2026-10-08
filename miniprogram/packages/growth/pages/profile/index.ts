import { getLearningProfile } from '../../../../services/activities';
import { requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

interface WeakPoint {
  knowledge_point: string;
  accuracy_rate: number;
  total_questions: number;
  correct_count: number;
  /** 进度条颜色：掌握度低红、中黄、高绿 */
  color: string;
}

Page({
  data: {
    loading: true,
    /** 掌握度 0~100（null = 暂无作答数据） */
    abilityPercent: null as number | null,
    abilityText: '暂无数据',
    practiceTotal: 0,
    practiceCorrectRate: '—',
    last7d: 0,
    dailyTotal: 0,
    weakPoints: [] as WeakPoint[],
  },

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  async load() {
    try {
      const res = await getLearningProfile();
      const d = res.data;
      const abilityPercent =
        d.ability == null ? null : Math.round(d.ability * 100);
      const weakPoints: WeakPoint[] = (d.weakPoints ?? []).map((w) => ({
        ...w,
        accuracy_rate: Math.round(w.accuracy_rate),
        color:
          w.accuracy_rate >= 80
            ? '#16a34a'
            : w.accuracy_rate >= 60
              ? '#d97706'
              : '#dc2626',
      }));
      this.setData({
        loading: false,
        abilityPercent,
        abilityText:
          abilityPercent == null
            ? '暂无数据'
            : abilityPercent >= 80
              ? '优秀'
              : abilityPercent >= 60
                ? '良好'
                : '待提升',
        practiceTotal: d.practice?.total ?? 0,
        practiceCorrectRate:
          d.practice?.correctRate == null ? '—' : `${d.practice.correctRate}%`,
        last7d: d.practice?.last7d ?? 0,
        dailyTotal: d.dailyTotal ?? 0,
        weakPoints,
      });
    } catch (err) {
      this.setData({ loading: false });
      toastError(err, '加载学习画像失败');
    }
  },
});
