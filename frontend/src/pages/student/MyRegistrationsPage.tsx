/**
 * My Registrations Page
 * 学生报名记录页面
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  message,
  Spin,
  Modal,
  Input,
  Empty,
  Tooltip,
  Typography
} from 'antd';
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getMyRegistrations,
  cancelRegistration,
  AssessmentRegistration
} from '../../services/assessmentRegistrationApi';

const { Text } = Typography;
const { TextArea } = Input;

const MyRegistrationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<AssessmentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await getMyRegistrations();
      setRegistrations(response.data || []);
    } catch (error: any) {
      console.error('Load registrations error:', error);
      message.error(error.response?.data?.message || '加载报名记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (registration: AssessmentRegistration) => {
    setCancellingId(registration.activity_id);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingId) return;

    try {
      setCancelling(true);
      await cancelRegistration(cancellingId, cancelReason);
      message.success('取消报名成功');
      setCancelModalVisible(false);
      loadRegistrations();
    } catch (error: any) {
      console.error('Cancel registration error:', error);
      message.error(error.response?.data?.message || '取消报名失败');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      pending: { color: 'processing', text: '待确认' },
      confirmed: { color: 'success', text: '已确认' },
      rejected: { color: 'error', text: '已拒绝' },
      cancelled: { color: 'default', text: '已取消' },
      completed: { color: 'purple', text: '已完成' },
      absent: { color: 'warning', text: '缺考' }
    };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getAbilityLevelTag = (level?: string) => {
    if (!level) return '-';
    const colors: Record<string, string> = {
      L1: 'blue',
      L2: 'cyan',
      L3: 'green',
      L4: 'lime',
      L5: 'orange',
      L6: 'red',
      L7: 'purple'
    };
    return <Tag color={colors[level] || 'default'}>{level}</Tag>;
  };

  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns = [
    {
      title: '测评名称',
      dataIndex: 'activity_title',
      key: 'activity_title',
      width: 200,
      render: (title: string, record: AssessmentRegistration) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => navigate(`/student/activity/${record.activity_id}`)}
        >
          {title}
        </Button>
      )
    },
    {
      title: '能力等级',
      dataIndex: 'ability_level',
      key: 'ability_level',
      width: 100,
      render: (level: string) => getAbilityLevelTag(level)
    },
    {
      title: '测评点',
      dataIndex: 'location_name',
      key: 'location_name',
      width: 180,
      render: (name: string, record: AssessmentRegistration) => (
        name ? (
          <Tooltip title={record.location_address}>
            <Space>
              <EnvironmentOutlined />
              <Text>{name}</Text>
            </Space>
          </Tooltip>
        ) : (
          <Text type="secondary">在线测评</Text>
        )
      )
    },
    {
      title: '报名时间',
      dataIndex: 'registered_at',
      key: 'registered_at',
      width: 160,
      render: (time: string) => (
        <Space>
          <ClockCircleOutlined />
          <span>{formatDateTime(time)}</span>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: AssessmentRegistration) => {
        const canCancel = ['pending', 'confirmed'].includes(record.status);
        const canTake = record.status === 'confirmed';

        return (
          <Space>
            {canTake && (
              <Button
                size="small"
                type="primary"
                onClick={() => navigate(`/student/activity/${record.activity_id}`)}
              >
                进入测评
              </Button>
            )}
            {canCancel && (
              <Button
                size="small"
                danger
                onClick={() => handleCancelClick(record)}
              >
                取消报名
              </Button>
            )}
            {!canCancel && !canTake && (
              <Button
                size="small"
                onClick={() => navigate(`/student/activity/${record.activity_id}`)}
              >
                查看详情
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载报名记录中..." />
      </div>
    );
  }

  return (
    <div>
      <Card
        title="我的报名"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadRegistrations}
          >
            刷新
          </Button>
        }
      >
        {registrations.length === 0 ? (
          <Empty
            description="暂无报名记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={registrations}
            rowKey="id"
            scroll={{ x: 1000 }}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
          />
        )}
      </Card>

      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#f59e0b' }} />
            <span>取消报名</span>
          </Space>
        }
        open={cancelModalVisible}
        onCancel={() => setCancelModalVisible(false)}
        onOk={handleConfirmCancel}
        confirmLoading={cancelling}
        okText="确认取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要取消此测评的报名吗？取消后可能需要重新报名。</p>
        <TextArea
          placeholder="请输入取消原因（可选）"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          style={{ marginTop: 12 }}
        />
      </Modal>
    </div>
  );
};

export default MyRegistrationsPage;
