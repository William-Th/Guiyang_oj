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
import TeacherDashboard from './teacher/TeacherDashboard';
import AdminOverview from './admin/AdminOverview';
import QuestionBankPage from './teacher/QuestionBankPage';
import UserManagement from './admin/UserManagement';
import PermissionManagement from './admin/PermissionManagement';

const { TabPane } = Tabs;

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

  // 如果是普通教师，显示教师工作台
  if (isTeacher()) {
    return (
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <DashboardOutlined />
              工作台
            </span>
          }
          key="overview"
        >
          <TeacherDashboard />
        </TabPane>
        <TabPane
          tab={
            <span>
              <BookOutlined />
              题库管理
            </span>
          }
          key="question-bank"
        >
          <QuestionBankPage />
        </TabPane>
      </Tabs>
    );
  }

  // 如果是管理员，显示完整的管理后台
  if (isAdmin()) {
    return (
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <DashboardOutlined />
              数据概览
            </span>
          }
          key="overview"
        >
          <AdminOverview />
        </TabPane>
        <TabPane
          tab={
            <span>
              <BookOutlined />
              题库管理
            </span>
          }
          key="question-bank"
        >
          <QuestionBankPage />
        </TabPane>
        <TabPane
          tab={
            <span>
              <TeamOutlined />
              用户管理
            </span>
          }
          key="users"
        >
          <UserManagement />
        </TabPane>
        <TabPane
          tab={
            <span>
              <SettingOutlined />
              权限管理
            </span>
          }
          key="permissions"
        >
          <PermissionManagement />
        </TabPane>
      </Tabs>
    );
  }

  return null;
};

export default AdminTeacherDashboard;
