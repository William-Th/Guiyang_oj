import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Spin, message } from 'antd';
import { UserOutlined, FileTextOutlined, TrophyOutlined, TeamOutlined } from '@ant-design/icons';
import api from '@/services/api';

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

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard statistics
  useEffect(() => {
    fetchStats();
  }, []);

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

  const columns = [
    { title: '考试名称', dataIndex: 'name', key: 'name' },
    { title: '参与人数', dataIndex: 'participants', key: 'participants' },
    { title: '平均分', dataIndex: 'avgScore', key: 'avgScore' },
    { title: '日期', dataIndex: 'date', key: 'date' },
  ];

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
      <h2>数据概览</h2>
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
              valueStyle={{ color: '#1677ff' }}
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

export default AdminOverview;
