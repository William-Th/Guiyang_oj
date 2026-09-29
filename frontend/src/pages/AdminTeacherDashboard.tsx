import React, { useState } from 'react';
import { Tabs } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  TeamOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { getGreeting } from '@/utils/greeting';
import TeacherDashboard from './teacher/TeacherDashboard';
import AdminOverview from './admin/AdminOverview';
import QuestionBankPage from './teacher/QuestionBankPage';
import UserManagement from './admin/UserManagement';
import PermissionManagement from './admin/PermissionManagement';

const AdminTeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useSelector((state: RootState) => state.auth);

  // 检查是否为管理员角色（不包括普通教师）
  const isAdmin = () => {
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin',
      'base_school_admin', 'municipal_admin', 'system_admin'];
    return user && adminRoles.includes(user.role);
  };

  // 检查是否为教师角色
  const isTeacher = () => {
    return user && user.role === 'teacher';
  };

  const displayName = user?.realName || user?.username || (isTeacher() ? '老师' : '管理员');
  const heroSubtitle = isTeacher()
    ? '题库、活动与学情反馈都在这里，今天也从认真出题开始。'
    : '全校的题库、用户与审核动态一目了然，今天的数据已自动汇总。';

  const hero = (
    <div className="admin-home__hero">
      <h1>{getGreeting()}，{displayName}</h1>
      <p>{heroSubtitle}</p>
    </div>
  );

  // 如果是普通教师，显示教师工作台
  if (isTeacher()) {
    return (
      <div>
        {hero}
        <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <DashboardOutlined />
                工作台
              </span>
            ),
            children: <TeacherDashboard />,
          },
          {
            key: 'question-bank',
            label: (
              <span>
                <BookOutlined />
                题库管理
              </span>
            ),
            children: <QuestionBankPage />,
          },
        ]}
      />
      </div>
    );
  }

  // 如果是管理员，显示完整的管理后台
  if (isAdmin()) {
    return (
      <div>
        {hero}
        <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <DashboardOutlined />
                数据概览
              </span>
            ),
            children: <AdminOverview />,
          },
          {
            key: 'question-bank',
            label: (
              <span>
                <BookOutlined />
                题库管理
              </span>
            ),
            children: <QuestionBankPage />,
          },
          {
            key: 'users',
            label: (
              <span>
                <TeamOutlined />
                用户管理
              </span>
            ),
            children: <UserManagement />,
          },
          {
            key: 'permissions',
            label: (
              <span>
                <SettingOutlined />
                权限管理
              </span>
            ),
            children: <PermissionManagement />,
          },
        ]}
      />
      </div>
    );
  }

  return null;
};

export default AdminTeacherDashboard;
