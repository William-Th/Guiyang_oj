import React, { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Tabs,
  Empty,
  Spin,
  message,
  Select,
} from 'antd';
import {
  StarOutlined,
  RiseOutlined,
  FallOutlined,
  TrophyOutlined,
  GiftOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { pointsApi } from '../../services/api';
import type { ColumnsType } from 'antd/es/table';
import './PointsPage.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface PointsAccount {
  student_id: number;
  current_balance: number;
  total_earned: number;
  total_spent: number;
  updated_at: string;
}

interface PointsTransaction {
  transaction_id: number;
  student_id: number;
  transaction_type: 'earn' | 'spend';
  points_amount: number;
  source_type: string;
  source_id?: number;
  description: string;
  transaction_date: string;
  created_at: string;
}

interface LeaderboardEntry {
  rank: number;
  student_id: number;
  student_name: string;
  points: number;
}

/**
 * 学生积分页面
 * 展示积分余额、交易记录、排行榜等
 */
const PointsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [pointsAccount, setPointsAccount] = useState<PointsAccount | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [transactionType, setTransactionType] = useState<'all' | 'earn' | 'spend'>('all');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // 从localStorage获取当前登录用户的ID
  const currentUserId = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    if (currentUserId) {
      loadData();
    }
  }, [currentUserId, transactionType, pagination.current]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 加载积分账户信息
      const accountRes = await pointsApi.getPointsAccount(currentUserId);
      if (accountRes.success) {
        setPointsAccount(accountRes.data);
      }

      // 加载交易记录
      const filters: any = {
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
      };
      if (transactionType !== 'all') {
        filters.type = transactionType;
      }

      const transactionsRes = await pointsApi.getPointsTransactions(currentUserId, filters);
      if (transactionsRes.success) {
        setTransactions(transactionsRes.data || []);
        setPagination(prev => ({
          ...prev,
          total: transactionsRes.total || 0,
        }));
      }

      // 加载排行榜（可选）
      try {
        const leaderboardRes = await pointsApi.getLeaderboard({ limit: 10 });
        if (leaderboardRes.success) {
          setLeaderboard(leaderboardRes.data || []);
        }
      } catch (error) {
        // 排行榜加载失败不影响主要功能
        console.warn('Failed to load leaderboard:', error);
      }
    } catch (error: any) {
      console.error('Failed to load points data:', error);
      message.error(error.response?.data?.message || '加载积分数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取交易类型显示信息
  const getTransactionTypeInfo = (type: string) => {
    return type === 'earn'
      ? { color: 'success', icon: <RiseOutlined />, label: '获得' }
      : { color: 'error', icon: <FallOutlined />, label: '消费' };
  };

  // 获取来源类型显示信息
  const getSourceTypeInfo = (sourceType: string) => {
    const sourceMap: Record<string, { color: string; label: string }> = {
      achievement: { color: 'gold', label: '成就奖励' },
      activity_complete: { color: 'blue', label: '活动完成' },
      daily_login: { color: 'green', label: '每日登录' },
      manual_adjust: { color: 'purple', label: '手动调整' },
      system_reward: { color: 'cyan', label: '系统奖励' },
      redemption: { color: 'red', label: '兑换消费' },
    };
    return sourceMap[sourceType] || { color: 'default', label: sourceType };
  };

  // 交易记录表格列定义
  const transactionColumns: ColumnsType<PointsTransaction> = [
    {
      title: '时间',
      dataIndex: 'transaction_date',
      key: 'transaction_date',
      width: 180,
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined />
          <Text>{new Date(date).toLocaleString()}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      width: 100,
      render: (type: string) => {
        const info = getTransactionTypeInfo(type);
        return (
          <Tag color={info.color} icon={info.icon}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: '来源',
      dataIndex: 'source_type',
      key: 'source_type',
      width: 120,
      render: (sourceType: string) => {
        const info = getSourceTypeInfo(sourceType);
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '积分变动',
      dataIndex: 'points_amount',
      key: 'points_amount',
      width: 120,
      align: 'right',
      render: (amount: number, record: PointsTransaction) => {
        const isEarn = record.transaction_type === 'earn';
        return (
          <Text
            strong
            style={{
              color: isEarn ? '#52c41a' : '#ff4d4f',
              fontSize: 16,
            }}
          >
            {isEarn ? '+' : '-'}
            {amount}
          </Text>
        );
      },
    },
  ];

  // 排行榜表格列定义
  const leaderboardColumns: ColumnsType<LeaderboardEntry> = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      align: 'center',
      render: (rank: number) => {
        if (rank <= 3) {
          const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
          return (
            <Tag
              icon={<TrophyOutlined />}
              color={colors[rank - 1]}
              style={{ fontSize: 16, fontWeight: 'bold' }}
            >
              {rank}
            </Tag>
          );
        }
        return <Text strong>{rank}</Text>;
      },
    },
    {
      title: '学生',
      dataIndex: 'student_name',
      key: 'student_name',
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 120,
      align: 'right',
      render: (points: number) => (
        <Text strong style={{ color: '#fa8c16', fontSize: 16 }}>
          {points}
        </Text>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="points-page" style={{ padding: '24px' }}>
      <Title level={2}>
        <StarOutlined /> 我的积分
      </Title>

      {/* 积分统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="当前积分"
              value={pointsAccount?.current_balance || 0}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: 32 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="累计获得"
              value={pointsAccount?.total_earned || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 32 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="累计消费"
              value={pointsAccount?.total_spent || 0}
              prefix={<FallOutlined />}
              valueStyle={{ color: '#ff4d4f', fontSize: 32 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 交易记录和排行榜 */}
      <Tabs defaultActiveKey="transactions">
        <TabPane tab="交易记录" key="transactions">
          <Card
            title="积分交易记录"
            extra={
              <Select
                style={{ width: 120 }}
                value={transactionType}
                onChange={(value) => {
                  setTransactionType(value);
                  setPagination({ ...pagination, current: 1 });
                }}
              >
                <Select.Option value="all">全部记录</Select.Option>
                <Select.Option value="earn">获得记录</Select.Option>
                <Select.Option value="spend">消费记录</Select.Option>
              </Select>
            }
          >
            {transactions.length > 0 ? (
              <Table
                columns={transactionColumns}
                dataSource={transactions}
                rowKey="transaction_id"
                pagination={{
                  ...pagination,
                  onChange: (page) => setPagination({ ...pagination, current: page }),
                  showSizeChanger: false,
                  showTotal: (total) => `共 ${total} 条记录`,
                }}
              />
            ) : (
              <Empty description="暂无交易记录" />
            )}
          </Card>
        </TabPane>

        <TabPane tab="积分排行" key="leaderboard">
          <Card title="积分排行榜" extra={<GiftOutlined style={{ fontSize: 20 }} />}>
            {leaderboard.length > 0 ? (
              <Table
                columns={leaderboardColumns}
                dataSource={leaderboard}
                rowKey="student_id"
                pagination={false}
                rowClassName={(record) =>
                  record.student_id === pointsAccount?.student_id ? 'current-student-row' : ''
                }
              />
            ) : (
              <Empty description="暂无排行数据" />
            )}
          </Card>
        </TabPane>
      </Tabs>

      {pointsAccount && (
        <Card style={{ marginTop: 16 }} size="small">
          <Text type="secondary" style={{ fontSize: 12 }}>
            最后更新时间: {new Date(pointsAccount.updated_at).toLocaleString()}
          </Text>
        </Card>
      )}
    </div>
  );
};

export default PointsPage;
