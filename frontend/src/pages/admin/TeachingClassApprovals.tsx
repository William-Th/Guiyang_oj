import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Modal,
  Input,
  Tag,
  Tooltip,
  Descriptions
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { teachingClassApi } from '../../services/api';

const { TextArea } = Input;

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

const TeachingClassApprovals: React.FC = () => {
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
      setPendingClasses(Array.isArray(data) ? data : data.data || []);
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
      icon: <CheckOutlined style={{ color: '#52c41a' }} />,
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
              style={{ color: '#52c41a' }}
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
    <Card title="教学班审批">
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
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
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
    </Card>
  );
};

export default TeachingClassApprovals;
