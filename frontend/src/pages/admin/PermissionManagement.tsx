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
  Form,
  DatePicker,
  Input,
  Popconfirm,
  Tooltip,
  Empty,
  Spin,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { permissionApi, userManagementApi } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;

interface Permission {
  id: number;
  user_id: number;
  username: string;
  real_name: string;
  permission_type: string;
  subjects: string[];
  granted_by: number;
  granted_by_name?: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  notes?: string;
}

interface Teacher {
  id: number;
  username: string;
  real_name: string;
  role: string;
}

const PermissionManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grantModalVisible, setGrantModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPermissions();
    loadTeachers();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const response = await permissionApi.getAllPermissions();
      setPermissions(response.data || []);
    } catch (error: any) {
      console.error('Load permissions error:', error);
      message.error(error.response?.data?.error || '加载权限列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await userManagementApi.getTeachers();
      setTeachers(response.data || []);
    } catch (error: any) {
      console.error('Load teachers error:', error);
    }
  };

  const handleGrantClick = () => {
    setEditingPermission(null);
    form.resetFields();
    setGrantModalVisible(true);
  };

  const handleEditClick = (permission: Permission) => {
    setEditingPermission(permission);
    form.setFieldsValue({
      user_id: permission.user_id,
      permission_type: permission.permission_type,
      subjects: permission.subjects,
      expires_at: permission.expires_at ? dayjs(permission.expires_at) : null,
      notes: permission.notes,
    });
    setGrantModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const data = {
        user_id: values.user_id,
        permission_type: values.permission_type,
        subjects: values.subjects,
        expires_at: values.expires_at ? values.expires_at.toISOString() : undefined,
        notes: values.notes,
      };

      await permissionApi.grantPermission(data);
      message.success(editingPermission ? '更新权限成功' : '授予权限成功');
      setGrantModalVisible(false);
      loadPermissions();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (userId: number, permissionType: string) => {
    try {
      await permissionApi.revokePermission(userId, permissionType);
      message.success('撤销权限成功');
      loadPermissions();
    } catch (error: any) {
      message.error(error.response?.data?.error || '撤销失败');
    }
  };

  const getPermissionTypeText = (type: string) => {
    const types: Record<string, { text: string; color: string }> = {
      question_bank_review: { text: '练习题库审核', color: 'blue' },
      assessment_review: { text: '测评题库审核', color: 'orange' },
      competition_review: { text: '竞赛题库审核', color: 'red' },
    };
    return types[type] || { text: type, color: 'default' };
  };

  const columns = [
    {
      title: '用户',
      key: 'user',
      width: 150,
      render: (_: any, record: Permission) => (
        <div>
          <div><strong>{record.real_name}</strong></div>
          <div style={{ fontSize: 12, color: '#999' }}>@{record.username}</div>
        </div>
      ),
    },
    {
      title: '权限类型',
      dataIndex: 'permission_type',
      key: 'permission_type',
      width: 150,
      render: (type: string) => {
        const config = getPermissionTypeText(type);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '授权科目',
      dataIndex: 'subjects',
      key: 'subjects',
      width: 200,
      render: (subjects: string[]) => (
        <div>
          {subjects.map((subject) => (
            <Tag key={subject} color="cyan" style={{ marginBottom: 4 }}>
              {subject}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean, record: Permission) => {
        const now = new Date();
        const expired = record.expires_at && new Date(record.expires_at) < now;

        if (!isActive || expired) {
          return (
            <Badge status="error" text="已失效" />
          );
        }
        return (
          <Badge status="success" text="有效" />
        );
      },
    },
    {
      title: '授权人',
      dataIndex: 'granted_by_name',
      key: 'granted_by_name',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '授权时间',
      dataIndex: 'granted_at',
      key: 'granted_at',
      width: 160,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '到期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 160,
      render: (text: string) => {
        if (!text) return <Tag color="green">永久有效</Tag>;
        const expiryDate = new Date(text);
        const now = new Date();
        const isExpired = expiryDate < now;
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : '#000' }}>
            {expiryDate.toLocaleString('zh-CN')}
            {isExpired && <Tag color="error" style={{ marginLeft: 8 }}>已过期</Tag>}
          </span>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Permission) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditClick(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要撤销此权限吗？"
            onConfirm={() => handleRevoke(record.user_id, record.permission_type)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="撤销">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="权限管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleGrantClick}
          >
            授予权限
          </Button>
        }
      >
        <Spin spinning={loading}>
          {permissions.length === 0 && !loading ? (
            <Empty
              description="暂无权限记录"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleGrantClick}
              >
                授予第一个权限
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={permissions}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条权限记录`,
              }}
              scroll={{ x: 1400 }}
            />
          )}
        </Spin>
      </Card>

      {/* Grant/Edit Permission Modal */}
      <Modal
        title={editingPermission ? '编辑权限' : '授予权限'}
        open={grantModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setGrantModalVisible(false)}
        confirmLoading={submitting}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="选择教师"
            name="user_id"
            rules={[{ required: true, message: '请选择教师' }]}
          >
            <Select
              placeholder="请选择要授权的教师"
              showSearch
              optionFilterProp="children"
              disabled={!!editingPermission}
            >
              {teachers.map((teacher) => (
                <Option key={teacher.id} value={teacher.id}>
                  {teacher.real_name} ({teacher.username})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="权限类型"
            name="permission_type"
            rules={[{ required: true, message: '请选择权限类型' }]}
          >
            <Select placeholder="请选择权限类型" disabled={!!editingPermission}>
              <Option value="question_bank_review">
                <Tag color="blue">练习题库审核</Tag>
                <span style={{ color: '#999', marginLeft: 8 }}>
                  - 可审核练习题库的题目
                </span>
              </Option>
              <Option value="assessment_review">
                <Tag color="orange">测评题库审核</Tag>
                <span style={{ color: '#999', marginLeft: 8 }}>
                  - 可审核测评题库的题目（需要更高权限）
                </span>
              </Option>
              <Option value="competition_review">
                <Tag color="red">竞赛题库审核</Tag>
                <span style={{ color: '#999', marginLeft: 8 }}>
                  - 可审核竞赛题库的题目（需要最高权限）
                </span>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="授权科目"
            name="subjects"
            rules={[{ required: true, message: '请选择至少一个科目' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择可审核的科目"
              options={[
                { label: '数学', value: '数学' },
                { label: '物理', value: '物理' },
                { label: '化学', value: '化学' },
                { label: '生物', value: '生物' },
                { label: '计算机', value: '计算机' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="有效期"
            name="expires_at"
            help="不设置则永久有效"
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="选择权限到期时间"
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item
            label="备注"
            name="notes"
          >
            <TextArea
              rows={3}
              placeholder="填写备注信息，如：授权原因、特殊说明等"
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>

        <div style={{
          marginTop: 16,
          padding: 12,
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: 4
        }}>
          <strong>权限说明：</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>练习题库审核：可审核发布到练习题库的题目</li>
            <li>测评题库审核：可审核发布到测评题库的题目，要求更严格</li>
            <li>竞赛题库审核：可审核发布到竞赛题库的题目，要求最严格</li>
            <li>每个教师可以拥有多个权限类型</li>
            <li>权限与科目相关联，只能审核指定科目的题目</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default PermissionManagement;
