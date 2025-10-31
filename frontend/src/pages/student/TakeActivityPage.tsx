import React, { useState, useEffect, useRef } from 'react';
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
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { activityApi } from '../../services/api';
import CountdownTimer from '../../components/common/CountdownTimer';
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
  const [autoSaving, setAutoSaving] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [hasLocalBackup, setHasLocalBackup] = useState(false);

  const activityId = id ? parseInt(id) : undefined;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);
  const retryCountRef = useRef(0);

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
    };
  }, [activityId]);

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
        setActivity(questionsResponse.activity);
      }

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
        form.setFieldsValue(formValues);
        updateAnsweredCount(formValues);
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

  // Update answered question count
  const updateAnsweredCount = (values?: any) => {
    const formValues = values || form.getFieldsValue();
    const answered = Object.values(formValues).filter((v) => {
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && v !== null && v !== '';
    }).length;
    setAnsweredCount(answered);
  };

  // Auto-save answers
  const handleFormChange = () => {
    updateAnsweredCount();

    // Save to localStorage immediately (fast, no network required)
    if (activityId) {
      const values = form.getFieldsValue();
      saveAnswersToLocalStorage(activityId, values);
      setHasLocalBackup(true);
    }

    // Debounce server auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSaveAnswers();
    }, 2000); // Save to server after 2 seconds of inactivity
  };

  const autoSaveAnswers = async () => {
    if (!activity || !activityId) return;

    try {
      setAutoSaving(true);
      const values = form.getFieldsValue();
      const answers = prepareAnswers(values);

      if (answers.length === 0) return; // No answers to save

      // Submit each answer individually using new API
      const savePromises = answers.map(answer =>
        activityApi.submitAnswer(activityId, {
          questionId: answer.questionId,
          answer: answer.answer
        })
      );

      await Promise.all(savePromises);

      // Success - clear network error flag
      if (networkError) {
        setNetworkError(false);
        message.success('网络已恢复，答案已同步');
      }
      retryCountRef.current = 0;
    } catch (error: any) {
      console.error('Auto-save error:', error);
      setNetworkError(true);

      // Retry logic for network errors
      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        setTimeout(() => {
          autoSaveAnswers();
        }, 5000 * retryCountRef.current); // Exponential backoff: 5s, 10s, 15s
      }

      // Don't show error message for auto-save failures (answers are in localStorage)
    } finally {
      setAutoSaving(false);
    }
  };

  // Prepare answers in API format
  const prepareAnswers = (values: any): any[] => {
    if (!activity) return [];

    return activity.questions
      .map((q) => {
        const answer = values[`question_${q.id}`];
        if (answer === undefined || answer === null || answer === '') return null;

        return {
          questionId: q.id,
          answer: Array.isArray(answer) ? answer : String(answer),
        };
      })
      .filter((a) => a !== null);
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

  // Render question based on type
  const renderQuestion = (question: ActivityQuestion, index: number) => {
    const fieldName = `question_${question.id}`;

    return (
      <Card
        key={question.id}
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <Text strong>第 {index + 1} 题</Text>
            <Text type="secondary">({question.score} 分)</Text>
            {question.difficulty && (
              <Text type="secondary">难度: {question.difficulty}</Text>
            )}
          </Space>
        }
      >
        <Paragraph>{question.content}</Paragraph>

        {/* Single choice */}
        {question.type === 'single' && (
          <Form.Item name={fieldName}>
            <Radio.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {question.options?.map((option, i) => (
                  <Radio key={i} value={String.fromCharCode(65 + i)}>
                    {String.fromCharCode(65 + i)}. {option}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>
        )}

        {/* Multiple choice */}
        {question.type === 'multiple' && (
          <Form.Item name={fieldName}>
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {question.options?.map((option, i) => (
                  <Checkbox key={i} value={String.fromCharCode(65 + i)}>
                    {String.fromCharCode(65 + i)}. {option}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>
        )}

        {/* Fill in the blank */}
        {question.type === 'blank' && (
          <Form.Item name={fieldName}>
            <Input placeholder="请输入答案" />
          </Form.Item>
        )}

        {/* Essay */}
        {question.type === 'essay' && (
          <Form.Item name={fieldName}>
            <TextArea rows={6} placeholder="请输入您的答案" />
          </Form.Item>
        )}

        {/* Code */}
        {question.type === 'code' && (
          <Form.Item name={fieldName}>
            <TextArea
              rows={12}
              placeholder="请输入代码"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        )}
      </Card>
    );
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

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      {/* Activity Header */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={3}>{activity.title}</Title>
        {activity.description && <Paragraph>{activity.description}</Paragraph>}

        <Space direction="vertical" style={{ width: '100%' }} size="middle">
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
          <div>
            <Space>
              <Text>答题进度：</Text>
              <Text strong>
                {answeredCount} / {activity.questions.length}
              </Text>
              {autoSaving && <Text type="secondary">(自动保存中...)</Text>}
            </Space>
            <Progress percent={Math.round(progress)} status="active" />
          </div>

          {/* Activity info */}
          <Space split={<Divider type="vertical" />}>
            <Text>科目: {activity.subject}</Text>
            <Text>年级: {activity.grade}</Text>
            <Text>总分: {activity.total_score}</Text>
            <Text>及格分: {activity.pass_score}</Text>
          </Space>
        </Space>
      </Card>

      {/* Questions Form */}
      <Form form={form} layout="vertical" onValuesChange={handleFormChange}>
        {activity.questions.map((question, index) =>
          renderQuestion(question, index)
        )}
      </Form>

      {/* Submit Button */}
      <Card>
        <Space size="large" style={{ width: '100%', justifyContent: 'center' }}>
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
            提交答案
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default TakeActivityPage;
