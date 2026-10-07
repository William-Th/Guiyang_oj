import { PendingQuestion, getPendingQuestions, reviewQuestion } from '../../../../services/review';
import { requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';
import { formatDateTime } from '../../../../utils/format';
import {
  TYPE_TEXT,
  NormalOption,
  parseOptions,
  formatCorrectDisplay,
} from '../../../../utils/questionFormat';

const DIFF_TEXT: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' };

interface DisplayQuestion extends PendingQuestion {
  typeText: string;
  difficultyText: string;
  submittedAtText: string;
  parsedOptions: NormalOption[];
  answerText: string;
  expanded: boolean;
  acting: boolean;
}

Page({
  data: {
    loading: true,
    /** 审核统计（来自 /pending 响应 meta，避免多拉一次 /stats） */
    stats: { pending: 0, approved: 0, rejected: 0, rate: 0 },
    list: [] as DisplayQuestion[],
  },

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  async load() {
    try {
      const res = await getPendingQuestions();
      const list = (res.data ?? []).map(
        (q): DisplayQuestion => ({
          ...q,
          typeText: TYPE_TEXT[q.type] ?? q.type,
          difficultyText: DIFF_TEXT[q.difficulty ?? ''] ?? '',
          submittedAtText: formatDateTime(q.submitted_at),
          parsedOptions: parseOptions(q.options),
          answerText: formatCorrectDisplay(q.type, q.correct_answer, parseOptions(q.options)),
          expanded: false,
          acting: false,
        })
      );
      this.setData({
        loading: false,
        list,
        stats: {
          pending: res.meta?.count ?? list.length,
          approved: res.meta?.approved_count ?? 0,
          rejected: res.meta?.rejected_count ?? 0,
          rate: res.meta?.approval_rate ?? 0,
        },
      });
    } catch (err) {
      this.setData({ loading: false });
      toastError(err, '加载待审题目失败');
    }
  },

  onToggle(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    this.setData({
      list: this.data.list.map((q) => (q.id === id ? { ...q, expanded: !q.expanded } : q)),
    });
  },

  onApprove(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    const target = this.data.list.find((q) => q.id === id);
    if (!target) return;
    wx.showModal({
      title: '通过审核',
      content: '通过后该题将直接发布入库，确定通过吗？',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ list: this.data.list.map((q) => (q.id === id ? { ...q, acting: true } : q)) });
        try {
          await reviewQuestion(id, 'approved');
          wx.showToast({ title: '已通过并发布', icon: 'success' });
          this.load();
        } catch (err) {
          this.setData({ list: this.data.list.map((q) => (q.id === id ? { ...q, acting: false } : q)) });
          toastError(err, '审核操作失败');
        }
      },
    });
  },

  onReject(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    // 审核意见后端必填（拒绝时）
    wx.showModal({
      title: '驳回题目',
      editable: true,
      placeholderText: '请填写审核意见（必填）',
      success: async (res) => {
        if (!res.confirm) return;
        const comment = (res.content || '').trim();
        if (!comment) {
          wx.showToast({ title: '审核意见不能为空', icon: 'none' });
          return;
        }
        this.setData({ list: this.data.list.map((q) => (q.id === id ? { ...q, acting: true } : q)) });
        try {
          await reviewQuestion(id, 'rejected', comment);
          wx.showToast({ title: '已驳回', icon: 'success' });
          this.load();
        } catch (err) {
          this.setData({ list: this.data.list.map((q) => (q.id === id ? { ...q, acting: false } : q)) });
          toastError(err, '审核操作失败');
        }
      },
    });
  },
});
