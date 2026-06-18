import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Tag,
  Button,
  Select,
  Space,
  Spin,
  Empty,
  Typography,
  Statistic,
  Row,
  Col,
  message,
} from 'antd';
import { ReloadOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { parentApi } from '../../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface Child {
  student_user_id: number;
  student_id?: number;
  username: string;
  real_name?: string;
  grade?: string;
  class?: string;
  relation?: string;
}

interface ResultRow {
  id: number;
  title?: string;
  subject?: string;
  total_score?: number;
  score?: number;
  submitted_at?: string;
  status?: string;
}

const ParentDashboard: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<number | undefined>();
  const [profile, setProfile] = useState<any>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState('overview');

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const r = await parentApi.getChildren();
      setChildren(r.data || []);
      if ((r.data || []).length > 0 && !selectedChild) {
        setSelectedChild(r.data[0].student_user_id);
      }
    } catch (e: any) {
      message.error(e.response?.data?.error || '加载孩子信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    (async () => {
      try {
        const [p, s] = await Promise.all([
          parentApi.getChildProfile(selectedChild),
          parentApi.getChildStats(selectedChild),
        ]);
        setProfile(p.data);
        setStats(s.data);
      } catch (e) {
        /* ignore */
      }
    })();
  }, [selectedChild]);

  const fetchResults = async () => {
    if (!selectedChild) return;
    try {
      const r = await parentApi.getChildResults(selectedChild);
      setResults(r.data || []);
    } catch (e: any) {
      message.error(e.response?.data?.error || '加载成绩失败');
    }
  };

  const fetchWrong = async () => {
    if (!selectedChild) return;
    try {
      const r = await parentApi.getChildWrongQuestions(selectedChild);
      setWrongQuestions(r.data || []);
    } catch (e: any) {
      message.error(e.response?.data?.error || '加载错题失败');
    }
  };

  const handleRegister = async (activityId: number) => {
    if (!selectedChild) return;
    try {
      await parentApi.registerForChild(selectedChild, activityId);
      message.success('已为孩子报名');
    } catch (e: any) {
      message.error(e.response?.data?.error || '报名失败');
    }
  };

  const resultColumns: ColumnsType<ResultRow> = [
    { title: '活动', dataIndex: 'title', render: (t: string) => t || '-' },
    { title: '科目', dataIndex: 'subject', width: 90 },
    {
      title: '分数',
      width: 100,
      render: (_, r) => (r.score != null ? `${r.score} / ${r.total_score || '-'}` : '-'),
    },
    {
      title: '时间',
      dataIndex: 'submitted_at',
      width: 160,
      render: (t: string) => (t ? new Date(t).toLocaleString('zh-CN') : '-'),
    },
  ];

  if (loading) {
    return <Spin style={{ display: 'block', padding: 100 }} />;
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>
        <TeamOutlined /> 家长中心
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <UserOutlined />
          <Text>选择孩子：</Text>
          <Select
            style={{ width: 240 }}
            value={selectedChild}
            onChange={setSelectedChild}
            options={children.map((c) => ({
              value: c.student_user_id,
              label: `${c.real_name || c.username}${c.grade ? `（${c.grade}）` : ''}`,
            }))}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchChildren}>刷新</Button>
        </Space>
      </Card>

      {selectedChild && (
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'overview',
              label: '学习概览',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <Card>
                      <Statistic title="累计答题" value={stats?.total_questions || 0} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card>
                      <Statistic
                        title="平均正确率"
                        value={stats?.avg_accuracy || 0}
                        suffix="%"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card>
                      <Statistic title="完成活动" value={stats?.completed_activities || 0} />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'results',
              label: '成绩记录',
              children: (
                <Card extra={<Button icon={<ReloadOutlined />} onClick={fetchResults}>刷新</Button>}>
                  {results.length ? (
                    <Table columns={resultColumns} dataSource={results} rowKey="id" pagination={{ pageSize: 10 }} />
                  ) : (
                    <Empty description="暂无成绩记录" />
                  )}
                </Card>
              ),
            },
            {
              key: 'wrong',
              label: '错题情况',
              children: (
                <Card extra={<Button icon={<ReloadOutlined />} onClick={fetchWrong}>刷新</Button>}>
                  {wrongQuestions.length ? (
                    <Table
                      dataSource={wrongQuestions}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      columns={[
                        {
                          title: '题目',
                          dataIndex: 'content',
                          render: (c: string) => (
                            <div style={{ maxWidth: 300 }} dangerouslySetInnerHTML={{ __html: c && c.length > 40 ? c.slice(0, 40) + '...' : c }} />
                          ),
                        },
                        { title: '科目', dataIndex: 'subject', width: 90 },
                        { title: '错误次数', dataIndex: 'error_count', width: 90 },
                      ]}
                    />
                  ) : (
                    <Empty description="暂无错题记录" />
                  )}
                </Card>
              ),
            },
            {
              key: 'register',
              label: '代报名测评',
              children: (
                <Card>
                  <Empty description="输入测评活动ID为孩子代报名">
                    <RegisterForChild onRegister={handleRegister} />
                  </Empty>
                </Card>
              ),
            },
          ]}
        />
      )}

      {profile && (
        <Card title="孩子信息（只读）" style={{ marginTop: 16 }}>
          <Row gutter={[16, 8]}>
            <Col span={12}><Text>姓名：{profile.real_name || profile.student_name}</Text></Col>
            <Col span={12}><Text>年级：{profile.grade || '-'}</Text></Col>
            <Col span={12}><Text>班级：{profile.class || '-'}</Text></Col>
          </Row>
          <div style={{ marginTop: 8 }}>
            <Tag color="blue">家长为只读权限，不可修改孩子数据</Tag>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ParentDashboard;

// 代报名子组件：输入活动ID为孩子报名
const RegisterForChild: React.FC<{ onRegister: (activityId: number) => Promise<void> }> = ({ onRegister }) => {
  const [activityId, setActivityId] = React.useState('');
  return (
    <Space>
      <Select
        showSearch
        placeholder="输入测评活动ID"
        style={{ width: 200 }}
        value={activityId || undefined}
        onChange={(v) => setActivityId(String(v))}
        options={[]}
        onSearch={(val) => setActivityId(val)}
        mode="tags"
        maxCount={1}
      />
      <Button
        type="primary"
        disabled={!activityId}
        onClick={async () => {
          const id = parseInt(activityId, 10);
          if (id) await onRegister(id);
        }}
      >
        报名
      </Button>
    </Space>
  );
};
