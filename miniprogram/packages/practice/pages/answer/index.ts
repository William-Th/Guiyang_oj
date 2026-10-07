import {
  QuestionRaw,
  getActivityQuestions,
  getMyAnswers,
  saveAnswer,
  startActivity,
  submitActivity,
} from '../../../../services/activities';
import { requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';
import { TYPE_TEXT, NormalOption, parseOptions } from '../../../../utils/questionFormat';
import { popStash } from '../../../../utils/transfer';

interface NormalQuestion {
  question_id: number;
  type: string;
  typeText: string;
  content: string;
  maxScore: number;
  imageUrl: string;
  codeTemplate: string;
  parsedOptions: NormalOption[];
}

type AnswerValue = string | string[];

const CACHE_PREFIX = 'mp_answers_';

function hasAnswer(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value) !== '';
}

function parseStoredAnswer(type: string, raw: string): AnswerValue {
  if (type !== 'multiple') return raw;
  // 服务端 text 列可能存 {A,C} / ["A","C"] / A,C 三种形态，统一还原为数组
  const cleaned = raw.replace(/^\[|\]$/g, '').replace(/^\{|\}$/g, '').replace(/"/g, '');
  return cleaned.split(',').map((v) => v.trim()).filter(Boolean);
}

function normalizeQuestion(q: QuestionRaw): NormalQuestion {
  return {
    question_id: q.question_id,
    type: q.type,
    typeText: TYPE_TEXT[q.type] ?? q.type,
    content: q.content ?? '',
    maxScore: parseFloat(String(q.max_score ?? 0)) || 0,
    imageUrl: q.image_url ?? '',
    codeTemplate: q.code_template ?? '',
    parsedOptions: parseOptions(q.options),
  };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

Page({
  data: {
    loading: true,
    title: '',
    questions: [] as NormalQuestion[],
    current: 0,
    total: 0,
    /** 编程题已提交判题映射：question_id -> submissionId（展示"已提交"） */
    codeSubmits: {} as Record<string, number>,
    answers: {} as Record<string, AnswerValue>,
    answeredCount: 0,
    showSheet: false,
    submitting: false,
    remainingSeconds: -1, // -1 = 无限时
    countdownText: '',
  },

  activityId: 0 as number,
  saveTimers: {} as Record<number, number>,
  deadlineTs: 0 as number,
  studentActivityId: 0 as number,
  countdownTimer: 0 as number,

  async onLoad(query: Record<string, string | undefined>) {
    if (!requireLogin()) return;
    this.activityId = Number(query.id ?? 0);
    await this.init();
  },

  async init() {
    try {
      // 先 start（幂等：已有进行中 attempt 会复用），再拉题目与已存答案
      const startRes = await startActivity(this.activityId);
      // 编程题提交判题需要 student_activities.id（judge-service 外键指向它）
      this.studentActivityId = startRes.student_activity_id ?? 0;
      this.deadlineTs = startRes.deadline ? new Date(startRes.deadline).getTime() : 0;

      const [questionRes, answerRes] = await Promise.all([
        getActivityQuestions(this.activityId),
        getMyAnswers(this.activityId).catch(() => null),
      ]);

      const questions = (questionRes.questions ?? []).map(normalizeQuestion);
      const answers: Record<string, AnswerValue> = {};
      (answerRes?.answers ?? []).forEach((a) => {
        const q = questions.find((item) => item.question_id === a.question_id);
        if (q && a.answer !== null && a.answer !== undefined && a.answer !== '') {
          answers[String(a.question_id)] = parseStoredAnswer(q.type, a.answer);
        }
      });
      // 本地草稿优先（断网/闪退兜底，与 web 端 localStorage 策略一致）
      const local = wx.getStorageSync(`${CACHE_PREFIX}${this.activityId}`) as Record<string, AnswerValue> | '';
      if (local && typeof local === 'object') Object.assign(answers, local);

      this.setData({
        loading: false,
        title: questionRes.activity?.title || `第 ${startRes.attempt_number} 次作答`,
        questions,
        total: questions.length,
        answers,
        answeredCount: questions.filter((q) => hasAnswer(answers[String(q.question_id)])).length,
      });
      this.refreshCodeSubmits();
      this.startCountdown();
    } catch (err) {
      toastError(err, '无法进入答题');
      setTimeout(() => wx.navigateBack(), 1200);
    }
  },

  startCountdown() {
    if (!this.deadlineTs) return;
    this.tickCountdown();
    this.countdownTimer = setInterval(() => this.tickCountdown(), 1000);
  },

  tickCountdown() {
    const remain = Math.floor((this.deadlineTs - Date.now()) / 1000);
    if (remain <= 0) {
      clearInterval(this.countdownTimer);
      this.setData({ remainingSeconds: 0, countdownText: '00:00' });
      wx.showToast({ title: '时间到，自动交卷', icon: 'none' });
      this.doSubmit();
      return;
    }
    const h = Math.floor(remain / 3600);
    const m = Math.floor((remain % 3600) / 60);
    const s = remain % 60;
    this.setData({
      remainingSeconds: remain,
      countdownText: h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`,
    });
  },

  onShow() {
    // 编程编辑器页判题终态回填（stash 传值，URL 无法承载）
    const payload = popStash<{ questionId: number; answer: string }>('mp_code_answer');
    if (payload && payload.questionId && payload.answer) {
      const key = String(payload.questionId);
      if (this.data.questions.some((q) => String(q.question_id) === key)) {
        this.applyAnswer(payload.answer);
      }
    }
  },

  // ---------- 作答 ----------
  // ---------- 作答 ----------

  currentQuestion(): NormalQuestion {
    return this.data.questions[this.data.current];
  },

  applyAnswer(value: AnswerValue) {
    const q = this.currentQuestion();
    if (!q) return;
    const key = String(q.question_id);
    this.setData({
      [`answers.${key}`]: value,
      answeredCount: this.data.questions.filter((item) =>
        hasAnswer(item.question_id === q.question_id ? value : this.data.answers[String(item.question_id)])
      ).length,
    });
    if (q.type === 'code') this.refreshCodeSubmits();
    // 本地草稿即时落盘 + 防抖逐题上送（与 web 端 2 秒防抖同策略）
    wx.setStorageSync(`${CACHE_PREFIX}${this.activityId}`, this.data.answers);
    clearTimeout(this.saveTimers[q.question_id]);
    this.saveTimers[q.question_id] = setTimeout(() => this.persist(q.question_id), 800) as unknown as number;
  },

  /** code 题答案为 JSON（{submissionId,...}）——提取已提交 id 供卡片显示状态 */
  refreshCodeSubmits() {
    const codeSubmits: Record<string, number> = {};
    this.data.questions
      .filter((q) => q.type === 'code')
      .forEach((q) => {
        const raw = this.data.answers[String(q.question_id)];
        if (typeof raw !== 'string') return;
        try {
          const parsed = JSON.parse(raw) as { submissionId?: number };
          if (parsed?.submissionId) codeSubmits[String(q.question_id)] = parsed.submissionId;
        } catch {
          /* 非 JSON 忽略 */
        }
      });
    this.setData({ codeSubmits });
  },

  goCodeEditor() {
    const q = this.currentQuestion();
    const submitted = this.data.codeSubmits[String(q.question_id)] || 0;
    wx.navigateTo({
      url: `/packages/practice/pages/code/index?activityId=${this.activityId}&studentActivityId=${this.studentActivityId || 0}&questionId=${q.question_id}&submissionId=${submitted}`,
    });
  },

  onSingleTap(e: WechatMiniprogram.CustomEvent) {
    this.applyAnswer(String(e.currentTarget.dataset.letter));
  },

  onMultipleTap(e: WechatMiniprogram.CustomEvent) {
    const letter = String(e.currentTarget.dataset.letter);
    const q = this.currentQuestion();
    const current = this.data.answers[String(q.question_id)];
    const letters = Array.isArray(current) ? [...current] : [];
    const idx = letters.indexOf(letter);
    if (idx > -1) letters.splice(idx, 1);
    else letters.push(letter);
    this.applyAnswer(letters);
  },

  onTfTap(e: WechatMiniprogram.CustomEvent) {
    this.applyAnswer(String(e.currentTarget.dataset.val));
  },

  onTextInput(e: WechatMiniprogram.CustomEvent) {
    this.applyAnswer(String(e.detail.value ?? ''));
  },

  async persist(questionId: number) {
    const value = this.data.answers[String(questionId)];
    if (!hasAnswer(value)) return;
    try {
      await saveAnswer(this.activityId, questionId, value);
    } catch {
      wx.showToast({ title: '答案保存失败，修改后会重试', icon: 'none' });
    }
  },

  // ---------- 翻题/答题卡 ----------

  onPrev() {
    if (this.data.current > 0) this.setData({ current: this.data.current - 1 });
  },

  onNext() {
    if (this.data.current < this.data.questions.length - 1) {
      this.setData({ current: this.data.current + 1 });
    }
  },

  openSheet() {
    this.setData({ showSheet: true });
  },

  closeSheet() {
    this.setData({ showSheet: false });
  },

  onSheetJump(e: WechatMiniprogram.CustomEvent) {
    this.setData({ current: Number(e.currentTarget.dataset.index ?? 0), showSheet: false });
  },

  // ---------- 交卷 ----------

  onSubmit() {
    const unanswered = this.data.questions.length - this.data.answeredCount;
    wx.showModal({
      title: '确认交卷？',
      content: unanswered > 0 ? `还有 ${unanswered} 题未作答，交卷后未答题按 0 分计` : '交卷后将立即判分，确认提交？',
      success: (res) => {
        if (res.confirm) this.doSubmit();
      },
    });
  },

  async doSubmit() {
    if (this.data.submitting) return;
    this.setData({ submitting: true, showSheet: false });
    try {
      await submitActivity(this.activityId);
      wx.removeStorageSync(`${CACHE_PREFIX}${this.activityId}`);
      clearInterval(this.countdownTimer);
      wx.redirectTo({ url: `/packages/practice/pages/result/index?id=${this.activityId}` });
    } catch (err) {
      toastError(err, '交卷失败，请重试');
    } finally {
      this.setData({ submitting: false });
    }
  },

  onUnload() {
    clearInterval(this.countdownTimer);
    Object.values(this.saveTimers).forEach((t) => clearTimeout(t));
  },
});
