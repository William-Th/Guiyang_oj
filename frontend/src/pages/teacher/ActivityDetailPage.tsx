import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, message, Spin, Table, Statistic, Row, Col } from 'antd';
import { EditOutlined, BarChartOutlined, TeamOutlined, ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { activityApi } from '../../services/api';
import LocationManagement from '../../components/admin/LocationManagement';
import RegistrationManagement from '../../components/admin/RegistrationManagement';

interface Activity {
  id: number;
  title: string;
  description?: string;
  subject: string;
  grade: string;
  type: 'practice' | 'assessment';
  ability_level?: string;
  scope?: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_score: number;
  pass_score: number;
  status: string;
  is_official: boolean;
  allow_retake: boolean;
  max_attempts: number;
  created_at: string;
}

interface Participant {
  id: number;
  student_id: number;
  student_name: string;
  status: string;
  score?: number;
  submitted_at?: string;
  attempt_number: number;
}

interface Statistics {
  total_participants: number;
  completed_count: number;
  average_score: number;
  pass_rate: number;
  highest_score: number;
  lowest_score: number;
}

const ActivityDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'participants' | 'statistics' | 'locations' | 'registrations'>('info');

  const activityId = id ? parseInt(id) : 0;

  useEffect(() => {
    if (activityId) {
      loadActivityData();
    }
  }, [activityId]);

  const loadActivityData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadActivity(),
        loadParticipants(),
        loadStatistics(),
      ]);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      const response = await activityApi.getActivity(activityId);
      setActivity(response.activity);
    } catch (error: any) {
      console.error('Load activity error:', error);
      message.error(error.response?.data?.message || '加载活动信息失败');
    }
  };

  const loadParticipants = async () => {
    try {
      const response = await activityApi.getActivityParticipants(activityId);
      setParticipants(response.participants || []);
    } catch (error: any) {
      console.error('Load participants error:', error);
      // Not critical, don't show error message
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await activityApi.getActivityStatistics(activityId);
      setStatistics(response.statistics);
    } catch (error: any) {
      console.error('Load statistics error:', error);
      // Not critical, don't show error message
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityTypeTag = (type: string) => {
    return type === 'assessment' ? (
      <Tag color="red">测评</Tag>
    ) : (
      <Tag color="blue">练习</Tag>
    );
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      draft: { color: 'default', text: '草稿' },
      published: { color: 'green', text: '已发布' },
      ongoing: { color: 'processing', text: '进行中' },
      finished: { color: 'default', text: '已结束' },
      cancelled: { color: 'error', text: '已取消' },
    };
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const getStudentStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      registered: { color: 'blue', text: '已报名' },
      in_progress: { color: 'processing', text: '进行中' },
      submitted: { color: 'success', text: '已提交' },
    };
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const participantColumns = [
    {
      title: '学生姓名',
      dataIndex: 'student_name',
      key: 'student_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStudentStatusTag(status),
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => score !== null && score !== undefined ? score : '-',
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (time: string) => formatDateTime(time),
    },
    {
      title: '尝试次数',
      dataIndex: 'attempt_number',
      key: 'attempt_number',
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载活动详情中..." />
      </div>
    );
  }

  if (!activity) {
    return (
      <Card title="活动不存在">
        <p>未找到该活动信息</p>
        <Button type="primary" onClick={() => navigate('/teacher/activities')}>
          返回活动列表
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teacher/activities')}>
              返回
            </Button>
            <span>{activity.title}</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => navigate(`/teacher/activities/${activity.id}/paper`)}
            >
              组卷
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/teacher/activities/edit/${activity.id}`)}
              disabled={activity.status !== 'draft'}
            >
              编辑
            </Button>
          </Space>
        }
        tabList={[
          { key: 'info', tab: '基本信息' },
          { key: 'participants', tab: `参与者 (${participants.length})` },
          { key: 'statistics', tab: '统计数据' },
          ...(activity.type === 'assessment' ? [
            { key: 'locations', tab: '测评点管理' },
            { key: 'registrations', tab: '报名管理' },
          ] : []),
        ]}
        activeTabKey={activeTab}
        onTabChange={(key) => setActiveTab(key as any)}
      >
        {activeTab === 'info' && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="活动类型">
              {getActivityTypeTag(activity.type)}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {getStatusTag(activity.status)}
            </Descriptions.Item>
            <Descriptions.Item label="科目">{activity.subject}</Descriptions.Item>
            <Descriptions.Item label="年级">{activity.grade}</Descriptions.Item>
            {activity.ability_level && (
              <Descriptions.Item label="能力等级">
                <Tag color="blue">{activity.ability_level}</Tag>
              </Descriptions.Item>
            )}
            {activity.scope && (
              <Descriptions.Item label="范围">
                {activity.scope}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="是否官方">
              {activity.is_official ? <Tag color="red">官方</Tag> : <Tag>非官方</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="允许重做">
              {activity.allow_retake ? '是' : '否'}
            </Descriptions.Item>
            {activity.allow_retake && (
              <Descriptions.Item label="最大尝试次数">
                {activity.max_attempts}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="开始时间">
              {formatDateTime(activity.start_time)}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {formatDateTime(activity.end_time)}
            </Descriptions.Item>
            <Descriptions.Item label="答题时长">
              {activity.duration} 分钟
            </Descriptions.Item>
            <Descriptions.Item label="总分">
              {activity.total_score}
            </Descriptions.Item>
            <Descriptions.Item label="及格分数">
              {activity.pass_score}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {formatDateTime(activity.created_at)}
            </Descriptions.Item>
            {activity.description && (
              <Descriptions.Item label="活动描述" span={2}>
                {activity.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}

        {activeTab === 'participants' && (
          <Table
            columns={participantColumns}
            dataSource={participants}
            rowKey="id"
            locale={{ emptyText: '暂无参与者' }}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 位学生`,
            }}
          />
        )}

        {activeTab === 'statistics' && statistics && (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总参与人数"
                    value={statistics.total_participants}
                    prefix={<TeamOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="完成人数"
                    value={statistics.completed_count}
                    suffix={`/ ${statistics.total_participants}`}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均分"
                    value={statistics.average_score}
                    precision={2}
                    prefix={<BarChartOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="及格率"
                    value={statistics.pass_rate}
                    precision={2}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="最高分"
                    value={statistics.highest_score}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="最低分"
                    value={statistics.lowest_score}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {activeTab === 'locations' && activity.type === 'assessment' && (
          <LocationManagement
            activityId={activityId}
            abilityLevel={activity.ability_level}
          />
        )}

        {activeTab === 'registrations' && activity.type === 'assessment' && (
          <RegistrationManagement
            activityId={activityId}
            abilityLevel={activity.ability_level}
          />
        )}
      </Card>
    </div>
  );
};

export default ActivityDetailPage;
