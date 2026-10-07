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
import { highlightCode, starterTemplate } from '../../../../utils/highlight';

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
    /** picker 数据源：{id,name} 对象数组（字符串数组配 range-key 会渲染 undefined） */
    usableLanguages: [] as JudgeLanguage[],
    languageIndex: 0,
    /** 题面原始模板（python 注释风格），作为 python 语言的起步模板 */
    questionTemplate: '',
    /** 当前语言的起步模板（切语言时更新） */
    templateCode: '',
    /** 高亮层 HTML（rich-text nodes 直收） */
    highlightHtml: '',
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
    const submissionId = Number(query.submissionId || 0);
    this.setData({ activityId, questionId });
    this.load(activityId, questionId);
    // 已提交过的题再次进入：直接展示上次判题结果
    if (submissionId) {
      this.lastSubmissionId = submissionId;
      getStatus(submissionId)
        .then((res) => {
          const result = this.normalizeResult(res.data);
          if (result.status === 'pending' || result.status === 'judging') return;
          const cfg = STATUS_TEXT[result.status] || { text: result.status, type: 'primary' as const };
          this.setData({ result, statusText: cfg.text, statusType: cfg.type });
        })
        .catch(() => {
          /* 结果拉取失败不打扰 */
        });
    }
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
      const supported = ((raw.supported_languages as string[]) || ['cpp']).filter((id) =>
        languages.some((l) => l.id === id)
      );
      const usableIds = supported.length > 0 ? supported : languages.map((l) => l.id);
      const usableLanguages = usableIds.map(
        (id) => languages.find((l) => l.id === id) ?? { id, name: id, extension: '' }
      );
      const questionTemplate = (raw.code_template as string) || '';
      const initialCode = starterTemplate(usableIds[0] ?? 'python', questionTemplate);
      this.setData({
        loading: false,
        contentHtml: raw.content || '',
        timeLimit: Number(raw.time_limit ?? 1000),
        memoryLimit: Number(raw.memory_limit ?? 256),
        usableLanguages,
        languageIndex: 0,
        questionTemplate,
        templateCode: initialCode,
        code: initialCode,
        highlightHtml: highlightCode(initialCode, usableIds[0] ?? 'python'),
      });
      const sampleRes = await getSamples(questionId).catch(() => null);
      if (sampleRes?.data?.length) this.setData({ samples: sampleRes.data });
    } catch (err) {
      this.setData({ loading: false });
      toastError(err, '加载编程题失败');
    }
  },

  /** 所有 code 变更统一走这里：同步高亮层（透明 textarea 盖在高亮层上） */
  applyCode(code: string, cursor?: number) {
    // 值未变时只刷高亮不回写 code——受控 textarea 回写会让光标跳到末尾
    const patch: Record<string, unknown> = {
      highlightHtml: highlightCode(code, this.languageId()),
    };
    if (code !== this.data.code) patch.code = code;
    if (cursor !== undefined) patch.cursor = cursor;
    this.setData(patch);
  },

  onCodeInput(e: WechatMiniprogram.CustomEvent) {
    this.applyCode(String(e.detail.value ?? ''), Number(e.detail.cursor ?? 0));
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
    this.applyCode(code.slice(0, pos) + insert + code.slice(pos), pos + insert.length);
  },

  onLanguageChange(e: WechatMiniprogram.CustomEvent) {
    const idx = Number(e.detail.value || 0);
    if (idx === this.data.languageIndex) return;
    const langId = this.data.usableLanguages[idx]?.id ?? 'python';
    const nextTemplate = starterTemplate(langId, this.data.questionTemplate);
    const switchTo = () => {
      this.setData({ languageIndex: idx, templateCode: nextTemplate });
      this.applyCode(nextTemplate, 0);
    };
    // 未编辑（仍为上一语言模板）直接换；已编辑需确认覆盖
    if (this.data.code === this.data.templateCode) {
      switchTo();
      return;
    }
    wx.showModal({
      title: '切换语言',
      content: '切换后代码区将被该语言的起步模板覆盖，确定切换吗？',
      success: (res) => {
        if (res.confirm) switchTo();
        else this.setData({ languageIndex: this.data.languageIndex }); // 取消，保持原语言
      },
    });
  },

  onInjectTemplate() {
    const tpl = this.data.templateCode;
    if (tpl) {
      this.applyCode(tpl, 0);
      wx.showToast({ title: '已注入模板', icon: 'none' });
    }
  },

  languageId(): string {
    const { usableLanguages, languageIndex } = this.data;
    return usableLanguages[languageIndex]?.id ?? usableLanguages[0]?.id ?? 'cpp';
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

  /** 队列缓存与 DB 两条返回路径字段名不一致，统一归一：
   *  满分 maxScore→totalScore、总耗时 totalTime→executionTime；
   *  用例通过判定：match（DB 路径）→ status==='accepted'（队列缓存路径把
   *  match 剥掉了，用例级 status 在）→ passed（兜底） */
  normalizeResult(result: JudgeStatus): JudgeStatus {
    const anyResult = result as JudgeStatus & { maxScore?: number; totalTime?: number };
    return {
      ...result,
      totalScore: result.totalScore ?? anyResult.maxScore,
      executionTime: result.executionTime ?? anyResult.totalTime,
      testResults: (result.testResults ?? []).map((t) => ({
        ...t,
        passed:
          t.match !== undefined
            ? t.match
            : t.status
              ? t.status === 'accepted'
              : (t.passed ?? false),
      })),
    };
  },

  schedulePoll() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => this.poll(), POLL_INTERVAL);
  },

  async poll() {
    if (!this.lastSubmissionId) return;
    try {
      const res = await getStatus(this.lastSubmissionId);
      const result = this.normalizeResult(res.data);
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
