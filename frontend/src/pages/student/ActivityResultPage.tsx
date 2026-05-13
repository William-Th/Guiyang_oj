import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Spin,
  Button,
  Typography,
  Divider,
  Tag,
  Progress,
  Space,
  Empty,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { activityApi } from '../../services/api';

const { Title, Text, Paragraph } = Typography;

interface AnswerResult {
  id: number;
  question_id: number;
  my_answer: string;
  score: number;
  is_correct?: boolean;
  grading_status: string;
  feedback?: string;
  question_code?: string;
  question_type: string;
  question_content: string;
  correct_answer?: string;
  max_score: number;
}

interface StudentActivityResult {
  id: number;
  status: string;
  grading_status: string;
  score: number;
  rank?: number;
  started_at: string;
  submit_time: string;
  attempt_number: number;
  activity_title: string;
  activity_type: string;
  activity_total_score: number;
}

interface Statistics {
  total_questions: number;
  answered_questions: number;
  auto_graded_questions: number;
  manual_graded_questions: number;
  pending_questions: number;
  correct_questions: number;
}

interface ApiResponse {
  success: boolean;
  can_show_answers: boolean;
  show_answers_reason: string;
  result_publish_time?: string;
  student_activity: StudentActivityResult;
  statistics: Statistics;
  answers: AnswerResult[];
}

/**
 * 学生活动结果页面
 *
 * 功能:
 * - 练习活动: 立即显示答案和解析
 * - 测评活动: 仅在result_publish_time之后显示答案
 * - 显示得分、排名、答题统计等
 */
const ActivityResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadResult(parseInt(id));
    }
  }, [id]);

  const loadResult = async (activityId: number) => {
    try {
      setLoading(true);
      const response = await activityApi.getActivityResult(activityId);
      setData(response as ApiResponse);
    } catch (err: any) {
      console.error('Load result error:', err);
      setError(err.response?.data?.message || '加载结果失败');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      blank: '填空题',
      fill_blank: '填空题',
      essay: '主观题',
      code: '编程题',
      true_false: '判断题',
      matching: '匹配题',
    };
    return typeMap[type] || type;
  };

  // 题型显示顺序（约定）
  const TYPE_ORDER = ['single', 'multiple', 'true_false', 'blank', 'fill_blank', 'matching', 'essay', 'code'];
  const CN_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  // 按题型分组答案，保持原始顺序作为组内排序
  const groupAnswersByType = (list: AnswerResult[]) => {
    const groups = new Map<string, AnswerResult[]>();
    list.forEach(a => {
      const t = a.question_type || 'unknown';
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t)!.push(a);
    });
    // 按预定义顺序排序
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ia = TYPE_ORDER.indexOf(a);
      const ib = TYPE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  };

  const renderAnswerStatus = (answer: AnswerResult) => {
    if (!data?.can_show_answers) {
      return null;
    }

    if (answer.is_correct === true) {
      return (
        <Tag color="success" icon={<CheckCircleOutlined />}>
          正确
        </Tag>
      );
    } else if (answer.is_correct === false) {
      return (
        <Tag color="error" icon={<CloseCircleOutlined />}>
          错误
        </Tag>
      );
    } else {
      return (
        <Tag color="default">
          待批改
        </Tag>
      );
    }
  };

  const renderCorrectAnswer = (answer: AnswerResult) => {
    if (!data?.can_show_answers) {
      return (
        <Alert
          message="答案尚未公布"
          description={
            data?.result_publish_time ? (
              <span>
                结果将在 <Text strong>{new Date(data.result_publish_time).toLocaleString('zh-CN')}</Text> 后公布
              </span>
            ) : (
              '请等待教师公布结果'
            )
          }
          type="info"
          showIcon
          icon={<ClockCircleOutlined />}
        />
      );
    }

    // For single/multiple choice, show options
    if (answer.question_type === 'single' || answer.question_type === 'multiple') {
      const correctOptions = answer.correct_answer || '';
      return (
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">正确答案：</Text>
          <Text strong style={{ marginLeft: 8, color: '#22c55e' }}>
            {correctOptions}
          </Text>
        </div>
      );
    }

    // For other question types
    return (
      <div style={{ marginTop: 12 }}>
        <Text type="secondary">参考答案：</Text>
        <Paragraph
          style={{
            marginLeft: 8,
            marginTop: 8,
            padding: 12,
            background: '#f0fdf4',
            borderRadius: 4,
          }}
        >
          {answer.correct_answer || '暂无参考答案'}
        </Paragraph>
      </div>
    );
  };

  const renderYourAnswer = (answer: AnswerResult) => {
    const myAnswer = answer.my_answer;

    if (answer.question_type === 'single' || answer.question_type === 'multiple') {
      return (
        <Text strong style={{ fontSize: 16 }}>
          {myAnswer || '未作答'}
        </Text>
      );
    }

    if (answer.question_type === 'essay' || answer.question_type === 'blank') {
      return (
        <Paragraph
          style={{
            padding: 12,
            background: '#f3f4f6',
            borderRadius: 4,
            minHeight: 60,
          }}
        >
          {myAnswer || '未作答'}
        </Paragraph>
      );
    }

    if (answer.question_type === 'code') {
      return (
        <pre
          style={{
            padding: 12,
            background: '#f3f4f6',
            borderRadius: 4,
            overflow: 'auto',
          }}
        >
          {myAnswer || '未作答'}
        </pre>
      );
    }

    return <Text>{myAnswer || '未作答'}</Text>;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载结果中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate(-1)}>
              返回
            </Button>
          }
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="暂无结果数据" />
      </div>
    );
  }

  const { student_activity, statistics, answers } = data;

  // Calculate percentage
  const scorePercentage = student_activity.activity_total_score > 0
    ? Math.round((student_activity.score / student_activity.activity_total_score) * 100)
    : 0;

  const isPassed = student_activity.score >= (data as any).pass_score;
  const correctRate = statistics.total_questions > 0
    ? Math.round((statistics.correct_questions / statistics.total_questions) * 100)
    : 0;

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              {student_activity.activity_title}
            </Title>
            <Space style={{ marginTop: 8 }}>
              <Tag color={student_activity.activity_type === 'practice' ? 'blue' : 'purple'}>
                {student_activity.activity_type === 'practice' ? '练习' : '测评'}
              </Tag>
              <Text type="secondary">
                第 {student_activity.attempt_number} 次尝试
              </Text>
            </Space>
          </Col>
          <Col>
            <Button onClick={() => navigate(-1)}>
              返回
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Warning if answers not published */}
      {!data.can_show_answers && (
        <Alert
          message="答案尚未公布"
          description={
            data.show_answers_reason === 'assessment_pending' && data.result_publish_time ? (
              <span>
                本次测评的结果将在 <Text strong>{new Date(data.result_publish_time).toLocaleString('zh-CN')}</Text> 后公布，
                请耐心等待。
              </span>
            ) : (
              '请等待教师公布结果。'
            )
          }
          type="info"
          showIcon
          icon={<ClockCircleOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Score Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总分"
              value={student_activity.score}
              suffix={`/ ${student_activity.activity_total_score}`}
              valueStyle={{ color: isPassed ? '#22c55e' : '#ef4444', fontSize: 28 }}
              prefix={<TrophyOutlined />}
            />
            <Progress
              percent={scorePercentage}
              status={isPassed ? 'success' : 'exception'}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="正确率"
              value={correctRate}
              suffix="%"
              valueStyle={{ color: correctRate >= 60 ? '#22c55e' : '#ef4444' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="答对题数"
              value={statistics.correct_questions}
              suffix={`/ ${statistics.total_questions}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="批改状态"
              value={
                statistics.pending_questions === 0
                  ? '已完成'
                  : `${statistics.auto_graded_questions + statistics.manual_graded_questions}/${statistics.total_questions}`
              }
              valueStyle={{
                color: statistics.pending_questions === 0 ? '#22c55e' : '#f59e0b',
                fontSize: 20
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Time Information */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Text type="secondary">开始时间：</Text>
            <br />
            <Text>{new Date(student_activity.started_at).toLocaleString('zh-CN')}</Text>
          </Col>
          <Col span={8}>
            <Text type="secondary">提交时间：</Text>
            <br />
            <Text>{new Date(student_activity.submit_time).toLocaleString('zh-CN')}</Text>
          </Col>
          <Col span={8}>
            <Text type="secondary">用时：</Text>
            <br />
            <Text>
              {Math.round(
                (new Date(student_activity.submit_time).getTime() -
                  new Date(student_activity.started_at).getTime()) /
                  1000 / 60
              )}{' '}
              分钟
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Answers Detail */}
      <Card
        title={<Title level={4} style={{ margin: 0 }}>答题详情</Title>}
        extra={
          !data.can_show_answers && (
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => loadResult(parseInt(id!))}
            >
              刷新
            </Button>
          )
        }
      >
        {!answers || answers.length === 0 ? (
          <Empty description="暂无答题记录，答案可能正在批改中或未正确保存" />
        ) : (
          groupAnswersByType(answers).map(([type, list], groupIndex) => {
            const typeName = getQuestionTypeName(type);
            const groupMaxScore = list.reduce((sum, a) => sum + (Number(a.max_score) || 0), 0);
            const groupEarnedScore = list.reduce((sum, a) => sum + (Number(a.score) || 0), 0);
            const cnNum = CN_NUMS[groupIndex] || String(groupIndex + 1);

            return (
              <div key={type} style={{ marginBottom: 24 }}>
                <Title level={5} style={{ marginBottom: 12 }}>
                  {cnNum}、{typeName}
                  <Text type="secondary" style={{ fontSize: 14, marginLeft: 12 }}>
                    （共 {list.length} 题，{groupMaxScore} 分
                    {data.can_show_answers ? `，得 ${groupEarnedScore} 分` : ''}）
                  </Text>
                </Title>
                {list.map((answer, idx) => (
                  <Card
                    key={answer.id}
                    type="inner"
                    style={{ marginBottom: 12 }}
                    title={
                      <Space>
                        <Text strong>{idx + 1}.</Text>
                        <Text type="secondary">{answer.max_score} 分</Text>
                        {data.can_show_answers && (
                          <>
                            {renderAnswerStatus(answer)}
                            {answer.score !== null && (
                              <Text type="secondary">
                                得分：{answer.score} / {answer.max_score}
                              </Text>
                            )}
                          </>
                        )}
                      </Space>
                    }
                  >
                    <div style={{ marginBottom: 16 }}>
                      <Paragraph style={{ fontSize: 16, marginBottom: 8 }}>
                        {answer.question_content}
                      </Paragraph>
                    </div>

                    <Divider orientation="left" style={{ margin: '12px 0' }}>
                      你的答案
                    </Divider>
                    {renderYourAnswer(answer)}

                    {data.can_show_answers && answer.feedback && (
                      <div style={{ marginTop: 12 }}>
                        <Text type="secondary">评语：</Text>
                        <Paragraph style={{ marginTop: 8, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
                          {answer.feedback}
                        </Paragraph>
                      </div>
                    )}

                    <Divider orientation="left" style={{ margin: '12px 0' }}>
                      {data.can_show_answers ? '正确答案' : '答案公布'}
                    </Divider>
                    {renderCorrectAnswer(answer)}
                  </Card>
                ))}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
};

export default ActivityResultPage;
