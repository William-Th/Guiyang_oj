import React, { useState, useEffect, useRef } from 'react';
import { optionText } from '../../components/questions/questionOption';
import { Card, Form, InputNumber, Input, Button, Space, Spin, Tag, Divider, Typography, Alert, Row, Col, Progress, Affix, Tooltip, Image, Segmented } from 'antd';
import { message, modal } from '../../lib/feedback';
import {
  SaveOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  UpOutlined,
  DownOutlined,
  CloseCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { gradingApi } from '../../services/api';
import RichTextViewer from '../../components/common/RichTextViewer';
import { plainTextPreview } from '@/utils/richText';
import { ApiError, GradingQuestion } from '../../types';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

/** 分值显示：整数去掉小数点（5.00 → 5，15.5 → 15.5） */
const fmtScore = (value: unknown): string => {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (value === null || value === undefined || Number.isNaN(n)) return '-';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
};

/** 学生答案可能以 JSON 字符串存储（如 "[\"A\"]"、"true"），客观题先解析再格式化 */
const parseAnswerValue = (raw: unknown, type: string): unknown => {
  if (typeof raw === 'string' && ['single', 'multiple', 'true_false', 'blank', 'fill_blank', 'matching'].includes(type)) {
    const t = raw.trim();
    if (t.startsWith('[') || t.startsWith('{') || t === 'true' || t === 'false') {
      try {
        return JSON.parse(t);
      } catch {
        return raw;
      }
    }
  }
  return raw;
};

/** 选项字母映射回选项文本（如 A → "A. 12"） */
const letterToOptionText = (letter: string, options?: any[]): string => {
  const idx = letter.toUpperCase().charCodeAt(0) - 65;
  if (options && idx >= 0 && idx < options.length) {
    return optionText(options[idx], idx);
  }
  return letter;
};

/** 把学生答案渲染为教师可读的文本（"true" → 正确、["A","B"] → A. xx、B. xx） */
const formatStudentAnswer = (answer: { answer: unknown }, question: { type: string; options?: any[] }): string => {
  const value = parseAnswerValue(answer.answer, question.type);

  if (question.type === 'true_false') {
    return value === true || value === 'true' ? '正确' : '错误';
  }
  if (Array.isArray(value)) {
    if (question.options && ['multiple', 'single'].includes(question.type)) {
      return value.map((v) => letterToOptionText(String(v), question.options)).join('、');
    }
    return value.map((v) => String(v)).join('；');
  }
  if (question.options && question.type === 'single' && typeof value === 'string') {
    return letterToOptionText(value, question.options);
  }
  return String(value ?? '');
};

/** 客观题正确答案文本 */
const formatCorrectAnswer = (question: { type: string; options?: any[]; correct_answer?: string | string[] }): string => {
  const value = parseAnswerValue(question.correct_answer, question.type);
  if (question.type === 'true_false') {
    return value === true || value === 'true' ? '正确' : '错误';
  }
  if (Array.isArray(value)) {
    if (question.options) {
      return value.map((v) => letterToOptionText(String(v), question.options)).join('、');
    }
    return value.join('；');
  }
  if (question.options && question.type === 'single' && typeof value === 'string') {
    return letterToOptionText(value, question.options);
  }
  return String(value ?? '');
};

// Extended type to match actual API response
interface GradingDetailResponse {
  student_activity: {
    id: number;
    student_id: number;
    activity_id: number;
    status: string;
    grading_status: string;
    score: number | null;
    submit_time: string;
  };
  student: {
    id: number;
    real_name: string;
    username: string;
  };
  activity: {
    id: number;
    title: string;
    subject: string;
    grade: string;
    total_score: number;
  };
  answers: Array<GradingQuestion & {
    grading_status: string;
    question_id: number;
    is_correct: boolean | null;
    manual_score: number | null;
    auto_score: number | null;
    feedback: string | null;
  }>;
  questions: Array<{
    id: number;
    type: string;
    content: string;
    options?: any[];
    correct_answer?: string | string[];
    explanation?: string | null;
    score: number;
    difficulty?: string | null;
    image_url?: string;
  }>;
}

const GradingDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<GradingDetailResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'all' | 'pending'>('all');
  // 已自动评分的客观题默认折叠，展开后记录在此
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const questionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const studentActivityId = id ? parseInt(id) : undefined;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (!detail) return;

      switch (e.key.toLowerCase()) {
        case 'n': // Next question
          if (currentQuestionIndex < detail.questions.length - 1) {
            scrollToQuestion(currentQuestionIndex + 1);
          }
          break;
        case 'p': // Previous question
          if (currentQuestionIndex > 0) {
            scrollToQuestion(currentQuestionIndex - 1);
          }
          break;
        case 's': // Save current
          e.preventDefault();
          handleBatchSave();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [detail, currentQuestionIndex]);

  // Scroll to specific question（折叠中的题目先展开再定位）
  const scrollToQuestion = (index: number) => {
    const questionId = detail?.questions[index]?.id;
    if (questionId && questionRefs.current[questionId]) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(questionId);
        return next;
      });
      questionRefs.current[questionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      setCurrentQuestionIndex(index);
    }
  };

  useEffect(() => {
    if (studentActivityId) {
      loadGradingDetail();
    }
  }, [studentActivityId]);

  // Check for backup data after detail is loaded
  useEffect(() => {
    if (detail) {
      restoreFromBackup();
    }
  }, [detail]);

  const loadGradingDetail = async () => {
    try {
      setLoading(true);
      const response = await gradingApi.getStudentActivityForGrading(studentActivityId!);
      setDetail(response);

      // Set initial form values
      const formValues: Record<string, number | string> = {};
      response.answers.forEach((answer: GradingDetailResponse['answers'][0]) => {
        formValues[`score_${answer.id}`] = answer.manual_score || answer.auto_score || 0;
        formValues[`feedback_${answer.id}`] = answer.feedback || '';
      });
      form.setFieldsValue(formValues);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Load grading detail error:', apiError);
      message.error(apiError.response?.data?.message || '加载评卷详情失败');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrade = async (answerId: number, retryCount = 0) => {
    try {
      // Validate form before saving
      await form.validateFields([`score_${answerId}`, `feedback_${answerId}`]);

      const values = form.getFieldsValue();
      const score = values[`score_${answerId}`];
      const feedback = values[`feedback_${answerId}`];

      // Save to localStorage as backup
      const backupKey = `grading_backup_${studentActivityId}_${answerId}`;
      localStorage.setItem(backupKey, JSON.stringify({ score, feedback, timestamp: Date.now() }));

      await gradingApi.gradeAnswer(answerId, { score, feedback });
      message.success('评分保存成功');

      // Clear backup after successful save
      localStorage.removeItem(backupKey);

      // Reload to get updated status
      await loadGradingDetail();
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Save grade error:', apiError);

      // Network error - retry mechanism
      if (apiError.code === 'ERR_NETWORK' || apiError.message?.includes('Network Error')) {
        if (retryCount < 2) {
          message.warning(`网络错误，正在重试... (${retryCount + 1}/2)`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return handleSaveGrade(answerId, retryCount + 1);
        } else {
          message.error('网络错误，请检查网络连接后重试。评分已保存到本地缓存。');
        }
      } else if (apiError.name === 'ValidationError') {
        // Form validation error - already shown by form
        return;
      } else {
        // Other errors
        const errorMsg = apiError.response?.data?.message || '保存评分失败';
        message.error(errorMsg);
      }
    }
  };

  const handleBatchSave = async (retryCount = 0) => {
    try {
      setSaving(true);

      // Validate all form fields first
      await form.validateFields();

      const values = form.getFieldsValue();
      const answers = detail!.answers.map((answer) => ({
        answerId: answer.id,
        score: values[`score_${answer.id}`],
        feedback: values[`feedback_${answer.id}`],
      }));

      // Save to localStorage as backup
      const backupKey = `grading_batch_backup_${studentActivityId}`;
      localStorage.setItem(backupKey, JSON.stringify({ answers, timestamp: Date.now() }));

      await gradingApi.batchGradeAnswers(answers);
      message.success('批量保存成功');

      // Clear backup after successful save
      localStorage.removeItem(backupKey);

      // Reload to get updated status
      await loadGradingDetail();
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Batch save error:', error);

      // Network error - retry mechanism
      if (apiError.code === 'ERR_NETWORK' || apiError.message?.includes('Network Error')) {
        if (retryCount < 2) {
          message.warning(`网络错误，正在重试... (${retryCount + 1}/2)`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return handleBatchSave(retryCount + 1);
        } else {
          message.error('网络错误，请检查网络连接后重试。评分已保存到本地缓存。');
        }
      } else if ('errorFields' in apiError) {
        // Form validation error
        message.error('请检查表单，确保所有分数在有效范围内');
        // Scroll to first error field
        const validationError = apiError as unknown as { errorFields: Array<{ name: (string | number)[] }> };
        const firstError = validationError.errorFields[0];
        if (firstError) {
          const fieldName = String(firstError.name[0]);
          const questionId = fieldName.replace('score_', '').replace('feedback_', '');
          const element = document.getElementById(`question-${questionId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      } else {
        // Other errors
        const errorMsg = apiError.response?.data?.message || '批量保存失败';
        message.error(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteGrading = async (retryCount = 0) => {
    try {
      setSaving(true);

      // Save all grades first
      await handleBatchSave();

      // Complete grading
      await gradingApi.completeGrading(studentActivityId!);
      message.success('评卷完成！');

      // Clear all backup data
      clearAllBackups();

      navigate('/teacher/grading');
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Complete grading error:', apiError);

      // Network error - retry mechanism
      if (apiError.code === 'ERR_NETWORK' || apiError.message?.includes('Network Error')) {
        if (retryCount < 2) {
          message.warning(`网络错误，正在重试... (${retryCount + 1}/2)`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return handleCompleteGrading(retryCount + 1);
        } else {
          message.error('网络错误，请检查网络连接后重试');
        }
      } else {
        const errorMsg = apiError.response?.data?.message || '完成评卷失败';
        message.error(errorMsg);
      }

      setSaving(false);
    }
  };

  // Clear all backup data for current student activity
  const clearAllBackups = () => {
    if (!studentActivityId) return;

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`grading_backup_${studentActivityId}_`) ||
          key.startsWith(`grading_batch_backup_${studentActivityId}`)) {
        localStorage.removeItem(key);
      }
    });
  };

  // Restore from local backup if available
  const restoreFromBackup = () => {
    if (!detail || !studentActivityId) return;

    const batchBackupKey = `grading_batch_backup_${studentActivityId}`;
    const batchBackup = localStorage.getItem(batchBackupKey);

    if (batchBackup) {
      try {
        const { answers, timestamp } = JSON.parse(batchBackup);
        const backupDate = new Date(timestamp);
        const timeDiff = Date.now() - timestamp;

        // Only restore if backup is less than 24 hours old
        if (timeDiff < 24 * 60 * 60 * 1000) {
          modal.confirm({
            title: '发现未保存的评分数据',
            content: `发现于 ${backupDate.toLocaleString()} 的未保存评分数据，是否恢复？`,
            okText: '恢复',
            cancelText: '忽略',
            onOk: () => {
              const formValues: any = {};
              answers.forEach((answer: any) => {
                formValues[`score_${answer.answerId}`] = answer.score;
                formValues[`feedback_${answer.answerId}`] = answer.feedback;
              });
              form.setFieldsValue(formValues);
              message.success('已恢复本地缓存的评分数据');
            },
          });
        }
      } catch (err) {
        console.error('Failed to restore backup:', err);
      }
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      fill_blank: '填空题',
      blank: '填空题',
      short_answer: '简答题',
      essay: '论述题',
      coding: '编程题',
      programming: '编程题',
      code: '编程题',
      true_false: '判断题',
      matching: '匹配题',
    };
    return typeMap[type] || type;
  };

  // 题型显示顺序
  const TYPE_ORDER = ['single', 'multiple', 'true_false', 'blank', 'fill_blank', 'matching', 'short_answer', 'essay', 'coding', 'programming', 'code'];
  const CN_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  // 按题型分组题目，组内每个项保留全局 index（用于上下题导航和 scroll）
  const computeGroupedQuestions = () => {
    if (!detail) return [];
    type Item = {
      question: typeof detail.questions[0];
      answer: typeof detail.answers[0];
      globalIndex: number;
    };
    const groups = new Map<string, Item[]>();
    detail.questions.forEach((q, i) => {
      const a = detail.answers.find(x => x.question_id === q.id);
      if (!a) return;
      const t = q.type || 'unknown';
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t)!.push({ question: q, answer: a, globalIndex: i });
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        const ia = TYPE_ORDER.indexOf(a);
        const ib = TYPE_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(([type, items]) => ({
        type,
        typeName: getQuestionTypeLabel(type),
        items,
        totalScore: items.reduce((s, it) => s + (Number(it.question.score) || 0), 0),
        earnedScore: items.reduce((s, it) => s + (Number(it.answer.score) || 0), 0),
        gradedCount: items.filter(it => it.answer.grading_status !== 'pending').length
      }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载评卷详情中..." />
      </div>
    );
  }

  if (!detail) {
    return <div>未找到评卷详情</div>;
  }

  const pendingCount = detail.answers.filter(a => a.grading_status === 'pending').length;
  const gradedCount = detail.answers.length - pendingCount;
  const progressPercent = detail.answers.length > 0
    ? Math.round((gradedCount / detail.answers.length) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 顶部摘要条：单行收纳学生/活动/进度/操作，吸顶常驻 */}
        <div className="grading-summary-bar">
          <div className="grading-summary-bar__row">
            <Space size="small" wrap>
              <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                返回
              </Button>
              <Divider type="vertical" />
              <UserOutlined style={{ color: 'var(--bohe-primary)' }} />
              <Text strong>{detail.student.real_name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{detail.student.username}</Text>
              <Divider type="vertical" />
              <Text ellipsis style={{ maxWidth: 240 }}>{detail.activity.title}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {detail.activity.subject} / {detail.activity.grade} · 提交于{' '}
                {new Date(detail.student_activity.submit_time).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Space>

            <Space size="small" wrap>
              {pendingCount > 0 && (
                <Text type="warning" style={{ fontSize: 13 }}>
                  还有 {pendingCount} 道待评分
                </Text>
              )}
              <Tag color={pendingCount === 0 ? 'green' : 'orange'}>
                已评 {gradedCount} / {detail.answers.length}
              </Tag>
              <Tooltip title="快捷键: N=下一题, P=上一题, S=保存">
                <Button size="small" type="text">快捷键</Button>
              </Tooltip>
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                onClick={() => handleBatchSave()}
                loading={saving}
              >
                保存所有评分 (S)
              </Button>
              <Button
                type="primary"
                danger
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCompleteGrading()}
                loading={saving}
                disabled={pendingCount > 0}
              >
                完成评卷
              </Button>
            </Space>
          </div>
          <div className="grading-summary-bar__score">
            <Text type="secondary" style={{ fontSize: 12 }}>
              总分 {fmtScore(detail.activity.total_score)}
            </Text>
            <Text strong style={{ fontSize: 16, color: 'var(--bohe-primary)' }}>
              {fmtScore(detail.student_activity.score)}
            </Text>
            <div className="grading-summary-bar__progress">
              <Progress
                percent={progressPercent}
                size="small"
                showInfo={false}
                status={pendingCount === 0 ? 'success' : 'active'}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0' }}>
          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as 'all' | 'pending')}
            options={[
              { label: `全部题目（${detail.answers.length}）`, value: 'all' },
              { label: `仅看待评分（${pendingCount}）`, value: 'pending' },
            ]}
          />
        </div>

      <Form form={form} layout="vertical">
        {computeGroupedQuestions().map((group, groupIndex) => {
          const cnNum = CN_NUMS[groupIndex] || String(groupIndex + 1);
          const visibleItems = viewMode === 'pending'
            ? group.items.filter(({ answer }) => answer.grading_status === 'pending')
            : group.items;
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.type} style={{ marginBottom: 24 }}>
              <div style={{
                padding: '10px 14px',
                background: '#fafafa',
                borderLeft: '3px solid #0ea5e9',
                marginBottom: 12,
                borderRadius: 4
              }}>
                <Title level={5} style={{ margin: 0 }}>
                  {cnNum}、{group.typeName}
                  <Text type="secondary" style={{ fontSize: 14, marginLeft: 12, fontWeight: 'normal' }}>
                    （{group.items.length} 题 · {fmtScore(group.totalScore)} 分 ·
                    已评 {group.gradedCount}/{group.items.length}
                    {group.earnedScore > 0 ? ` · 得 ${fmtScore(group.earnedScore)} 分` : ''}）
                  </Text>
                </Title>
              </div>
              {visibleItems.map(({ question, answer, globalIndex }, idx) => {
                const isSubjective = ['short_answer', 'essay', 'coding', 'programming', 'code'].includes(question.type);
                const needsManualGrading = answer.grading_status === 'pending' || isSubjective;
                const isAutoGradedObjective = !isSubjective && answer.grading_status !== 'pending';
                const isExpanded = !isAutoGradedObjective || expandedIds.has(question.id);
                const hasReference = isSubjective && (question.correct_answer || question.explanation);

                if (!isExpanded) {
                  /* 已自动评分的客观题：默认折叠为一行摘要 */
                  return (
                    <Card
                      key={question.id}
                      id={`question-${question.id}`}
                      ref={(el) => (questionRefs.current[question.id] = el)}
                      size="small"
                      style={{ marginBottom: 12 }}
                      className="grading-question-summary"
                      hoverable
                      onClick={() => setExpandedIds((prev) => new Set(prev).add(question.id))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 700, color: 'var(--bohe-primary)' }}>{idx + 1}.</span>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555' }}>
                          {plainTextPreview(question.content, 60)}
                        </span>
                        {answer.is_correct !== null && answer.is_correct !== undefined && (
                          answer.is_correct
                            ? <Tag color="success" icon={<CheckCircleOutlined />}>答对</Tag>
                            : <Tag color="error" icon={<CloseCircleOutlined />}>答错</Tag>
                        )}
                        <Tag color="blue">已自动评分</Tag>
                        <Tag style={{ marginRight: 0 }}>{fmtScore(answer.score)} / {fmtScore(question.score)} 分</Tag>
                        <Button
                          type="text"
                          size="small"
                          icon={<DownOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedIds((prev) => new Set(prev).add(question.id));
                          }}
                        >
                          展开
                        </Button>
                      </div>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={question.id}
                    id={`question-${question.id}`}
                    ref={(el) => (questionRefs.current[question.id] = el)}
                    style={{ marginBottom: 16 }}
                    title={
                      <Space size="large">
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#0ea5e9' }}>
                          {idx + 1}.
                        </div>
                        <Tag color="green" style={{ fontSize: 14 }}>
                          满分: {fmtScore(question.score)} 分
                        </Tag>
                        {answer.grading_status === 'auto_graded' && (
                          <Tag color="blue">已自动评分</Tag>
                        )}
                        {answer.grading_status === 'manual_graded' && (
                          <Tag color="purple">已人工评分</Tag>
                        )}
                        {answer.grading_status === 'pending' && (
                          <Tag color="orange">待评分</Tag>
                        )}
                      </Space>
                    }
                    extra={
                      <Space>
                        {isAutoGradedObjective && (
                          <Button
                            size="small"
                            icon={<UpOutlined />}
                            onClick={() => setExpandedIds((prev) => {
                              const next = new Set(prev);
                              next.delete(question.id);
                              return next;
                            })}
                          >
                            收起
                          </Button>
                        )}
                        <Button
                          size="small"
                          icon={<ArrowLeftOutlined />}
                          onClick={() => scrollToQuestion(globalIndex - 1)}
                          disabled={globalIndex === 0}
                        >
                          上一题 (P)
                        </Button>
                        <Button
                          size="small"
                          icon={<ArrowRightOutlined />}
                          onClick={() => scrollToQuestion(globalIndex + 1)}
                          disabled={globalIndex === detail.questions.length - 1}
                        >
                          下一题 (N)
                        </Button>
                      </Space>
                    }
                  >
                    <Divider style={{ marginTop: 0 }} />

                    <div style={{ marginBottom: 16 }}>
                      <Title level={5}>题目</Title>
                      <Paragraph><RichTextViewer content={question.content} /></Paragraph>

                      {question.image_url && (
                        <div style={{ margin: '8px 0' }}>
                          <Image
                            src={question.image_url}
                            alt="题目图片"
                            style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 4 }}
                          />
                        </div>
                      )}

                      {question.options && (
                        <div>
                          {question.options.map((option, idx) => (
                            <div key={idx}>
                              {optionText(option, idx)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Title level={5}>学生答案</Title>
                      <div style={{
                        padding: '12px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                      }}>
                        {formatStudentAnswer(answer, question)}
                      </div>
                    </div>

                    {!needsManualGrading && question.correct_answer !== null && question.correct_answer !== undefined && (
                      <div style={{ marginBottom: 16 }}>
                        <Title level={5}>正确答案</Title>
                        <div style={{
                          padding: '12px',
                          background: '#f6ffed',
                          border: '1px solid #b7eb8f',
                          borderRadius: '4px',
                        }}>
                          {formatCorrectAnswer(question)}
                        </div>
                      </div>
                    )}

                    {hasReference && (
                      <div style={{ marginBottom: 16 }}>
                        {question.correct_answer && (
                          <>
                            <Title level={5}>参考答案</Title>
                            <div style={{
                              padding: '12px',
                              background: '#f6ffed',
                              border: '1px solid #b7eb8f',
                              borderRadius: '4px',
                              marginBottom: question.explanation ? 12 : 0,
                            }}>
                              <RichTextViewer content={Array.isArray(question.correct_answer) ? question.correct_answer.join('；') : question.correct_answer} />
                            </div>
                          </>
                        )}
                        {question.explanation && (
                          <>
                            <Title level={5}>解析 / 评分标准</Title>
                            <div style={{
                              padding: '12px',
                              background: '#fffbeb',
                              border: '1px solid #ffe58f',
                              borderRadius: '4px',
                            }}>
                              <RichTextViewer content={question.explanation} />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {!needsManualGrading && answer.is_correct !== null && (
                      <Alert
                        message={answer.is_correct ? '回答正确' : '回答错误'}
                        type={answer.is_correct ? 'success' : 'error'}
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}

                    <Row gutter={16}>
                      <Col xs={24} sm={8} md={6}>
                        <Form.Item
                          label="得分"
                          name={`score_${answer.id}`}
                          rules={[
                            { required: true, message: '请输入得分' },
                            { type: 'number', min: 0, max: question.score, message: `得分范围: 0-${fmtScore(question.score)}` },
                          ]}
                        >
                          <InputNumber
                            min={0}
                            max={question.score}
                            precision={1}
                            style={{ width: '100%' }}
                            disabled={!needsManualGrading}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={16} md={18}>
                        <Form.Item label="评语" name={`feedback_${answer.id}`}>
                          <TextArea
                            rows={2}
                            placeholder="请输入评语（选填）"
                            disabled={!needsManualGrading}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {needsManualGrading && (
                      <Button
                        type="link"
                        icon={<SaveOutlined />}
                        onClick={() => handleSaveGrade(answer.id)}
                      >
                        保存本题评分
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          );
        })}
      </Form>
      </div>

      {/* Question Navigation Sidebar */}
      <Affix offsetTop={20} style={{ width: 200 }}>
        <Card
          title="题目导航"
          size="small"
          style={{ maxHeight: 'calc(100vh - 100px)', overflow: 'auto' }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {computeGroupedQuestions().map((group) => (
              <div key={group.type} style={{ width: '100%' }}>
                <div style={{
                  fontSize: 12,
                  color: '#666',
                  padding: '4px 0',
                  borderBottom: '1px solid #f0f0f0',
                  marginBottom: 4,
                  fontWeight: 500
                }}>
                  {group.typeName}（{group.gradedCount}/{group.items.length}）
                </div>
                {group.items.map(({ question, answer, globalIndex }, idx) => {
                  const isGraded = answer?.grading_status !== 'pending';
                  return (
                    <Button
                      key={question.id}
                      size="small"
                      type={currentQuestionIndex === globalIndex ? 'primary' : 'default'}
                      block
                      onClick={() => scrollToQuestion(globalIndex)}
                      style={{
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        marginBottom: 4
                      }}
                      icon={isGraded ? <CheckCircleOutlined /> : null}
                    >
                      {idx + 1}.
                      <span style={{ marginLeft: 'auto', fontSize: 12 }}>
                        {question.score}分
                      </span>
                    </Button>
                  );
                })}
              </div>
            ))}
          </Space>

          <Divider style={{ margin: '12px 0' }} />

          <Button
            block
            icon={<UpOutlined />}
            size="small"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            回到顶部
          </Button>
        </Card>
      </Affix>
    </div>
  );
};

export default GradingDetailPage;
