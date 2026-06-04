import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Input,
  Button,
  Space,
  message,
  Spin,
  Descriptions,
  Tag,
  Divider,
  Typography,
  Alert,
  Row,
  Col,
  Progress,
  Affix,
  Tooltip,
  Modal,
} from 'antd';
import {
  SaveOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { gradingApi } from '../../services/api';
import { ApiError, GradingQuestion } from '../../types';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

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
    options?: Record<string, string>;
    correct_answer?: string | string[];
    explanation?: string | null;
    score: number;
    difficulty?: string | null;
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

  // Scroll to specific question
  const scrollToQuestion = (index: number) => {
    const questionId = detail?.questions[index]?.id;
    if (questionId && questionRefs.current[questionId]) {
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
          Modal.confirm({
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

  const renderAnswer = (answer: GradingDetailResponse['answers'][0]) => {
    return (
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {Array.isArray(answer.answer) ? answer.answer.join(', ') : String(answer.answer || '')}
      </div>
    );
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
      <div style={{ flex: 1 }}>
        <Card
          title={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>评卷详情</div>
              <Progress
                percent={progressPercent}
                status={pendingCount === 0 ? 'success' : 'active'}
                format={(percent) => `${gradedCount} / ${detail.answers.length} (${percent}%)`}
              />
            </Space>
          }
          extra={
            <Space>
              <Tooltip title="快捷键: N=下一题, P=上一题, S=保存">
                <Button size="small" type="text">快捷键提示</Button>
              </Tooltip>
              <Button onClick={() => navigate(-1)}>返回</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => handleBatchSave()}
                loading={saving}
              >
                保存所有评分 (S)
              </Button>
              <Button
                type="primary"
                danger
                icon={<CheckCircleOutlined />}
                onClick={() => handleCompleteGrading()}
                loading={saving}
                disabled={pendingCount > 0}
              >
                完成评卷
              </Button>
            </Space>
          }
        >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="学生姓名">{detail.student.real_name}</Descriptions.Item>
          <Descriptions.Item label="学号">{detail.student.username}</Descriptions.Item>
          <Descriptions.Item label="活动名称">{detail.activity.title}</Descriptions.Item>
          <Descriptions.Item label="科目/年级">
            {detail.activity.subject} / {detail.activity.grade}
          </Descriptions.Item>
          <Descriptions.Item label="提交时间">
            {new Date(detail.student_activity.submit_time).toLocaleString('zh-CN')}
          </Descriptions.Item>
          <Descriptions.Item label="评卷进度">
            <Tag color={pendingCount === 0 ? 'green' : 'orange'}>
              {gradedCount} / {detail.answers.length} 已评
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="总分">{detail.activity.total_score}</Descriptions.Item>
          <Descriptions.Item label="当前得分">
            <Text strong style={{ fontSize: '16px', color: '#16a34a' }}>
              {detail.student_activity.score || 0}
            </Text>
          </Descriptions.Item>
        </Descriptions>

        {pendingCount > 0 && (
          <Alert
            message={`还有 ${pendingCount} 道题目待评分`}
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {computeGroupedQuestions().map((group, groupIndex) => {
          const cnNum = CN_NUMS[groupIndex] || String(groupIndex + 1);
          return (
            <div key={group.type} style={{ marginBottom: 24 }}>
              <div style={{
                padding: '10px 14px',
                background: '#fafafa',
                borderLeft: '3px solid #16a34a',
                marginBottom: 12,
                borderRadius: 4
              }}>
                <Title level={5} style={{ margin: 0 }}>
                  {cnNum}、{group.typeName}
                  <Text type="secondary" style={{ fontSize: 14, marginLeft: 12, fontWeight: 'normal' }}>
                    （{group.items.length} 题 · {group.totalScore} 分 ·
                    已评 {group.gradedCount}/{group.items.length}
                    {group.earnedScore > 0 ? ` · 得 ${group.earnedScore} 分` : ''}）
                  </Text>
                </Title>
              </div>
              {group.items.map(({ question, answer, globalIndex }, idx) => {
                const isSubjective = ['short_answer', 'essay', 'coding', 'programming'].includes(question.type);
                const needsManualGrading = answer.grading_status === 'pending' || isSubjective;

                return (
                  <Card
                    key={question.id}
                    id={`question-${question.id}`}
                    ref={(el) => (questionRefs.current[question.id] = el)}
                    style={{ marginBottom: 16 }}
                    title={
                      <Space size="large">
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#16a34a' }}>
                          {idx + 1}.
                        </div>
                        <Tag color="green" style={{ fontSize: 14 }}>
                          满分: {question.score} 分
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
                      <Paragraph>{question.content}</Paragraph>

                      {question.options && (
                        <div>
                          {Object.entries(question.options).map(([key, value]) => (
                            <div key={key}>
                              {key}. {value}
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
                        {renderAnswer(answer)}
                      </div>
                    </div>

                    {!needsManualGrading && answer.is_correct !== null && (
                      <Alert
                        message={answer.is_correct ? '回答正确' : '回答错误'}
                        type={answer.is_correct ? 'success' : 'error'}
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}

                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item
                          label="得分"
                          name={`score_${answer.id}`}
                          rules={[
                            { required: true, message: '请输入得分' },
                            { type: 'number', min: 0, max: question.score, message: `得分范围: 0-${question.score}` },
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
                      <Col span={18}>
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
