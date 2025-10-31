import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Tooltip,
  Empty,
  Spin,
  Timeline,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { questionReviewApi } from '../../services/api';

interface Question {
  id: number;
  type: string;
  subject: string;
  grade: string;
  level: string;
  content: string;
  suggested_score: number;
  difficulty: string;
  status: string;
  reviewer_name?: string;
  review_comment?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  scope?: string[];
}

interface ReviewHistory {
  id: number;
  reviewer_id: number;
  reviewer_name: string;
  status: string;
  comment: string;
  reviewed_at: string;
  created_at: string;
}

const MySubmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Question[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await questionReviewApi.getMySubmissions();
      setSubmissions(response.data || []);
    } catch (error: any) {
      console.error('Load submissions error:', error);
      message.error(error.response?.data?.error || '加载提交列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (question: Question) => {
    setSelectedQuestion(question);
    setHistoryModalVisible(true);

    try {
      setLoadingHistory(true);
      const response = await questionReviewApi.getReviewHistory(question.id);
      setReviewHistory(response.data || []);
    } catch (error: any) {
      message.error('加载审核历史失败');
      setReviewHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditRejected = (question: Question) => {
    if (question.status === 'rejected') {
      navigate(`/teacher/question-bank/edit/${question.id}`);
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

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; text: string }> = {
      pending_review: {
        color: 'processing',
        icon: <ClockCircleOutlined />,
        text: '待审核',
      },
      approved: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: '已批准',
      },
      rejected: {
        color: 'error',
        icon: <CloseCircleOutlined />,
        text: '已拒绝',
      },
      published: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: '已发布',
      },
    };

    const config = statusConfig[status] || { color: 'default', icon: null, text: status };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
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
      title: '题库范围',
      dataIndex: 'scope',
      key: 'scope',
      width: 150,
      render: (scope: string[]) => (
        <div>
          {scope?.map((s) => (
            <Tag key={s} color="purple" style={{ marginBottom: 4 }}>
              {getScopeText(s)}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: '审核状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '审核人',
      dataIndex: 'reviewer_name',
      key: 'reviewer_name',
      width: 100,
      render: (text: string) => text || '-',
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
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: Question) => (
        <Space size="small">
          <Tooltip title="查看审核历史">
            <Button
              type="link"
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => handleViewHistory(record)}
            />
          </Tooltip>
          {record.status === 'rejected' && (
            <Tooltip title="修改并重新提交">
              <Button
                type="link"
                size="small"
                onClick={() => handleEditRejected(record)}
              >
                修改
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="我的提交"
        extra={
          <Button
            type="primary"
            onClick={() => navigate('/teacher/question-bank/drafts')}
          >
            返回草稿箱
          </Button>
        }
      >
        <Spin spinning={loading}>
          {submissions.length === 0 && !loading ? (
            <Empty
              description="暂无提交记录"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                onClick={() => navigate('/teacher/question-bank/drafts')}
              >
                去草稿箱提交题目
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={submissions}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条提交记录`,
              }}
              scroll={{ x: 1400 }}
            />
          )}
        </Spin>
      </Card>

      {/* Review History Modal */}
      <Modal
        title={`审核历史 - 题目 #${selectedQuestion?.id}`}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        <Spin spinning={loadingHistory}>
          {selectedQuestion && (
            <div>
              <div style={{
                padding: 12,
                background: '#f5f5f5',
                borderRadius: 4,
                marginBottom: 24
              }}>
                <p style={{ margin: 0 }}>
                  <strong>题目内容：</strong>
                  {selectedQuestion.content.substring(0, 100)}
                  {selectedQuestion.content.length > 100 && '...'}
                </p>
                <p style={{ margin: '8px 0 0 0' }}>
                  <strong>当前状态：</strong>
                  {getStatusTag(selectedQuestion.status)}
                </p>
              </div>

              {reviewHistory.length === 0 && !loadingHistory ? (
                <Empty description="暂无审核记录" />
              ) : (
                <Timeline mode="left">
                  {reviewHistory.map((history) => {
                    const isApproved = history.status === 'approved';
                    return (
                      <Timeline.Item
                        key={history.id}
                        color={isApproved ? 'green' : 'red'}
                        dot={
                          isApproved ? (
                            <CheckCircleOutlined style={{ fontSize: 16 }} />
                          ) : (
                            <CloseCircleOutlined style={{ fontSize: 16 }} />
                          )
                        }
                      >
                        <div>
                          <div style={{ marginBottom: 8 }}>
                            <Tag color={isApproved ? 'success' : 'error'}>
                              {isApproved ? '批准通过' : '拒绝'}
                            </Tag>
                            <span style={{ color: '#666', marginLeft: 8 }}>
                              {new Date(history.reviewed_at).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong>审核人：</strong>
                            {history.reviewer_name}
                          </div>
                          <div style={{
                            padding: 12,
                            background: isApproved ? '#f6ffed' : '#fff2f0',
                            border: `1px solid ${isApproved ? '#b7eb8f' : '#ffccc7'}`,
                            borderRadius: 4,
                            whiteSpace: 'pre-wrap'
                          }}>
                            <strong>审核意见：</strong>
                            <div style={{ marginTop: 4 }}>
                              {history.comment}
                            </div>
                          </div>
                        </div>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              )}
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default MySubmissionsPage;
