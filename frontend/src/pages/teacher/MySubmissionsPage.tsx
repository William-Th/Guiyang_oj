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
  Select,
  Alert,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  SendOutlined,
  CopyOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { questionReviewApi, questionBankApi } from '../../services/api';
import { buildDistrictScope, getDistrictById } from '../../config/districts';

interface Question {
  id: number;
  submission_id: number;
  draft_id: number;
  type: string;
  subject: string;
  grade: string;
  level: string;
  content: string;
  suggested_score: number;
  difficulty: string;
  status: string;
  status_text?: string;
  status_color?: string;
  reviewer_name?: string;
  review_comment?: string;
  reviewed_at?: string;
  submitted_at?: string;
  created_at: string;
  scope?: string;
  scope_text?: string;
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

interface Reviewer {
  id: number;
  username: string;
  real_name: string;
  subjects: string[];
}

const MySubmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Question[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 重新提交审核相关状态
  const [resubmitModalVisible, setResubmitModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Question | null>(null);
  const [availableReviewers, setAvailableReviewers] = useState<Reviewer[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<number | null>(null);
  const [selectedScope, setSelectedScope] = useState<string>('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // 自动获取用户所属区域代码
  const getUserDistrictCode = (): string | null => {
    if (!user?.districtId) return null;
    const district = getDistrictById(user.districtId);
    return district?.code || null;
  };

  // 监听scope变化，动态加载对应的审核人列表
  useEffect(() => {
    const loadReviewersForScope = async () => {
      if (!selectedSubmission || !selectedScope) {
        setAvailableReviewers([]);
        setSelectedReviewer(null);
        return;
      }

      // 如果选择了区级题库但未选择具体区域，不加载审核人
      if (selectedScope === 'practice_district' && !selectedDistrictCode) {
        setAvailableReviewers([]);
        setSelectedReviewer(null);
        return;
      }

      // 构造完整的scope字符串
      let finalScope = selectedScope;
      if (selectedScope === 'practice_district' && selectedDistrictCode) {
        finalScope = buildDistrictScope(selectedDistrictCode);
      }

      try {
        const response = await questionReviewApi.getAvailableReviewers(
          selectedSubmission.subject,
          finalScope
        );
        setAvailableReviewers(response.data || []);
        setSelectedReviewer(null);
      } catch (error: any) {
        console.error('Load reviewers error:', error);
        setAvailableReviewers([]);
      }
    };

    loadReviewersForScope();
  }, [selectedScope, selectedDistrictCode, selectedSubmission]);

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
      // 使用 submission_id 而不是 id，因为 id 字段存储的是 draft_id
      const response = await questionReviewApi.getReviewHistory(question.submission_id);
      setReviewHistory(response.data || []);
    } catch (error: any) {
      message.error('加载审核历史失败');
      setReviewHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditRejected = (question: Question) => {
    if (question.status === 'inactive' || question.status === 'rejected') {
      navigate(`/teacher/question-bank/edit/${question.draft_id}`);
    }
  };

  // 打开重新提交模态框
  const handleResubmitClick = (submission: Question) => {
    setSelectedSubmission(submission);
    const scope = submission.scope || 'assessment';
    setSelectedScope(scope.startsWith('practice_district_') ? 'practice_district' : scope);
    // 如果是区级练习题库，提取区域代码
    if (scope.startsWith('practice_district_')) {
      const districtCode = scope.replace('practice_district_', '');
      setSelectedDistrictCode(districtCode);
    } else {
      setSelectedDistrictCode('');
    }
    setResubmitModalVisible(true);
  };

  // 处理重新提交
  const handleResubmit = async () => {
    if (!selectedReviewer || !selectedScope || !selectedSubmission) {
      message.warning('请选择审核人');
      return;
    }

    if (selectedScope === 'practice_district' && !selectedDistrictCode) {
      message.error('无法获取区域信息，请联系管理员');
      return;
    }

    // 构造完整的scope字符串
    let finalScope = selectedScope;
    if (selectedScope === 'practice_district' && selectedDistrictCode) {
      finalScope = buildDistrictScope(selectedDistrictCode);
    }

    try {
      setSubmitting(true);
      await questionReviewApi.submitForReview(
        selectedSubmission.draft_id,
        selectedReviewer,
        finalScope
      );
      message.success('重新提交审核成功');
      setResubmitModalVisible(false);
      // 刷新提交列表
      loadSubmissions();
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 格式化scope显示文本
  const getScopeDisplayText = (scope: string) => {
    if (scope === 'assessment') return '测评题库';
    if (scope === 'practice_municipal') return '市级练习题库';
    if (scope === 'practice_district') return '区级练习题库';
    if (scope === 'practice_school') return '校级题库';
    if (scope.startsWith('practice_district_')) {
      const districtCode = scope.replace('practice_district_', '');
      const district = getDistrictById(parseInt(districtCode));
      return district ? `区级练习-${district.name}` : `区级练习-${districtCode}`;
    }
    return scope;
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

  const getStatusTag = (record: Question) => {
    // 使用后端提供的格式化状态文本和颜色
    if (record.status_text) {
      let icon = null;
      if (record.status === 'pending_review') {
        icon = <ClockCircleOutlined />;
      } else if (record.status === 'published' || record.status === 'approved') {
        icon = <CheckCircleOutlined />;
      } else if (record.status === 'inactive' || record.status === 'rejected') {
        icon = <CloseCircleOutlined />;
      }
      return (
        <Tag color={record.status_color || 'default'} icon={icon}>
          {record.status_text}
        </Tag>
      );
    }

    // 备用逻辑
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
      inactive: {
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

    const config = statusConfig[record.status] || { color: 'default', icon: null, text: record.status };
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
      dataIndex: 'scope_text',
      key: 'scope_text',
      width: 150,
      render: (scopeText: string) => (
        <Tag color="purple">{scopeText || '-'}</Tag>
      ),
    },
    {
      title: '审核状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_: any, record: Question) => getStatusTag(record),
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
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 160,
      render: (text: string) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
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
          {(record.status === 'inactive' || record.status === 'rejected') && (
            <>
              <Tooltip title="修改题目内容">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEditRejected(record)}
                >
                  修改
                </Button>
              </Tooltip>
              <Tooltip title="重新提交审核">
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => handleResubmitClick(record)}
                >
                  重新提交
                </Button>
              </Tooltip>
            </>
          )}
          {record.status === 'published' && (
            <Tooltip title="克隆题目创建新版本">
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                onClick={async () => {
                  try {
                    const response = await questionBankApi.cloneQuestion(record.draft_id);
                    const newId = response.data?.id;
                    if (newId) {
                      message.success('已创建修订副本');
                      navigate(`/teacher/question-bank/edit/${newId}`);
                    }
                  } catch (error: any) {
                    message.error(error.response?.data?.error || '创建修订副本失败');
                  }
                }}
              >
                修订
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
              rowKey="submission_id"
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
        title={`审核历史 - 题目 #${selectedQuestion?.submission_id || selectedQuestion?.id}`}
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
                  {getStatusTag(selectedQuestion)}
                </p>
              </div>

              {reviewHistory.length === 0 && !loadingHistory ? (
                <Empty description="暂无审核记录" />
              ) : (
                <Timeline mode="left">
                  {reviewHistory.map((history) => {
                    const isApproved = history.status === 'approved' || history.status === 'published';
                    const isPending = history.status === 'pending_review';
                    return (
                      <Timeline.Item
                        key={history.id}
                        color={isPending ? 'blue' : (isApproved ? 'green' : 'red')}
                        dot={
                          isPending ? (
                            <ClockCircleOutlined style={{ fontSize: 16 }} />
                          ) : isApproved ? (
                            <CheckCircleOutlined style={{ fontSize: 16 }} />
                          ) : (
                            <CloseCircleOutlined style={{ fontSize: 16 }} />
                          )
                        }
                      >
                        <div>
                          <div style={{ marginBottom: 8 }}>
                            <Tag color={isPending ? 'processing' : (isApproved ? 'success' : 'error')}>
                              {isPending ? '待审核' : (isApproved ? '已通过' : '已拒绝')}
                            </Tag>
                            <span style={{ color: '#666', marginLeft: 8 }}>
                              {history.reviewed_at
                                ? new Date(history.reviewed_at).toLocaleString('zh-CN')
                                : new Date(history.created_at).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong>审核人：</strong>
                            {history.reviewer_name || '-'}
                          </div>
                          {history.comment && (
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
                          )}
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

      {/* 重新提交审核模态框 */}
      <Modal
        title="重新提交审核"
        open={resubmitModalVisible}
        onOk={handleResubmit}
        onCancel={() => setResubmitModalVisible(false)}
        confirmLoading={submitting}
        width={600}
        okText="提交审核"
        cancelText="取消"
      >
        {selectedSubmission && (
          <div>
            <div style={{
              marginBottom: 16,
              padding: 12,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 4
            }}>
              <strong>重新提交说明：</strong>题目修改后可以重新提交审核。请选择新的审核人，审核通过后题目将发布到对应的题库中。
            </div>

            {selectedSubmission.review_comment && (
              <Alert
                message="上次拒绝原因"
                description={selectedSubmission.review_comment}
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <p>
              <strong>目标题库：</strong>
              <Tag color="orange">{getScopeDisplayText(selectedSubmission.scope || '')}</Tag>
            </p>

            <div style={{ marginTop: 24 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ color: 'red' }}>* </span>
                选择目标题库范围：
              </label>
              <Select
                value={selectedScope || undefined}
                onChange={(value) => {
                  setSelectedScope(value);
                  if (value === 'practice_district') {
                    const userDistrictCode = getUserDistrictCode();
                    if (userDistrictCode) {
                      setSelectedDistrictCode(userDistrictCode);
                    } else {
                      message.warning('无法获取您的区域信息，请联系管理员');
                      setSelectedDistrictCode('');
                    }
                  } else {
                    setSelectedDistrictCode('');
                  }
                  setSelectedReviewer(null);
                }}
                placeholder="请选择要提交的题库范围"
                style={{ width: '100%' }}
                virtual={false}
              >
                <Select.Option value="assessment">
                  <Tag color="orange">测评题库</Tag>
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    - 市级/系统管理员审核（最高标准）
                  </span>
                </Select.Option>
                <Select.Option value="practice_municipal">
                  <Tag color="blue">市级练习题库</Tag>
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    - 市级审核人审核
                  </span>
                </Select.Option>
                <Select.Option value="practice_district">
                  <Tag color="cyan">区级练习题库</Tag>
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    - 区级审核人审核
                  </span>
                </Select.Option>
              </Select>
            </div>

            {/* 区域信息显示（仅当选择区级题库时显示） */}
            {selectedScope === 'practice_district' && selectedDistrictCode && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  目标区域：
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: '#f0f2f5',
                  borderRadius: 4,
                  border: '1px solid #d9d9d9'
                }}>
                  <Tag color="cyan">{selectedDistrictCode}</Tag>
                  <span style={{ marginLeft: 8 }}>
                    {user?.districtId ? getDistrictById(user.districtId)?.name || '未知区域' : '未知区域'}
                  </span>
                </div>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                <span style={{ color: 'red' }}>* </span>
                选择审核人：
              </label>
              <Select
                style={{ width: '100%' }}
                placeholder={
                  !selectedScope
                    ? '请先选择目标题库范围'
                    : (selectedScope === 'practice_district' && !selectedDistrictCode)
                      ? '请先选择目标区域'
                      : '请选择审核人'
                }
                value={selectedReviewer}
                onChange={setSelectedReviewer}
                showSearch
                optionFilterProp="children"
                disabled={!selectedScope || (selectedScope === 'practice_district' && !selectedDistrictCode)}
                virtual={false}
              >
                {availableReviewers.map((reviewer) => (
                  <Select.Option key={reviewer.id} value={reviewer.id}>
                    {reviewer.real_name} ({reviewer.username})
                    <span style={{ color: '#999', marginLeft: 8 }}>
                      [{reviewer.subjects.join(', ')}]
                    </span>
                  </Select.Option>
                ))}
              </Select>
            </div>

            {availableReviewers.length === 0 && selectedScope && (
              <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4 }}>
                <strong>提示：</strong>当前没有可用的审核人。请联系管理员为教师授予相应的审核权限。
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MySubmissionsPage;
