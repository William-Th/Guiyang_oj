import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  message,
  Input,
  Radio,
  Tooltip,
  Empty,
  Spin,
  Descriptions,
} from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { questionReviewApi } from '../../services/api';

const { TextArea } = Input;

interface Question {
  id: number;
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
  created_by: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  scope?: string[];
}

const ReviewPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<Question[]>([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPendingReviews();
  }, []);

  const loadPendingReviews = async () => {
    try {
      setLoading(true);
      const response = await questionReviewApi.getPendingReviews();
      setPendingReviews(response.data || []);
    } catch (error: any) {
      console.error('Load pending reviews error:', error);
      message.error(error.response?.data?.error || '加载待审核列表失败');
    } finally {
      setLoading(false);
    }
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
      blank: '填空题',
      true_false: '判断题',
      essay: '问答题',
      code: '编程题',
      matching: '匹配题',
    };
    return types[type] || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'green',
      medium: 'orange',
      hard: 'red',
    };
    return colors[difficulty] || 'default';
  };

  const getLevelColor = (level: string) => {
    const levelNum = parseInt(level.replace('L', ''));
    if (levelNum <= 3) return 'green';
    if (levelNum <= 6) return 'blue';
    return 'red';
  };

  const getScopeText = (scope: string) => {
    const scopes: Record<string, string> = {
      practice: '练习题库',
      assessment: '测评题库',
      competition: '竞赛题库',
    };
    return scopes[scope] || scope;
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

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (type: string) => (
        <Tag color="blue">{getQuestionTypeText(type)}</Tag>
      ),
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
      width: 80,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => (
        <Tag color={getLevelColor(level)}>{level}</Tag>
      ),
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text.length > 50 ? text.substring(0, 50) + '...' : text}</span>
        </Tooltip>
      ),
    },
    {
      title: '建议分值',
      dataIndex: 'suggested_score',
      key: 'suggested_score',
      width: 90,
    },
    {
      title: '创建人',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 100,
    },
    {
      title: '提交时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: Question) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleReviewClick(record)}
        >
          审核
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card title="待我审核">
        <Spin spinning={loading}>
          {pendingReviews.length === 0 && !loading ? (
            <Empty
              description="暂无待审核题目"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={pendingReviews}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 道待审核题目`,
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </Spin>
      </Card>

      {/* Review Modal */}
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
                  {selectedQuestion.difficulty}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="建议分值">
                {selectedQuestion.suggested_score} 分
              </Descriptions.Item>
              <Descriptions.Item label="题库范围">
                {selectedQuestion.scope?.map((s) => (
                  <Tag key={s} color="purple" style={{ marginBottom: 4 }}>
                    {getScopeText(s)}
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

export default ReviewPage;
