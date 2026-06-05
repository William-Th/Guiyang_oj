import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, message, Spin, Select, Tabs } from 'antd';
import { PlayCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { activityApi } from '../../services/api';
import { SUBJECTS, getAllGrades, getAllAbilityLevels } from '../../config/subjects';

interface Practice {
  id: number;
  title: string;
  subject: string;
  grade: string;
  ability_level?: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_score: number;
  status: string;
  is_official: boolean;
  allow_retake: boolean;
  max_attempts: number;
  my_status?: string;
  my_score?: number;
  attempt_number?: number;
}

interface HistoryActivity {
  id: number;
  title: string;
  subject: string;
  grade?: string;
  type: string;
  total_score?: number;
  score: number | null;
  status: string;
  grading_status?: string;
  submit_time: string;
  attempt_number: number;
}

/**
 * 练习中心页面
 * 可用练习 + 已完成练习（全部从后端 API 获取）
 */
const PracticeCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [completedPractices, setCompletedPractices] = useState<HistoryActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [filters, setFilters] = useState<{
    subject?: string;
    grade?: string;
    ability_level?: string;
  }>({});

  useEffect(() => {
    loadPractices();
    loadCompletedPractices();
  }, []);

  useEffect(() => {
    if (activeTab === 'available') {
      loadPractices();
    } else {
      loadCompletedPractices();
    }
  }, [filters, activeTab]);

  const loadPractices = async () => {
    try {
      setLoading(true);
      const response = await activityApi.getStudentPractices(filters);
      setPractices(response.practices || []);
    } catch (error: any) {
      console.error('Load practices error:', error);
      message.error(error.response?.data?.message || '加载练习列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedPractices = async () => {
    try {
      setLoading(true);
      // 使用 history API 获取已完成的练习
      const response = await activityApi.getStudentHistory({ type: 'practice', ...filters });
      const history = response.history || [];
      const completed = history.filter(
        (h: any) => h.status === 'graded' || h.status === 'submitted'
      );
      setCompletedPractices(completed);
    } catch (error: any) {
      console.error('Load completed practices error:', error);
      message.error(error.response?.data?.message || '加载已完成练习列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = async (practiceId: number) => {
    navigate(`/student/activity/${practiceId}`);
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

  const getSubjectTag = (subject: string) => {
    const colors: Record<string, string> = {
      '语文': 'blue', '数学': 'green', '科学': 'purple',
      '英语': 'orange', '计算机': 'cyan', '信息科技': 'cyan',
    };
    return <Tag color={colors[subject] || 'default'}>{subject}</Tag>;
  };

  const getAbilityLevelTag = (level?: string) => {
    if (!level) return '-';
    const colors: Record<string, string> = {
      L1: 'blue', L2: 'cyan', L3: 'green', L4: 'lime',
      L5: 'orange', L6: 'red', L7: 'purple',
    };
    return <Tag color={colors[level] || 'default'}>{level}</Tag>;
  };

  const columns = [
    {
      title: '练习名称', dataIndex: 'title', key: 'title', width: 200,
      render: (title: string, record: Practice) => (
        <Space>
          <span>{title}</span>
          {record.my_status === 'submitted' || record.my_status === 'graded' ? (
            <Tag color="success" icon={<TrophyOutlined />}>已完成</Tag>
          ) : record.my_status === 'in_progress' ? (
            <Tag color="processing" icon={<PlayCircleOutlined />}>进行中</Tag>
          ) : null}
        </Space>
      ),
    },
    { title: '科目', dataIndex: 'subject', key: 'subject', width: 100, render: (s: string) => getSubjectTag(s) },
    { title: '年级', dataIndex: 'grade', key: 'grade', width: 100 },
    { title: '能力等级', dataIndex: 'ability_level', key: 'ability_level', width: 120, render: (l: string) => getAbilityLevelTag(l) },
    { title: '开始时间', dataIndex: 'start_time', key: 'start_time', width: 160, render: (t: string) => formatDateTime(t) },
    { title: '时长', dataIndex: 'duration', key: 'duration', width: 100, render: (d: number | null) => d != null ? `${d}分钟` : '-' },
    { title: '总分', dataIndex: 'total_score', key: 'total_score', width: 80 },
    {
      title: '操作', key: 'action', width: 150, fixed: 'right' as const,
      render: (_: any, record: Practice) => {
        if (record.my_status === 'graded' || record.my_status === 'submitted') {
          return (
            <Button size="small" type="primary" icon={<TrophyOutlined />}
              onClick={() => navigate(`/student/results/${record.id}`)}>
              查看结果
            </Button>
          );
        }
        return (
          <Button size="small" type="primary" icon={<PlayCircleOutlined />}
            onClick={() => handleStartPractice(record.id)}>
            开始练习
          </Button>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载练习列表中..." />
      </div>
    );
  }

  return (
    <div>
      <Card
        title="练习中心"
        extra={
          <Space>
            <Select placeholder="科目" allowClear style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, subject: value })} virtual={false}>
              {SUBJECTS.map(s => <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>)}
            </Select>
            <Select placeholder="年级" allowClear style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, grade: value })} virtual={false}>
              {getAllGrades().map(g => <Select.Option key={g.value} value={g.value}>{g.label}</Select.Option>)}
            </Select>
            <Select placeholder="能力等级" allowClear style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, ability_level: value })} virtual={false}>
              {getAllAbilityLevels().map(l => <Select.Option key={l.value} value={l.value}>{l.label}</Select.Option>)}
            </Select>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key)} items={[
          {
            key: 'available',
            label: `可用练习 (${practices.length})`,
            children: (
              <Table columns={columns} dataSource={practices} rowKey="id" scroll={{ x: 1200 }}
                locale={{ emptyText: '暂无可用练习' }}
                pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 个练习` }} />
            ),
          },
          {
            key: 'completed',
            label: `已完成 (${completedPractices.length})`,
            children: renderCompletedTable(),
          },
        ]} />
      </Card>
    </div>
  );

  function renderCompletedTable() {
    const completedColumns = [
      { title: '练习名称', dataIndex: 'title', key: 'title', width: 200 },
      { title: '科目', dataIndex: 'subject', key: 'subject', width: 100, render: (s: string) => getSubjectTag(s) },
      { title: '年级', dataIndex: 'grade', key: 'grade', width: 100, render: (g: string) => g || '-' },
      {
        title: '得分', key: 'score', width: 120,
        render: (_: any, record: HistoryActivity) => {
          const myScore = Number(record.score) || 0;
          const totalScore = Number(record.total_score) || 0;
          const passed = totalScore > 0 && myScore >= totalScore * 0.6;
          return (
            <span style={{ fontSize: 16, fontWeight: 'bold', color: passed ? '#52c41a' : '#ff4d4f' }}>
              {myScore.toFixed(1)} / {totalScore}
            </span>
          );
        },
      },
      {
        title: '完成时间', dataIndex: 'submit_time', key: 'submit_time', width: 160,
        render: (t: string) => formatDateTime(t),
      },
      {
        title: '批改状态', dataIndex: 'grading_status', key: 'grading_status', width: 100,
        render: (status: string) => {
          const map: Record<string, { text: string; color: string }> = {
            pending: { text: '待批改', color: 'default' },
            partial_graded: { text: '部分批改', color: 'processing' },
            auto_graded: { text: '已批改', color: 'success' },
            completed: { text: '已完成', color: 'success' },
          };
          const s = map[status] || { text: status, color: 'default' };
          return <Tag color={s.color}>{s.text}</Tag>;
        },
      },
      {
        title: '操作', key: 'action', width: 120, fixed: 'right' as const,
        render: (_: any, record: HistoryActivity) => (
          <Button size="small" type="primary" icon={<TrophyOutlined />}
            onClick={() => navigate(`/student/results/${record.id}`)}>
            查看结果
          </Button>
        ),
      },
    ];

    return (
      <Table columns={completedColumns} dataSource={completedPractices} rowKey="id" scroll={{ x: 1100 }}
        locale={{ emptyText: '暂无已完成的练习，快去练习吧！' }}
        pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 个练习` }} />
    );
  }
};

export default PracticeCenterPage;
