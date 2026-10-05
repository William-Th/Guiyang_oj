import { WrongQuestionItem, getWrongQuestionStats, getWrongQuestions } from '../../../../services/growth';
import { requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';
import { setStash } from '../../../../utils/transfer';
import { TYPE_TEXT } from '../../../../utils/questionFormat';

const STATUS_TEXT: Record<string, { text: string; tag: 'success' | 'warning' | 'default' }> = {
  active: { text: '待攻克', tag: 'warning' },
  mastered: { text: '已掌握', tag: 'success' },
  removed: { text: '已移除', tag: 'default' },
};

const DIFF_TEXT: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' };

interface DisplayWrong {
  id: number;
  statusText: string;
  statusTag: 'success' | 'warning' | 'default';
  typeText: string;
  difficultyText: string;
  contentHtml: string;
  kpTags: string[];
  error_count: number;
  lastWrongText: string;
  canRedo: boolean;
  needsPc: boolean;
}

/** 后端 redo/recommend 判题仅支持这四种客观题，问答/匹配/编程需电脑端 */
const AUTO_JUDGE_TYPES = new Set(['single', 'multiple', 'true_false', 'blank']);

function decorate(item: WrongQuestionItem): DisplayWrong {
  const status = STATUS_TEXT[item.status ?? 'active'] ?? STATUS_TEXT.active;
  const kps = Array.isArray(item.knowledge_points) ? item.knowledge_points.slice(0, 3) : [];
  return {
    id: item.id,
    statusText: status.text,
    statusTag: status.tag,
    typeText: TYPE_TEXT[item.type] ?? item.type,
    difficultyText: DIFF_TEXT[item.difficulty ?? ''] ?? '',
    contentHtml: item.content || '（题目内容为图片，重练后作答）',
    kpTags: kps,
    error_count: item.error_count ?? 0,
    lastWrongText: item.last_wrong_at ? String(item.last_wrong_at).slice(0, 10) : '',
    canRedo: item.status !== 'removed' && AUTO_JUDGE_TYPES.has(item.type),
    needsPc: !AUTO_JUDGE_TYPES.has(item.type),
  };
}

Page({
  data: {
    loading: true,
    stats: { total: 0, byStatus: { active: 0, mastered: 0, removed: 0 } },
    list: [] as DisplayWrong[],
  },

  // 原始列表（供重练取完整题面）
  rawList: [] as WrongQuestionItem[],

  onShow() {
    if (!requireLogin()) return;
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const [statsRes, listRes] = await Promise.all([
        getWrongQuestionStats().catch(() => null),
        getWrongQuestions(1, 50),
      ]);
      this.rawList = listRes.data ?? [];
      this.setData({
        stats: statsRes?.data ?? { total: 0, byStatus: { active: 0, mastered: 0, removed: 0 } },
        list: this.rawList.map(decorate),
      });
    } catch (err) {
      toastError(err, '错题本加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  onRedo(e: WechatMiniprogram.CustomEvent) {
    const id = Number(e.currentTarget.dataset.id);
    const raw = this.rawList.find((item) => item.id === id);
    if (!raw) return;
    // 题面通过暂存传给单题流（重练走 redo 端点，积分半价）
    setStash('wrong_redo_question', {
      question_id: raw.question_id,
      type: raw.type,
      content: raw.content,
      options: raw.options,
      explanation: raw.explanation,
      image_url: raw.image_url,
    });
    wx.navigateTo({ url: '/packages/smart/pages/flow/index' });
  },
});
