import {
  ChildResult,
  ParentChild,
  getChildProfile,
  getChildResults,
  getChildStats,
  getParentChildren,
} from '../../../../services/parent';
import { requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';

interface SubjectDisplay {
  subject: string;
  pct: number;
  levelClass: 'good' | 'mid' | 'weak';
  total_questions: number;
  correct_count: number;
}

Page({
  data: {
    loading: true,
    children: [] as ParentChild[],
    child: null as ParentChild | null,
    stats: [] as SubjectDisplay[],
    results: [] as (ChildResult & { timeText: string })[],
  },

  onShow() {
    if (!requireLogin()) return;
    this.loadChildren();
  },

  async loadChildren() {
    this.setData({ loading: true });
    try {
      const res = await getParentChildren();
      const children = res.data ?? [];
      this.setData({ children });
      if (children.length > 0) {
        await this.selectChild(children[0].student_user_id);
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      toastError(err, '孩子信息加载失败');
      this.setData({ loading: false });
    }
  },

  async selectChild(studentId: number) {
    this.setData({ loading: true, child: this.data.children.find((c) => c.student_user_id === studentId) ?? null });
    try {
      const [profileRes, statsRes, resultsRes] = await Promise.all([
        getChildProfile(studentId).catch(() => null),
        getChildStats(studentId).catch(() => null),
        getChildResults(studentId).catch(() => null),
      ]);
      // profile 作为数据源补充（children 列表已含 grade/class，此处兜底）
      const profile = profileRes?.data;
      const child = { ...(this.data.child ?? {}), ...(profile ?? {}) } as ParentChild;
      const stats = (statsRes?.data ?? []).map((s) => {
        const raw = parseFloat(String(s.accuracy_rate ?? 0));
        const ratio = raw <= 1 ? raw : raw / 100;
        const pct = Math.round(ratio * 100);
        return {
          subject: s.subject,
          pct,
          levelClass: pct >= 80 ? 'good' : pct >= 60 ? 'mid' : 'weak',
          total_questions: s.total_questions ?? 0,
          correct_count: s.correct_count ?? 0,
        } as SubjectDisplay;
      });
      const results = (resultsRes?.data ?? []).slice(0, 20).map((r) => ({
        ...r,
        timeText: r.submit_time ? String(r.submit_time).slice(5, 10) : '',
      }));
      this.setData({
        loading: false,
        child,
        stats,
        results,
      });
    } catch (err) {
      toastError(err, '孩子数据加载失败');
      this.setData({ loading: false });
    }
  },

  onSwitchChild(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    if (this.data.child?.student_user_id === id) return;
    this.selectChild(id);
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/index' });
  },
});
