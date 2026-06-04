/**
 * Registration Management Component
 * 报名管理组件 - 用于管理员查看和管理测评报名
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Select,
  message,
  Modal,
  Input,
  Statistic,
  Row,
  Col,
  Typography
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import {
  getActivityRegistrations,
  getActivityLocations,
  batchUpdateRegistrations,
  AssessmentRegistration,
  AssessmentLocation,
  RegistrationStatistics
} from '../../services/assessmentRegistrationApi';

const { Text } = Typography;
const { TextArea } = Input;

interface RegistrationManagementProps {
  activityId: number;
  abilityLevel?: string;
}

const RegistrationManagement: React.FC<RegistrationManagementProps> = ({
  activityId,
  abilityLevel
}) => {
  const [registrations, setRegistrations] = useState<AssessmentRegistration[]>([]);
  const [locations, setLocations] = useState<AssessmentLocation[]>([]);
  const [statistics, setStatistics] = useState<RegistrationStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [filters, setFilters] = useState<{
    status?: string;
    location_id?: number;
  }>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [batchActionModal, setBatchActionModal] = useState<{
    visible: boolean;
    action: string;
    reason: string;
  }>({ visible: false, action: '', reason: '' });

  const requiresLocation = ['L4', 'L5', 'L6', 'L7'].includes(abilityLevel || '');

  useEffect(() => {
    loadRegistrations();
    if (requiresLocation) {
      loadLocations();
    }
  }, [activityId, filters, pagination.current, pagination.pageSize]);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await getActivityRegistrations(activityId, {
        ...filters,
        page: pagination.current,
        page_size: pagination.pageSize
      });
      setRegistrations(response.data || []);
      setStatistics(response.statistics);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination!.total
        }));
      }
    } catch (error: any) {
      console.error('Load registrations error:', error);
      message.error(error.response?.data?.message || '加载报名记录失败');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await getActivityLocations(activityId);
      setLocations(response.data || []);
    } catch (error: any) {
      console.error('Load locations error:', error);
    }
  };

  const handleBatchAction = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的记录');
      return;
    }

    try {
      await batchUpdateRegistrations(
        activityId,
        selectedRowKeys,
        batchActionModal.action as any,
        batchActionModal.reason
      );
      message.success('操作成功');
      setBatchActionModal({ visible: false, action: '', reason: '' });
      setSelectedRowKeys([]);
      loadRegistrations();
    } catch (error: any) {
      console.error('Batch action error:', error);
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const openBatchActionModal = (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的记录');
      return;
    }
    setBatchActionModal({ visible: true, action, reason: '' });
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

  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return '-';
    return new Date(dateTimeString).toLocaleString('zh-CN');
  };

  const columns = [
    {
      title: '学生姓名',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 120,
      render: (name: string) => (
        <Space>
          <UserOutlined />
          <Text>{name || '-'}</Text>
        </Space>
      )
    },
    {
      title: '联系电话',
      dataIndex: 'student_phone',
      key: 'student_phone',
      width: 130
    },
    {
      title: '学校',
      dataIndex: 'school_name',
      key: 'school_name',
      width: 150,
      ellipsis: true
    },
    {
      title: '年级班级',
      key: 'grade_class',
      width: 120,
      render: (_: any, record: AssessmentRegistration) => (
        <Text>
          {record.student_grade || '-'}
          {record.student_class && ` ${record.student_class}`}
        </Text>
      )
    },
    ...(requiresLocation ? [{
      title: '测评点',
      dataIndex: 'location_name',
      key: 'location_name',
      width: 150,
      render: (name: string) => name || <Text type="secondary">未选择</Text>
    }] : []),
    {
      title: '报名时间',
      dataIndex: 'registered_at',
      key: 'registered_at',
      width: 160,
      render: (time: string) => formatDateTime(time)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as number[]),
    getCheckboxProps: (record: AssessmentRegistration) => ({
      disabled: ['completed', 'absent'].includes(record.status)
    })
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      confirm: '确认报名',
      reject: '拒绝报名',
      cancel: '取消报名',
      mark_completed: '标记完成',
      mark_absent: '标记缺考'
    };
    return labels[action] || action;
  };

  return (
    <div>
      {statistics && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={4}>
              <Statistic
                title="总报名数"
                value={statistics.total}
                prefix={<TeamOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="已确认"
                value={statistics.confirmed}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="待确认"
                value={statistics.pending}
                valueStyle={{ color: '#16a34a' }}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="已取消"
                value={statistics.cancelled}
                prefix={<CloseOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="已完成"
                value={statistics.completed}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="缺考"
                value={statistics.absent}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Card
        title="报名记录"
        extra={
          <Space>
            {requiresLocation && (
              <Select
                placeholder="按测评点筛选"
                allowClear
                style={{ width: 180 }}
                onChange={(value) => setFilters({ ...filters, location_id: value })}
              >
                {locations.map(loc => (
                  <Select.Option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.registered_count}/{loc.capacity})
                  </Select.Option>
                ))}
              </Select>
            )}
            <Select
              placeholder="按状态筛选"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Select.Option value="pending">待确认</Select.Option>
              <Select.Option value="confirmed">已确认</Select.Option>
              <Select.Option value="cancelled">已取消</Select.Option>
              <Select.Option value="rejected">已拒绝</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
              <Select.Option value="absent">缺考</Select.Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadRegistrations}>
              刷新
            </Button>
          </Space>
        }
      >
        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: 16, padding: '8px 16px', background: '#f0f5ff', borderRadius: 4 }}>
            <Space>
              <Text>已选择 {selectedRowKeys.length} 条记录</Text>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => openBatchActionModal('confirm')}
              >
                批量确认
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => openBatchActionModal('reject')}
              >
                批量拒绝
              </Button>
              <Button
                size="small"
                onClick={() => openBatchActionModal('mark_completed')}
              >
                标记完成
              </Button>
              <Button
                size="small"
                onClick={() => openBatchActionModal('mark_absent')}
              >
                标记缺考
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedRowKeys([])}
              >
                取消选择
              </Button>
            </Space>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={registrations}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1000 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || 20
              }));
            }
          }}
          locale={{ emptyText: '暂无报名记录' }}
        />
      </Card>

      <Modal
        title={`${getActionLabel(batchActionModal.action)} - ${selectedRowKeys.length} 条记录`}
        open={batchActionModal.visible}
        onCancel={() => setBatchActionModal({ visible: false, action: '', reason: '' })}
        onOk={handleBatchAction}
        okButtonProps={{
          danger: ['reject', 'cancel'].includes(batchActionModal.action)
        }}
      >
        <p>确定要对选中的 {selectedRowKeys.length} 条记录执行&ldquo;{getActionLabel(batchActionModal.action)}&rdquo;操作吗？</p>
        {['reject', 'cancel'].includes(batchActionModal.action) && (
          <TextArea
            placeholder="请输入原因（可选）"
            value={batchActionModal.reason}
            onChange={(e) => setBatchActionModal(prev => ({ ...prev, reason: e.target.value }))}
            rows={3}
            style={{ marginTop: 12 }}
          />
        )}
      </Modal>
    </div>
  );
};

export default RegistrationManagement;
