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
import { SUBJECTS } from '../../config/subjects';

const { Option } = Select;
const { TextArea } = Input;

interface Permission {
  id: number;
  user_id: number;
  username: string;
  real_name: string;
  permission_type: string;
  subjects: string[];
  scope_level?: string;
  district_id?: number;
  district_name?: string;
  school_id?: number;
  school_name?: string;
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
  subjects?: string[];
  school_name?: string;
  district_name?: string;
}

const PermissionManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grantModalVisible, setGrantModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    loadPermissions();
    loadTeachers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      // 从 localStorage 或 Redux store 获取当前用户信息
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserRole(user.role || '');
      }
    } catch (error) {
      console.error('Load current user error:', error);
    }
  };

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
      // 使用新的 API：根据管理员权限范围过滤教师
      const response = await permissionApi.getAvailableTeachers();
      setTeachers(response.data || []);
    } catch (error: any) {
      console.error('Load teachers error:', error);
      // 如果新 API 失败，回退到旧 API
      try {
        const fallbackResponse = await userManagementApi.getTeachers();
        setTeachers(fallbackResponse.data || []);
      } catch (fallbackError) {
        console.error('Fallback load teachers error:', fallbackError);
      }
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
        scope_level: values.scope_level,
        district_id: values.district_id,
        school_id: values.school_id,
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

  const handleDelete = async (permissionId: number) => {
    try {
      await permissionApi.deletePermission(permissionId);
      message.success('删除权限成功');
      loadPermissions();
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的权限');
      return;
    }

    try {
      const result = await permissionApi.batchDeletePermissions(selectedRowKeys as number[]);
      message.success(result.message || '批量删除完成');
      setSelectedRowKeys([]);
      loadPermissions();
    } catch (error: any) {
      message.error(error.response?.data?.error || '批量删除失败');
    }
  };

  const isPermissionInactive = (permission: Permission): boolean => {
    const now = new Date();
    const expired = permission.expires_at ? new Date(permission.expires_at) < now : false;
    return !permission.is_active || expired;
  };

  const getAvailablePermissionTypes = () => {
    // 区级管理员可授予的权限
    if (currentUserRole === 'district_admin') {
      return [
        {
          value: 'practice_district_review',
          label: <><Tag color="cyan">区级练习题库审核</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 区级管理员可授予</span></>
        },
        {
          value: 'practice_publish_district',
          label: <><Tag color="green">区级练习发布</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 允许发布区级练习活动</span></>
        },
        {
          value: 'practice_publish_school',
          label: <><Tag color="green">校级练习发布</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 允许发布校级练习活动</span></>
        }
      ];
    }

    // 校级管理员可授予的权限
    if (currentUserRole === 'school_admin' || currentUserRole === 'base_school_admin' || currentUserRole === 'municipal_school_admin') {
      return [
        {
          value: 'practice_publish_school',
          label: <><Tag color="green">校级练习发布</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 允许发布校级练习活动</span></>
        }
      ];
    }

    // 市级/系统管理员可以授予所有权限
    if (currentUserRole === 'municipal_admin' || currentUserRole === 'system_admin') {
      return [
        // 审核权限
        {
          value: 'assessment_review',
          label: <><Tag color="orange">测评题库审核</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 市级/系统管理员专用</span></>
        },
        {
          value: 'practice_municipal_review',
          label: <><Tag color="blue">市级练习题库审核</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 市级/系统管理员专用</span></>
        },
        {
          value: 'practice_district_review',
          label: <><Tag color="cyan">区级练习题库审核</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 区级管理员可授予</span></>
        },
        {
          value: 'competition_review',
          label: <><Tag color="red">竞赛题库审核</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 竞赛专用</span></>
        },
        // 练习发布权限
        {
          value: 'practice_publish_municipal',
          label: <><Tag color="purple">市级练习发布</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 允许发布市级练习活动</span></>
        },
        {
          value: 'practice_publish_district',
          label: <><Tag color="green">区级练习发布</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 允许发布区级练习活动</span></>
        },
        {
          value: 'practice_publish_school',
          label: <><Tag color="green">校级练习发布</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 允许发布校级练习活动</span></>
        },
        {
          value: 'practice_publish_base_school',
          label: <><Tag color="green">基地学校练习发布</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 允许发布基地学校练习活动</span></>
        },
        {
          value: 'practice_publish_municipal_school',
          label: <><Tag color="green">市直学校练习发布</Tag><span style={{ color: '#999', marginLeft: 8 }}>- 允许发布市直学校练习活动</span></>
        }
      ];
    }

    // 默认返回空数组
    return [];
  };

  const getPermissionTypeText = (type: string) => {
    const types: Record<string, { text: string; color: string }> = {
      // 审核权限
      question_bank_review: { text: '练习题库审核（旧）', color: 'default' },
      assessment_review: { text: '测评题库审核', color: 'orange' },
      practice_municipal_review: { text: '市级练习审核', color: 'blue' },
      practice_district_review: { text: '区级练习审核', color: 'cyan' },
      competition_review: { text: '竞赛题库审核', color: 'red' },
      // 练习发布权限
      practice_publish_municipal: { text: '市级练习发布', color: 'purple' },
      practice_publish_district: { text: '区级练习发布', color: 'green' },
      practice_publish_school: { text: '校级练习发布', color: 'green' },
      practice_publish_base_school: { text: '基地学校练习发布', color: 'green' },
      practice_publish_municipal_school: { text: '市直学校练习发布', color: 'green' },
    };
    return types[type] || { text: type, color: 'default' };
  };

  const getScopeLevelText = (level?: string) => {
    const levels: Record<string, { text: string; color: string }> = {
      municipal: { text: '市级', color: 'blue' },
      district: { text: '区级', color: 'cyan' },
      school: { text: '校级', color: 'green' },
    };
    return levels[level || 'municipal'] || { text: level || '-', color: 'default' };
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
      title: '权限层级',
      dataIndex: 'scope_level',
      key: 'scope_level',
      width: 100,
      render: (level?: string) => {
        const config = getScopeLevelText(level);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '区域',
      dataIndex: 'district_name',
      key: 'district_name',
      width: 100,
      render: (text: string) => {
        if (text) {
          return <Tag color="geekblue">{text}</Tag>;
        }
        return <span style={{ color: '#999' }}>全市</span>;
      },
    },
    {
      title: '学校',
      dataIndex: 'school_name',
      key: 'school_name',
      width: 120,
      render: (text: string) => {
        if (text) {
          return <Tag color="green">{text}</Tag>;
        }
        return <span style={{ color: '#999' }}>-</span>;
      },
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
      render: (_: any, record: Permission) => {
        const inactive = isPermissionInactive(record);

        return (
          <Space size="small">
            <Tooltip title={inactive ? '编辑以恢复权限' : '编辑'}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditClick(record)}
              />
            </Tooltip>
            {inactive ? (
              <Popconfirm
                title="确定要删除此权限吗？"
                description="已失效的权限可以删除"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Tooltip title="删除">
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            ) : (
              <Popconfirm
                title="确定要撤销此权限吗？"
                description="撤销后权限将失效"
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
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Card
        title="权限管理"
        extra={
          <Space>
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`确定要批量删除选中的 ${selectedRowKeys.length} 个权限吗？`}
                description="只有已失效的权限会被删除"
                onConfirm={handleBatchDelete}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                >
                  批量删除 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleGrantClick}
            >
              授予权限
            </Button>
          </Space>
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
              rowSelection={{
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys),
                getCheckboxProps: (record: Permission) => ({
                  // 只允许选择已失效的权限进行批量删除
                  disabled: !isPermissionInactive(record),
                }),
              }}
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条权限记录`,
              }}
              scroll={{ x: 1520 }}
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
              {getAvailablePermissionTypes().map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
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
              options={SUBJECTS}
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
            <li><strong>题库审核权限</strong>：</li>
            <ul style={{ paddingLeft: 20, marginTop: 4 }}>
              <li>测评题库审核：可审核测评题库的题目，市级/系统管理员可授予</li>
              <li>市级练习题库审核：可审核市级练习题库，市级/系统管理员可授予</li>
              <li>区级练习题库审核：可审核本区练习题库，区级管理员可授予本区教师</li>
            </ul>
            <li><strong>练习发布权限</strong>：</li>
            <ul style={{ paddingLeft: 20, marginTop: 4 }}>
              <li>班级练习：所有教师都可以创建，无需授权</li>
              <li>校级/区级/市级练习发布：需要相应权限才能发布</li>
              <li>管理员默认有对应级别的发布权限，可以授予给管辖内的教师</li>
            </ul>
            <li>权限与科目相关联，只能操作指定科目的题目/活动</li>
            <li>区级管理员授权时，系统会自动关联管理员所在区域</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default PermissionManagement;
