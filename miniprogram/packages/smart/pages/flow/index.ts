import {
  DailyQuestion,
  getDailyQuestions,
  getPointsSummary,
  getSubjectsSimple,
  redoWrongQuestion,
  submitRecommendAnswer,
} from '../../../../services/growth';
import { getStreak } from '../../../../services/api';
import { recordSubscribe } from '../../../../services/api';
import { getUser, requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';
import { popStash } from '../../../../utils/transfer';
import { SUBSCRIBE_TEMPLATES } from '../../../../config/env';
import { TYPE_TEXT, NormalOption, formatCorrectDisplay, parseOptions } from '../../../../utils/questionFormat';

type AnswerValue = string | string[];

interface NormalQuestion {
  question_id: number;
  type: string;
  typeText: string;
  difficultyText: string;
  content: string;
  imageUrl: string;
  parsedOptions: NormalOption[];
}

interface JudgeState {
  correct: boolean;
  awarded: number;
  streakCurrent: number;
  correctDisplay: string;
  explanation: string;
}

const DIFF_TEXT: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' };

/** 即答即判仅支持客观题（后端 judgeObjective 同口径） */
const AUTO_JUDGE_TYPES = new Set(['single', 'multiple', 'true_false', 'blank']);

function hasAnswer(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value) !== '';
}

function normalizeQuestion(q: DailyQuestion): NormalQuestion {
  return {
    question_id: q.question_id,
    type: q.type,
    typeText: TYPE_TEXT[q.type] ?? q.type,
    difficultyText: DIFF_TEXT[q.difficulty ?? ''] ?? '',
    content: q.content ?? '',
    imageUrl: '',
    parsedOptions: parseOptions(q.options),
  };
}

Page({
  data: {
    loading: true,
    mode: 'daily' as 'daily' | 'redo',
    subject: '',
    subjects: [] as string[],
    questions: [] as NormalQuestion[],
    current: 0,
    answers: {} as Record<string, AnswerValue>,
    localAnswered: {} as Record<string, boolean>,
    judged: null as JudgeState | null,
    submitting: false,
    canSubmit: false,
    hasNext: false,
    doneCount: 0,
    total: 0,
    streakTemplate: SUBSCRIBE_TEMPLATES.streak,
    celebration: null as null | { streak: number; todayEarned: number; subject: string },
  },

  // 非渲染实例状态
  redoQuestionId: 0 as number,
  redoExplanation: '' as string,
  lastStreak: 0 as number,

  onLoad() {
    if (!requireLogin()) return;
    const redoItem = popStash<{ question_id: number; type: string; content?: string; options?: unknown; explanation?: string | null; image_url?: string | null }>(
      'wrong_redo_question'
    );
    if (redoItem) {
      this.mode = 'redo';
      this.redoQuestionId = redoItem.question_id;
      this.redoExplanation = redoItem.explanation ?? '';
      this.setData({
        loading: false,
        mode: 'redo',
        questions: [
          {
            question_id: redoItem.question_id,
            type: redoItem.type,
            typeText: TYPE_TEXT[redoItem.type] ?? redoItem.type,
            difficultyText: '',
            content: redoItem.content ?? '',
            imageUrl: redoItem.image_url ?? '',
            parsedOptions: parseOptions(redoItem.options),
          },
        ],
        total: 1,
        current: 0,
      });
      return;
    }
    this.loadSubjects();
    this.loadDailySet();
  },

  /** 科目列表（/subjects/simple 公开接口），供每日推题切换科目 */
  async loadSubjects() {
    try {
      const subjects = await getSubjectsSimple();
      this.setData({ subjects: subjects.map((s) => s.value) });
    } catch {
      /* 科目切换条允许降级隐藏 */
    }
  },

  async loadDailySet(subject?: string) {
    try {
      const res = await getDailyQuestions(subject);
      const set = res.data ?? { subject: subject ?? '', questions: [] as DailyQuestion[] };
      // 客户端兜底过滤：非客观题（问答/匹配/编程）无法即答即判，不进入单题流
      const questions = (set.questions ?? [])
        .filter((q) => AUTO_JUDGE_TYPES.has(q.type))
        .map(normalizeQuestion);
      const answers: Record<string, AnswerValue> = {};
      const localAnswered: Record<string, boolean> = {};
      (set.questions ?? []).forEach((q) => {
        if (q.answered) localAnswered[String(q.question_id)] = true;
      });
      const firstUnanswered = questions.findIndex((q) => !localAnswered[String(q.question_id)]);
      const allDone = firstUnanswered < 0;
      this.setData({
        loading: false,
        subject: set.subject ?? '',
        questions,
        total: questions.length,
        answers,
        localAnswered,
        doneCount: questions.filter((q) => localAnswered[String(q.question_id)]).length,
        current: allDone ? 0 : firstUnanswered,
      });
      this.updateHasNext();
      if (allDone) {
        await this.showCelebration();
      }
    } catch (err) {
      toastError(err, '每日推题加载失败');
      setTimeout(() => wx.navigateBack(), 1200);
    }
  },

  /** 切换科目重新拉取当日题集 */
  onSubjectTap(e: WechatMiniprogram.CustomEvent) {
    const subject = String(e.currentTarget.dataset.subject ?? '');
    if (!subject || subject === this.data.subject) return;
    this.setData({ loading: true, subject, judged: null });
    this.loadDailySet(subject);
  },

  currentQuestion(): NormalQuestion | null {
    return this.data.questions[this.data.current] ?? null;
  },

  /** 当前题之后是否还有未答的题（决定底栏文案“下一题/完成今日推题”） */
  updateHasNext() {
    const hasNext = this.data.questions.some(
      (q, i) => i > this.data.current && !this.data.localAnswered[String(q.question_id)]
    );
    this.setData({ hasNext });
  },

  syncCanSubmit() {
    const q = this.currentQuestion();
    this.setData({ canSubmit: q ? hasAnswer(this.data.answers[String(q.question_id)]) : false });
  },

  // ---------- 作答 ----------

  onSingleTap(e: WechatMiniprogram.CustomEvent) {
    if (this.data.judged) return;
    const q = this.currentQuestion();
    if (!q) return;
    this.setData({ [`answers.${q.question_id}`]: String(e.currentTarget.dataset.letter) });
    this.syncCanSubmit();
  },

  onMultipleTap(e: WechatMiniprogram.CustomEvent) {
    if (this.data.judged) return;
    const q = this.currentQuestion();
    if (!q) return;
    const letter = String(e.currentTarget.dataset.letter);
    const current = this.data.answers[String(q.question_id)];
    const letters = Array.isArray(current) ? [...current] : [];
    const idx = letters.indexOf(letter);
    if (idx > -1) letters.splice(idx, 1);
    else letters.push(letter);
    this.setData({ [`answers.${q.question_id}`]: letters });
    this.syncCanSubmit();
  },

  onTfTap(e: WechatMiniprogram.CustomEvent) {
    if (this.data.judged) return;
    const q = this.currentQuestion();
    if (!q) return;
    this.setData({ [`answers.${q.question_id}`]: String(e.currentTarget.dataset.val) });
    this.syncCanSubmit();
  },

  onTextInput(e: WechatMiniprogram.CustomEvent) {
    if (this.data.judged) return;
    const q = this.currentQuestion();
    if (!q) return;
    this.setData({ [`answers.${q.question_id}`]: String(e.detail.value ?? '') });
    this.syncCanSubmit();
  },

  // ---------- 即答即判 ----------

  async onSubmitAnswer() {
    const q = this.currentQuestion();
    if (!q || this.data.submitting || this.data.judged) return;
    const answer = this.data.answers[String(q.question_id)];
    if (!hasAnswer(answer)) return;
    this.setData({ submitting: true });
    try {
      const res =
        this.data.mode === 'redo'
          ? await redoWrongQuestion(this.redoQuestionId, answer)
          : await submitRecommendAnswer(q.question_id, answer);
      const d = res.data;
      const judged: JudgeState = {
        correct: d.correct,
        awarded: d.awarded ?? 0,
        streakCurrent: d.streak?.current_streak ?? 0,
        correctDisplay:
          d.correct === false
            ? formatCorrectDisplay(q.type, d.correct_answer, q.parsedOptions)
            : '',
        // redo 端点不回解析，用错题列表暂存的解析；每日推题答错才下发解析
        explanation:
          this.data.mode === 'redo' ? this.redoExplanation : (d as { explanation?: string | null }).explanation ?? '',
      };
      this.lastStreak = judged.streakCurrent;
      this.setData({
        judged,
        localAnswered:
          this.data.mode === 'daily'
            ? { ...this.data.localAnswered, [String(q.question_id)]: true }
            : this.data.localAnswered,
        doneCount:
          this.data.mode === 'daily'
            ? this.data.doneCount + 1
            : this.data.doneCount,
      });
      this.updateHasNext();
    } catch (err) {
      toastError(err, '提交失败');
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ---------- 下一题 / 庆祝 ----------

  onNext() {
    if (this.data.mode === 'redo') {
      wx.navigateBack();
      return;
    }
    const idx = this.data.questions.findIndex(
      (q, i) => i > this.data.current && !this.data.localAnswered[String(q.question_id)]
    );
    if (idx >= 0) {
      this.setData({ current: idx, judged: null, canSubmit: false });
      this.updateHasNext();
      return;
    }
    this.showCelebration();
  },

  async showCelebration() {
    let streak = this.lastStreak;
    if (!streak) {
      try {
        const res = await getStreak();
        streak = res.data?.current_streak ?? 0;
      } catch {
        streak = 0;
      }
    }
    let todayEarned = 0;
    const user = getUser();
    if (user) {
      try {
        const summary = await getPointsSummary(user.id);
        todayEarned = summary.data?.todayEarned ?? 0;
      } catch {
        todayEarned = 0;
      }
    }
    this.setData({
      celebration: { streak, todayEarned, subject: this.data.subject },
      judged: null,
    });
  },

  goBack() {
    wx.navigateBack();
  },

  /** 订阅连胜保级提醒（一次性订阅：接受一次=可收一条；后端每日 20:05 扫描发送） */
  onSubscribeStreak() {
    const tmpl = SUBSCRIBE_TEMPLATES.streak;
    if (!tmpl) return;
    wx.requestSubscribeMessage({
      tmplIds: [tmpl],
      complete: (res) => {
        const accepted = (res as unknown as Record<string, unknown>)[tmpl] === 'accept';
        recordSubscribe('streak', accepted).catch(() => {
          /* 上报失败不影响主流程 */
        });
        wx.showToast({ title: accepted ? '已订阅，断了连胜会提醒你' : '已取消订阅', icon: 'none' });
      },
    });
  },

  onShareAppMessage() {
    const streak = this.data.celebration?.streak ?? 0;
    return {
      title: `我在贵阳市小学生测评平台连续练习 ${streak} 天，一起来刷题吧！`,
      path: '/pages/login/index',
    };
  },
});
