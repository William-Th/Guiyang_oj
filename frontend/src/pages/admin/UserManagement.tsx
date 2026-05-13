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

// 角色层级定义（数字越大，权限越高）
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'student': 1,
  'teacher': 2,
  'school_admin': 3,
  'municipal_school_admin': 4,
  'base_school_admin': 4,
  'district_admin': 5,
  'municipal_admin': 6,
  'system_admin': 7,
};

// 角色选项配置
const ROLE_OPTIONS = [
  { value: 'student', label: '学生', level: 1 },
  { value: 'teacher', label: '教师', level: 2 },
  { value: 'school_admin', label: '校级管理员', level: 3 },
  { value: 'municipal_school_admin', label: '市直属学校管理员', level: 4 },
  { value: 'base_school_admin', label: '基地校管理员', level: 4 },
  { value: 'district_admin', label: '区级管理员', level: 5 },
  { value: 'municipal_admin', label: '市级总管理员', level: 6 },
  { value: 'system_admin', label: '系统总管理员', level: 7 },
];

// 获取当前用户可以管理的角色列表
const getManageableRoles = (currentUserRole: UserRole): typeof ROLE_OPTIONS => {
  const currentLevel = ROLE_HIERARCHY[currentUserRole];
  // 只能管理低于自己等级的角色
  return ROLE_OPTIONS.filter(option => option.level < currentLevel);
};

// 获取当前用户可以查看/筛选的角色列表
const getViewableRoles = (currentUserRole: UserRole): Array<{ text: string; value: string }> => {
  switch (currentUserRole) {
    case 'school_admin':
    case 'base_school_admin':
    case 'municipal_school_admin':
      // 校级管理员：只能查看学生、老师
      return [
        { text: '学生', value: 'student' },
        { text: '教师', value: 'teacher' },
      ];

    case 'district_admin':
      // 区级管理员：可以查看学生、老师、校级管理员、基地校管理员
      return [
        { text: '学生', value: 'student' },
        { text: '教师', value: 'teacher' },
        { text: '校级管理员', value: 'school_admin' },
        { text: '基地校管理员', value: 'base_school_admin' },
      ];

    case 'municipal_admin':
      // 市级管理员：可以查看除系统管理员外的所有角色
      return [
        { text: '学生', value: 'student' },
        { text: '教师', value: 'teacher' },
        { text: '校级管理员', value: 'school_admin' },
        { text: '区级管理员', value: 'district_admin' },
        { text: '市直属学校管理员', value: 'municipal_school_admin' },
        { text: '基地校管理员', value: 'base_school_admin' },
        { text: '市级总管理员', value: 'municipal_admin' },
      ];

    case 'system_admin':
      // 系统管理员：可以查看所有角色
      return [
        { text: '学生', value: 'student' },
        { text: '教师', value: 'teacher' },
        { text: '校级管理员', value: 'school_admin' },
        { text: '区级管理员', value: 'district_admin' },
        { text: '市直属学校管理员', value: 'municipal_school_admin' },
        { text: '基地校管理员', value: 'base_school_admin' },
        { text: '市级总管理员', value: 'municipal_admin' },
        { text: '系统总管理员', value: 'system_admin' },
      ];

    default:
      return [];
  }
};

interface UserFormData {
  username: string;
  password?: string;
  role: UserRole;
  realName: string;
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
  const [searchText, setSearchText] = useState<string>('');

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

  // 检查当前用户是否有权限查看某个角色的统计
  const canViewRoleStats = (role: string): boolean => {
    const viewableRoles = getViewableRoles(currentUser?.role as UserRole);
    return viewableRoles.some(r => r.value === role);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userManagementApi.getAllUsers(filters);
      setUsers(response.users || []);

      // Get viewable roles for current user
      const viewableRoles = getViewableRoles(currentUser?.role as UserRole);
      const viewableRoleValues = viewableRoles.map(r => r.value);

      // Calculate statistics - only for roles current user can view
      const total = response.users?.length || 0;
      const students = viewableRoleValues.includes('student')
        ? response.users?.filter((u: User) => u.role === 'student').length || 0
        : 0;
      const teachers = viewableRoleValues.includes('teacher')
        ? response.users?.filter((u: User) => u.role === 'teacher').length || 0
        : 0;
      const schoolAdmins = viewableRoleValues.includes('school_admin')
        ? response.users?.filter((u: User) => u.role === 'school_admin').length || 0
        : 0;
      const districtAdmins = viewableRoleValues.includes('district_admin')
        ? response.users?.filter((u: User) => u.role === 'district_admin').length || 0
        : 0;
      const municipalSchoolAdmins = viewableRoleValues.includes('municipal_school_admin')
        ? response.users?.filter((u: User) => u.role === 'municipal_school_admin').length || 0
        : 0;
      const baseSchoolAdmins = viewableRoleValues.includes('base_school_admin')
        ? response.users?.filter((u: User) => u.role === 'base_school_admin').length || 0
        : 0;
      const municipalAdmins = viewableRoleValues.includes('municipal_admin')
        ? response.users?.filter((u: User) => u.role === 'municipal_admin').length || 0
        : 0;
      const systemAdmins = viewableRoleValues.includes('system_admin')
        ? response.users?.filter((u: User) => u.role === 'system_admin').length || 0
        : 0;
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
    // 检查权限：不能编辑高于或等于自己权限的用户
    const currentUserLevel = ROLE_HIERARCHY[currentUser?.role as UserRole] || 0;
    const targetUserLevel = ROLE_HIERARCHY[user.role];

    if (targetUserLevel >= currentUserLevel) {
      message.warning('您无权编辑该用户，该用户权限高于或等于您的权限');
      return;
    }

    setEditingUser(user);
    setModalVisible(true);
    form.setFieldsValue({
      username: user.username,
      realName: user.real_name,
      role: user.role,
      status: user.status,
      phone: user.phone,
      email: user.email,
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
      case 'municipal_school_admin': return '市直属学校管理员';
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

  // 过滤用户数据（基于搜索文本）
  const filteredUsers = users.filter(user => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      user.phone?.toLowerCase().includes(search) ||
      user.real_name?.toLowerCase().includes(search) ||
      user.school_name?.toLowerCase().includes(search)
    );
  });

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
      title: '姓名',
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
      filters: getViewableRoles(currentUser?.role as UserRole),
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
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        {canViewRoleStats('student') && (
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="学生"
                value={statistics.students}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#22c55e' }}
              />
            </Card>
          </Col>
        )}
        {canViewRoleStats('teacher') && (
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="教师"
                value={statistics.teachers}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#16a34a' }}
              />
            </Card>
          </Col>
        )}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={statistics.activeUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Admin Statistics */}
      {(canViewRoleStats('school_admin') ||
        canViewRoleStats('district_admin') ||
        canViewRoleStats('base_school_admin') ||
        canViewRoleStats('municipal_school_admin') ||
        canViewRoleStats('municipal_admin') ||
        canViewRoleStats('system_admin')) && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {canViewRoleStats('school_admin') && (
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="校级管理员"
                  value={statistics.schoolAdmins}
                  prefix={<CrownOutlined />}
                  valueStyle={{ color: '#f59e0b' }}
                />
              </Card>
            </Col>
          )}
          {canViewRoleStats('district_admin') && (
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="区级管理员"
                  value={statistics.districtAdmins}
                  prefix={<CrownOutlined />}
                  valueStyle={{ color: '#16a34a' }}
                />
              </Card>
            </Col>
          )}
          {canViewRoleStats('base_school_admin') && (
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="基地校管理员"
                  value={statistics.baseSchoolAdmins}
                  prefix={<CrownOutlined />}
                  valueStyle={{ color: '#16a34a' }}
                />
              </Card>
            </Col>
          )}
          {(canViewRoleStats('municipal_admin') || canViewRoleStats('municipal_school_admin')) && (
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="市级管理员"
                  value={statistics.municipalAdmins + statistics.municipalSchoolAdmins}
                  prefix={<CrownOutlined />}
                  valueStyle={{ color: '#ef4444' }}
                />
              </Card>
            </Col>
          )}
          {canViewRoleStats('system_admin') && (
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="系统总管理员"
                  value={statistics.systemAdmins}
                  prefix={<CrownOutlined />}
                  valueStyle={{ color: '#f59e0b' }}
                />
              </Card>
            </Col>
          )}
        </Row>
      )}

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
            <Input.Search
              placeholder="搜索手机号/姓名/学校"
              allowClear
              style={{ width: 250 }}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(value) => setSearchText(value)}
            />
          </Space>

          <Space>
            <Select
              placeholder="筛选角色"
              allowClear
              style={{ width: 180 }}
              onChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
            >
              {getViewableRoles(currentUser?.role as UserRole).map(role => (
                <Option key={role.value} value={role.value}>{role.text}</Option>
              ))}
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
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredUsers.length,
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
                tooltip={editingUser?.role === 'student' ? '学生角色不可更改' : '只能设置低于自己权限的角色'}
              >
                <Select
                  placeholder="请选择角色"
                  disabled={editingUser?.role === 'student'}
                >
                  {getManageableRoles(currentUser?.role as UserRole).map(roleOption => (
                    <Option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </Option>
                  ))}
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