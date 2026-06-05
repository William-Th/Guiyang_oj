import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, List, Tag, Typography, Space, Spin } from 'antd';
import {
  BookOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  TrophyOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { activityApi, statisticsApi } from '../services/api';

const { Text, Title } = Typography;

const StudentHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ available: 0, completed: 0, nextExam: '-' });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [announcements] = useState([
    { id: 1, title: '欢迎使用贵阳市小学生测评平台', type: '系统通知', time: '2026-06-01' },
    { id: 2, title: '2026年春季期末测评即将开始，请同学们做好准备', type: '考试提醒', time: '2026-05-28' },
    { id: 3, title: '信息科技能力认证报名已开放', type: '活动通知', time: '2026-05-25' },
  ]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // 并行获取：可用测评、可用练习、已完成活动历史、学习概览
      const [assessRes, practiceRes, historyRes, overviewRes] = await Promise.all([
        activityApi.getStudentAssessments({}).catch(() => ({ activities: [] })),
        activityApi.getStudentPractices({}).catch(() => ({ practices: [] })),
        activityApi.getStudentHistory({}).catch(() => ({ history: [] })),
        statisticsApi.getStudentOverview().catch(() => ({ success: false, data: null })),
      ]);

      const assessments = assessRes.activities || assessRes.assessments || [];
      const practices = practiceRes.practices || [];
      const history = historyRes.history || [];

      // 统计可参加的活动数量（排除已完成的）
      const availableCount = assessments.filter(
        (a: any) => !a.student_status || a.student_status === 'registered'
      ).length + practices.filter(
        (p: any) => !p.my_status || p.my_status === 'registered'
      ).length;

      // 已完成数：从 overview API 获取真实数据
      const completedFromOverview = overviewRes.success ? (overviewRes.data?.completed_activities || 0) : 0;
      // 如果 overview 不可用，则从历史记录中计数
      const completedCount = completedFromOverview || history.filter(
        (h: any) => h.status === 'graded' || h.status === 'submitted'
      ).length;

      // 计算下一个考试时间
      const now = new Date();
      const upcomingExams = assessments
        .filter((a: any) => a.start_time && new Date(a.start_time) > now)
        .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      let nextExamText = '暂无';
      if (upcomingExams.length > 0) {
        const diffMs = new Date(upcomingExams[0].start_time).getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        nextExamText = diffDays <= 0 ? '今天' : `${diffDays}天后`;
      }

      setStats({
        available: availableCount,
        completed: completedCount,
        nextExam: nextExamText,
      });

      // 构建最近活动列表：合并可用活动和已完成活动
      const recent = [
        // 已完成/已提交的活动（从历史记录）
        ...history.slice(0, 5).map((h: any) => ({
          id: h.id,
          title: h.title,
          type: h.type,
          status: h.status,
          subject: h.subject,
          score: h.score,
          time: h.submit_time,
        })),
        // 可参加的测评（排除已在历史中的）
        ...assessments
          .filter((a: any) => !a.student_status || a.student_status === 'registered')
          .slice(0, 2)
          .map((a: any) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            status: a.status,
            subject: a.subject,
            score: null,
            time: null,
          })),
        // 可参加的练习（排除已在历史中的）
        ...practices
          .filter((p: any) => !p.my_status || p.my_status === 'registered')
          .slice(0, 2)
          .map((p: any) => ({
            id: p.id,
            title: p.title,
            type: p.type,
            status: p.my_status || p.status,
            subject: p.subject,
            score: null,
            time: null,
          })),
      ];
      setRecentActivities(recent.slice(0, 8));
    } catch (error) {
      console.error('Load dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      published: { color: 'blue', label: '未开始' },
      ongoing: { color: 'green', label: '进行中' },
      graded: { color: 'default', label: '已完成' },
      submitted: { color: 'orange', label: '待批改' },
      available: { color: 'blue', label: '可参加' },
      registered: { color: 'blue', label: '已报名' },
      in_progress: { color: 'green', label: '进行中' },
    };
    const info = map[status] || { color: 'default', label: status };
    return <Tag color={info.color}>{info.label}</Tag>;
  };

  return (
    <Spin spinning={loading}>
      <div>
        <Title level={3} style={{ marginBottom: '24px' }}>欢迎来到贵阳市小学生测评平台</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card hoverable onClick={() => navigate('/student/assessments')} style={{ cursor: 'pointer' }}>
              <Statistic
                title="可参加考试"
                value={stats.available}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card hoverable onClick={() => navigate('/student/growth')} style={{ cursor: 'pointer' }}>
              <Statistic
                title="已完成考试"
                value={stats.completed}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#16a34a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card hoverable>
              <Statistic
                title="下次考试"
                value={stats.nextExam}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
          <Col xs={24} lg={12}>
            <Card
              title={<Space><TrophyOutlined />最近活动</Space>}
              extra={<a onClick={() => navigate('/student/assessments')}>查看全部</a>}
            >
              {recentActivities.length > 0 ? (
                <List
                  size="small"
                  dataSource={recentActivities}
                  renderItem={(item: any) => (
                    <List.Item
                      actions={[
                        getStatusTag(item.status),
                        item.score != null ? <Text type="success">{Number(item.score).toFixed(0)}分</Text> : null,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <a onClick={() => navigate(`/student/activity/${item.id}`)}>
                            {item.title}
                          </a>
                        }
                        description={
                          <Space>
                            <Tag>{item.subject}</Tag>
                            <Tag color={item.type === 'assessment' ? 'red' : 'green'}>
                              {item.type === 'assessment' ? '测评' : '练习'}
                            </Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">暂无最近活动</Text>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={<Space><BellOutlined />公告通知</Space>}
            >
              <List
                size="small"
                dataSource={announcements}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title}
                      description={
                        <Space>
                          <Tag color="blue">{item.type}</Tag>
                          <Text type="secondary">{item.time}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default StudentHomePage;
