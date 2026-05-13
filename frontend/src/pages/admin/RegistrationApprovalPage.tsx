import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Input, message, Select, Descriptions, Timeline } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '@/services/api';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface RegistrationRequest {
  id: number;
  phone: string;
  real_name: string;
  school_name: string;
  grade: string;
  status: string;
  current_reviewer_level: number;
  submitted_at: string;
  reviewed_at: string | null;
  review_comment: string | null;
}

interface AuditLogEntry {
  action: string;
  action_by: number | null;
  action_level: number;
  comment: string;
  created_at: string;
}

const RegistrationApprovalPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchText, setSearchText] = useState('');

  // Modal states
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);

  // 加载注册申请列表
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (searchText) {
        params.search = searchText;
      }

      const response = await api.get('/registration/admin/requests', { params });
      if (response.data.success) {
        setRequests(response.data.data.requests);
        setTotal(response.data.data.total);
      } else {
        message.error(response.data.message || '加载失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentPage, pageSize, statusFilter]);

  // 批准申请
  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      const response = await api.post(`/registration/admin/requests/${selectedRequest.id}/approve`, {
        comment: approveComment || undefined,
      });

      if (response.data.success) {
        message.success(response.data.message || '批准成功');
        setApproveModalVisible(false);
        setApproveComment('');
        setSelectedRequest(null);
        fetchRequests(); // 刷新列表
      } else {
        message.error(response.data.message || '批准失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '批准失败');
    }
  };

  // 拒绝申请
  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!rejectComment.trim()) {
      message.warning('请输入拒绝原因');
      return;
    }

    try {
      const response = await api.post(`/registration/admin/requests/${selectedRequest.id}/reject`, {
        comment: rejectComment,
      });

      if (response.data.success) {
        message.success(response.data.message || '拒绝成功');
        setRejectModalVisible(false);
        setRejectComment('');
        setSelectedRequest(null);
        fetchRequests(); // 刷新列表
      } else {
        message.error(response.data.message || '拒绝失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '拒绝失败');
    }
  };

  // 查看审核历史
  const viewHistory = async (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setHistoryModalVisible(true);

    try {
      const response = await api.get(`/registration/admin/requests/${request.id}/history`);
      if (response.data.success) {
        setAuditHistory(response.data.data.history || []);
      } else {
        message.error('加载审核历史失败');
        setAuditHistory([]);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载审核历史失败');
      setAuditHistory([]);
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'processing', text: '待审核' },
      approved: { color: 'success', text: '已批准' },
      rejected: { color: 'error', text: '已拒绝' },
    };
    const config = statusMap[status] || { color: 'default', text: '未知' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取审核层级名称
  const getReviewerLevelName = (level: number) => {
    const levelMap: Record<number, string> = {
      2: '校级',
      3: '区县级',
      4: '市级',
    };
    return levelMap[level] || '未知';
  };

  // 获取操作名称
  const getActionName = (action: string) => {
    const actionMap: Record<string, string> = {
      submitted: '提交申请',
      escalated: '手动升级',
      auto_escalated: '自动升级',
      approved: '批准',
      rejected: '拒绝',
    };
    return actionMap[action] || action;
  };

  // 表格列定义
  const columns = [
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'real_name',
      key: 'real_name',
      width: 100,
    },
    {
      title: '学校',
      dataIndex: 'school_name',
      key: 'school_name',
      width: 180,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '当前审核层级',
      dataIndex: 'current_reviewer_level',
      key: 'current_reviewer_level',
      width: 120,
      render: (level: number) => getReviewerLevelName(level),
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: RegistrationRequest) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewHistory(record)}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => {
                  setSelectedRequest(record);
                  setApproveModalVisible(true);
                }}
                style={{ color: '#22c55e' }}
              >
                批准
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setSelectedRequest(record);
                  setRejectModalVisible(true);
                }}
                danger
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="学生注册审核管理"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchRequests}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        {/* 筛选器 */}
        <Space style={{ marginBottom: 16 }} size="middle">
          <Select
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="筛选状态"
          >
            <Option value="">全部状态</Option>
            <Option value="pending">待审核</Option>
            <Option value="approved">已批准</Option>
            <Option value="rejected">已拒绝</Option>
          </Select>
          <Input.Search
            style={{ width: 250 }}
            placeholder="搜索手机号或姓名"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={fetchRequests}
            allowClear
          />
        </Space>

        {/* 申请列表表格 */}
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            },
          }}
        />
      </Card>

      {/* 批准申请Modal */}
      <Modal
        title="批准注册申请"
        open={approveModalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setApproveModalVisible(false);
          setApproveComment('');
          setSelectedRequest(null);
        }}
        okText="确认批准"
        cancelText="取消"
      >
        {selectedRequest && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="姓名">{selectedRequest.real_name}</Descriptions.Item>
              <Descriptions.Item label="手机号">{selectedRequest.phone}</Descriptions.Item>
              <Descriptions.Item label="学校">{selectedRequest.school_name}</Descriptions.Item>
              <Descriptions.Item label="年级">{selectedRequest.grade}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <label>审核意见（可选）：</label>
              <TextArea
                rows={3}
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                placeholder="请输入审核意见"
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 拒绝申请Modal */}
      <Modal
        title="拒绝注册申请"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectComment('');
          setSelectedRequest(null);
        }}
        okText="确认拒绝"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        {selectedRequest && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="姓名">{selectedRequest.real_name}</Descriptions.Item>
              <Descriptions.Item label="手机号">{selectedRequest.phone}</Descriptions.Item>
              <Descriptions.Item label="学校">{selectedRequest.school_name}</Descriptions.Item>
              <Descriptions.Item label="年级">{selectedRequest.grade}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <label><span style={{ color: 'red' }}>*</span> 拒绝原因：</label>
              <TextArea
                rows={3}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="请输入拒绝原因（必填）"
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 审核历史Modal */}
      <Modal
        title="申请详情与审核历史"
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setSelectedRequest(null);
          setAuditHistory([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setHistoryModalVisible(false);
            setSelectedRequest(null);
            setAuditHistory([]);
          }}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedRequest && (
          <div>
            {/* 申请详情 */}
            <div style={{ marginBottom: 24 }}>
              <h4>申请详情</h4>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="姓名">{selectedRequest.real_name}</Descriptions.Item>
                <Descriptions.Item label="手机号">{selectedRequest.phone}</Descriptions.Item>
                <Descriptions.Item label="学校">{selectedRequest.school_name}</Descriptions.Item>
                <Descriptions.Item label="年级">{selectedRequest.grade}</Descriptions.Item>
                <Descriptions.Item label="状态" span={2}>
                  {getStatusTag(selectedRequest.status)}
                </Descriptions.Item>
                <Descriptions.Item label="当前审核层级" span={2}>
                  {getReviewerLevelName(selectedRequest.current_reviewer_level)}
                </Descriptions.Item>
                <Descriptions.Item label="提交时间" span={2}>
                  {dayjs(selectedRequest.submitted_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                {selectedRequest.reviewed_at && (
                  <Descriptions.Item label="审核时间" span={2}>
                    {dayjs(selectedRequest.reviewed_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                )}
                {selectedRequest.review_comment && (
                  <Descriptions.Item label="审核意见" span={2}>
                    {selectedRequest.review_comment}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>

            {/* 审核历史 */}
            <div>
              <h4>审核历史</h4>
              {auditHistory.length > 0 ? (
                <Timeline
                  items={auditHistory.map((entry) => ({
                    children: (
                      <div>
                        <div><strong>{getActionName(entry.action)}</strong></div>
                        {entry.comment && <div style={{ color: '#4b5563' }}>{entry.comment}</div>}
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>
                          {dayjs(entry.created_at).format('YYYY-MM-DD HH:mm:ss')}
                        </div>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px 0' }}>
                  暂无审核历史
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RegistrationApprovalPage;
