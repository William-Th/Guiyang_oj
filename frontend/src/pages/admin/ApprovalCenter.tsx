import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Input,
  message,
  Select,
  Descriptions,
  Timeline,
  Tooltip,
  Badge
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  UserAddOutlined,
  TeamOutlined
} from '@ant-design/icons';
import api, { teachingClassApi } from '@/services/api';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

// ==================== 注册审核相关接口 ====================
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

// ==================== 教学班审批相关接口 ====================
interface PendingTeachingClass {
  id: number;
  name: string;
  description: string;
  scope: 'school' | 'district' | 'municipal';
  school_id: number;
  district_id: number;
  school_name: string;
  district_name: string;
  subject: string;
  grade: string;
  academic_year: string;
  created_by: number;
  creator_name: string;
  submitted_at: string;
  current_reviewer_level: string;
  pending_days: number;
}

// ==================== 注册审核组件 ====================
const RegistrationApproval: React.FC<{ onCountChange: (count: number) => void }> = ({ onCountChange }) => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchText, setSearchText] = useState('');

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);

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
        // Update pending count for badge
        if (statusFilter === 'pending') {
          onCountChange(response.data.data.total);
        }
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
        fetchRequests();
      } else {
        message.error(response.data.message || '批准失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '批准失败');
    }
  };

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
        fetchRequests();
      } else {
        message.error(response.data.message || '拒绝失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '拒绝失败');
    }
  };

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

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'processing', text: '待审核' },
      approved: { color: 'success', text: '已批准' },
      rejected: { color: 'error', text: '已拒绝' },
    };
    const config = statusMap[status] || { color: 'default', text: '未知' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getReviewerLevelName = (level: number) => {
    const levelMap: Record<number, string> = {
      2: '校级',
      3: '区县级',
      4: '市级',
    };
    return levelMap[level] || '未知';
  };

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
    <>
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
        <Button icon={<ReloadOutlined />} onClick={fetchRequests} loading={loading}>
          刷新
        </Button>
      </Space>

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
    </>
  );
};

// ==================== 教学班审批组件 ====================
const TeachingClassApproval: React.FC<{ onCountChange: (count: number) => void }> = ({ onCountChange }) => {
  const [loading, setLoading] = useState(true);
  const [pendingClasses, setPendingClasses] = useState<PendingTeachingClass[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<PendingTeachingClass | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingClasses();
  }, []);

  const loadPendingClasses = async () => {
    try {
      setLoading(true);
      const response = await teachingClassApi.getPendingApprovals();
      const data = response.data || response;
      const classes = Array.isArray(data) ? data : data.data || [];
      setPendingClasses(classes);
      onCountChange(classes.length);
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      if (error.response?.status === 403) {
        message.warning('您没有审批教学班的权限');
      } else {
        message.error(error.response?.data?.message || '加载待审批列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (classItem: PendingTeachingClass) => {
    Modal.confirm({
      title: '批准教学班',
      icon: <CheckOutlined style={{ color: '#22c55e' }} />,
      content: (
        <div>
          <p>确定要批准教学班 &quot;{classItem.name}&quot; 吗？</p>
          <TextArea
            placeholder="审批意见（可选）"
            rows={3}
            onChange={(e) => setApproveComment(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>
      ),
      okText: '批准',
      cancelText: '取消',
      onOk: async () => {
        try {
          setProcessing(true);
          await teachingClassApi.approve(classItem.id, approveComment);
          message.success('已批准');
          setApproveComment('');
          loadPendingClasses();
        } catch (err) {
          const error = err as { response?: { data?: { message?: string } } };
          message.error(error.response?.data?.message || '操作失败');
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      message.warning('请输入拒绝原因');
      return;
    }

    try {
      setProcessing(true);
      await teachingClassApi.reject(selectedClass!.id, rejectReason);
      message.success('已拒绝');
      setRejectModalVisible(false);
      setRejectReason('');
      setSelectedClass(null);
      loadPendingClasses();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setProcessing(false);
    }
  };

  const showRejectModal = (classItem: PendingTeachingClass) => {
    setSelectedClass(classItem);
    setRejectModalVisible(true);
  };

  const showDetailModal = (classItem: PendingTeachingClass) => {
    setSelectedClass(classItem);
    setDetailModalVisible(true);
  };

  const getScopeTag = (scope: string) => {
    const scopeMap: Record<string, { color: string; text: string }> = {
      school: { color: 'blue', text: '校级' },
      district: { color: 'orange', text: '区级' },
      municipal: { color: 'red', text: '市级' },
    };
    const info = scopeMap[scope] || { color: 'default', text: scope };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getReviewerLevelTag = (level: string) => {
    const levelMap: Record<string, { color: string; text: string }> = {
      school: { color: 'blue', text: '校级审核' },
      district: { color: 'orange', text: '区级审核' },
      municipal: { color: 'red', text: '市级审核' },
    };
    const info = levelMap[level] || { color: 'default', text: level };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '-';
    return new Date(dateTimeString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns = [
    {
      title: '班级名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text: string, record: PendingTeachingClass) => (
        <a onClick={() => showDetailModal(record)}>{text}</a>
      ),
    },
    {
      title: '范围',
      dataIndex: 'scope',
      key: 'scope',
      width: 80,
      render: (scope: string) => getScopeTag(scope),
    },
    {
      title: '当前审核级别',
      dataIndex: 'current_reviewer_level',
      key: 'current_reviewer_level',
      width: 100,
      render: (level: string) => getReviewerLevelTag(level),
    },
    {
      title: '学科',
      dataIndex: 'subject',
      key: 'subject',
      width: 80,
      render: (text: string) => text || '-',
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
      render: (text: string) => text || '-',
    },
    {
      title: '学年学期',
      dataIndex: 'academic_year',
      key: 'academic_year',
      width: 160,
    },
    {
      title: '创建者',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 100,
    },
    {
      title: '学校',
      dataIndex: 'school_name',
      key: 'school_name',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 150,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '等待天数',
      dataIndex: 'pending_days',
      key: 'pending_days',
      width: 90,
      render: (days: number) => {
        const color = days >= 7 ? 'red' : days >= 3 ? 'orange' : 'default';
        return (
          <Tooltip title={days >= 7 ? '即将自动流转到上级' : ''}>
            <Tag color={color}>{days || 0} 天</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: PendingTeachingClass) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showDetailModal(record)}
            />
          </Tooltip>
          <Tooltip title="批准">
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              style={{ color: '#22c55e' }}
              onClick={() => handleApprove(record)}
            />
          </Tooltip>
          <Tooltip title="拒绝">
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => showRejectModal(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={loadPendingClasses} loading={loading}>
          刷新
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={pendingClasses}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 20,
          showTotal: (total) => `共 ${total} 条待审批记录`,
        }}
        locale={{
          emptyText: '暂无待审批的教学班',
        }}
      />

      {/* Detail Modal */}
      <Modal
        title="教学班详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedClass(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            onClick={() => {
              setDetailModalVisible(false);
              showRejectModal(selectedClass!);
            }}
          >
            拒绝
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => {
              setDetailModalVisible(false);
              handleApprove(selectedClass!);
            }}
          >
            批准
          </Button>,
        ]}
        width={700}
      >
        {selectedClass && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="班级名称">{selectedClass.name}</Descriptions.Item>
            <Descriptions.Item label="范围">{getScopeTag(selectedClass.scope)}</Descriptions.Item>
            <Descriptions.Item label="当前审核级别">
              {getReviewerLevelTag(selectedClass.current_reviewer_level)}
            </Descriptions.Item>
            <Descriptions.Item label="学年学期">{selectedClass.academic_year}</Descriptions.Item>
            <Descriptions.Item label="学科">{selectedClass.subject || '-'}</Descriptions.Item>
            <Descriptions.Item label="年级">{selectedClass.grade || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建者">{selectedClass.creator_name}</Descriptions.Item>
            <Descriptions.Item label="提交时间">{formatDateTime(selectedClass.submitted_at)}</Descriptions.Item>
            {selectedClass.school_name && (
              <Descriptions.Item label="所属学校" span={2}>{selectedClass.school_name}</Descriptions.Item>
            )}
            {selectedClass.district_name && (
              <Descriptions.Item label="所属区县" span={2}>{selectedClass.district_name}</Descriptions.Item>
            )}
            <Descriptions.Item label="描述" span={2}>
              {selectedClass.description || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title={
          <span>
            <ExclamationCircleOutlined style={{ color: '#ef4444', marginRight: 8 }} />
            拒绝教学班
          </span>
        }
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectReason('');
          setSelectedClass(null);
        }}
        onOk={handleReject}
        confirmLoading={processing}
        okText="确认拒绝"
        okButtonProps={{ danger: true }}
      >
        <p>您正在拒绝教学班: <strong>{selectedClass?.name}</strong></p>
        <p>请输入拒绝原因（必填）：</p>
        <TextArea
          rows={4}
          placeholder="请详细说明拒绝原因，以便创建者修改后重新提交"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={500}
          showCount
        />
      </Modal>
    </>
  );
};

// ==================== 审批中心主组件 ====================
const ApprovalCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState('registration');
  const [registrationCount, setRegistrationCount] = useState(0);
  const [teachingClassCount, setTeachingClassCount] = useState(0);

  const tabItems = [
    {
      key: 'registration',
      label: (
        <span>
          <UserAddOutlined />
          注册审核
          {registrationCount > 0 && (
            <Badge count={registrationCount} size="small" style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: <RegistrationApproval onCountChange={setRegistrationCount} />,
    },
    {
      key: 'teachingClass',
      label: (
        <span>
          <TeamOutlined />
          教学班审批
          {teachingClassCount > 0 && (
            <Badge count={teachingClassCount} size="small" style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: <TeachingClassApproval onCountChange={setTeachingClassCount} />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="审批中心">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};

export default ApprovalCenter;
