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
  my_status?: string; // 当前用户对此练习的状态
  my_score?: number; // 当前用户的得分
  attempt_number?: number; // 尝试次数
}

interface CompletedPractice {
  id: number;
  title: string;
  subject: string;
  grade: string;
  ability_level?: string;
  total_score: number;
  my_score: number;
  student_status: string;
  submit_time: string;
  attempt_number: number;
  grading_status: string;
}

const PracticeCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [completedPractices, setCompletedPractices] = useState<CompletedPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [filters, setFilters] = useState<{
    subject?: string;
    grade?: string;
    ability_level?: string;
  }>({});

  // 初始加载时同时加载两个列表
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
      const response = await activityApi.getStudentCompletedPractices(filters);
      setCompletedPractices(response.practices || []);
    } catch (error: any) {
      console.error('Load completed practices error:', error);
      message.error(error.response?.data?.message || '加载已完成练习列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = async (practiceId: number) => {
    try {
      // Navigate to practice page (eligibility will be checked when starting)
      navigate(`/student/activity/${practiceId}`);
    } catch (error: any) {
      console.error('Navigate error:', error);
      message.error('跳转失败');
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

  const getSubjectTag = (subject: string) => {
    const colors: Record<string, string> = {
      '语文': 'blue',
      '数学': 'green',
      '科学': 'purple',
      '英语': 'orange',
      '计算机': 'cyan',
    };
    return <Tag color={colors[subject] || 'default'}>{subject}</Tag>;
  };

  const getAbilityLevelTag = (level?: string) => {
    if (!level) return '-';
    const colors: Record<string, string> = {
      L1: 'blue',
      L2: 'cyan',
      L3: 'green',
      L4: 'lime',
      L5: 'orange',
      L6: 'red',
      L7: 'purple',
    };
    return <Tag color={colors[level] || 'default'}>{level}</Tag>;
  };

  const columns = [
    {
      title: '练习名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (title: string, record: Practice) => (
        <Space>
          <span>{title}</span>
          {record.my_status === 'submitted' || record.my_status === 'graded' ? (
            <Tag color="success" icon={<TrophyOutlined />}>
              已完成
            </Tag>
          ) : record.my_status === 'in_progress' ? (
            <Tag color="processing" icon={<PlayCircleOutlined />}>
              进行中
            </Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 100,
      render: (subject: string) => getSubjectTag(subject),
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 100,
    },
    {
      title: '能力等级',
      dataIndex: 'ability_level',
      key: 'ability_level',
      width: 120,
      render: (level: string) => getAbilityLevelTag(level),
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 160,
      render: (time: string) => formatDateTime(time),
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => `${duration}分钟`,
    },
    {
      title: '总分',
      dataIndex: 'total_score',
      key: 'total_score',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: Practice) => (
        <Button
          size="small"
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={() => handleStartPractice(record.id)}
        >
          开始练习
        </Button>
      ),
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
            <Select
              placeholder="科目"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, subject: value })}
              virtual={false}
            >
              {SUBJECTS.map(subject => (
                <Select.Option key={subject.value} value={subject.value}>
                  {subject.label}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="年级"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, grade: value })}
              virtual={false}
            >
              {getAllGrades().map(grade => (
                <Select.Option key={grade.value} value={grade.value}>
                  {grade.label}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="能力等级"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, ability_level: value })}
              virtual={false}
            >
              {getAllAbilityLevels().map(level => (
                <Select.Option key={level.value} value={level.value}>
                  {level.label}
                </Select.Option>
              ))}
            </Select>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          items={[
            {
              key: 'available',
              label: `可用练习 (${practices.length})`,
              children: (
                <Table
                  columns={columns}
                  dataSource={practices}
                  rowKey="id"
                  scroll={{ x: 1200 }}
                  locale={{ emptyText: '暂无可用练习' }}
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 个练习`,
                  }}
                />
              ),
            },
            {
              key: 'completed',
              label: `已完成 (${completedPractices.length})`,
              children: renderCompletedTable(),
            },
          ]}
        />
      </Card>
    </div>
  );

  function renderCompletedTable() {
    const completedColumns = [
      {
        title: '练习名称',
        dataIndex: 'title',
        key: 'title',
        width: 200,
      },
      {
        title: '科目',
        dataIndex: 'subject',
        key: 'subject',
        width: 100,
        render: (subject: string) => getSubjectTag(subject),
      },
      {
        title: '年级',
        dataIndex: 'grade',
        key: 'grade',
        width: 100,
      },
      {
        title: '能力等级',
        dataIndex: 'ability_level',
        key: 'ability_level',
        width: 120,
        render: (level: string) => getAbilityLevelTag(level),
      },
      {
        title: '得分',
        key: 'score',
        width: 120,
        render: (_: any, record: CompletedPractice) => (
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: record.my_score >= record.total_score * 0.6 ? '#52c41a' : '#ff4d4f' }}>
            {record.my_score} / {record.total_score}
          </span>
        ),
      },
      {
        title: '完成时间',
        dataIndex: 'submit_time',
        key: 'submit_time',
        width: 160,
        render: (time: string) => formatDateTime(time),
      },
      {
        title: '批改状态',
        dataIndex: 'grading_status',
        key: 'grading_status',
        width: 100,
        render: (status: string) => {
          const statusMap: Record<string, { text: string; color: string }> = {
            'pending': { text: '待批改', color: 'default' },
            'in_progress': { text: '批改中', color: 'processing' },
            'completed': { text: '已完成', color: 'success' },
          };
          const s = statusMap[status] || { text: status, color: 'default' };
          return <Tag color={s.color}>{s.text}</Tag>;
        },
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right' as const,
        render: (_: any, record: CompletedPractice) => (
          <Button
            size="small"
            type="primary"
            icon={<TrophyOutlined />}
            onClick={() => navigate(`/student/results/${record.id}`)}
          >
            查看结果
          </Button>
        ),
      },
    ];

    return (
      <Table
        columns={completedColumns}
        dataSource={completedPractices}
        rowKey="id"
        scroll={{ x: 1100 }}
        locale={{ emptyText: '暂无已完成的练习，快去练习吧！' }}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 个练习`,
        }}
      />
    );
  }
};

export default PracticeCenterPage;
