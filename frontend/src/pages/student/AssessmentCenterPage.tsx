import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, message, Spin, Select } from 'antd';
import { EyeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { activityApi } from '../../services/api';
import { SUBJECTS, getAllGrades, getAllAbilityLevels } from '../../config/subjects';

interface Assessment {
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
  student_status?: string;
  attempt_number?: number;
}

const AssessmentCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    subject?: string;
    grade?: string;
    ability_level?: string;
  }>({});

  useEffect(() => {
    loadAssessments();
  }, [filters]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const response = await activityApi.getStudentAssessments(filters);
      setAssessments(response.assessments || []);
    } catch (error: any) {
      console.error('Load assessments error:', error);
      message.error(error.response?.data?.message || '加载测评列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async (assessmentId: number) => {
    try {
      // Navigate to activity page (eligibility will be checked when starting)
      navigate(`/student/activity/${assessmentId}`);
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
      title: '测评名称',
      dataIndex: 'title',
      key: 'title',
      width: 250,
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
      title: '官方测评',
      dataIndex: 'is_official',
      key: 'is_official',
      width: 100,
      render: (isOfficial: boolean) =>
        isOfficial ? (
          <Tag color="red">官方</Tag>
        ) : (
          <Tag>非官方</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Assessment) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/student/activity/${record.id}`)}
          >
            查看详情
          </Button>
          <Button
            size="small"
            type="primary"
            danger
            icon={<PlayCircleOutlined />}
            onClick={() => handleStartAssessment(record.id)}
          >
            开始测评
          </Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载测评列表中..." />
      </div>
    );
  }

  return (
    <div>
      <Card
        title="测评中心"
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
        <Table
          columns={columns}
          dataSource={assessments}
          rowKey="id"
          scroll={{ x: 1300 }}
          locale={{ emptyText: '暂无可用测评' }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个测评`,
          }}
        />
      </Card>
    </div>
  );
};

export default AssessmentCenterPage;
