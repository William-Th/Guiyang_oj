import React from 'react';
import { Row, Col, Card, Statistic, Progress, Timeline, Tag, Empty, Alert } from 'antd';
import {
  TrophyOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

/**
 * 个人成长中心页面
 * 展示学生的学习进度、成就、学习轨迹等个人成长数据
 */
const GrowthCenterPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  // TODO: 从后端API获取真实数据
  const mockData = {
    statistics: {
      totalActivities: 28,
      completedActivities: 24,
      inProgressActivities: 2,
      totalLearningHours: 45.5,
      averageScore: 0, // 移除平均分数显示
      currentStreak: 7, // 连续学习天数
    },
    recentActivities: [
      {
        id: 1,
        title: '数学练习 - 加减法',
        type: 'practice',
        completedAt: '2025-10-29',
        score: 95,
      },
      {
        id: 2,
        title: '语文测评 - 阅读理解',
        type: 'assessment',
        completedAt: '2025-10-28',
        score: 88,
      },
      {
        id: 3,
        title: '英语练习 - 单词拼写',
        type: 'practice',
        completedAt: '2025-10-27',
        score: 92,
      },
    ],
    learningPath: [
      {
        date: '2025-10-29',
        activities: [
          { title: '数学练习 - 加减法', status: 'completed' },
          { title: '语文阅读 - 课外阅读', status: 'completed' },
        ],
      },
      {
        date: '2025-10-28',
        activities: [
          { title: '语文测评 - 阅读理解', status: 'completed' },
        ],
      },
      {
        date: '2025-10-27',
        activities: [
          { title: '英语练习 - 单词拼写', status: 'completed' },
          { title: '数学练习 - 乘除法', status: 'in_progress' },
        ],
      },
    ],
  };

  const completionRate = Math.round(
    (mockData.statistics.completedActivities / mockData.statistics.totalActivities) * 100
  );

  return (
    <div style={{ padding: '0' }}>
      <h2>个人成长中心</h2>
      <p style={{ color: '#4b5563', marginBottom: '24px' }}>
        欢迎，{user?.realName || user?.idCard}！这里记录了你的学习成长轨迹
      </p>

      {/* 学习统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="总参与活动"
              value={mockData.statistics.totalActivities}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="已完成活动"
              value={mockData.statistics.completedActivities}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="学习时长"
              value={mockData.statistics.totalLearningHours}
              suffix="小时"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="连续学习"
              value={mockData.statistics.currentStreak}
              suffix="天"
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        {/* 学习进度 */}
        <Col xs={24} lg={12}>
          <Card title="学习进度" bordered={false}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>完成率</span>
                <span style={{ fontWeight: 'bold' }}>{completionRate}%</span>
              </div>
              <Progress percent={completionRate} status="active" />
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
                    {mockData.statistics.completedActivities}
                  </div>
                  <div style={{ color: '#4b5563', marginTop: '4px' }}>已完成</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                    {mockData.statistics.inProgressActivities}
                  </div>
                  <div style={{ color: '#4b5563', marginTop: '4px' }}>进行中</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 成就系统 - 待开发 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <TrophyOutlined style={{ marginRight: '8px' }} />
                成就系统
              </span>
            }
            bordered={false}
          >
            <Alert
              message="即将上线"
              description="成就系统正在开发中，敬请期待！完成学习任务可以解锁各种成就徽章。"
              type="info"
              showIcon
              icon={<StarOutlined />}
              style={{ marginBottom: '16px' }}
            />
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: '#6b7280' }}>
                  成就功能即将开放
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        {/* 最近活动 */}
        <Col xs={24} lg={12}>
          <Card title="最近完成的活动" bordered={false}>
            {mockData.recentActivities.length > 0 ? (
              <div>
                {mockData.recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #f0f0f0',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {activity.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        <Tag color={activity.type === 'practice' ? 'blue' : 'green'}>
                          {activity.type === 'practice' ? '练习' : '测评'}
                        </Tag>
                        {activity.completedAt}
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#22c55e' }}>
                      {activity.score}分
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="暂无最近活动记录" />
            )}
          </Card>
        </Col>

        {/* 学习轨迹 */}
        <Col xs={24} lg={12}>
          <Card title="学习轨迹" bordered={false}>
            <Timeline>
              {mockData.learningPath.map((day, index) => (
                <Timeline.Item
                  key={index}
                  color={index === 0 ? 'green' : 'blue'}
                  dot={index === 0 ? <CheckCircleOutlined style={{ fontSize: '16px' }} /> : undefined}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{day.date}</div>
                  {day.activities.map((activity, actIndex) => (
                    <div
                      key={actIndex}
                      style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        background: activity.status === 'completed' ? '#f0fdf4' : '#fef3c7',
                        borderLeft: `3px solid ${activity.status === 'completed' ? '#22c55e' : '#f59e0b'}`,
                        borderRadius: '4px',
                      }}
                    >
                      <span>{activity.title}</span>
                      <Tag
                        color={activity.status === 'completed' ? 'success' : 'warning'}
                        style={{ marginLeft: '8px', fontSize: '11px' }}
                      >
                        {activity.status === 'completed' ? '已完成' : '进行中'}
                      </Tag>
                    </div>
                  ))}
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GrowthCenterPage;
