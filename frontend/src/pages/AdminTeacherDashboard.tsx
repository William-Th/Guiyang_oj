import React, { useState } from 'react';
import { Tabs, Tag } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>{getGreeting()}，{displayName}</h1>
        <Tag color="blue" style={{ marginRight: 0 }}>{isTeacher() ? '教师工作台' : '管理控制台'}</Tag>
      </div>
      <p style={{ marginBottom: 0 }}>{heroSubtitle}</p>
      {isTeacher() && (
        <div className="admin-home__meta">
          <span><UserOutlined style={{ marginRight: 5 }} />{user?.realName || '未设置'}</span>
          <span><PhoneOutlined style={{ marginRight: 5 }} />{user?.phone || '未设置'}</span>
          <span><MailOutlined style={{ marginRight: 5 }} />{user?.email || '未设置'}</span>
        </div>
      )}
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
