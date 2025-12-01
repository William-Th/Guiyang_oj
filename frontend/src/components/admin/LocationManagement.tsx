/**
 * Location Management Component
 * 测评点管理组件 - 用于管理员在活动详情中管理测评点
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  TimePicker,
  Select,
  message,
  Popconfirm,
  Tag,
  Progress,
  Tooltip,
  Typography,
  Empty
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getActivityLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  AssessmentLocation,
  CreateLocationParams
} from '../../services/assessmentRegistrationApi';

const { Text } = Typography;
const { TextArea } = Input;

interface LocationManagementProps {
  activityId: number;
  abilityLevel?: string;
  readonly?: boolean;
}

const LocationManagement: React.FC<LocationManagementProps> = ({
  activityId,
  abilityLevel,
  readonly = false
}) => {
  const [locations, setLocations] = useState<AssessmentLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<AssessmentLocation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const requiresLocation = ['L4', 'L5', 'L6', 'L7'].includes(abilityLevel || '');

  useEffect(() => {
    loadLocations();
  }, [activityId]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await getActivityLocations(activityId);
      setLocations(response.data || []);
    } catch (error: any) {
      console.error('Load locations error:', error);
      message.error(error.response?.data?.message || '加载测评点失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingLocation(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (location: AssessmentLocation) => {
    setEditingLocation(location);
    form.setFieldsValue({
      ...location,
      exam_date: location.exam_date ? dayjs(location.exam_date) : undefined,
      exam_time_start: location.exam_time_start ? dayjs(location.exam_time_start, 'HH:mm') : undefined,
      exam_time_end: location.exam_time_end ? dayjs(location.exam_time_end, 'HH:mm') : undefined,
      check_in_time: location.check_in_time ? dayjs(location.check_in_time, 'HH:mm') : undefined
    });
    setModalVisible(true);
  };

  const handleDelete = async (locationId: number) => {
    try {
      await deleteLocation(locationId);
      message.success('删除成功');
      loadLocations();
    } catch (error: any) {
      console.error('Delete location error:', error);
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const params: CreateLocationParams = {
        name: values.name,
        address: values.address,
        capacity: values.capacity,
        contact_name: values.contact_name,
        contact_phone: values.contact_phone,
        exam_date: values.exam_date?.format('YYYY-MM-DD'),
        exam_time_start: values.exam_time_start?.format('HH:mm'),
        exam_time_end: values.exam_time_end?.format('HH:mm'),
        check_in_time: values.check_in_time?.format('HH:mm'),
        notes: values.notes
      };

      if (editingLocation) {
        await updateLocation(editingLocation.id, {
          ...params,
          is_active: values.is_active
        });
        message.success('更新成功');
      } else {
        await createLocation(activityId, params);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadLocations();
    } catch (error: any) {
      console.error('Submit error:', error);
      if (error.errorFields) {
        // Form validation error
        return;
      }
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '测评点名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record: AssessmentLocation) => (
        <Space>
          <EnvironmentOutlined />
          <Text strong>{name}</Text>
          {!record.is_active && <Tag color="default">已禁用</Tag>}
        </Space>
      )
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 200,
      ellipsis: true
    },
    {
      title: '测评时间',
      key: 'exam_time',
      width: 180,
      render: (_: any, record: AssessmentLocation) => (
        <Space direction="vertical" size={0}>
          {record.exam_date && (
            <Text>{dayjs(record.exam_date).format('YYYY-MM-DD')}</Text>
          )}
          {record.exam_time_start && record.exam_time_end && (
            <Text type="secondary">
              {record.exam_time_start.substring(0, 5)} - {record.exam_time_end.substring(0, 5)}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '容量',
      key: 'capacity',
      width: 150,
      render: (_: any, record: AssessmentLocation) => {
        const percent = Math.round((record.registered_count / record.capacity) * 100);
        const isFull = record.registered_count >= record.capacity;

        return (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Space>
              <TeamOutlined />
              <Text>{record.registered_count} / {record.capacity}</Text>
              {isFull && <Tag color="red">已满</Tag>}
            </Space>
            <Progress
              percent={percent}
              size="small"
              showInfo={false}
              status={isFull ? 'exception' : 'normal'}
            />
          </Space>
        );
      }
    },
    {
      title: '联系人',
      key: 'contact',
      width: 150,
      render: (_: any, record: AssessmentLocation) => (
        record.contact_name ? (
          <Space direction="vertical" size={0}>
            <Text>{record.contact_name}</Text>
            {record.contact_phone && (
              <Text type="secondary">{record.contact_phone}</Text>
            )}
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: AssessmentLocation) => (
        readonly ? null : (
          <Space>
            <Tooltip title="编辑">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Popconfirm
              title="确定要删除此测评点吗？"
              description={record.registered_count > 0 ? '该测评点已有报名记录，无法删除' : undefined}
              onConfirm={() => handleDelete(record.id)}
              disabled={record.registered_count > 0}
            >
              <Tooltip title={record.registered_count > 0 ? '有报名记录，无法删除' : '删除'}>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={record.registered_count > 0}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      )
    }
  ];

  if (!requiresLocation) {
    return (
      <Card title="测评点管理">
        <Empty
          description="L1-L3级别为纯线上测评，无需设置测评点"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <>
      <Card
        title={
          <Space>
            <EnvironmentOutlined />
            <span>测评点管理</span>
          </Space>
        }
        extra={
          !readonly && (
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadLocations}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                添加测评点
              </Button>
            </Space>
          )
        }
      >
        <Table
          columns={columns}
          dataSource={locations}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          locale={{ emptyText: '暂无测评点，请添加' }}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingLocation ? '编辑测评点' : '添加测评点'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ capacity: 50, is_active: true }}
        >
          <Form.Item
            name="name"
            label="测评点名称"
            rules={[{ required: true, message: '请输入测评点名称' }]}
          >
            <Input placeholder="如：贵阳一中考点" />
          </Form.Item>

          <Form.Item
            name="address"
            label="详细地址"
          >
            <Input placeholder="请输入详细地址" />
          </Form.Item>

          <Form.Item
            name="capacity"
            label="容纳人数"
            rules={[{ required: true, message: '请输入容纳人数' }]}
          >
            <InputNumber min={1} max={9999} style={{ width: '100%' }} />
          </Form.Item>

          <Space style={{ width: '100%' }} size={16}>
            <Form.Item
              name="exam_date"
              label="测评日期"
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="exam_time_start"
              label="开始时间"
              style={{ flex: 1 }}
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="exam_time_end"
              label="结束时间"
              style={{ flex: 1 }}
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item
            name="check_in_time"
            label="签到时间"
          >
            <TimePicker format="HH:mm" style={{ width: 200 }} />
          </Form.Item>

          <Space style={{ width: '100%' }} size={16}>
            <Form.Item
              name="contact_name"
              label="联系人"
              style={{ flex: 1 }}
            >
              <Input placeholder="联系人姓名" />
            </Form.Item>

            <Form.Item
              name="contact_phone"
              label="联系电话"
              style={{ flex: 1 }}
            >
              <Input placeholder="联系电话" />
            </Form.Item>
          </Space>

          <Form.Item
            name="notes"
            label="备注说明"
          >
            <TextArea
              rows={3}
              placeholder="如：请携带学生证、需提前30分钟到场"
            />
          </Form.Item>

          {editingLocation && (
            <Form.Item
              name="is_active"
              label="状态"
            >
              <Select>
                <Select.Option value={true}>启用</Select.Option>
                <Select.Option value={false}>禁用</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default LocationManagement;
