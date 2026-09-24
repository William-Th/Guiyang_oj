import React, { useState, useEffect, useRef, useCallback } from 'react';
import { parseOption } from '../../components/questions/questionOption';
import { Card, Form, Radio, Checkbox, Input, Button, Space, Alert, Spin, Typography, Divider, Progress, Image, Dropdown } from 'antd';
import { message, modal } from '../../lib/feedback';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  MoreOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { activityApi } from '../../services/api';
import CountdownTimer from '../../components/common/CountdownTimer';
import RichTextViewer from '../../components/common/RichTextViewer';
import CodeQuestion from '../../components/CodeQuestion';
import type { CodeQuestionData } from '../../components/CodeQuestion';
import type { ActivityQuestion, StudentActivity } from '../../types/activity';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

/** 分值显示：整数去掉小数点（10.00 → 10） */
const fmtScore = (value: unknown): string => {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (value === null || value === undefined || Number.isNaN(n)) return '-';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
};

/**
 * LocalStorage helper functions for answer persistence
 * Provides backup in case of network failure or page refresh
 */
const STORAGE_KEY_PREFIX = 'activity_answers_';

const saveAnswersToLocalStorage = (activityId: number, answers: any) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${activityId}`;
    localStorage.setItem(key, JSON.stringify({
      answers,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

const loadAnswersFromLocalStorage = (activityId: number): any | null => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${activityId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const data = JSON.parse(stored);
    // Only restore if saved within last 24 hours
    const ageHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
    if (ageHours > 24) {
      localStorage.removeItem(key);
      return null;
    }

    return data.answers;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

const clearAnswersFromLocalStorage = (activityId: number) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${activityId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};

interface ActivityData {
  id: number;
  title: string;
  description?: string;
  subject: string;
  grade: string;
  time_limit_type: 'unlimited' | 'scheduled' | 'timed';
  start_time?: string;
  end_time?: string;
  duration?: number;
  total_score: number;
  pass_score: number;
  questions: ActivityQuestion[];
}

// Code Question Wrapper Component - renders programming questions with code editor
interface CodeQuestionWrapperProps {
  question: ActivityQuestion;
  activityId: number | undefined;
  fieldName: string;
  form: any;
  onAnswerChange: () => void;
}

const CodeQuestionWrapper: React.FC<CodeQuestionWrapperProps> = ({
  question,
  activityId,
  fieldName,
  form,
  onAnswerChange,
}) => {
  // Transform ActivityQuestion to CodeQuestionData
  const codeQuestionData: CodeQuestionData = {
    id: question.id,
    content: question.content,
    codeTemplate: (question as any).code_template,
    timeLimit: (question as any).time_limit || 1000,
    memoryLimit: (question as any).memory_limit || 256,
    supportedLanguages: (question as any).supported_languages || ['cpp', 'c'],
    sampleTestCases: [], // Will be loaded by CodeQuestion component
  };

  const handleSubmitSuccess = useCallback((submissionId: number) => {
    // Store the submission info in the form for grading
    const answerData = JSON.stringify({
      submissionId,
      questionId: question.id,
      timestamp: new Date().toISOString(),
    });
    form.setFieldValue(fieldName, answerData);
    onAnswerChange();
    message.success('代码已提交，将在最终提交时计入成绩');
  }, [question.id, fieldName, form, onAnswerChange]);

  return (
    <div>
      <CodeQuestion
        question={codeQuestionData}
        activityId={activityId}
        onSubmitSuccess={handleSubmitSuccess}
      />
      {/* Hidden field to store submission result */}
      <Form.Item name={fieldName} hidden>
        <Input />
      </Form.Item>
    </div>
  );
};

/**
 * Take Activity Page
 * Allows students to answer activity questions with time limits
 *
 * Features:
 * - Time limit support (unlimited/scheduled/timed)
 * - Countdown timer with auto-submit
 * - Progress tracking
 * - Auto-save answers (with localStorage backup)
 * - Network error handling with retry
 * - Page refresh protection and answer recovery
 */
const TakeActivityPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [studentActivity, setStudentActivity] = useState<StudentActivity | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const [hasLocalBackup, setHasLocalBackup] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  // Refs for question scrolling
  const questionRefs = useRef<(HTMLElement | null)[]>([]);

  const activityId = id ? parseInt(id) : undefined;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);
  // 答题卡手动跳转的目标题索引；非 null 期间锁定高亮，直到目标题滚到落点
  const manualClickRef = useRef<number | null>(null);
  const scrollSettleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const manualNavAbortRef = useRef<AbortController | null>(null);
  const scrollHandlerRef = useRef<(() => void) | null>(null);
  const loadingActivityRef = useRef<number | null>(null);

  // Calculate deadline for countdown timer
  const getDeadline = (): string | null => {
    if (!activity || !studentActivity) return null;

    // For timed activities, use time_limit_deadline
    if (activity.time_limit_type === 'timed' && studentActivity.time_limit_deadline) {
      return studentActivity.time_limit_deadline;
    }

    // For scheduled activities, use end_time
    if (activity.time_limit_type === 'scheduled' && activity.end_time) {
      return activity.end_time;
    }

    // No deadline for unlimited
    return null;
  };

  // Load activity data and start attempt
  useEffect(() => {
    if (activityId) {
      loadActivityAndStart();
    }

    // Warn user before leaving page
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasStartedRef.current) return;
      e.preventDefault();
      e.returnValue = '你还有未提交的答案，确定要离开吗？';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activityId]);

  // 探测线算法定位当前题：取顶边越过探测线的最后一题。
  // 与点击跳转的 block:'start' 落点一致（题目落到 scroll-margin-top 处），
  // 修复旧的「离视口中央最近」算法在点击跳转后高亮错位的问题。
  const updateCurrentQuestion = useCallback(() => {
    // 手动跳转滚动进行中，锁定高亮不被中途更新
    if (manualClickRef.current !== null) return;

    // 探测线需大于题目卡 scroll-margin-top（桌面 88px / 窄屏 160px），否则跳转后命不中目标题
    const compact = window.matchMedia('(max-width: 1024px)').matches;
    const probe = compact ? 176 : 120;
    let current = 0;
    let lastNonNull = 0;

    questionRefs.current.forEach((ref, index) => {
      if (!ref) return;
      lastNonNull = index;
      if (ref.getBoundingClientRect().top <= probe) {
        current = index;
      }
    });

    // 滚动到底部时强制选中最后一题（末题较短、到不了探测线时兜底）
    const docEl = document.documentElement;
    if (docEl.scrollHeight - window.innerHeight - window.scrollY <= 2) {
      current = lastNonNull;
    }

    setCurrentQuestionIndex(current);
  }, []);

  // 解除手动锁定；resume=true 时按当前位置恢复自动检测（用户接管/兜底超时）
  const releaseManualLock = useCallback((resume: boolean) => {
    manualNavAbortRef.current?.abort();
    manualNavAbortRef.current = null;
    if (scrollSettleTimerRef.current) {
      clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = null;
    }
    manualClickRef.current = null;
    if (resume) {
      updateCurrentQuestion();
    }
  }, [updateCurrentQuestion]);

  // 用户滚动输入（滚轮/触摸/按键）→ 立即交还自动检测
  const handleUserTakeover = useCallback(() => {
    if (manualClickRef.current === null) return;
    releaseManualLock(true);
  }, [releaseManualLock]);

  // 目标题是否已滚到 scroll-margin 落点（±6px）→ 解锁（高亮本就停在目标题上）
  const checkManualTargetLanded = useCallback(() => {
    const idx = manualClickRef.current;
    if (idx === null) return;
    const ref = questionRefs.current[idx];
    if (!ref) return;
    const margin = parseFloat(getComputedStyle(ref).scrollMarginTop) || 88;
    if (Math.abs(ref.getBoundingClientRect().top - margin) <= 6) {
      releaseManualLock(false);
    }
  }, [releaseManualLock]);

  // Setup scroll listener to track current visible question
  useEffect(() => {
    if (!activity || questionRefs.current.length === 0) return;

    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      updateCurrentQuestion();

      // Add scroll listener with throttling
      let ticking = false;
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            updateCurrentQuestion();
            ticking = false;
          });
          ticking = true;
        }
        // 手动跳转进行中：目标题到位即解锁
        if (manualClickRef.current !== null) {
          checkManualTargetLanded();
        }
      };

      window.addEventListener('scroll', handleScroll, true); // Use capture phase
      scrollHandlerRef.current = handleScroll;
    }, 200);

    return () => {
      clearTimeout(timer);
      // 此前的清理函数误写在 setTimeout 回调里从未生效，监听器会跨活动泄漏
      if (scrollHandlerRef.current) {
        window.removeEventListener('scroll', scrollHandlerRef.current, true);
        scrollHandlerRef.current = null;
      }
      manualNavAbortRef.current?.abort();
      manualNavAbortRef.current = null;
      if (scrollSettleTimerRef.current) {
        clearTimeout(scrollSettleTimerRef.current);
        scrollSettleTimerRef.current = null;
      }
      manualClickRef.current = null;
    };
  }, [activity, updateCurrentQuestion, checkManualTargetLanded]);

  const loadActivityAndStart = async () => {
    if (!activityId) return;
    // StrictMode 下 effect 会双跑；同一活动只加载一次，
    // 避免重复 startActivity（后端会撞唯一约束）与重复弹出恢复提示
    if (loadingActivityRef.current === activityId) return;
    loadingActivityRef.current = activityId;

    try {
      setLoading(true);

      // Start the activity first (backend checks eligibility automatically)
      const startResponse = await activityApi.startActivity(activityId);

      // Store student_activity_id for later use
      // 后端返回蛇形字段（student_activity_id/started_at/deadline），做兼容映射
      const studentActivityId = startResponse.studentActivityId ?? (startResponse as any).student_activity_id;
      setStudentActivity({
        id: studentActivityId,
        start_time: startResponse.startTime ?? (startResponse as any).started_at,
        time_limit_deadline: startResponse.timeLimitDeadline ?? (startResponse as any).deadline,
        status: 'in_progress'
      } as any);
      hasStartedRef.current = true;

      // Get activity with questions
      const questionsResponse = await activityApi.getActivityQuestions(activityId);
      if (questionsResponse.activity) {
        const activityData = questionsResponse.activity;
        setActivity(activityData);

        // Convert old field names to new format after activity is loaded
        // Use activityData directly instead of state to avoid async issues
        const convertFieldNames = (values: any) => {
          const converted: any = {};
          Object.entries(values).forEach(([key, value]) => {
            // Check if this is an old field name (question_${id})
            const match = key.match(/^question_(\d+)$/);
            if (match) {
              const questionId = parseInt(match[1]);
              // Find the index of this question
              const index = activityData.questions.findIndex((q: any) => q.id === questionId);
              if (index !== -1) {
                // Convert to new format: q_${index}_${question.id}
                converted[`q_${index}_${questionId}`] = value;
              } else {
                // Keep old format if question not found
                converted[key] = value;
              }
            } else {
              // Keep new format or other fields as is
              converted[key] = value;
            }
          });
          return converted;
        };

        // Check for localStorage backup
        const localBackup = loadAnswersFromLocalStorage(activityId);

        // Load existing answers from server
        let formValues: any = {};
        try {
          const answersResponse = await activityApi.getMyAnswers(activityId);
          if (answersResponse.answers && answersResponse.answers.length > 0) {
            answersResponse.answers.forEach((answer: any) => {
              formValues[`question_${answer.question_id}`] = answer.answer;
            });
          }
        } catch (error) {
          console.log('No existing answers found');
        }

        if (localBackup) {
          // Merge with localStorage backup (localStorage takes priority for newer answers)
          formValues = { ...formValues, ...localBackup };
          setHasLocalBackup(true);

          // Show message about restored answers
          message.info('已恢复本地保存的答案');
        }

        if (Object.keys(formValues).length > 0) {
          // Convert field names to new format
          const convertedValues = convertFieldNames(formValues);
          form.setFieldsValue(convertedValues);
          // Update answered tracking using the converted values and activityData
          // Use activityData directly to avoid async state issues
          const answeredSet = new Set<number>();
          activityData.questions.forEach((q: any, index: number) => {
            const fieldName = `q_${index}_${q.id}`;
            const value = convertedValues[fieldName];
            if (value !== undefined && value !== null && value !== '') {
              if (Array.isArray(value)) {
                if (value.length > 0) {
                  answeredSet.add(index);
                }
              } else {
                answeredSet.add(index);
              }
            }
          });
          setAnsweredQuestions(answeredSet);
          setAnsweredCount(answeredSet.size);
        }
      }
    } catch (error: any) {
      console.error('Load activity error:', error);
      setNetworkError(true);

      // Try to load from localStorage if network fails
      if (activityId) {
        const localBackup = loadAnswersFromLocalStorage(activityId);
        if (localBackup) {
          message.warning('网络连接失败，已加载本地备份答案');
          // Note: Can't fully start without activity data from server
        }
      }

      message.error(error.response?.data?.message || '加载活动失败');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  // Update answered question tracking - marks which questions have been answered
  // Pass values explicitly to avoid relying on form state
  const updateAnsweredTracking = (values?: any) => {
    if (!activity) return;

    // If no values provided, get from form
    const formValues = values || form.getFieldsValue();
    const answeredSet = new Set<number>();

    activity.questions.forEach((q, index) => {
      // Use the exact field name format: q_${index}_${q.id}
      const fieldName = `q_${index}_${q.id}`;
      const value = formValues[fieldName];

      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            answeredSet.add(index);
          }
        } else {
          answeredSet.add(index);
        }
      }
    });

    setAnsweredQuestions(answeredSet);
    setAnsweredCount(answeredSet.size);
  };

  // Scroll to question
  const scrollToQuestion = (index: number) => {
    // 立即高亮目标题并锁定，直到目标题滚到落点（checkManualTargetLanded）、
    // 用户滚动输入或超时兜底才恢复自动检测。
    // 不能用固定时长解锁：Chrome 平滑滚动的启动延迟可达 200ms+，中途解锁
    // 会让探测线按半路位置重算，高亮弹回途经题（表现为"点两次才选中"）。
    releaseManualLock(false);
    manualClickRef.current = index;
    setCurrentQuestionIndex(index);
    questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const ac = new AbortController();
    manualNavAbortRef.current = ac;
    window.addEventListener('wheel', handleUserTakeover, { signal: ac.signal, passive: true });
    window.addEventListener('touchstart', handleUserTakeover, { signal: ac.signal, passive: true });
    window.addEventListener('keydown', handleUserTakeover, { signal: ac.signal });
    // 兜底：滚动极慢/被中断时也能恢复自动检测（正常情况下目标题落位即解锁）
    scrollSettleTimerRef.current = setTimeout(() => {
      scrollSettleTimerRef.current = null;
      manualClickRef.current = null;
      updateCurrentQuestion();
    }, 1200);
  };

  // Auto-save answers to localStorage AND backend
  const handleFormChange = async (changedValues?: Record<string, unknown>) => {
    // 本次作答的题目 → 左侧答题卡高亮跟随到该题
    // （用户可能在同屏多题中直接作答下方题目，高亮应反映正在作答的题）
    if (changedValues) {
      const firstKey = Object.keys(changedValues)[0];
      const match = firstKey?.match(/^q_(\d+)_/);
      if (match) {
        setCurrentQuestionIndex(parseInt(match[1], 10));
      }
    }

    // Get all form values (not just touched) to properly track answered questions
    const allValues = form.getFieldsValue();
    updateAnsweredTracking(allValues);

    // Save to localStorage (fast, no network required)
    if (activityId) {
      saveAnswersToLocalStorage(activityId, allValues);
      setHasLocalBackup(true);
    }

    // Debounced backend save - only save to server after user stops typing for 2 seconds
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!activityId || !studentActivity) return;

      // Save each answered question to backend（字段名与题目卡片一致：q_${index}_${id}）
      const questions = activity?.questions || [];
      const savePromises: Promise<void>[] = [];

      questions.forEach((question, qIndex) => {
        const fieldName = `q_${qIndex}_${question.id}`;
        const answer = allValues[fieldName];

        // Only save non-empty answers
        if (answer !== undefined && answer !== null && answer !== '') {
          savePromises.push(
            activityApi.submitAnswer(activityId, {
              questionId: question.id,
              answer: answer
            }).catch(err => {
              console.error(`Failed to save answer for question ${question.id}:`, err);
            })
          );
        }
      });

      await Promise.allSettled(savePromises);
    }, 2000); // 2 second debounce
  };

  // Handle manual submit
  const handleSubmit = async () => {
    if (!activity || !studentActivity) return;

    modal.confirm({
      title: '确认提交',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            你已完成 {answeredCount} / {activity.questions.length} 题
          </p>
          <p>提交后将无法再修改答案，确认提交吗？</p>
        </div>
      ),
      okText: '确认提交',
      cancelText: '继续答题',
      onOk: () => submitAnswers(),
    });
  };

  // Submit answers to backend
  const submitAnswers = async () => {
    if (!activity || !activityId) return;

    try {
      setSubmitting(true);

      // Submit the activity (new API - answers are already saved individually)
      await activityApi.submitActivity(activityId);

      message.success('提交成功！');
      hasStartedRef.current = false;

      // Clear localStorage on successful submission
      if (activityId) {
        clearAnswersFromLocalStorage(activityId);
      }

      // Navigate to results page
      navigate(`/student/results/${activityId}`);
    } catch (error: any) {
      console.error('Submit error:', error);
      message.error(error.response?.data?.message || '提交失败，请检查网络连接');

      // Keep localStorage backup in case of failure
    } finally {
      setSubmitting(false);
    }
  };

  // Handle time expired (auto-submit)
  const handleTimeExpired = () => {
    message.warning('时间已到，正在自动提交...');
    submitAnswers();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载活动中..." />
      </div>
    );
  }

  if (!activity || !studentActivity) {
    return (
      <Alert
        message="活动不存在"
        description="未找到该活动，或你暂时无法访问"
        type="error"
        showIcon
      />
    );
  }

  const deadline = getDeadline();
  const progress = (answeredCount / activity.questions.length) * 100;

  // Question type name mapping for display
  const getTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'single': '单选题',
      'multiple': '多选题',
      'blank': '填空题',
      'essay': '主观题',
      'code': '编程题',
      'true_false': '判断题',
      'matching': '匹配题',
    };
    return typeMap[type] || '其他';
  };

  // Get display number for a question (per-type numbering)
  const getQuestionDisplayNumber = (index: number): string => {
    const question = activity.questions[index];
    const typeName = getTypeName(question.type);

    // Count questions of this type before the current one
    let count = 0;
    for (let i = 0; i < index; i++) {
      if (getTypeName(activity.questions[i].type) === typeName) {
        count++;
      }
    }
    return `${count + 1}`;
  };

  // Group questions by type
  const groupQuestionsByType = () => {
    const groups: Record<string, Array<{ question: ActivityQuestion; index: number }>> = {};
    activity.questions.forEach((q, index) => {
      const typeName = getTypeName(q.type);
      if (!groups[typeName]) {
        groups[typeName] = [];
      }
      groups[typeName].push({ question: q, index });
    });
    return groups;
  };

  const questionGroups = groupQuestionsByType();

  return (
    <main className="activity-workspace" aria-labelledby="activity-title">
      {/* Left Sidebar - Question Navigation */}
      <aside className="activity-workspace__sidebar" aria-label="答题导航">
        <Card
          className="activity-question-nav"
          title={<span className="activity-question-nav__title">答题卡</span>}
          size="small"
        >
          <div>
            {Object.entries(questionGroups).map(([typeName, questions]) => (
              <div key={typeName} className="activity-question-nav__group">
                <div className="activity-question-nav__group-label">
                  {typeName} ({questions.length})
                </div>
                <div className="activity-question-nav__grid">
                  {questions.map(({ question, index }) => {
                    const isAnswered = answeredQuestions.has(index);
                    const isCurrent = index === currentQuestionIndex;
                    const stateClass = isCurrent
                      ? (isAnswered
                        ? 'activity-question-nav__button--current'
                        : 'activity-question-nav__button--current-pending')
                      : (isAnswered ? 'activity-question-nav__button--answered' : '');

                    return (
                      <Button
                        key={question.id}
                        className={`activity-question-nav__button ${stateClass}`}
                        onClick={() => scrollToQuestion(index)}
                        aria-label={`第 ${index + 1} 题${isAnswered ? '，已作答' : '，未作答'}`}
                        aria-current={isCurrent ? 'step' : undefined}
                      >
                        {getQuestionDisplayNumber(index)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Divider />

          <div className="activity-question-nav__summary">
            <span>已答 <strong>{answeredCount}</strong></span>
            <span>未答 <strong>{activity.questions.length - answeredCount}</strong></span>
          </div>
        </Card>
      </aside>

      {/* Main Content */}
      <div className="activity-workspace__main">
        {/* Submit Button - Fixed at top */}
        <Card className="activity-hero-card">
          <div className="activity-hero-card__content">
            <div>
              <Title id="activity-title" level={1}>
                {activity.title}
              </Title>
              {activity.description && (
                <Paragraph className="activity-hero-card__description">
                  {activity.description}
                </Paragraph>
              )}
              <div className="activity-meta">
                <span className="activity-meta__item">科目：{activity.subject}</span>
                <span className="activity-meta__item">年级：{activity.grade}</span>
                <span className="activity-meta__item">总分：{fmtScore(activity.total_score)}</span>
                <span className="activity-meta__item">及格分：{fmtScore(activity.pass_score)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Time and Status Info */}
        <Card className="activity-status-card">
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {/* Time limit info */}
            {deadline && (
              <CountdownTimer
                deadline={deadline}
                onTimeExpired={handleTimeExpired}
                showWarning={true}
                warningThreshold={5}
              />
            )}

            {activity.time_limit_type === 'unlimited' && (
              <Alert
                message="无时间限制"
                description="你可以随时保存并继续答题"
                type="info"
                showIcon
              />
            )}

            {/* Network Error Alert */}
            {networkError && (
              <Alert
                message="网络连接异常"
                description="答案已保存在本地，网络恢复后将自动同步到服务器"
                type="warning"
                showIcon
                closable
              />
            )}

            {/* LocalStorage Backup Info */}
            {hasLocalBackup && !networkError && (
              <Alert
                message="答案已本地备份"
                description="你的答案已自动保存到本地，即使刷新页面也不会丢失"
                type="success"
                showIcon
                closable
              />
            )}

            {/* Progress */}
            <Progress
              percent={Math.round(progress)}
              format={(percent) => `${answeredCount}/${activity.questions.length} 题 (${percent}%)`}
            />
          </Space>
        </Card>

        {/* Questions Form */}
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          preserve={false}
        >
          {/* Render questions grouped by type */}
          {Object.entries(questionGroups)
            .sort(([, a], [, b]) => {
              const typeOrder: Record<string, number> = {
                '单选题': 1,
                '多选题': 2,
                '判断题': 3,
                '填空题': 4,
                '主观题': 5,
                '编程题': 6,
                '匹配题': 7,
              };
              // @ts-expect-error - Workaround for TypeScript index access issue
              const orderA = typeOrder[a[0]] ?? 99;
              // @ts-expect-error - Workaround for TypeScript index access issue
              const orderB = typeOrder[b[0]] ?? 99;
              return orderA - orderB;
            })
            .map(([typeName, questions], groupIndex) => {
              const chineseNums = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
              const sectionLabel = chineseNums[groupIndex] || `${groupIndex + 1}`;
              const typeQuestionCount = questions.length;
              const typeTotalScore = questions.reduce((sum, { question }) => {
                const score = (question as any).max_score || question.score || 0;
                return sum + (typeof score === 'string' ? parseFloat(score) : score);
              }, 0);

              return (
                <section key={typeName} className="activity-section" aria-labelledby={`section-${groupIndex}`}>
                  {/* Type Section Header */}
                  <div className="activity-section__header" id={`section-${groupIndex}`}>
                    <span className="activity-section__index">{sectionLabel}</span>
                    <span>{typeName}（共 {typeQuestionCount} 题，共 {typeTotalScore} 分）</span>
                  </div>

                  {/* Questions in this type */}
                  {questions.map(({ question, index }, typeIndex) => {
                    const fieldName = `q_${index}_${question.id}`;
                    const qType = question.type as string;

                    return (
                      <div
                        key={`card-${index}-${question.id}`}
                        ref={(el: any) => (questionRefs.current[index] = el)}
                        id={`question-${index}`}
                        className="activity-question-card"
                      >
                        {/* Question Header */}
                        <div className="activity-question-card__header">
                          <span className="activity-question-card__number">{typeIndex + 1}</span>
                          <span className="activity-question-card__content">
                            <RichTextViewer content={question.content} />
                          </span>
                          <span className="activity-question-card__score">
                            {fmtScore((question as any).max_score ?? question.score)} 分
                          </span>
                          {answeredQuestions.has(index) && (
                            <CheckOutlined className="activity-question-card__complete" aria-label="已作答" />
                          )}
                        </div>

                        {/* 题目插图 */}
                        {(question as any).image_url && (
                          <div className="activity-question-card__image">
                            <Image
                              src={(question as any).image_url}
                              alt="题目图片"
                              style={{ maxWidth: '100%', maxHeight: 300 }}
                            />
                          </div>
                        )}

                        {/* Single choice */}
                        {qType === 'single' && question.options && (
                          <Form.Item
                            key={`single-${index}`}
                            name={fieldName}
                            preserve={false}
                            style={{ marginBottom: 0, fontSize: '16px' }}
                          >
                            <Radio.Group className="activity-answer-options">
                              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                {question.options.map((option, optIndex) => {
                                  const { label, content } = parseOption(option, optIndex);
                                  return (
                                    <Radio
                                      key={`${index}-${optIndex}`}
                                      value={String.fromCharCode(65 + optIndex)}
                                      className="activity-answer-option"
                                    >
                                      <span className="activity-answer-option__badge">{label}</span>
                                      <span className="activity-answer-option__text">{content}</span>
                                    </Radio>
                                  );
                                })}
                              </Space>
                            </Radio.Group>
                          </Form.Item>
                        )}

                        {/* Multiple choice */}
                        {qType === 'multiple' && question.options && (
                          <Form.Item
                            key={`multiple-${index}`}
                            name={fieldName}
                            preserve={false}
                            style={{ marginBottom: 0, fontSize: '16px' }}
                          >
                            <Checkbox.Group className="activity-answer-options">
                              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                {question.options.map((option, optIndex) => {
                                  const { label, content } = parseOption(option, optIndex);
                                  return (
                                    <Checkbox
                                      key={`${index}-${optIndex}`}
                                      value={String.fromCharCode(65 + optIndex)}
                                      className="activity-answer-option"
                                    >
                                      <span className="activity-answer-option__badge">{label}</span>
                                      <span className="activity-answer-option__text">{content}</span>
                                    </Checkbox>
                                  );
                                })}
                              </Space>
                            </Checkbox.Group>
                          </Form.Item>
                        )}

                        {/* True/False */}
                        {qType === 'true_false' && (
                          <Form.Item
                            key={`true_false-${index}`}
                            name={fieldName}
                            preserve={false}
                            style={{ marginBottom: 0, fontSize: '16px' }}
                          >
                            <Radio.Group className="activity-answer-options">
                              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <Radio value="true" className="activity-answer-option">正确</Radio>
                                <Radio value="false" className="activity-answer-option">错误</Radio>
                              </Space>
                            </Radio.Group>
                          </Form.Item>
                        )}

                        {/* Fill in the blank */}
                        {qType === 'blank' && (
                          <Form.Item
                            key={`blank-${index}`}
                            name={fieldName}
                            preserve={false}
                            style={{ marginBottom: 0, fontSize: '16px' }}
                          >
                            <TextArea
                              placeholder="请输入答案"
                              autoSize={{ minRows: 2, maxRows: 4 }}
                              style={{ fontSize: '16px' }}
                            />
                          </Form.Item>
                        )}

                        {/* Essay question */}
                        {qType === 'essay' && (
                          <Form.Item
                            key={`essay-${index}`}
                            name={fieldName}
                            preserve={false}
                            style={{ marginBottom: 0, fontSize: '16px' }}
                          >
                            <TextArea
                              placeholder="请在这里写下你的答案"
                              autoSize={{ minRows: 5, maxRows: 12 }}
                              maxLength={1000}
                              showCount
                              style={{ fontSize: '16px' }}
                            />
                          </Form.Item>
                        )}

                        {/* Code question */}
                        {qType === 'code' && (
                          <CodeQuestionWrapper
                            question={question}
                            activityId={activityId}
                            fieldName={fieldName}
                            form={form}
                            onAnswerChange={() => handleFormChange()}
                          />
                        )}

                        {/* Matching question */}
                        {qType === 'matching' && (
                          <Form.Item
                            key={`matching-${index}`}
                            name={fieldName}
                            preserve={false}
                            style={{ marginBottom: 0, fontSize: '16px' }}
                          >
                            <TextArea
                              placeholder="请输入匹配答案"
                              autoSize={{ minRows: 3, maxRows: 6 }}
                              style={{ fontSize: '16px' }}
                            />
                          </Form.Item>
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            })}
        </Form>

        {/* 底部粘性提交栏：答题过程中随时可见 */}
        <div className="activity-submit-bar">
          <div className="activity-submit-bar__info">
            已答 <strong>{answeredCount}</strong> / {activity.questions.length} 题
            {answeredCount < activity.questions.length && (
              <span className="activity-submit-bar__hint">
                （还有 {activity.questions.length - answeredCount} 题未作答）
              </span>
            )}
          </div>
          <Space size="small">
            <Button
              className="activity-submit-bar__abandon"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              放弃答题
            </Button>
            <Dropdown
              className="activity-submit-bar__more"
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'abandon',
                    icon: <CloseOutlined />,
                    label: '放弃答题',
                    onClick: () => navigate(-1),
                  },
                ],
              }}
            >
              <Button icon={<MoreOutlined />} disabled={submitting} aria-label="更多操作" />
            </Dropdown>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleSubmit}
              loading={submitting}
              disabled={answeredCount === 0}
            >
              提交答案 ({answeredCount}/{activity.questions.length})
            </Button>
          </Space>
        </div>
      </div>
    </main>
  );
};

export default TakeActivityPage;
