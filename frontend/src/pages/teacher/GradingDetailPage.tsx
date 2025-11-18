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

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

interface Answer {
  id: number;
  question_id: number;
  answer: any;
  score: number | null;
  auto_score: number | null;
  manual_score: number | null;
  is_correct: boolean | null;
  grading_status: string;
  feedback: string | null;
}

interface Question {
  id: number;
  type: string;
  content: string;
  options: any;
  correct_answer: any;
  explanation: string | null;
  score: number;
  difficulty: string | null;
}

interface StudentActivityDetail {
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
  answers: Answer[];
  questions: Question[];
}

const GradingDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<StudentActivityDetail | null>(null);
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

  const loadGradingDetail = async () => {
    try {
      setLoading(true);
      const response = await gradingApi.getStudentActivityForGrading(studentActivityId!);
      setDetail(response);

      // Set initial form values
      const formValues: any = {};
      response.answers.forEach((answer: Answer) => {
        formValues[`score_${answer.id}`] = answer.manual_score || answer.auto_score || 0;
        formValues[`feedback_${answer.id}`] = answer.feedback || '';
      });
      form.setFieldsValue(formValues);
    } catch (error: any) {
      console.error('Load grading detail error:', error);
      message.error(error.response?.data?.message || '加载评卷详情失败');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrade = async (answerId: number) => {
    try {
      const values = form.getFieldsValue();
      const score = values[`score_${answerId}`];
      const feedback = values[`feedback_${answerId}`];

      await gradingApi.gradeAnswer(answerId, { score, feedback });
      message.success('评分保存成功');

      // Reload to get updated status
      await loadGradingDetail();
    } catch (error: any) {
      console.error('Save grade error:', error);
      message.error(error.response?.data?.message || '保存评分失败');
    }
  };

  const handleBatchSave = async () => {
    try {
      setSaving(true);
      const values = form.getFieldsValue();
      const answers = detail!.answers.map((answer) => ({
        answerId: answer.id,
        score: values[`score_${answer.id}`],
        feedback: values[`feedback_${answer.id}`],
      }));

      await gradingApi.batchGradeAnswers(answers);
      message.success('批量保存成功');

      // Reload to get updated status
      await loadGradingDetail();
    } catch (error: any) {
      console.error('Batch save error:', error);
      message.error(error.response?.data?.message || '批量保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteGrading = async () => {
    try {
      setSaving(true);
      await handleBatchSave(); // Save first
      await gradingApi.completeGrading(studentActivityId!);
      message.success('评卷完成！');
      navigate('/teacher/grading');
    } catch (error: any) {
      console.error('Complete grading error:', error);
      message.error(error.response?.data?.message || '完成评卷失败');
      setSaving(false);
    }
  };

  const renderAnswer = (answer: Answer) => {
    return (
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer}
      </div>
    );
  };

  const getQuestionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      fill_blank: '填空题',
      short_answer: '简答题',
      essay: '论述题',
      coding: '编程题',
      programming: '编程题',
      true_false: '判断题',
      blank: '填空题',
    };
    return typeMap[type] || type;
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
                onClick={handleBatchSave}
                loading={saving}
              >
                保存所有评分 (S)
              </Button>
              <Button
                type="primary"
                danger
                icon={<CheckCircleOutlined />}
                onClick={handleCompleteGrading}
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
            <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
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
        {detail.questions.map((question, index) => {
          const answer = detail.answers.find(a => a.question_id === question.id);
          if (!answer) return null;

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
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                    第 {index + 1} 题
                  </div>
                  <Tag color="cyan" style={{ fontSize: 14 }}>
                    {getQuestionTypeLabel(question.type)}
                  </Tag>
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
                    onClick={() => scrollToQuestion(index - 1)}
                    disabled={index === 0}
                  >
                    上一题 (P)
                  </Button>
                  <Button
                    size="small"
                    icon={<ArrowRightOutlined />}
                    onClick={() => scrollToQuestion(index + 1)}
                    disabled={index === detail.questions.length - 1}
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
                        {key}. {String(value)}
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
            {detail.questions.map((question, index) => {
              const answer = detail.answers.find(a => a.question_id === question.id);
              const isGraded = answer?.grading_status !== 'pending';

              return (
                <Button
                  key={question.id}
                  size="small"
                  type={currentQuestionIndex === index ? 'primary' : 'default'}
                  block
                  onClick={() => scrollToQuestion(index)}
                  style={{
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                  }}
                  icon={isGraded ? <CheckCircleOutlined /> : null}
                >
                  第 {index + 1} 题
                  <span style={{ marginLeft: 'auto', fontSize: 12 }}>
                    {question.score}分
                  </span>
                </Button>
              );
            })}
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
