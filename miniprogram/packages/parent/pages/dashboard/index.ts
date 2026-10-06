import {
  ChildResult,
  ParentChild,
  getChildProfile,
  getChildResults,
  getChildStats,
  getParentChildren,
  getRegistrableAssessments,
  registerForChild,
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
    registrable: [] as { id: number; title: string; subject?: string; endTimeText: string }[],
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
      const [profileRes, statsRes, resultsRes, registrableRes] = await Promise.all([
        getChildProfile(studentId).catch(() => null),
        getChildStats(studentId).catch(() => null),
        getChildResults(studentId).catch(() => null),
        getRegistrableAssessments(studentId).catch(() => null),
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
      const registrable = (registrableRes?.data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        subject: a.subject,
        endTimeText: a.end_time ? String(a.end_time).slice(5, 10) : '',
      }));
      this.setData({
        loading: false,
        child,
        stats,
        results,
        registrable,
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

  /** 代孩子报名测评（后端幂等：已报名返回 400 提示） */
  onRegisterForChild(e: WechatMiniprogram.CustomEvent) {
    const activityId = Number(e.currentTarget.dataset.id);
    const childName = this.data.child?.real_name || '孩子';
    const item = this.data.registrable.find((a) => a.id === activityId);
    wx.showModal({
      title: '代报名确认',
      content: `为 ${childName} 报名「${item?.title ?? '该测评'}」？`,
      success: async (res) => {
        if (!res.confirm || !this.data.child) return;
        try {
          const result = await registerForChild(this.data.child.student_user_id, activityId);
          wx.showToast({ title: result.message || '已代孩子报名', icon: 'none' });
          this.selectChild(this.data.child.student_user_id);
        } catch (err) {
          toastError(err, '报名失败');
        }
      },
    });
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/index' });
  },
});
