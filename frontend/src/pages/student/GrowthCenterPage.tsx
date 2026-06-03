import React, { useState, useEffect } from 'react';
import {
  Row, Col, Card, Statistic, Progress, Timeline, Tag, Empty, Spin, message,
  Typography, Divider,
} from 'antd';
import {
  TrophyOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '@/store';
import { statisticsApi, activityApi, achievementApi, pointsApi } from '../../services/api';

const { Text } = Typography;

/**
 * 个人成长中心页面
 * 展示学生的学习进度、成就、学习轨迹等个人成长数据（全部从后端API获取）
 */
const GrowthCenterPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{
    total_activities: number;
    completed_activities: number;
    avg_score: number;
    total_study_seconds: number;
  } | null>(null);
  const [recentPractices, setRecentPractices] = useState<any[]>([]);
  const [studentAchievements, setStudentAchievements] = useState<any[]>([]);
  const [pointsAccount, setPointsAccount] = useState<{
    current_points: number;
    total_points: number;
    spent_points: number;
  } | null>(null);

  // 从 localStorage 获取当前用户 ID
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currentUserId = currentUser?.id || 0;

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [overviewRes, practicesRes, achievementsRes, pointsRes] = await Promise.all([
        statisticsApi.getStudentOverview().catch(() => ({ success: false, data: null })),
        activityApi.getStudentCompletedPractices({}).catch(() => ({ practices: [] })),
        currentUserId
          ? achievementApi.getStudentAchievements(currentUserId).catch(() => ({ success: false, data: [] }))
          : Promise.resolve({ success: false, data: [] }),
        currentUserId
          ? pointsApi.getPointsAccount(currentUserId).catch(() => ({ success: false, data: null }))
          : Promise.resolve({ success: false, data: null }),
      ]);

      if (overviewRes.success) {
        setOverview(overviewRes.data);
      }

      const practices = practicesRes.practices || [];
      setRecentPractices(practices.slice(0, 10));

      if (achievementsRes.success) {
        setStudentAchievements(achievementsRes.data || []);
      }

      if (pointsRes.success) {
        setPointsAccount(pointsRes.data);
      }
    } catch (error) {
      console.error('Load growth data error:', error);
      message.error('加载成长数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算完成率
  const completionRate = overview
    ? (overview.total_activities > 0
        ? Math.round((overview.completed_activities / overview.total_activities) * 100)
        : 0)
    : 0;

  // 从已完成练习中提取学习轨迹（按日期分组）
  const learningPathMap = new Map<string, any[]>();
  recentPractices.forEach((p: any) => {
    const dateStr = p.submit_time
      ? new Date(p.submit_time).toLocaleDateString('zh-CN')
      : '未知日期';
    if (!learningPathMap.has(dateStr)) {
      learningPathMap.set(dateStr, []);
    }
    learningPathMap.get(dateStr)!.push(p);
  });
  const learningPathEntries = Array.from(learningPathMap.entries()).slice(0, 7);

  // 计算进行中的活动数
  const inProgressCount = overview
    ? overview.total_activities - overview.completed_activities
    : 0;

  return (
    <div style={{ padding: '0' }}>
      <h2>个人成长中心</h2>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        欢迎，{user?.realName || user?.idCard}！这里记录了你的学习成长轨迹
      </p>

      <Spin spinning={loading}>
        {/* 学习统计卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="总参与活动"
                value={overview?.total_activities || 0}
                prefix={<FireOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="已完成活动"
                value={overview?.completed_activities || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="学习时长"
                value={Math.floor((overview?.total_study_seconds || 0) / 3600)}
                suffix="小时"
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="平均得分"
                value={overview?.avg_score || 0}
                suffix="分"
                prefix={<RiseOutlined />}
                valueStyle={{ color: '#eb2f96' }}
                precision={1}
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
                  <div style={{ textAlign: 'center', padding: '12px', background: '#f0f5ff', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1677ff' }}>
                      {overview?.completed_activities || 0}
                    </div>
                    <div style={{ color: '#666', marginTop: '4px' }}>已完成</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ textAlign: 'center', padding: '12px', background: '#fff7e6', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                      {inProgressCount > 0 ? inProgressCount : 0}
                    </div>
                    <div style={{ color: '#666', marginTop: '4px' }}>进行中</div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 成就摘要 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <span>
                  <TrophyOutlined style={{ marginRight: '8px' }} />
                  我的成就
                </span>
              }
              bordered={false}
              extra={<a onClick={() => navigate('/student/achievements')}>查看全部</a>}
            >
              {studentAchievements.length > 0 ? (
                <div>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                      <Statistic
                        title="已获得成就"
                        value={studentAchievements.length}
                        prefix={<TrophyOutlined />}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="当前积分"
                        value={pointsAccount?.current_points || 0}
                        prefix={<StarOutlined />}
                        valueStyle={{ color: '#1677ff' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="累计积分"
                        value={pointsAccount?.total_points || 0}
                        prefix={<RiseOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ maxHeight: 160, overflow: 'auto' }}>
                    {studentAchievements.slice(0, 5).map((ach: any) => (
                      <div
                        key={ach.student_achievement_id || ach.achievement_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 0',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <div>
                          <TrophyOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
                          <Text strong>{ach.achievement_name}</Text>
                        </div>
                        <Tag color="gold">{ach.rarity === 'legendary' ? '传说' : ach.rarity === 'epic' ? '史诗' : ach.rarity === 'rare' ? '稀有' : '普通'}</Tag>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span style={{ color: '#999' }}>
                      还没有获得成就，继续努力吧！
                    </span>
                  }
                />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
          {/* 最近完成的活动 */}
          <Col xs={24} lg={12}>
            <Card title="最近完成的活动" bordered={false}>
              {recentPractices.length > 0 ? (
                <div>
                  {recentPractices.slice(0, 5).map((activity: any) => (
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
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/student/results/${activity.id}`)}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          {activity.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          <Tag color={activity.type === 'assessment' ? 'green' : 'blue'}>
                            {activity.type === 'assessment' ? '测评' : '练习'}
                          </Tag>
                          <Tag>{activity.subject}</Tag>
                          {activity.submit_time && new Date(activity.submit_time).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                        {activity.my_score != null ? `${activity.my_score}分` : '-'}
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
              {learningPathEntries.length > 0 ? (
                <Timeline
                  items={learningPathEntries.map(([date, activities], index) => ({
                    color: index === 0 ? 'green' : 'blue',
                    dot: index === 0 ? <CheckCircleOutlined style={{ fontSize: '16px' }} /> : undefined,
                    children: (
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{date}</div>
                        {activities.map((act: any, actIndex: number) => (
                          <div
                            key={actIndex}
                            style={{
                              padding: '8px 12px',
                              marginBottom: '4px',
                              background: '#f6ffed',
                              borderLeft: '3px solid #52c41a',
                              borderRadius: '4px',
                            }}
                          >
                            <span>{act.title}</span>
                            <Tag color="success" style={{ marginLeft: '8px', fontSize: '11px' }}>
                              已完成
                            </Tag>
                            {act.my_score != null && (
                              <Text type="success" style={{ marginLeft: 8 }}>{act.my_score}分</Text>
                            )}
                          </div>
                        ))}
                      </div>
                    ),
                  }))}
                />
              ) : (
                <Empty description="暂无学习轨迹" />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default GrowthCenterPage;
