import { getActivityResult, ResultAnswer } from '../../../../services/activities';
import { requireLogin } from '../../../../utils/auth';
import { toastError } from '../../../../utils/request';
import {
  TYPE_TEXT,
  NormalOption,
  formatAnswerDisplay,
  formatCorrectDisplay,
  parseLetters,
  parseOptions,
} from '../../../../utils/questionFormat';

type StripStatus = 'correct' | 'wrong' | 'pending' | 'unknown';

interface AnalysisOption extends NormalOption {
  state: '' | 'correct' | 'mine' | 'both' | 'wrong-mine';
}

interface AnalysisItem {
  typeText: string;
  contentHtml: string;
  statusClass: 'correct' | 'wrong' | 'pending' | 'unknown';
  score: number;
  maxScore: number;
  myDisplay: string;
  correctDisplay: string;
  feedback: string;
  explanationHtml: string;
  options: AnalysisOption[];
}

function isChoiceType(type: string): boolean {
  return type === 'single' || type === 'multiple' || type === 'true_false';
}

function normalizeAnswer(type: string, answer: unknown): unknown {
  // my_answer 与 correct_answer 存储形态不统一（字母串/数组/布尔/JSON），choice 题统一为字母串
  if (isChoiceType(type)) return parseLetters(answer)[0] ?? '';
  return answer;
}

function statusOf(a: ResultAnswer, canShow: boolean): StripStatus {
  if (!canShow) return 'unknown';
  if (a.grading_status === 'pending' || a.is_correct === undefined || a.is_correct === null) return 'pending';
  return a.is_correct ? 'correct' : 'wrong';
}

function buildOptionStates(type: string, rawOptions: unknown, my: unknown, correct: unknown): AnalysisOption[] {
  const options = parseOptions(rawOptions);
  const myLetters = parseLetters(my);
  const correctLetters = parseLetters(correct);
  return options.map((o) => {
    const isMine = myLetters.some((l) => l.toUpperCase() === o.letter.toUpperCase());
    const isCorrect = correctLetters.some((l) => l.toUpperCase() === o.letter.toUpperCase());
    let state: AnalysisOption['state'] = '';
    if (isMine && isCorrect) state = 'both';
    else if (isCorrect) state = 'correct';
    else if (isMine) state = correctLetters.length > 0 ? 'wrong-mine' : 'mine';
    return { ...o, state };
  });
}

function formatDuration(startedAt?: string, submittedAt?: string): string {
  if (!startedAt || !submittedAt) return '';
  const ms = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min} 分 ${sec} 秒` : `${sec} 秒`;
}

Page({
  data: {
    loading: true,
    title: '',
    typeText: '',
    attemptNumber: 1,
    score: 0,
    totalScore: 0,
    percentText: '',
    correctCount: 0,
    totalQuestions: 0,
    usedTimeText: '',
    submittedAt: '',
    canShow: false,
    publishText: '',
    strip: [] as { status: StripStatus }[],
    list: [] as AnalysisItem[],
  },

  activityId: 0 as number,

  async onLoad(query: Record<string, string | undefined>) {
    if (!requireLogin()) return;
    this.activityId = Number(query.id ?? 0);
    try {
      const res = await getActivityResult(this.activityId);
      const sa = res.student_activity ?? ({} as typeof res.student_activity);
      const canShow = Boolean(res.can_show_answers);
      const stats = res.statistics;
      const answers = res.answers ?? [];

      const strip = answers.map((a) => ({ status: statusOf(a, canShow) }));
      const list: AnalysisItem[] = answers.map((a) => {
        const type = a.question_type;
        const options = isChoiceType(type)
          ? buildOptionStates(type, a.question_options, normalizeAnswer(type, a.my_answer), a.correct_answer)
          : [];
        return {
          typeText: TYPE_TEXT[type] ?? type,
          contentHtml: a.question_content ?? '',
          statusClass: statusOf(a, canShow) === 'unknown' ? 'unknown' : statusOf(a, canShow),
          score: a.score ?? 0,
          maxScore: a.max_score ?? 0,
          myDisplay: canShow
            ? formatAnswerDisplay(type, normalizeAnswer(type, a.my_answer), parseOptions(a.question_options))
            : a.my_answer
              ? '已作答（待公布）'
              : '未作答',
          correctDisplay: canShow ? formatCorrectDisplay(type, a.correct_answer, parseOptions(a.question_options)) : '',
          feedback: a.feedback ?? '',
          explanationHtml: a.question_explanation ?? '',
          options,
        };
      });

      const total = sa.activity_total_score ?? 0;
      const score = sa.score ?? 0;
      this.setData({
        loading: false,
        title: sa.activity_title ?? '成绩详情',
        typeText: sa.activity_type === 'assessment' ? '测评' : '练习',
        attemptNumber: sa.attempt_number ?? 1,
        score,
        totalScore: total,
        percentText: total > 0 ? `${Math.round((score / total) * 1000) / 10}%` : '',
        correctCount: stats?.correct_questions ?? 0,
        totalQuestions: stats?.total_questions ?? 0,
        usedTimeText: formatDuration(sa.started_at, sa.submit_time),
        submittedAt: sa.submit_time ? String(sa.submit_time).slice(5, 16).replace('T', ' ') : '',
        canShow,
        publishText: res.result_publish_time
          ? String(res.result_publish_time).slice(5, 16).replace('T', ' ')
          : '老师批改后',
        strip,
        list,
      });
    } catch (err) {
      toastError(err, '成绩加载失败');
      setTimeout(() => wx.navigateBack(), 1200);
    }
  },

  goBack() {
    wx.navigateBack();
  },
});
