import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Spin,
  Empty,
  message,
  Select,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  TrophyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { activityApi } from '../services/api';

interface CompletedActivity {
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
  type?: string;
}

/**
 * 成绩查询页面
 * 展示学生已完成的所有活动/练习成绩
 */
const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<CompletedActivity[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadResults();
  }, [subjectFilter]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (subjectFilter) filters.subject = subjectFilter;

      const response = await activityApi.getStudentCompletedPractices(filters);
      const practices = response.practices || [];
      setResults(practices);
    } catch (error: any) {
      console.error('Load results error:', error);
      message.error(error.response?.data?.message || '加载成绩列表失败');
    } finally {
      setLoading(false);
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
      '信息科技': 'cyan',
    };
    return <Tag color={colors[subject] || 'default'}>{subject}</Tag>;
  };

  const getGradingStatusTag = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      'pending': { text: '待批改', color: 'default' },
      'in_progress': { text: '批改中', color: 'processing' },
      'completed': { text: '已完成', color: 'success' },
    };
    const s = statusMap[status] || { text: status, color: 'default' };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  // 计算统计数据
  const stats = {
    total: results.length,
    avgScore: results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.my_score || 0), 0) / results.length * 10) / 10
      : 0,
    excellent: results.filter(r => r.my_score >= r.total_score * 0.9).length,
    passed: results.filter(r => r.my_score >= r.total_score * 0.6).length,
  };

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      render: (title: string) => (
        <span style={{ fontWeight: 500 }}>{title}</span>
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
      width: 80,
    },
    {
      title: '得分',
      key: 'score',
      width: 120,
      sorter: (a: CompletedActivity, b: CompletedActivity) => (a.my_score || 0) - (b.my_score || 0),
      render: (_: any, record: CompletedActivity) => {
        const percentage = record.total_score > 0 ? (record.my_score / record.total_score) : 0;
        const color = percentage >= 0.9 ? '#52c41a' : percentage >= 0.6 ? '#16a34a' : '#ff4d4f';
        return (
          <span style={{ fontSize: 16, fontWeight: 'bold', color }}>
            {record.my_score != null ? record.my_score : '-'} / {record.total_score}
          </span>
        );
      },
    },
    {
      title: '完成时间',
      dataIndex: 'submit_time',
      key: 'submit_time',
      width: 160,
      sorter: (a: CompletedActivity, b: CompletedActivity) =>
        new Date(a.submit_time).getTime() - new Date(b.submit_time).getTime(),
      render: (time: string) => formatDateTime(time),
    },
    {
      title: '批改状态',
      dataIndex: 'grading_status',
      key: 'grading_status',
      width: 100,
      render: (status: string) => getGradingStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: CompletedActivity) => (
        <Button
          size="small"
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/student/results/${record.id}`)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2><TrophyOutlined style={{ marginRight: 8 }} />成绩查询</h2>

      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="已完成考试"
              value={stats.total}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#16a34a' }}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="平均得分"
              value={stats.avgScore}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix="分"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="优秀次数"
              value={stats.excellent}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#fa8c16' }}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="通过率"
              value={stats.total > 0 ? Math.round(stats.passed / stats.total * 100) : 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* 成绩列表 */}
      <Card
        title="我的成绩"
        extra={
          <Space>
            <Select
              placeholder="筛选科目"
              allowClear
              style={{ width: 120 }}
              value={subjectFilter}
              onChange={(value) => setSubjectFilter(value)}
            >
              <Select.Option value="数学">数学</Select.Option>
              <Select.Option value="语文">语文</Select.Option>
              <Select.Option value="英语">英语</Select.Option>
              <Select.Option value="信息科技">信息科技</Select.Option>
              <Select.Option value="计算机">计算机</Select.Option>
              <Select.Option value="科学">科学</Select.Option>
            </Select>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="加载成绩数据..." />
          </div>
        ) : results.length > 0 ? (
          <Table
            columns={columns}
            dataSource={results}
            rowKey="id"
            scroll={{ x: 900 }}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条成绩记录`,
              pageSize: 10,
            }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: '#999' }}>
                暂无成绩记录，完成测评后即可在此查看成绩
              </span>
            }
          />
        )}
      </Card>
    </div>
  );
};

export default ResultsPage;
