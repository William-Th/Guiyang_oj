import React from 'react';
import { Layout, Avatar, Dropdown, Space, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
  DashboardOutlined,
  BookOutlined,
  TeamOutlined,
  SettingOutlined,
  ProjectOutlined,
  AuditOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/authSlice';
import type { MenuProps } from 'antd';

const { Header, Content, Footer } = Layout;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  // 检查是否为管理员角色
  const isAdmin = () => {
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin',
      'base_school_admin', 'municipal_admin', 'system_admin'];
    return user && adminRoles.includes(user.role);
  };

  // 检查是否为教师角色
  const isTeacher = () => {
    return user && user.role === 'teacher';
  };

  // 检查是否为学生角色
  const isStudent = () => {
    return user && user.role === 'student';
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      dispatch(logout());
      navigate('/login');
    } else if (key === 'profile') {
      navigate('/profile');
    }
  };

  // 检查是否有成就管理权限（仅system_admin和municipal_admin）
  const hasAchievementPermission = () => {
    return user && (user.role === 'system_admin' || user.role === 'municipal_admin');
  };

  // 管理员导航菜单项
  const getAdminMenuItems = (): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: '/admin/home',
        icon: <HomeOutlined />,
        label: '首页',
      },
      {
        key: '/admin/overview',
        icon: <DashboardOutlined />,
        label: '数据概览',
      },
      {
        key: '/admin/assessments',
        icon: <ProjectOutlined />,
        label: '活动管理',
      },
      {
        key: '/admin/question-bank',
        icon: <BookOutlined />,
        label: '题库管理',
      },
      {
        key: '/admin/users',
        icon: <TeamOutlined />,
        label: '用户管理',
      },
      {
        key: '/admin/permissions',
        icon: <SettingOutlined />,
        label: '权限管理',
      },
      {
        key: '/admin/registration-approval',
        icon: <AuditOutlined />,
        label: '注册审核',
      },
    ];

    // 仅对system_admin和municipal_admin显示成就管理
    if (hasAchievementPermission()) {
      items.push({
        key: '/admin/achievements',
        icon: <TrophyOutlined />,
        label: '成就管理',
      });
    }

    return items;
  };

  // 教师导航菜单项
  const teacherMenuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/teacher/activities',
      icon: <ProjectOutlined />,
      label: '练习管理',
    },
    {
      key: '/teacher/question-bank',
      icon: <BookOutlined />,
      label: '题库管理',
    },
    {
      key: '/teacher/review-workbench',
      icon: <AuditOutlined />,
      label: '审核工作台',
    },
    {
      key: '/teacher/grading',
      icon: <AuditOutlined />,
      label: '评卷管理',
    },
  ];

  // 学生导航菜单项
  const studentMenuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/student/practice',
      icon: <ProjectOutlined />,
      label: '练习中心',
    },
    {
      key: '/student/assessments',
      icon: <BookOutlined />,
      label: '测评中心',
    },
  ];

  // 获取当前选中的菜单项（管理员）
  const getAdminSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/admin/home')) return '/admin/home';
    if (path.includes('/admin/overview')) return '/admin/overview';
    if (path.includes('/admin/assessments')) return '/admin/assessments';
    if (path.includes('/admin/question-bank')) return '/admin/question-bank';
    if (path.includes('/admin/users')) return '/admin/users';
    if (path.includes('/admin/permissions')) return '/admin/permissions';
    if (path.includes('/admin/achievements')) return '/admin/achievements';
    return '/admin/home';
  };

  // 获取当前选中的菜单项（教师）
  const getTeacherSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/teacher/activities')) return '/teacher/activities';
    if (path.includes('/teacher/question-bank')) return '/teacher/question-bank';
    if (path.includes('/teacher/review-workbench')) return '/teacher/review-workbench';
    if (path.includes('/teacher/grading')) return '/teacher/grading';
    if (path === '/') return '/';
    return '/';
  };

  // 获取当前选中的菜单项（学生）
  const getStudentSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/student/practice')) return '/student/practice';
    if (path.includes('/student/assessments')) return '/student/assessments';
    if (path === '/') return '/';
    return '/';
  };

  // 处理管理员菜单点击
  const handleAdminMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  // 处理教师菜单点击
  const handleTeacherMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  // 处理学生菜单点击
  const handleStudentMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#1677ff', padding: '0 24px' }}>
        <div style={{ color: 'white', fontSize: '20px', marginRight: '48px', whiteSpace: 'nowrap' }}>
          贵阳市小学生测评平台
        </div>

        {/* 管理员导航菜单 */}
        {isAdmin() && (
          <Menu
            mode="horizontal"
            selectedKeys={[getAdminSelectedKey()]}
            items={getAdminMenuItems()}
            onClick={handleAdminMenuClick}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              borderBottom: 'none',
              lineHeight: '64px',
            }}
            theme="dark"
          />
        )}

        {/* 教师导航菜单 */}
        {isTeacher() && (
          <Menu
            mode="horizontal"
            selectedKeys={[getTeacherSelectedKey()]}
            items={teacherMenuItems}
            onClick={handleTeacherMenuClick}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              borderBottom: 'none',
              lineHeight: '64px',
            }}
            theme="dark"
          />
        )}

        {/* 学生导航菜单 */}
        {isStudent() && (
          <Menu
            mode="horizontal"
            selectedKeys={[getStudentSelectedKey()]}
            items={studentMenuItems}
            onClick={handleStudentMenuClick}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              borderBottom: 'none',
              lineHeight: '64px',
            }}
            theme="dark"
          />
        )}

        {/* 用户菜单 */}
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleMenuClick }}
          placement="bottomRight"
        >
          <Space style={{ color: 'white', cursor: 'pointer', marginLeft: 'auto' }}>
            <Avatar icon={<UserOutlined />} />
            <span>{user?.realName || user?.username || '用户'}</span>
          </Space>
        </Dropdown>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', minHeight: '100%' }}>
          <Outlet />
        </div>
      </Content>
      <Footer style={{ textAlign: 'center', background: '#f0f2f5' }}>
        贵阳市教育局 ©2024 小学生测评服务平台
      </Footer>
    </Layout>
  );
};

export default MainLayout;