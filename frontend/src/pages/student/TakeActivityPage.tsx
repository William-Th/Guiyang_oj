import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Form,
  Radio,
  Checkbox,
  Input,
  Button,
  Space,
  Alert,
  Spin,
  message,
  Modal,
  Typography,
  Divider,
  Progress,
  Affix,
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { activityApi } from '../../services/api';
import CountdownTimer from '../../components/common/CountdownTimer';
import CodeQuestion from '../../components/CodeQuestion';
import type { CodeQuestionData } from '../../components/CodeQuestion';
import type { ActivityQuestion, StudentActivity } from '../../types/activity';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

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
  const observerRef = useRef<IntersectionObserver | null>(null);
  const manualClickRef = useRef<number | null>(null); // 跟踪手动点击的题目索引

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
      e.returnValue = '您还有未提交的答案，确定要离开吗？';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [activityId]);

  // Setup scroll listener to track current visible question
  useEffect(() => {
    if (!activity || questionRefs.current.length === 0) return;

    // Find which question is currently most visible in viewport
    const updateCurrentQuestion = () => {
      // 检查是否在手动点击的保护期内
      const now = Date.now();
      const clickTime = manualClickRef.current;
      if (clickTime !== null && (now - clickTime) < 800) {
        // 在保护期内，不自动更新
        return;
      }
      // 超过保护期后清除标志
      if (clickTime !== null) {
        manualClickRef.current = null;
      }

      const viewportMiddle = window.innerHeight / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;

      questionRefs.current.forEach((ref, index) => {
        if (!ref) return;

        const rect = ref.getBoundingClientRect();
        const questionMiddle = rect.top + rect.height / 2;
        const distance = Math.abs(viewportMiddle - questionMiddle);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setCurrentQuestionIndex(closestIndex);
    };

    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      // 初始化当前题目
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
      };

      window.addEventListener('scroll', handleScroll, true); // Use capture phase

      // Store cleanup function
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
      };
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [activity]);

  const loadActivityAndStart = async () => {
    if (!activityId) return;

    try {
      setLoading(true);

      // Start the activity first (backend checks eligibility automatically)
      const startResponse = await activityApi.startActivity(activityId);

      // Store student_activity_id for later use
      const studentActivityId = startResponse.studentActivityId;
      setStudentActivity({
        id: studentActivityId,
        start_time: startResponse.startTime,
        time_limit_deadline: startResponse.timeLimitDeadline,
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
    // 记录手动点击时间戳，防止滚动监听器立即覆盖
    // 使用当前时间戳，滚动监听器会在800ms后恢复自动检测
    manualClickRef.current = Date.now();
    // 立即更新选中状态，让用户看到即时反馈
    setCurrentQuestionIndex(index);
    const ref = questionRefs.current[index];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Auto-save answers to localStorage AND backend
  const handleFormChange = async () => {
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

      // Save each answered question to backend
      const questions = activity?.questions || [];
      const savePromises: Promise<void>[] = [];

      questions.forEach((question) => {
        const fieldName = `question_${question.id}`;
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

    Modal.confirm({
      title: '确认提交',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            您已完成 {answeredCount} / {activity.questions.length} 题
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
        description="未找到该活动或您无权访问"
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
    <div style={{ display: 'flex', gap: '16px', padding: '24px', fontSize: '16px', overflowX: 'hidden' }}>
      {/* Left Sidebar - Question Navigation */}
      <Affix offsetTop={24}>
        <Card
          title={<span style={{ fontSize: '15px', fontWeight: 'bold' }}>答题卡</span>}
          style={{ width: 220, maxHeight: 'calc(100vh - 80px)', overflow: 'visible' }}
          size="small"
          bodyStyle={{ padding: '12px' }}
        >
          <div style={{ overflowX: 'hidden' }}>
            {Object.entries(questionGroups).map(([typeName, questions]) => (
              <div key={typeName} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px', fontWeight: 500 }}>
                  {typeName} ({questions.length})
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px'
                }}>
                  {questions.map(({ question, index }) => {
                    const isAnswered = answeredQuestions.has(index);
                    const isCurrent = index === currentQuestionIndex;

                    // Determine button style based on state
                    // Use type="default" to avoid Ant Design overriding custom styles
                    let buttonStyle: React.CSSProperties = {
                      padding: '4px 8px',
                      height: '36px',
                      minWidth: 'unset',
                      fontSize: '15px',
                      fontWeight: isAnswered ? 'bold' : 'normal',
                    };

                    let buttonType: 'default' | 'dashed' = 'dashed';

                    if (isCurrent && isAnswered) {
                      // Current + Answered: 蓝色高亮（当前正在看这道题）
                      buttonType = 'default';
                      buttonStyle = {
                        ...buttonStyle,
                        backgroundColor: '#16a34a',
                        borderColor: '#16a34a',
                        color: '#fff',
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 6px rgba(22, 119, 255, 0.4)',
                      };
                    } else if (isCurrent && !isAnswered) {
                      // Current + Not Answered: 橙色边框提示（当前题待作答）
                      buttonType = 'default';
                      buttonStyle = {
                        ...buttonStyle,
                        backgroundColor: '#fff7e6',
                        borderColor: '#fa8c16',
                        color: '#fa8c16',
                        borderWidth: '3px',
                        borderStyle: 'solid',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 6px rgba(250, 140, 22, 0.3)',
                      };
                    } else if (!isCurrent && isAnswered) {
                      // Not Current + Answered: 绿色背景（已完成）
                      buttonType = 'default';
                      buttonStyle = {
                        ...buttonStyle,
                        backgroundColor: '#f6ffed',
                        borderColor: '#b7eb8f',
                        color: '#52c41a',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      };
                    }
                    // else: dashed (default for unanswered)

                    return (
                      <Button
                        key={question.id}
                        size="small"
                        type={buttonType}
                        onClick={() => scrollToQuestion(index)}
                        style={buttonStyle}
                      >
                        {getQuestionDisplayNumber(index)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div style={{ fontSize: '13px', color: '#666', textAlign: 'center' }}>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>●</span> 已答 {answeredCount}
            </div>
            <div>
              <span style={{ color: '#d9d9d9' }}>○</span> 未答 {activity.questions.length - answeredCount}
            </div>
          </div>
        </Card>
      </Affix>

      {/* Main Content */}
      <div style={{ flex: 1, marginLeft: 'auto', maxWidth: 1200, overflowX: 'hidden' }}>
        {/* Submit Button - Fixed at top */}
        <Card style={{ marginBottom: 16 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {activity.title}
              </Title>
              {activity.description && (
                <Paragraph style={{ margin: 0, marginBottom: 8 }}>
                  {activity.description}
                </Paragraph>
              )}
              <Space split={<Divider type="vertical" />}>
                <Text>科目: {activity.subject}</Text>
                <Text>年级: {activity.grade}</Text>
                <Text>总分: {activity.total_score}</Text>
                <Text>及格分: {activity.pass_score}</Text>
              </Space>
            </div>
            <Space>
              <Button
                type="default"
                size="large"
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                放弃答题
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleSubmit}
                loading={submitting}
                disabled={answeredCount === 0}
              >
                提交答案 ({answeredCount}/{activity.questions.length})
              </Button>
            </Space>
          </Space>
        </Card>

        {/* Time and Status Info */}
        <Card style={{ marginBottom: 16 }}>
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
                description="您可以随时保存并继续答题"
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
                description="您的答案已自动保存到本地，即使刷新页面也不会丢失"
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
                <div key={typeName} style={{ marginBottom: 40 }}>
                  {/* Type Section Header */}
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: 20,
                    paddingBottom: 10,
                    borderBottom: '2px solid #e8e8e8'
                  }}>
                    {sectionLabel}、{typeName}（共{typeQuestionCount}题，共{typeTotalScore}分）
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
                        style={{ marginBottom: 24 }}
                      >
                        {/* Question Header */}
                        <div style={{ marginBottom: 12, fontSize: '16px' }}>
                          <span style={{ fontWeight: 'bold' }}>
                            {typeIndex + 1}. {question.content}
                          </span>
                          <span style={{ marginLeft: 12, color: '#999', fontSize: '14px' }}>
                            ({typeof (question as any).max_score === 'string' ? (question as any).max_score : (question as any).max_score || question.score}分)
                          </span>
                          {answeredQuestions.has(index) && (
                            <CheckOutlined style={{ color: '#52c41a', marginLeft: 8 }} />
                          )}
                        </div>

                        {/* Single choice */}
                        {qType === 'single' && question.options && (
                          <Form.Item
                            key={`single-${index}`}
                            name={fieldName}
                            preserve={false}
                            style={{ marginBottom: 0, fontSize: '16px' }}
                          >
                            <Radio.Group style={{ width: '100%' }}>
                              <Space direction="vertical" style={{ width: '100%' }} size="large">
                                {question.options.map((option, optIndex) => (
                                  <Radio
                                    key={`${index}-${optIndex}`}
                                    value={String.fromCharCode(65 + optIndex)}
                                    style={{ fontSize: '16px', lineHeight: '1.8' }}
                                  >
                                    {String.fromCharCode(65 + optIndex)}. {option}
                                  </Radio>
                                ))}
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
                            <Checkbox.Group style={{ width: '100%' }}>
                              <Space direction="vertical" style={{ width: '100%' }} size="large">
                                {question.options.map((option, optIndex) => (
                                  <Checkbox
                                    key={`${index}-${optIndex}`}
                                    value={String.fromCharCode(65 + optIndex)}
                                    style={{ fontSize: '16px', lineHeight: '1.8' }}
                                  >
                                    {String.fromCharCode(65 + optIndex)}. {option}
                                  </Checkbox>
                                ))}
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
                            <Radio.Group style={{ width: '100%' }}>
                              <Space size="large">
                                <Radio value="true" style={{ fontSize: '16px' }}>正确</Radio>
                                <Radio value="false" style={{ fontSize: '16px' }}>错误</Radio>
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
                              placeholder="请输入答案"
                              autoSize={{ minRows: 4, maxRows: 8 }}
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
                </div>
              );
            })}
        </Form>
      </div>
    </div>
  );
};

export default TakeActivityPage;
