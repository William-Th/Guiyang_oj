import React from 'react';
import { Layout, Avatar, Button, Drawer, Dropdown, Space, Menu } from 'antd';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
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
  StarOutlined,
  BarChartOutlined,
  SolutionOutlined,
  ThunderboltOutlined,
  FireOutlined,
  ShoppingOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import NotificationBell from '../common/NotificationBell';
import { ColoredName } from '@/hooks/useEquippedNameColor';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/authSlice';
import type { MenuProps } from 'antd';
import { isAdminRole, PERMISSION_ADMIN_ROLES } from '@/auth/roles';

const { Header, Content, Footer } = Layout;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, token, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [mobileNavigationOpen, setMobileNavigationOpen] = React.useState(false);

  // 身份验证守卫：同步判断，未登录直接重定向，避免首次渲染闪现内容（修复 BUG-001）
  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 检查是否为管理员角色
  const isAdmin = () => isAdminRole(user.role);

  // 检查是否为教师角色
  const isTeacher = () => {
    return user && user.role === 'teacher';
  };

  // 检查是否为学生角色
  const isStudent = () => {
    return user && user.role === 'student';
  };

  // 检查是否为家长角色
  const isParent = () => {
    return user && user.role === 'parent';
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

  // 检查是否有权限管理权限（区级及以上管理员）
  const hasPermissionManagementAccess = () => {
    return PERMISSION_ADMIN_ROLES.includes(
      user.role as (typeof PERMISSION_ADMIN_ROLES)[number]
    );
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
        key: '/admin/approval-center',
        icon: <AuditOutlined />,
        label: '审批中心',
      },
      {
        key: '/admin/question-governance',
        icon: <AuditOutlined />,
        label: '题库治理',
      },
    ];

    // 仅对区级及以上管理员显示权限管理
    if (hasPermissionManagementAccess()) {
      items.push({
        key: '/admin/permissions',
        icon: <SettingOutlined />,
        label: '权限管理',
      });
    }

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
      label: '活动管理',
    },
    {
      key: '/teacher/teaching-classes',
      icon: <SolutionOutlined />,
      label: '教学班管理',
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
      key: '/teacher/error-reports',
      icon: <AuditOutlined />,
      label: '纠错处理',
    },
    {
      key: '/teacher/grading',
      icon: <AuditOutlined />,
      label: '评卷管理',
    },
    {
      key: '/teacher/data-analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
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
      key: '/student/smart-practice',
      icon: <ThunderboltOutlined />,
      label: '智能练习',
    },
    {
      key: '/student/assessments',
      icon: <BookOutlined />,
      label: '测评中心',
    },
    {
      key: '/student/wrong-questions',
      icon: <FireOutlined />,
      label: '错题集',
    },
    {
      key: '/student/statistics',
      icon: <BarChartOutlined />,
      label: '学习统计',
    },
    {
      key: '/student/achievements',
      icon: <TrophyOutlined />,
      label: '我的成就',
    },
    {
      key: '/student/points',
      icon: <StarOutlined />,
      label: '我的积分',
    },
    {
      key: '/student/shop',
      icon: <ShoppingOutlined />,
      label: '积分商店',
    },
  ];

  // 家长菜单项
  const parentMenuItems = [
    {
      key: '/parent/dashboard',
      icon: <TeamOutlined />,
      label: '孩子学习',
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
    if (path.includes('/admin/approval-center')) return '/admin/approval-center';
    if (path.includes('/admin/question-governance')) return '/admin/question-governance';
    if (path.includes('/admin/permissions')) return '/admin/permissions';
    if (path.includes('/admin/achievements')) return '/admin/achievements';
    return '/admin/home';
  };

  // 获取当前选中的菜单项（教师）
  const getTeacherSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/teacher/activities')) return '/teacher/activities';
    if (path.includes('/teacher/teaching-classes')) return '/teacher/teaching-classes';
    if (path.includes('/teacher/question-bank')) return '/teacher/question-bank';
    if (path.includes('/teacher/review-workbench')) return '/teacher/review-workbench';
    if (path.includes('/teacher/error-reports')) return '/teacher/error-reports';
    if (path.includes('/teacher/grading')) return '/teacher/grading';
    if (path.includes('/teacher/data-analytics')) return '/teacher/data-analytics';
    if (path === '/') return '/';
    return '/';
  };

  // 获取当前选中的菜单项（学生）
  const getStudentSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/student/practice')) return '/student/practice';
    if (path.includes('/student/smart-practice')) return '/student/smart-practice';
    if (path.includes('/student/assessments')) return '/student/assessments';
    if (path.includes('/student/wrong-questions')) return '/student/wrong-questions';
    if (path.includes('/student/statistics')) return '/student/statistics';
    if (path.includes('/student/achievements')) return '/student/achievements';
    if (path.includes('/student/points')) return '/student/points';
    if (path.includes('/student/shop')) return '/student/shop';
    if (path === '/') return '/';
    return '/';
  };

  const getNavigation = (): { items: MenuProps['items']; selectedKeys: string[] } | null => {
    if (isAdmin()) return { items: getAdminMenuItems(), selectedKeys: [getAdminSelectedKey()] };
    if (isTeacher()) return { items: teacherMenuItems, selectedKeys: [getTeacherSelectedKey()] };
    if (isStudent()) return { items: studentMenuItems, selectedKeys: [getStudentSelectedKey()] };
    if (isParent()) return { items: parentMenuItems, selectedKeys: [location.pathname] };
    return null;
  };

  const navigation = getNavigation();
  const handleNavigationClick: MenuProps['onClick'] = (e) => {
    setMobileNavigationOpen(false);
    navigate(e.key);
  };

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        {navigation && (
          <Button
            className="app-mobile-navigation-trigger"
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileNavigationOpen(true)}
            aria-label="打开导航菜单"
          />
        )}

        <div className="app-brand" aria-label="贵阳市小学生测评平台">
          <span className="app-brand-mark" aria-hidden="true">
            <ThunderboltOutlined />
          </span>
          <span className="app-brand-name">贵阳市小学生测评平台</span>
        </div>

        {navigation && (
          <Menu
            className="app-desktop-navigation"
            mode="horizontal"
            selectedKeys={navigation.selectedKeys}
            items={navigation.items}
            onClick={handleNavigationClick}
          />
        )}

        {/* 右侧区域：通知铃铛和用户菜单 */}
        <Space className="app-header-user" size="middle">
          {/* 通知铃铛 */}
          <NotificationBell />

          {/* 用户菜单 */}
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleMenuClick }}
            placement="bottomRight"
          >
            <Space className="app-user-menu-trigger">
              <Avatar icon={<UserOutlined />} />
              <span className="app-user-name">
                <ColoredName name={user?.realName || user?.username || '用户'} />
              </span>
            </Space>
          </Dropdown>
        </Space>
      </Header>
      {navigation && (
        <Drawer
          rootClassName="app-mobile-navigation-drawer"
          title="功能导航"
          placement="left"
          open={mobileNavigationOpen}
          onClose={() => setMobileNavigationOpen(false)}
          width={280}
        >
          <Menu
            mode="inline"
            selectedKeys={navigation.selectedKeys}
            items={navigation.items}
            onClick={handleNavigationClick}
          />
        </Drawer>
      )}
      <Content className="app-content">
        <div className="app-page-surface">
          <Outlet />
        </div>
      </Content>
      <Footer className="app-footer">
        贵阳市教育局 ©2024 小学生测评服务平台
      </Footer>
    </Layout>
  );
};

export default MainLayout;
