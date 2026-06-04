import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tabs, Spin, message } from 'antd';
import { UserOutlined, FileTextOutlined, TrophyOutlined, TeamOutlined, SettingOutlined, BookOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import UserManagement from './UserManagement';
import QuestionBankPage from '../teacher/QuestionBankPage';
import api from '@/services/api';

const { TabPane } = Tabs;

interface DashboardStats {
  totalStudents: number;
  totalExams: number;
  thisMonthExams: number;
  onlineTeachers: number;
  recentExams: Array<{
    id: number;
    name: string;
    participants: number;
    avgScore: number;
    date: string;
  }>;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查是否为教师或管理员角色
  const isTeacherOrAdmin = () => {
    const teacherAdminRoles = ['teacher', 'school_admin', 'district_admin',
      'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'];
    return user && teacherAdminRoles.includes(user.role);
  };

  // 检查是否为管理员角色（不包括普通教师）
  const isAdmin = () => {
    const adminRoles = ['school_admin', 'district_admin', 'municipal_school_admin',
      'base_school_admin', 'municipal_admin', 'system_admin'];
    return user && adminRoles.includes(user.role);
  };

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/dashboard/stats');
        setStats(response.data);
      } catch (error: any) {
        console.error('Failed to fetch dashboard stats:', error);
        message.error('获取统计数据失败');
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'overview') {
      fetchStats();
    }
  }, [activeTab]);

  const columns = [
    { title: '考试名称', dataIndex: 'name', key: 'name' },
    { title: '参与人数', dataIndex: 'participants', key: 'participants' },
    { title: '平均分', dataIndex: 'avgScore', key: 'avgScore' },
    { title: '日期', dataIndex: 'date', key: 'date' },
  ];

  const renderOverview = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="加载统计数据..." />
        </div>
      );
    }

    if (!stats) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>无法加载统计数据</p>
        </div>
      );
    }

    return (
      <div>
        <h2>管理后台</h2>
        <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总学生数"
                value={stats.totalStudents}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总考试数"
                value={stats.totalExams}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#16a34a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="本月考试"
                value={stats.thisMonthExams}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="在线教师"
                value={stats.onlineTeachers}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="最近考试" style={{ marginTop: '24px' }}>
          <Table
            columns={columns}
            dataSource={stats.recentExams}
            rowKey="id"
            pagination={false}
          />
        </Card>
      </div>
    );
  };

  return (
    <Tabs activeKey={activeTab} onChange={setActiveTab}>
      <TabPane tab="数据概览" key="overview">
        {renderOverview()}
      </TabPane>
      {/* 题库管理选项卡 - 教师和管理员可见 */}
      {isTeacherOrAdmin() && (
        <TabPane tab={
          <span>
            <BookOutlined />
            题库管理
          </span>
        } key="question-bank">
          <QuestionBankPage />
        </TabPane>
      )}
      {/* 用户管理选项卡 - 仅管理员可见 */}
      {isAdmin() && (
        <TabPane tab={
          <span>
            <TeamOutlined />
            用户管理
          </span>
        } key="users">
          <UserManagement />
        </TabPane>
      )}
      {/* 权限管理选项卡 - 仅管理员可见 */}
      {isAdmin() && (
        <TabPane tab={
          <span>
            <SettingOutlined />
            权限管理
          </span>
        } key="permissions">
          <div>
            <h2>权限管理</h2>
            <p>权限管理功能开发中...</p>
          </div>
        </TabPane>
      )}
    </Tabs>
  );
};

export default AdminDashboard;