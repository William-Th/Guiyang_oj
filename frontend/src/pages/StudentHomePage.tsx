import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  RiseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { RootState } from '@/store';
import { activityApi, statisticsApi } from '../services/api';

const { Paragraph, Text, Title } = Typography;

interface DashboardStats {
  available: number;
  completed: number;
  nextExam: string;
}

interface RecentActivity {
  id: number;
  title: string;
  type: string;
  status: string;
  subject?: string;
  score?: number | null;
}

interface DashboardActivity extends RecentActivity {
  start_time?: string;
  student_status?: string;
  my_status?: string;
}

const announcements = [
  { id: 1, title: '欢迎使用贵阳市小学生测评平台', type: '平台通知', time: '2026-06-01' },
  { id: 2, title: '春季期末测评即将开始，请提前做好准备', type: '测评提醒', time: '2026-05-28' },
  { id: 3, title: '信息科技能力认证报名已开放', type: '活动通知', time: '2026-05-25' },
];

const StudentHomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [hasDataError, setHasDataError] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({ available: 0, completed: 0, nextExam: '暂无' });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const displayName = user?.realName || user?.username || '同学';

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setHasDataError(false);

      const [assessResult, practiceResult, historyResult, overviewResult] = await Promise.allSettled([
        activityApi.getStudentAssessments({}),
        activityApi.getStudentPractices({}),
        activityApi.getStudentHistory({}),
        statisticsApi.getStudentOverview(),
      ]);

      const assessments: DashboardActivity[] = assessResult.status === 'fulfilled'
        ? (assessResult.value.activities || assessResult.value.assessments || []) as DashboardActivity[]
        : [];
      const practices: DashboardActivity[] = practiceResult.status === 'fulfilled'
        ? (practiceResult.value.practices || []) as DashboardActivity[]
        : [];
      const history: DashboardActivity[] = historyResult.status === 'fulfilled'
        ? (historyResult.value.history || []) as DashboardActivity[]
        : [];
      const overview = overviewResult.status === 'fulfilled' ? overviewResult.value : null;

      setHasDataError(
        assessResult.status === 'rejected'
        || practiceResult.status === 'rejected'
        || historyResult.status === 'rejected'
        || overviewResult.status === 'rejected',
      );

      const availableCount = assessments.filter(
        (activity) => !activity.student_status || activity.student_status === 'registered',
      ).length + practices.filter(
        (practice) => !practice.my_status || practice.my_status === 'registered',
      ).length;

      const completedFromOverview = overview?.success
        ? Number(overview.data?.completed_activities || 0)
        : 0;
      const completedCount = completedFromOverview || history.filter(
        (item) => item.status === 'graded' || item.status === 'submitted',
      ).length;

      const now = new Date();
      const upcomingExams = assessments
        .filter((activity) => activity.start_time && new Date(activity.start_time) > now)
        .sort(
          (a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime(),
        );

      let nextExamText = '暂无';
      if (upcomingExams.length > 0) {
        const diffMs = new Date(upcomingExams[0].start_time!).getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        nextExamText = diffDays <= 0 ? '今天' : `${diffDays} 天后`;
      }

      setStats({ available: availableCount, completed: completedCount, nextExam: nextExamText });

      const recent: RecentActivity[] = [
        ...history.slice(0, 5).map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          status: item.status,
          subject: item.subject,
          score: item.score,
        })),
        ...assessments
          .filter((activity) => !activity.student_status || activity.student_status === 'registered')
          .slice(0, 2)
          .map((activity) => ({
            id: activity.id,
            title: activity.title,
            type: activity.type,
            status: activity.status,
            subject: activity.subject,
            score: null,
        })),
        ...practices
          .filter((practice) => !practice.my_status || practice.my_status === 'registered')
          .slice(0, 2)
          .map((practice) => ({
            id: practice.id,
            title: practice.title,
            type: practice.type,
            status: practice.my_status || practice.status,
            subject: practice.subject,
            score: null,
          })),
      ];

      setRecentActivities(recent.slice(0, 6));
      setLoading(false);
    };

    void loadDashboardData();
  }, []);

  const statusTag = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      published: { color: 'processing', label: '未开始' },
      ongoing: { color: 'success', label: '进行中' },
      graded: { color: 'default', label: '已完成' },
      submitted: { color: 'warning', label: '待批改' },
      available: { color: 'processing', label: '可参加' },
      registered: { color: 'processing', label: '已报名' },
      in_progress: { color: 'success', label: '进行中' },
    };
    const info = statusMap[status] || { color: 'default', label: '状态待更新' };
    return <Tag color={info.color}>{info.label}</Tag>;
  };

  const openActivity = (item: RecentActivity) => {
    const completed = item.status === 'graded' || item.status === 'submitted';
    // 测评/练习用类型化路由，顶部导航才能正确高亮对应菜单
    if (completed) {
      navigate(`/student/results/${item.id}`, { state: { from: item.type === 'assessment' ? 'assessment' : 'practice' } });
    } else if (item.type === 'assessment') {
      navigate(`/student/assessment/${item.id}`);
    } else {
      navigate(`/student/practice/${item.id}`);
    }
  };

  const statItems = [
    {
      label: '待完成内容',
      value: stats.available,
      suffix: '项',
      icon: <FileTextOutlined />,
      className: 'student-stat-card--mint',
      onClick: () => navigate('/student/assessments'),
    },
    {
      label: '已完成活动',
      value: stats.completed,
      suffix: '次',
      icon: <CheckCircleOutlined />,
      className: 'student-stat-card--cyan',
      onClick: () => navigate('/student/results'),
    },
    {
      label: '下次测评',
      value: stats.nextExam,
      suffix: '',
      icon: <ClockCircleOutlined />,
      className: 'student-stat-card--violet',
      onClick: () => navigate('/student/assessments'),
    },
  ];

  return (
    <main className="student-home" aria-labelledby="student-home-title">
      <section className="student-home__hero">
        <div className="student-home__hero-content">
          <span className="student-home__eyebrow">
            <ThunderboltOutlined aria-hidden="true" /> 今日学习空间
          </span>
          <Title id="student-home-title" level={1}>
            欢迎回来，{displayName}
          </Title>
          <Paragraph>
            今天从一组智能练习开始，系统会根据你的掌握情况推荐合适的题目。
          </Paragraph>
          <Space className="student-home__hero-actions" wrap>
            <Button
              className="student-primary-action"
              type="primary"
              size="large"
              icon={<ThunderboltOutlined />}
              onClick={() => navigate('/student/smart-practice')}
              data-testid="start-daily-practice"
            >
              开始今日练习
            </Button>
            <Button size="large" onClick={() => navigate('/student/assessments')}>
              查看测评安排
            </Button>
          </Space>
          <div className="student-home__quick-links" aria-label="学习快捷入口">
            <Button type="link" icon={<RiseOutlined />} onClick={() => navigate('/student/growth')}>
              查看成长
            </Button>
            <Button type="link" icon={<BarChartOutlined />} onClick={() => navigate('/student/results')}>
              查看成绩
            </Button>
          </div>
        </div>

        <div className="student-home__visual" aria-hidden="true">
          <div className="student-home__orbit student-home__orbit--outer" />
          <div className="student-home__orbit student-home__orbit--inner" />
          <div className="student-home__visual-core">
            <ThunderboltOutlined />
            <strong>智能推荐</strong>
            <span>从适合你的题目开始</span>
          </div>
          <span className="student-home__visual-dot student-home__visual-dot--one" />
          <span className="student-home__visual-dot student-home__visual-dot--two" />
        </div>
      </section>

      {hasDataError && (
        <Alert
          className="student-home__data-alert"
          type="warning"
          showIcon
          message="部分学习数据暂时没有加载出来"
          description="你仍然可以开始今日练习，稍后刷新即可查看完整数据。"
        />
      )}

      <section className="student-home__section" aria-labelledby="learning-overview-title">
        <div className="student-section-heading">
          <div>
            <Text className="student-section-heading__kicker">学习快照</Text>
            <Title id="learning-overview-title" level={2}>学习概览</Title>
          </div>
          <Text type="secondary">看清今天的进度，再决定下一步</Text>
        </div>
        <Row gutter={[16, 16]}>
          {statItems.map((item) => (
            <Col xs={24} sm={8} key={item.label}>
              <button
                className={`student-stat-card ${item.className}`}
                type="button"
                onClick={item.onClick}
              >
                <span className="student-stat-card__icon">{item.icon}</span>
                <span className="student-stat-card__body">
                  <span className="student-stat-card__label">{item.label}</span>
                  {loading ? (
                    <Skeleton.Input active size="small" />
                  ) : (
                    <strong>{item.value}<small>{item.suffix}</small></strong>
                  )}
                </span>
                <ArrowRightOutlined className="student-stat-card__arrow" />
              </button>
            </Col>
          ))}
        </Row>
      </section>

      <Row className="student-home__content-grid" gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card
            className="student-panel-card"
            title={<span className="student-panel-card__title"><BookOutlined /> 最近活动</span>}
            extra={(
              <Button type="link" onClick={() => navigate('/student/assessments')}>
                查看全部 <ArrowRightOutlined />
              </Button>
            )}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : recentActivities.length > 0 ? (
              <List
                className="student-activity-list"
                dataSource={recentActivities}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <span key="status">{statusTag(item.status)}</span>,
                      item.score != null
                        ? <Text key="score" className="student-activity-list__score">{Number(item.score).toFixed(0)} 分</Text>
                        : null,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={<span className="student-activity-list__icon"><BookOutlined /></span>}
                      title={<Button type="link" onClick={() => openActivity(item)}>{item.title}</Button>}
                      description={(
                        <Space size={4} wrap>
                          {item.subject && <Tag>{item.subject}</Tag>}
                          <Tag color={item.type === 'assessment' ? 'purple' : 'cyan'}>
                            {item.type === 'assessment' ? '测评' : '练习'}
                          </Tag>
                        </Space>
                      )}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂时没有活动，先去完成一组智能练习吧" />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            className="student-panel-card student-panel-card--notice"
            title={<span className="student-panel-card__title"><BellOutlined /> 学习提醒</span>}
          >
            <List
              className="student-notice-list"
              dataSource={announcements}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={(
                      <Space size={8} wrap>
                        <Tag color="cyan">{item.type}</Tag>
                        <Text type="secondary">{item.time}</Text>
                      </Space>
                    )}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </main>
  );
};

export default StudentHomePage;
