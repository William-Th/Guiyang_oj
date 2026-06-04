import React, { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Tag,
  Space,
  Statistic,
  Tabs,
  Badge,
  Empty,
  Spin,
  message,
  Select,
  Progress,
  Modal,
} from 'antd';
import {
  TrophyOutlined,
  StarOutlined,
  FireOutlined,
  RiseOutlined,
  LockOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { achievementApi, pointsApi } from '../../services/api';
import './AchievementPage.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface Achievement {
  achievement_id: number;
  achievement_code: string;
  achievement_name: string;
  achievement_desc: string;
  category: string;
  subcategory?: string;
  rarity: string;
  achievement_icon: string;
  points_reward: number;
  is_hidden: boolean;
  max_times?: number;
}

interface StudentAchievement extends Achievement {
  student_achievement_id: number;
  awarded_at: string;
  awarded_count: number;
}

interface PointsAccount {
  current_points: number;
  total_points: number;
  spent_points: number;
}

interface AchievementProgress {
  achievement_id: number;
  achievement_code: string;
  achievement_name: string;
  current_value: number;
  target_value: number;
  progress_percentage: number;
  last_updated: string;
}

/**
 * 学生成就页面
 * 展示学生已获得的成就、成就墙、成就进度等
 */
const AchievementPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [studentAchievements, setStudentAchievements] = useState<StudentAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [pointsAccount, setPointsAccount] = useState<PointsAccount | null>(null);
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 从localStorage获取当前登录用户的ID
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id || 0);
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadData();
    }
  }, [currentUserId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 并行加载数据
      const [achievementsRes, allAchievementsRes, pointsRes, progressRes] = await Promise.all([
        achievementApi.getStudentAchievements(currentUserId),
        achievementApi.getAllAchievements({ is_active: true }),
        pointsApi.getPointsAccount(currentUserId),
        achievementApi.getStudentAchievementProgress(currentUserId),
      ]);

      if (achievementsRes.success) {
        setStudentAchievements(achievementsRes.data || []);
      }

      if (allAchievementsRes.success) {
        // 过滤掉隐藏成就（除非学生已经获得）
        const earnedIds = new Set(
          (achievementsRes.data || []).map((a: StudentAchievement) => a.achievement_id)
        );
        const visibleAchievements = (allAchievementsRes.achievements || []).filter(
          (a: Achievement) => !a.is_hidden || earnedIds.has(a.achievement_id)
        );
        setAllAchievements(visibleAchievements);
      }

      if (pointsRes.success) {
        setPointsAccount(pointsRes.data);
      }

      if (progressRes.success) {
        setAchievementProgress(progressRes.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load achievements:', error);
      message.error(error.response?.data?.message || '加载成就数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取稀有度显示信息
  const getRarityInfo = (rarity: string) => {
    const rarityMap: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
      common: { color: '#8c8c8c', label: '普通', icon: <StarOutlined /> },
      rare: { color: '#16a34a', label: '稀有', icon: <StarOutlined /> },
      epic: { color: '#722ed1', label: '史诗', icon: <FireOutlined /> },
      legendary: { color: '#fa8c16', label: '传说', icon: <TrophyOutlined /> },
    };
    return rarityMap[rarity] || rarityMap.common;
  };

  // 获取类别显示信息
  const getCategoryInfo = (category: string) => {
    const categoryMap: Record<string, { color: string; label: string }> = {
      exam_certification: { color: 'blue', label: '测评认证' },
      learning_growth: { color: 'green', label: '学习成长' },
      social_collaboration: { color: 'orange', label: '社交协作' },
      special_event: { color: 'purple', label: '特殊事件' },
    };
    return categoryMap[category] || { color: 'default', label: category };
  };

  // 获取子分类中文显示
  const getSubcategoryLabel = (subcategory: string) => {
    const subcategoryMap: Record<string, string> = {
      first_breakthrough: '首次突破',
      progression: '等级进阶',
      consecutive_success: '连续通过',
      cross_subject: '跨学科',
      learning_duration: '学习时长',
      learning_frequency: '学习频率',
      habit: '学习习惯',
      improvement: '进步提升',
      interaction: '互动交流',
      help: '乐于助人',
      recognition: '获得认可',
      sharing: '知识分享',
      holiday: '节日活动',
      seasonal: '季节活动',
      personal_practice: '个人练习',
    };
    return subcategoryMap[subcategory] || subcategory;
  };

  // 检查成就是否已获得
  const isAchievementEarned = (achievementId: number) => {
    return studentAchievements.some(a => a.achievement_id === achievementId);
  };

  // 获取成就获得次数
  const getAchievementCount = (achievementId: number) => {
    const earned = studentAchievements.find(a => a.achievement_id === achievementId);
    return earned?.awarded_count || 0;
  };

  // 获取成就进度
  const getAchievementProgress = (achievementId: number) => {
    return achievementProgress.find(p => p.achievement_id === achievementId);
  };

  // 筛选成就列表
  const getFilteredAchievements = () => {
    return allAchievements.filter(achievement => {
      if (selectedCategory !== 'all' && achievement.category !== selectedCategory) {
        return false;
      }
      if (selectedRarity !== 'all' && achievement.rarity !== selectedRarity) {
        return false;
      }
      return true;
    });
  };

  // 渲染成就卡片
  const renderAchievementCard = (achievement: Achievement, earned: boolean) => {
    const rarityInfo = getRarityInfo(achievement.rarity);
    const categoryInfo = getCategoryInfo(achievement.category);
    const count = getAchievementCount(achievement.achievement_id);
    const studentAchievement = studentAchievements.find(
      a => a.achievement_id === achievement.achievement_id
    );
    const progress = getAchievementProgress(achievement.achievement_id);

    return (
      <Card
        key={achievement.achievement_id}
        className={`achievement-card ${earned ? 'earned' : 'locked'}`}
        hoverable
        style={{
          opacity: earned ? 1 : 0.6,
          borderColor: earned ? rarityInfo.color : '#d9d9d9',
        }}
        onClick={() => {
          setSelectedAchievement(achievement);
          setDetailModalVisible(true);
        }}
      >
        <div className="achievement-header">
          <div className="achievement-icon" style={{ fontSize: 48, color: rarityInfo.color }}>
            {earned ? rarityInfo.icon : <LockOutlined />}
          </div>
          {earned && (
            <Badge
              count={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              style={{ position: 'absolute', top: 10, right: 10 }}
            />
          )}
        </div>

        <div className="achievement-body">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Title level={5} style={{ margin: 0 }}>
              {achievement.achievement_name}
            </Title>

            <Paragraph
              ellipsis={{ rows: 2 }}
              style={{ marginBottom: 8, fontSize: 12, color: '#8c8c8c' }}
            >
              {achievement.achievement_desc}
            </Paragraph>

            <Space size="small" wrap>
              <Tag color={categoryInfo.color}>{categoryInfo.label}</Tag>
              <Tag color={rarityInfo.color}>{rarityInfo.label}</Tag>
              {achievement.subcategory && (
                <Tag>{getSubcategoryLabel(achievement.subcategory)}</Tag>
              )}
            </Space>
            {/* 进度条显示（未获得的成就） */}
            {!earned && progress && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#8c8c8c' }}>进度</Text>
                  <Text style={{ fontSize: 12, color: '#16a34a' }}>
                    {progress.current_value}/{progress.target_value}
                  </Text>
                </div>
                <Progress
                  percent={progress.progress_percentage}
                  size="small"
                  status="active"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <Space>
                <Text strong style={{ color: '#fa8c16' }}>
                  +{achievement.points_reward} 积分
                </Text>
                {earned && count > 0 && achievement.max_times && achievement.max_times > 1 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({count}/{achievement.max_times})
                  </Text>
                )}
              </Space>
            </div>

            {earned && studentAchievement && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                获得时间: {new Date(studentAchievement.awarded_at).toLocaleDateString()}
              </Text>
            )}
          </Space>
        </div>
      </Card>
    );
  };

  // 统计数据
  const stats = {
    totalEarned: studentAchievements.length,
    totalAvailable: allAchievements.filter(a => !a.is_hidden).length,
    totalPoints: studentAchievements.reduce((sum, a) => sum + a.points_reward * a.awarded_count, 0),
  };

  const earnedAchievements = allAchievements.filter(a => isAchievementEarned(a.achievement_id));
  const lockedAchievements = allAchievements.filter(a => !isAchievementEarned(a.achievement_id));

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="achievement-page" style={{ padding: '24px' }}>
      <Title level={2}>
        <TrophyOutlined /> 我的成就
      </Title>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已获得成就"
              value={stats.totalEarned}
              suffix={`/ ${stats.totalAvailable}`}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="成就积分"
              value={stats.totalPoints}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="当前积分"
              value={pointsAccount?.current_points || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="累计积分"
              value={pointsAccount?.total_points || 0}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选器 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle">
          <Text strong>筛选：</Text>
          <Select
            style={{ width: 150 }}
            value={selectedCategory}
            onChange={setSelectedCategory}
            placeholder="选择类别"
          >
            <Select.Option value="all">全部类别</Select.Option>
            <Select.Option value="exam_certification">测评认证</Select.Option>
            <Select.Option value="learning_growth">学习成长</Select.Option>
            <Select.Option value="social_collaboration">社交协作</Select.Option>
            <Select.Option value="special_event">特殊事件</Select.Option>
          </Select>

          <Select
            style={{ width: 120 }}
            value={selectedRarity}
            onChange={setSelectedRarity}
            placeholder="选择稀有度"
          >
            <Select.Option value="all">全部稀有度</Select.Option>
            <Select.Option value="common">普通</Select.Option>
            <Select.Option value="rare">稀有</Select.Option>
            <Select.Option value="epic">史诗</Select.Option>
            <Select.Option value="legendary">传说</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* 成就展示 */}
      <Tabs defaultActiveKey="all">
        <TabPane tab={`全部成就 (${getFilteredAchievements().length})`} key="all">
          {getFilteredAchievements().length > 0 ? (
            <Row gutter={[16, 16]}>
              {getFilteredAchievements().map(achievement =>
                <Col xs={24} sm={12} md={8} lg={6} key={achievement.achievement_id}>
                  {renderAchievementCard(
                    achievement,
                    isAchievementEarned(achievement.achievement_id)
                  )}
                </Col>
              )}
            </Row>
          ) : (
            <Empty description="暂无成就" />
          )}
        </TabPane>

        <TabPane tab={`已获得 (${earnedAchievements.length})`} key="earned">
          {earnedAchievements.length > 0 ? (
            <Row gutter={[16, 16]}>
              {earnedAchievements.map(achievement =>
                <Col xs={24} sm={12} md={8} lg={6} key={achievement.achievement_id}>
                  {renderAchievementCard(achievement, true)}
                </Col>
              )}
            </Row>
          ) : (
            <Empty description="还没有获得任何成就，继续努力吧！" />
          )}
        </TabPane>

        <TabPane tab={`未获得 (${lockedAchievements.length})`} key="locked">
          {lockedAchievements.length > 0 ? (
            <Row gutter={[16, 16]}>
              {lockedAchievements.map(achievement =>
                <Col xs={24} sm={12} md={8} lg={6} key={achievement.achievement_id}>
                  {renderAchievementCard(achievement, false)}
                </Col>
              )}
            </Row>
          ) : (
            <Empty description="恭喜！你已经获得了所有可见成就！" />
          )}
        </TabPane>
      </Tabs>

      {/* 成就详情模态框 */}
      {selectedAchievement && (
        <Modal
          title={
            <Space>
              <InfoCircleOutlined />
              <span>成就详情</span>
            </Space>
          }
          open={detailModalVisible}
          onCancel={() => {
            setDetailModalVisible(false);
            setSelectedAchievement(null);
          }}
          footer={null}
          width={600}
        >
          {(() => {
            const rarityInfo = getRarityInfo(selectedAchievement.rarity);
            const categoryInfo = getCategoryInfo(selectedAchievement.category);
            const earned = isAchievementEarned(selectedAchievement.achievement_id);
            const studentAchievement = studentAchievements.find(
              a => a.achievement_id === selectedAchievement.achievement_id
            );
            const progress = getAchievementProgress(selectedAchievement.achievement_id);

            return (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* 成就图标和名称 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 72, color: rarityInfo.color, marginBottom: 16 }}>
                    {earned ? rarityInfo.icon : <LockOutlined />}
                  </div>
                  <Title level={3} style={{ marginBottom: 8 }}>
                    {selectedAchievement.achievement_name}
                  </Title>
                  <Space size="small" wrap>
                    <Tag color={categoryInfo.color}>{categoryInfo.label}</Tag>
                    <Tag color={rarityInfo.color}>{rarityInfo.label}</Tag>
                    {selectedAchievement.subcategory && (
                      <Tag>{getSubcategoryLabel(selectedAchievement.subcategory)}</Tag>
                    )}
                  </Space>
                </div>

                {/* 成就描述 */}
                <Card size="small">
                  <Paragraph style={{ margin: 0 }}>
                    {selectedAchievement.achievement_desc}
                  </Paragraph>
                </Card>

                {/* 成就进度（未获得的成就） */}
                {!earned && progress && (
                  <Card size="small" title="完成进度">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>当前进度</Text>
                        <Text strong style={{ color: '#16a34a' }}>
                          {progress.current_value} / {progress.target_value}
                        </Text>
                      </div>
                      <Progress
                        percent={progress.progress_percentage}
                        strokeColor={{
                          '0%': '#108ee9',
                          '100%': '#87d068',
                        }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        最后更新: {new Date(progress.last_updated).toLocaleString('zh-CN')}
                      </Text>
                    </Space>
                  </Card>
                )}

                {/* 成就奖励 */}
                <Card size="small" title="奖励">
                  <Statistic
                    value={selectedAchievement.points_reward}
                    prefix={<StarOutlined />}
                    suffix="积分"
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>

                {/* 获得信息（已获得的成就） */}
                {earned && studentAchievement && (
                  <Card size="small" title="获得信息">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>获得时间</Text>
                        <Text strong>
                          {new Date(studentAchievement.awarded_at).toLocaleString('zh-CN')}
                        </Text>
                      </div>
                      {selectedAchievement.max_times && selectedAchievement.max_times > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>获得次数</Text>
                          <Text strong>
                            {studentAchievement.awarded_count} / {selectedAchievement.max_times}
                          </Text>
                        </div>
                      )}
                    </Space>
                  </Card>
                )}
              </Space>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};

export default AchievementPage;
