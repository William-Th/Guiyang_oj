import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { userManagementApi } from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const { Option } = Select;
const { Title } = Typography;

type UserRole = 'student' | 'teacher' | 'school_admin' | 'district_admin' | 'municipal_school_admin' | 'base_school_admin' | 'municipal_admin' | 'system_admin';

interface User {
  id: number;
  username: string;
  role: UserRole;
  real_name: string;
  id_card?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  school_name?: string;
  school_id?: number;
  district_name?: string;
  district_id?: number;
}

interface UserFormData {
  username: string;
  password?: string;
  role: UserRole;
  realName: string;
  idCard?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

// 角色映射：将前端扩展角色转换为API支持的基础角色
const mapRoleToApiRole = (role: UserRole): 'student' | 'teacher' | 'admin' => {
  switch (role) {
    case 'student':
      return 'student';
    case 'teacher':
      return 'teacher';
    case 'school_admin':
    case 'district_admin':
    case 'municipal_school_admin':
    case 'base_school_admin':
    case 'municipal_admin':
    case 'system_admin':
      return 'admin';
    default:
      return 'student';
  }
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [filters, setFilters] = useState<{ role?: string; status?: string }>({});

  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  // Statistics data
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    students: 0,
    teachers: 0,
    schoolAdmins: 0,
    districtAdmins: 0,
    municipalSchoolAdmins: 0,
    baseSchoolAdmins: 0,
    municipalAdmins: 0,
    systemAdmins: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userManagementApi.getAllUsers(filters);
      setUsers(response.users || []);

      // Calculate statistics
      const total = response.users?.length || 0;
      const students = response.users?.filter((u: User) => u.role === 'student').length || 0;
      const teachers = response.users?.filter((u: User) => u.role === 'teacher').length || 0;
      const schoolAdmins = response.users?.filter((u: User) => u.role === 'school_admin').length || 0;
      const districtAdmins = response.users?.filter((u: User) => u.role === 'district_admin').length || 0;
      const municipalSchoolAdmins = response.users?.filter((u: User) => u.role === 'municipal_school_admin').length || 0;
      const baseSchoolAdmins = response.users?.filter((u: User) => u.role === 'base_school_admin').length || 0;
      const municipalAdmins = response.users?.filter((u: User) => u.role === 'municipal_admin').length || 0;
      const systemAdmins = response.users?.filter((u: User) => u.role === 'system_admin').length || 0;
      const active = response.users?.filter((u: User) => u.status === 'active').length || 0;

      setStatistics({
        totalUsers: total,
        students,
        teachers,
        schoolAdmins,
        districtAdmins,
        municipalSchoolAdmins,
        baseSchoolAdmins,
        municipalAdmins,
        systemAdmins,
        activeUsers: active,
      });
    } catch (error) {
      message.error('获取用户列表失败');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setModalVisible(true);
    form.resetFields();
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setModalVisible(true);
    form.setFieldsValue({
      username: user.username,
      realName: user.real_name,
      role: user.role,
      status: user.status,
      phone: user.phone,
      email: user.email,
      idCard: user.id_card,
    });
  };

  const handleDeleteUser = async (userId: number, userRole: UserRole) => {
    try {
      // 根据用户角色调用不同的删除API（处理外键约束）
      if (userRole === 'student') {
        await userManagementApi.deleteStudent(userId);
        message.success('学生账号删除成功');
      } else if (userRole === 'teacher') {
        await userManagementApi.deleteTeacher(userId);
        message.success('教师账号删除成功');
      } else {
        // 管理员账号使用通用删除API
        await userManagementApi.deleteUser(userId);
        message.success('用户删除成功');
      }
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除用户失败');
    }
  };

  const handleResetPassword = (userId: number) => {
    setResetPasswordUserId(userId);
    setPasswordModalVisible(true);
    passwordForm.resetFields();
  };

  const handleSubmit = async (values: UserFormData) => {
    try {
      if (editingUser) {
        // Update user
        const updateData = {
          realName: values.realName,
          role: mapRoleToApiRole(values.role),
          status: values.status,
          phone: values.phone,
          email: values.email,
        };
        await userManagementApi.updateUser(editingUser.id, updateData);
        message.success('用户信息更新成功');
      } else {
        // Create user
        await userManagementApi.createUser({
          username: values.username,
          password: values.password!,
          role: mapRoleToApiRole(values.role),
          realName: values.realName,
          idCard: values.idCard,
          phone: values.phone,
          email: values.email,
        });
        message.success('用户创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handlePasswordReset = async (values: { newPassword: string }) => {
    try {
      if (resetPasswordUserId) {
        await userManagementApi.resetPassword(resetPasswordUserId, values.newPassword);
        message.success('密码重置成功');
        setPasswordModalVisible(false);
        passwordForm.resetFields();
        setResetPasswordUserId(null);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '密码重置失败');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student': return 'green';
      case 'teacher': return 'blue';
      case 'school_admin': return 'orange';
      case 'district_admin': return 'purple';
      case 'municipal_school_admin': return 'cyan';
      case 'base_school_admin': return 'magenta';
      case 'municipal_admin': return 'red';
      case 'system_admin': return 'gold';
      default: return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student': return <UserOutlined />;
      case 'teacher': return <TeamOutlined />;
      case 'school_admin':
      case 'district_admin':
      case 'municipal_school_admin':
      case 'base_school_admin':
      case 'municipal_admin':
      case 'system_admin': return <CrownOutlined />;
      default: return <UserOutlined />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'student': return '学生';
      case 'teacher': return '教师';
      case 'school_admin': return '校级管理员';
      case 'district_admin': return '区级管理员';
      case 'municipal_school_admin': return '市直属学校总管理员';
      case 'base_school_admin': return '基地校管理员';
      case 'municipal_admin': return '市级总管理员';
      case 'system_admin': return '系统总管理员';
      default: return '未知角色';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: '真实姓名',
      dataIndex: 'real_name',
      key: 'real_name',
      width: 120,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={getRoleColor(role)} icon={getRoleIcon(role)}>
          {getRoleName(role)}
        </Tag>
      ),
      filters: [
        { text: '学生', value: 'student' },
        { text: '教师', value: 'teacher' },
        { text: '校级管理员', value: 'school_admin' },
        { text: '区级管理员', value: 'district_admin' },
        { text: '市直属学校总管理员', value: 'municipal_school_admin' },
        { text: '基地校管理员', value: 'base_school_admin' },
        { text: '市级总管理员', value: 'municipal_admin' },
        { text: '系统总管理员', value: 'system_admin' },
      ],
      onFilter: (value: any, record: User) => record.role === value,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge
          status={getStatusColor(status) as any}
          text={status === 'active' ? '活跃' : status === 'inactive' ? '未激活' : '已暂停'}
        />
      ),
      filters: [
        { text: '活跃', value: 'active' },
        { text: '未激活', value: 'inactive' },
        { text: '已暂停', value: 'suspended' },
      ],
      onFilter: (value: any, record: User) => record.status === value,
    },
    {
      title: '学校',
      dataIndex: 'school_name',
      key: 'school_name',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: '区域',
      dataIndex: 'district_name',
      key: 'district_name',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
          >
            编辑
          </Button>
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record.id)}
          >
            重置密码
          </Button>
          {record.id !== Number(currentUser?.id) && (
            <Popconfirm
              title="确定要删除这个用户吗？"
              description="删除后将无法恢复"
              onConfirm={() => handleDeleteUser(record.id, record.role)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                data-testid={`delete-user-${record.id}`}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>用户管理</Title>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={statistics.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="学生"
              value={statistics.students}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="教师"
              value={statistics.teachers}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={statistics.activeUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Admin Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="校级管理员"
              value={statistics.schoolAdmins}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="区级管理员"
              value={statistics.districtAdmins}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="基地校管理员"
              value={statistics.baseSchoolAdmins}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="市级管理员"
              value={statistics.municipalAdmins + statistics.municipalSchoolAdmins}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="系统总管理员"
              value={statistics.systemAdmins}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateUser}
            >
              新建用户
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchUsers}
            >
              刷新
            </Button>
          </Space>

          <Space>
            <Select
              placeholder="筛选角色"
              allowClear
              style={{ width: 180 }}
              onChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
            >
              <Option value="student">学生</Option>
              <Option value="teacher">教师</Option>
              <Option value="school_admin">校级管理员</Option>
              <Option value="district_admin">区级管理员</Option>
              <Option value="municipal_school_admin">市直属学校总管理员</Option>
              <Option value="base_school_admin">基地校管理员</Option>
              <Option value="municipal_admin">市级总管理员</Option>
              <Option value="system_admin">系统总管理员</Option>
            </Select>
            <Select
              placeholder="筛选状态"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <Option value="active">活跃</Option>
              <Option value="inactive">未激活</Option>
              <Option value="suspended">已暂停</Option>
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            total: users.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create/Edit User Modal */}
      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                ]}
              >
                <Input placeholder="请输入用户名" disabled={!!editingUser} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="realName"
                label="真实姓名"
                rules={[{ required: true, message: '请输入真实姓名' }]}
              >
                <Input placeholder="请输入真实姓名" />
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  <Option value="student">学生</Option>
                  <Option value="teacher">教师</Option>
                  <Option value="school_admin">校级管理员</Option>
                  <Option value="district_admin">区级管理员</Option>
                  <Option value="municipal_school_admin">市直属学校总管理员</Option>
                  <Option value="base_school_admin">基地校管理员</Option>
                  <Option value="municipal_admin">市级总管理员</Option>
                  <Option value="system_admin">系统总管理员</Option>
                </Select>
              </Form.Item>
            </Col>
            {editingUser && (
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="状态"
                  rules={[{ required: true, message: '请选择状态' }]}
                >
                  <Select placeholder="请选择状态">
                    <Option value="active">活跃</Option>
                    <Option value="inactive">未激活</Option>
                    <Option value="suspended">已暂停</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="手机号"
                rules={[
                  {
                    pattern: /^1[3-9]\d{9}$/,
                    message: '请输入正确的手机号格式',
                  },
                ]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  {
                    type: 'email',
                    message: '请输入正确的邮箱格式',
                  },
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="idCard"
            label="身份证号"
            rules={[
              {
                pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
                message: '请输入正确的身份证号格式',
              },
            ]}
          >
            <Input placeholder="请输入身份证号（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title="重置用户密码"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
          setResetPasswordUserId(null);
        }}
        onOk={() => passwordForm.submit()}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordReset}
        >
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;