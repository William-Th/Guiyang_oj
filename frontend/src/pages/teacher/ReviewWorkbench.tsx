import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Select,
  Input,
  Row,
  Col,
  Statistic,
  Radio,
  Divider,
  Empty,
  Spin,
  Tooltip,
  Descriptions,
} from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { questionReviewApi } from '../../services/api';
import { SUBJECTS } from '../../config/subjects';

const { TextArea } = Input;
const { Option } = Select;

interface Question {
  id: number;
  question_code?: string;
  type: string;
  subject: string;
  grade: string;
  level: string;
  content: string;
  options?: string[];
  correct_answer: any;
  suggested_score: number;
  difficulty: string;
  explanation?: string;
  abilities?: string[];
  knowledge_points?: string[];
  status: string;
  scope?: string[];
  target_scope?: string;
  created_by: number;
  creator_name?: string;
  submitted_at: string;
  submitted_by_name?: string;
  created_at: string;
  updated_at: string;
}

interface ReviewStats {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  approval_rate: number;
}

const ReviewWorkbench: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 筛选条件
  const [filters, setFilters] = useState({
    subject: '',
    grade: '',
    difficulty: '',
    target_scope: '',
  });

  // 统计信息
  const [stats, setStats] = useState<ReviewStats>({
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    approval_rate: 0,
  });

  useEffect(() => {
    loadPendingReviews();
  }, [filters]);

  const loadPendingReviews = async () => {
    try {
      setLoading(true);
      const response = await questionReviewApi.getPendingReviews();
      let questions = response.data || [];

      // 应用筛选条件
      if (filters.subject) {
        questions = questions.filter((q: Question) => q.subject === filters.subject);
      }
      if (filters.grade) {
        questions = questions.filter((q: Question) => q.grade === filters.grade);
      }
      if (filters.difficulty) {
        questions = questions.filter((q: Question) => q.difficulty === filters.difficulty);
      }
      if (filters.target_scope) {
        questions = questions.filter((q: Question) => q.target_scope === filters.target_scope);
      }

      setPendingQuestions(questions);

      // 计算统计信息
      setStats({
        pending_count: questions.length,
        approved_count: response.meta?.approved_count || 0,
        rejected_count: response.meta?.rejected_count || 0,
        approval_rate: response.meta?.approval_rate || 0,
      });
    } catch (error: any) {
      console.error('Load pending reviews error:', error);
      message.error(error.response?.data?.error || '加载待审核题目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (question: Question) => {
    setSelectedQuestion(question);
    setDetailModalVisible(true);
  };

  const handleReviewClick = (question: Question) => {
    setSelectedQuestion(question);
    setReviewStatus('approved');
    setReviewComment('');
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async () => {
    // 拒绝时必须填写审核意见，批准时可选
    if (reviewStatus === 'rejected' && !reviewComment.trim()) {
      message.warning('拒绝时必须填写审核意见');
      return;
    }

    try {
      setSubmitting(true);
      await questionReviewApi.reviewQuestion(
        selectedQuestion!.id,
        reviewStatus,
        reviewComment
      );
      message.success(`${reviewStatus === 'approved' ? '批准' : '拒绝'}成功`);
      setReviewModalVisible(false);
      loadPendingReviews();
    } catch (error: any) {
      message.error(error.response?.data?.error || '审核提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getQuestionTypeText = (type: string) => {
    const types: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      true_false: '判断题',
      blank: '填空题',
      essay: '问答题',
      code: '编程题',
      matching: '匹配题',
    };
    return types[type] || type;
  };

  const getLevelColor = (level: string) => {
    const levelNum = parseInt(level.replace('L', ''));
    if (levelNum <= 3) return 'green';
    if (levelNum <= 6) return 'blue';
    return 'red';
  };

  const renderAnswer = (question: Question) => {
    switch (question.type) {
      case 'single':
      case 'multiple':
        if (Array.isArray(question.correct_answer)) {
          return question.correct_answer.join(', ');
        }
        return question.correct_answer;
      case 'true_false':
        return question.correct_answer ? '正确' : '错误';
      case 'blank':
        if (Array.isArray(question.correct_answer)) {
          return question.correct_answer.map((ans: string, idx: number) =>
            `空${idx + 1}: ${ans}`
          ).join('; ');
        }
        return question.correct_answer;
      default:
        return question.correct_answer || '-';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'green',
      medium: 'orange',
      hard: 'red',
    };
    return colors[difficulty] || 'default';
  };

  const getDifficultyText = (difficulty: string) => {
    const texts: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    };
    return texts[difficulty] || difficulty;
  };

  const getScopeText = (scope?: string): { text: string; color: string } => {
    if (!scope) return { text: '-', color: 'default' };
    const scopes: Record<string, { text: string; color: string }> = {
      assessment: { text: '测评题库', color: 'orange' },
      practice_municipal: { text: '市级练习', color: 'blue' },
      practice_district: { text: '区级练习', color: 'cyan' },
    };
    return scopes[scope] || { text: scope, color: 'default' };
  };

  const columns = [
    {
      title: '题目编号',
      dataIndex: 'question_code',
      key: 'question_code',
      width: 150,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag color="blue">{getQuestionTypeText(type)}</Tag>,
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 80,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 100,
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty: string) => (
        <Tag color={getDifficultyColor(difficulty)}>
          {getDifficultyText(difficulty)}
        </Tag>
      ),
    },
    {
      title: '目标范围',
      dataIndex: 'target_scope',
      key: 'target_scope',
      width: 120,
      render: (scope?: string) => {
        const config = getScopeText(scope);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '提交人',
      dataIndex: 'submitted_by_name',
      key: 'submitted_by_name',
      width: 100,
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 160,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Question) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="审核">
            <Button
              type="primary"
              size="small"
              onClick={() => handleReviewClick(record)}
            >
              审核
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="审核工作台" style={{ marginBottom: 16 }}>
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic
              title="待审核"
              value={stats.pending_count}
              suffix="题"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已通过"
              value={stats.approved_count}
              suffix="题"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已拒绝"
              value={stats.rejected_count}
              suffix="题"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="通过率"
              value={stats.approval_rate}
              suffix="%"
              precision={1}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>

        <Divider />

        {/* 筛选条件 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              placeholder="科目"
              value={filters.subject || undefined}
              onChange={(value) => setFilters({ ...filters, subject: value || '' })}
              allowClear
              style={{ width: '100%' }}
            >
              {SUBJECTS.map((subject) => (
                <Option key={subject.value} value={subject.value}>
                  {subject.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="难度"
              value={filters.difficulty || undefined}
              onChange={(value) => setFilters({ ...filters, difficulty: value || '' })}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="easy">简单</Option>
              <Option value="medium">中等</Option>
              <Option value="hard">困难</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="目标范围"
              value={filters.target_scope || undefined}
              onChange={(value) => setFilters({ ...filters, target_scope: value || '' })}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="assessment">
                <Tag color="orange">测评题库</Tag>
              </Option>
              <Option value="practice_municipal">
                <Tag color="blue">市级练习</Tag>
              </Option>
              <Option value="practice_district">
                <Tag color="cyan">区级练习</Tag>
              </Option>
            </Select>
          </Col>
          <Col span={6}>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadPendingReviews}
              style={{ width: '100%' }}
            >
              刷新
            </Button>
          </Col>
        </Row>

        {/* 题目列表 */}
        <Spin spinning={loading}>
          {pendingQuestions.length === 0 && !loading ? (
            <Empty
              description="暂无待审核题目"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={pendingQuestions}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 道待审核题目`,
              }}
              scroll={{ x: 1400 }}
            />
          )}
        </Spin>
      </Card>

      {/* 题目详情模态框 */}
      <Modal
        title="题目详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="review"
            type="primary"
            onClick={() => {
              setDetailModalVisible(false);
              handleReviewClick(selectedQuestion!);
            }}
          >
            开始审核
          </Button>,
        ]}
        width={800}
      >
        {selectedQuestion && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>题目编号：</strong>{selectedQuestion.question_code}</p>
              </Col>
              <Col span={12}>
                <p><strong>题型：</strong>{getQuestionTypeText(selectedQuestion.type)}</p>
              </Col>
              <Col span={12}>
                <p><strong>科目：</strong>{selectedQuestion.subject}</p>
              </Col>
              <Col span={12}>
                <p><strong>年级：</strong>{selectedQuestion.grade}</p>
              </Col>
              <Col span={12}>
                <p><strong>难度：</strong>
                  <Tag color={getDifficultyColor(selectedQuestion.difficulty)}>
                    {getDifficultyText(selectedQuestion.difficulty)}
                  </Tag>
                </p>
              </Col>
              <Col span={12}>
                <p><strong>目标范围：</strong>
                  <Tag color={getScopeText(selectedQuestion.target_scope).color}>
                    {getScopeText(selectedQuestion.target_scope).text}
                  </Tag>
                </p>
              </Col>
            </Row>

            <Divider />

            <div style={{ marginBottom: 16 }}>
              <strong>题目内容：</strong>
              <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                {selectedQuestion.content}
              </div>
            </div>

            {selectedQuestion.options && selectedQuestion.options.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <strong>选项：</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedQuestion.options.map((option, index) => (
                    <div key={index} style={{ padding: '4px 0' }}>
                      {String.fromCharCode(65 + index)}. {option}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <strong>正确答案：</strong>
              <div style={{ marginTop: 8, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
                {Array.isArray(selectedQuestion.correct_answer)
                  ? selectedQuestion.correct_answer.join(', ')
                  : String(selectedQuestion.correct_answer)}
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* 审核模态框 - 完整版本 */}
      <Modal
        title="审核题目"
        open={reviewModalVisible}
        onOk={handleSubmitReview}
        onCancel={() => setReviewModalVisible(false)}
        confirmLoading={submitting}
        width={800}
        okText="提交审核"
        cancelText="取消"
      >
        {selectedQuestion && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="题目ID">
                {selectedQuestion.id}
              </Descriptions.Item>
              <Descriptions.Item label="题型">
                <Tag color="blue">{getQuestionTypeText(selectedQuestion.type)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="科目">
                {selectedQuestion.subject}
              </Descriptions.Item>
              <Descriptions.Item label="年级">
                {selectedQuestion.grade}
              </Descriptions.Item>
              <Descriptions.Item label="级别">
                <Tag color={getLevelColor(selectedQuestion.level)}>
                  {selectedQuestion.level}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="难度">
                <Tag color={getDifficultyColor(selectedQuestion.difficulty)}>
                  {getDifficultyText(selectedQuestion.difficulty)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="建议分值">
                {selectedQuestion.suggested_score} 分
              </Descriptions.Item>
              <Descriptions.Item label="题库范围">
                {selectedQuestion.scope?.map((s) => (
                  <Tag key={s} color="purple" style={{ marginBottom: 4 }}>
                    {getScopeText(s).text}
                  </Tag>
                ))}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <strong>题目内容：</strong>
              <div style={{
                marginTop: 8,
                padding: 12,
                background: '#f5f5f5',
                borderRadius: 4,
                whiteSpace: 'pre-wrap'
              }}>
                {selectedQuestion.content}
              </div>
            </div>

            {selectedQuestion.options && selectedQuestion.options.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>选项：</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedQuestion.options.map((option, index) => (
                    <div key={index} style={{ padding: '4px 0' }}>
                      {String.fromCharCode(65 + index)}. {option}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <strong>正确答案：</strong>
              <div style={{
                marginTop: 8,
                padding: 12,
                background: '#e6f7ff',
                borderRadius: 4
              }}>
                {renderAnswer(selectedQuestion)}
              </div>
            </div>

            {selectedQuestion.explanation && (
              <div style={{ marginTop: 16 }}>
                <strong>题目解析：</strong>
                <div style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#f5f5f5',
                  borderRadius: 4,
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedQuestion.explanation}
                </div>
              </div>
            )}

            {selectedQuestion.abilities && selectedQuestion.abilities.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>考察能力：</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedQuestion.abilities.map((ability, index) => (
                    <Tag key={index} color="geekblue" style={{ marginBottom: 4 }}>
                      {ability}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {selectedQuestion.knowledge_points && selectedQuestion.knowledge_points.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>知识点：</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedQuestion.knowledge_points.map((kp, index) => (
                    <Tag key={index} color="cyan" style={{ marginBottom: 4 }}>
                      {kp}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <span style={{ color: 'red' }}>* </span>
                  审核决定：
                </label>
                <Radio.Group
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                >
                  <Radio.Button value="approved">
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> 批准通过
                  </Radio.Button>
                  <Radio.Button value="rejected">
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> 拒绝
                  </Radio.Button>
                </Radio.Group>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  {reviewStatus === 'rejected' && <span style={{ color: 'red' }}>* </span>}
                  审核意见{reviewStatus === 'rejected' ? '（必填）' : '（可选）'}：
                </label>
                <TextArea
                  rows={4}
                  placeholder={
                    reviewStatus === 'approved'
                      ? '可填写审核意见，如：题目质量良好，同意发布'
                      : '请说明拒绝原因，如：题目内容不准确，需要修改'
                  }
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  maxLength={500}
                  showCount
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewWorkbench;
