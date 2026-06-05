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
  Image,
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
  question_options?: string[] | null;
  correct_answer?: string;
  question_explanation?: string | null;
  question_image_url?: string | null;
  question_difficulty?: string | null;
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
 * - 按题型分组展示完整题目（含选项）
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

  // 解析 my_answer 字段（可能是 JSON 字符串如 "\"B\"" 或普通文本）
  const parseAnswer = (raw: string | null | undefined): string => {
    if (!raw) return '未作答';
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' ? parsed : raw;
    } catch {
      return raw;
    }
  };

  // 解析 correct_answer 字段（可能是 JSON 字符串）
  const parseCorrectAnswer = (raw: string | null | undefined): string => {
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' ? parsed : raw;
    } catch {
      return raw;
    }
  };

  // 解析选项列表
  const parseOptions = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
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

  // 题型显示顺序
  const TYPE_ORDER = ['single', 'multiple', 'true_false', 'blank', 'fill_blank', 'matching', 'essay', 'code'];
  const CN_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  // 按题型分组答案
  const groupAnswersByType = (list: AnswerResult[]) => {
    const groups = new Map<string, AnswerResult[]>();
    list.forEach(a => {
      const t = a.question_type || 'unknown';
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t)!.push(a);
    });
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
      return <Tag color="success" icon={<CheckCircleOutlined />}>正确</Tag>;
    } else if (answer.is_correct === false) {
      return <Tag color="error" icon={<CloseCircleOutlined />}>错误</Tag>;
    } else {
      return <Tag color="default">待批改</Tag>;
    }
  };

  // 渲染选项列表（选择题）
  const renderOptions = (answer: AnswerResult) => {
    const options = parseOptions(answer.question_options);
    if (options.length === 0) return null;

    const myAns = parseAnswer(answer.my_answer);
    const correctAns = data?.can_show_answers ? parseCorrectAnswer(answer.correct_answer) : '';
    // 支持多选答案如 "A,B" 或 "AB"
    const myAnsLetters = myAns.replace(/[,，\s]/g, '').split('');
    const correctAnsLetters = correctAns.replace(/[,，\s]/g, '').split('');

    return (
      <div style={{ marginTop: 8 }}>
        {options.map((opt: string, idx: number) => {
          // 提取选项字母（如 "A. xxx" → "A"）
          const letterMatch = opt.match(/^([A-Za-z])[.、．)\s]/);
          const letter = letterMatch ? letterMatch[1].toUpperCase() : String.fromCharCode(65 + idx);

          const isMyAnswer = myAnsLetters.includes(letter);
          const isCorrect = correctAnsLetters.includes(letter);
          const isWrong = isMyAnswer && !isCorrect && data?.can_show_answers;

          let bg = '#fff';
          let border = '1px solid #e5e7eb';
          let fontWeight = 'normal';

          if (data?.can_show_answers && isCorrect) {
            bg = '#f0fdf4';
            border = '1px solid #86efac';
            fontWeight = 'bold';
          }
          if (isWrong) {
            bg = '#fef2f2';
            border = '1px solid #fca5a5';
          }
          if (!data?.can_show_answers && isMyAnswer) {
            bg = '#f0fdf4';
            border = '1px solid #86efac';
            fontWeight = 'bold';
          }

          return (
            <div
              key={idx}
              style={{
                padding: '8px 12px',
                marginBottom: 4,
                background: bg,
                border,
                borderRadius: 6,
                fontWeight,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ minWidth: 20, textAlign: 'center' }}>{letter}.</span>
              <span>{opt.replace(/^[A-Za-z][.、．)\s]+/, '')}</span>
              {isMyAnswer && (
                <Tag color={data?.can_show_answers ? (isCorrect ? 'success' : 'error') : 'blue'} style={{ marginLeft: 'auto' }}>
                  你的选择
                </Tag>
              )}
              {data?.can_show_answers && isCorrect && !isMyAnswer && (
                <Tag color="success" style={{ marginLeft: 'auto' }}>正确答案</Tag>
              )}
              {data?.can_show_answers && isCorrect && isMyAnswer && (
                <Tag color="success" style={{ marginLeft: 'auto' }}>✓</Tag>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderYourAnswer = (answer: AnswerResult) => {
    const myAns = parseAnswer(answer.my_answer);
    const isChoiceType = ['single', 'multiple', 'true_false'].includes(answer.question_type);

    // 选择题：直接显示在选项中标记，不需要额外文本
    if (isChoiceType) {
      return <Text type="secondary">已选择：{myAns}</Text>;
    }

    if (answer.question_type === 'essay' || answer.question_type === 'blank' || answer.question_type === 'fill_blank') {
      return (
        <Paragraph
          style={{
            padding: 12,
            background: '#f9fafb',
            borderRadius: 4,
            minHeight: 40,
            whiteSpace: 'pre-wrap',
          }}
        >
          {myAns}
        </Paragraph>
      );
    }

    if (answer.question_type === 'code') {
      return (
        <pre
          style={{
            padding: 12,
            background: '#f9fafb',
            borderRadius: 4,
            overflow: 'auto',
            fontSize: 13,
          }}
        >
          {myAns}
        </pre>
      );
    }

    return <Text>{myAns}</Text>;
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

    const correctAns = parseCorrectAnswer(answer.correct_answer);
    const isChoiceType = ['single', 'multiple', 'true_false'].includes(answer.question_type);

    // 选择题的正确答案已在选项中标注
    if (isChoiceType) {
      if (correctAns) {
        return <Text type="secondary">正确答案：<Text strong style={{ color: '#16a34a' }}>{correctAns}</Text></Text>;
      }
      return null;
    }

    // 填空/主观题
    return (
      <div style={{ marginTop: 4 }}>
        <Text type="secondary">参考答案：</Text>
        <Paragraph
          style={{
            marginTop: 8,
            padding: 12,
            background: '#f0fdf4',
            borderRadius: 4,
            whiteSpace: 'pre-wrap',
          }}
        >
          {correctAns || '暂无参考答案'}
        </Paragraph>
      </div>
    );
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

  const scorePercentage = student_activity.activity_total_score > 0
    ? Math.round((student_activity.score / student_activity.activity_total_score) * 100)
    : 0;

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
              value={Number(student_activity.score)}
              suffix={`/ ${student_activity.activity_total_score}`}
              valueStyle={{ color: Number(student_activity.score) >= 60 ? '#52c41a' : '#ff4d4f', fontSize: 28 }}
              prefix={<TrophyOutlined />}
            />
            <Progress
              percent={scorePercentage}
              status={Number(student_activity.score) >= 60 ? 'success' : 'exception'}
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
              valueStyle={{ color: correctRate >= 60 ? '#52c41a' : '#ff4d4f' }}
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
                color: statistics.pending_questions === 0 ? '#52c41a' : '#faad14',
                fontSize: 20,
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
            <Text>{student_activity.started_at ? new Date(student_activity.started_at).toLocaleString('zh-CN') : '-'}</Text>
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
              {student_activity.started_at && student_activity.submit_time
                ? `${Math.round(
                    (new Date(student_activity.submit_time).getTime() -
                      new Date(student_activity.started_at).getTime()) /
                      1000 / 60
                  )} 分钟`
                : '-'}
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
                        <Tag>{getQuestionTypeName(answer.question_type)}</Tag>
                        <Text type="secondary">{answer.max_score} 分</Text>
                        {data.can_show_answers && (
                          <>
                            {renderAnswerStatus(answer)}
                            {answer.score !== null && (
                              <Text type="secondary">
                                得分：{Number(answer.score).toFixed(1)} / {answer.max_score}
                              </Text>
                            )}
                          </>
                        )}
                      </Space>
                    }
                  >
                    {/* 题目图片 */}
                    {answer.question_image_url && (
                      <div style={{ marginBottom: 8 }}>
                        <Image
                          src={answer.question_image_url}
                          alt="题目图片"
                          style={{ maxWidth: '100%', maxHeight: 300 }}
                        />
                      </div>
                    )}

                    {/* 题干 */}
                    <div style={{ marginBottom: 12 }}>
                      <Paragraph style={{ fontSize: 16, marginBottom: 0 }}>
                        {answer.question_content}
                      </Paragraph>
                    </div>

                    {/* 选项（选择题/判断题） */}
                    {renderOptions(answer)}

                    <Divider orientation="left" style={{ margin: '12px 0' }}>
                      你的答案
                    </Divider>
                    {renderYourAnswer(answer)}

                    {data.can_show_answers && answer.feedback && (
                      <div style={{ marginTop: 12 }}>
                        <Text type="secondary">评语：</Text>
                        <Paragraph style={{ marginTop: 8, padding: 12, background: '#f0fdf4', borderRadius: 4 }}>
                          {answer.feedback}
                        </Paragraph>
                      </div>
                    )}

                    <Divider orientation="left" style={{ margin: '12px 0' }}>
                      {data.can_show_answers ? '正确答案与解析' : '答案公布'}
                    </Divider>
                    {renderCorrectAnswer(answer)}

                    {/* 解析 */}
                    {data.can_show_answers && answer.question_explanation && (
                      <div style={{ marginTop: 12, padding: 12, background: '#fffbeb', borderRadius: 4 }}>
                        <Text type="secondary" strong>解析：</Text>
                        <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                          {answer.question_explanation}
                        </Paragraph>
                      </div>
                    )}
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
