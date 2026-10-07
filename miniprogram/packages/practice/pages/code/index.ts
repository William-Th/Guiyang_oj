import {
  JudgeLanguage,
  JudgeStatus,
  SampleCase,
  getLanguages,
  getSamples,
  getStatus,
  submitCode,
} from '../../../../services/judge';
import { getActivityQuestions, QuestionRaw } from '../../../../services/activities';
import { requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';
import { setStash } from '../../../../utils/transfer';

/** 轮询节奏与上限（计划书 6.3：1s 间隔；切后台暂停、回前台恢复） */
const POLL_INTERVAL = 1000;
const POLL_MAX = 120;

/** 答题页回填暂存键（utils/transfer，答题页 onShow popStash） */
export const CODE_ANSWER_STASH = 'mp_code_answer';

interface CodeStashPayload {
  questionId: number;
  answer: string;
}

/** 终态枚举以 judge-service src/judge/JudgeService.js JudgeStatus 为准（勿用 AC/WA 缩写） */
const STATUS_TEXT: Record<string, { text: string; type: 'success' | 'error' | 'warning' | 'primary' }> = {
  accepted: { text: '通过', type: 'success' },
  partial: { text: '部分通过', type: 'warning' },
  wrong_answer: { text: '答案错误', type: 'error' },
  compile_error: { text: '编译错误', type: 'warning' },
  runtime_error: { text: '运行时错误', type: 'error' },
  time_limit: { text: '超出时限', type: 'warning' },
  memory_limit: { text: '超出内存', type: 'warning' },
  output_limit: { text: '输出超限', type: 'warning' },
  system_error: { text: '系统错误', type: 'error' },
};

Page({
  data: {
    loading: true,
    questionId: 0,
    activityId: 0,
    contentHtml: '',
    timeLimit: 0,
    memoryLimit: 0,
    languages: [] as JudgeLanguage[],
    languageIndex: 0,
    supportedIds: [] as string[],
    samples: [] as SampleCase[],
    code: '',
    cursor: 0,
    submitting: false,
    /** pending/judging 时显示判题动画 */
    judging: false,
    result: null as JudgeStatus | null,
    statusText: '',
    statusType: 'primary' as 'success' | 'error' | 'warning' | 'primary',
    /** 判题中离开页面（切后台）的提示条 */
    pollPaused: false,
  },

  pollTimer: 0 as ReturnType<typeof setTimeout> | 0,
  studentActivityId: 0,
  pollLeft: 0,
  lastSubmissionId: 0,

  onLoad(query: Record<string, string | undefined>) {
    if (!requireLogin()) return;
    const activityId = Number(query.activityId || 0);
    const questionId = Number(query.questionId || 0);
    // student_activities.id：judge-service 的 student_activity_id 外键指向它
    this.studentActivityId = Number(query.studentActivityId || 0);
    this.setData({ activityId, questionId });
    this.load(activityId, questionId);
  },

  /** 切后台暂停轮询（计划书 6.3），回前台恢复剩余次数 */
  onHide() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = 0;
      this.setData({ pollPaused: this.data.judging });
    }
  },

  onShow() {
    if (this.data.pollPaused && this.data.judging && this.lastSubmissionId) {
      this.setData({ pollPaused: false });
      this.schedulePoll();
    }
  },

  onUnload() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
  },

  async load(activityId: number, questionId: number) {
    try {
      const [detailRes, langRes] = await Promise.all([
        getActivityQuestions(activityId),
        getLanguages().catch(() => null),
      ]);
      const raw = (detailRes.questions || []).find(
        (q: QuestionRaw) => (q.question_id || q.id) === questionId
      );
      if (!raw) {
        wx.showToast({ title: '未找到该编程题', icon: 'none' });
        this.setData({ loading: false });
        return;
      }
      const languages = langRes?.data ?? [{ id: 'cpp', name: 'C++', extension: '.cpp' }];
      const supportedIds = ((raw.supported_languages as string[]) || ['cpp']).filter((id) =>
        languages.some((l) => l.id === id)
      );
      const usable = supportedIds.length > 0 ? supportedIds : languages.map((l) => l.id);
      this.currentRaw = raw;
      this.setData({
        loading: false,
        contentHtml: raw.content || '',
        timeLimit: Number(raw.time_limit ?? 1000),
        memoryLimit: Number(raw.memory_limit ?? 256),
        languages,
        supportedIds: usable,
        languageIndex: 0,
        code: (raw.code_template as string) || '',
      });
      const sampleRes = await getSamples(questionId).catch(() => null);
      if (sampleRes?.data?.length) this.setData({ samples: sampleRes.data });
    } catch (err) {
      this.setData({ loading: false });
      toastError(err, '加载编程题失败');
    }
  },

  onCodeInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({
      code: String(e.detail.value ?? ''),
      cursor: Number(e.detail.cursor ?? 0),
    });
  },

  /** 缩进辅助键：在光标处插入文本（计划书 6.3：Tab/花括号/引号补全）。
   *  插入文本用 data-key 查表——WXML 属性表达式对花括号嵌套/转义支持不可靠 */
  onInsertKey(e: WechatMiniprogram.CustomEvent) {
    const INSERTS: Record<string, string> = {
      tab: '  ',
      brace: '{' + String.fromCharCode(10) + '}',
      paren: '()',
      quote: '""',
      semicolon: '; ',
    };
    const insert = INSERTS[String(e.currentTarget.dataset.key ?? '')] ?? '';
    const { code, cursor } = this.data;
    const pos = Math.min(Math.max(cursor, 0), code.length);
    const next = code.slice(0, pos) + insert + code.slice(pos);
    this.setData({ code: next, cursor: pos + insert.length });
  },

  onLanguageChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ languageIndex: Number(e.detail.value || 0) });
  },

  onInjectTemplate() {
    const q = this.currentRaw;
    if (q && q.code_template) {
      this.setData({ code: String(q.code_template), cursor: 0 });
      wx.showToast({ title: '已注入模板', icon: 'none' });
    }
  },

  currentRaw: null as QuestionRaw | null,

  languageId(): string {
    const { supportedIds, languages, languageIndex } = this.data;
    const id = supportedIds[languageIndex] || languages[0]?.id || 'cpp';
    return id;
  },

  async onSubmit() {
    if (this.data.submitting || this.data.judging) return;
    const code = this.data.code;
    if (!code.trim()) {
      wx.showToast({ title: '请先编写代码', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      const res = await submitCode({
        questionId: this.data.questionId,
        activityId: this.studentActivityId,
        code,
        language: this.languageId(),
      });
      const submissionId = res.data?.submissionId;
      if (!submissionId) throw new Error('empty submissionId');
      this.lastSubmissionId = submissionId;
      this.pollLeft = POLL_MAX;
      this.setData({ submitting: false, judging: true, result: null });
      this.schedulePoll();
    } catch (err) {
      this.setData({ submitting: false });
      toastError(err, '提交失败，请稍后重试');
    }
  },

  schedulePoll() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => this.poll(), POLL_INTERVAL);
  },

  async poll() {
    if (!this.lastSubmissionId) return;
    try {
      const res = await getStatus(this.lastSubmissionId);
      const result = res.data;
      if (result.status === 'pending' || result.status === 'judging') {
        this.pollLeft -= 1;
        if (this.pollLeft <= 0) {
          this.setData({ judging: false, pollPaused: false });
          wx.showToast({ title: '判题超时，稍后可回来查看', icon: 'none' });
          return;
        }
        this.schedulePoll();
        return;
      }
      const cfg = STATUS_TEXT[result.status] || { text: result.status, type: 'primary' as const };
      this.setData({
        judging: false,
        pollPaused: false,
        result,
        statusText: cfg.text,
        statusType: cfg.type,
      });
      this.stashAnswer(this.lastSubmissionId);
      wx.vibrateShort({ type: 'medium' });
    } catch {
      this.pollLeft -= 1;
      if (this.pollLeft <= 0) {
        this.setData({ judging: false, pollPaused: false });
        return;
      }
      this.schedulePoll();
    }
  },

  /** 判题终态即回填答题页：答案 = JSON（web 端同约定，评分按 submissionId 拉判题分） */
  stashAnswer(submissionId: number) {
    setStash(CODE_ANSWER_STASH, {
      questionId: this.data.questionId,
      answer: JSON.stringify({
        submissionId,
        questionId: this.data.questionId,
        timestamp: new Date().toISOString(),
      }),
    } as CodeStashPayload);
  },
});
