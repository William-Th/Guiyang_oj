import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, message, Spin, Select, Tabs } from 'antd';
import { EyeOutlined, PlayCircleOutlined, FormOutlined, UnorderedListOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { activityApi } from '../../services/api';
import { SUBJECTS, getAllGrades, getAllAbilityLevels } from '../../config/subjects';
import AssessmentRegistrationModal from '../../components/student/AssessmentRegistrationModal';

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
  registration_enabled?: boolean;
  registration_status?: string;
}

interface HistoryAssessment {
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
  is_official?: boolean;
}

/**
 * 测评中心页面
 * 可用测评 + 已完成测评（全部从后端 API 获取）
 */
const AssessmentCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [completedAssessments, setCompletedAssessments] = useState<HistoryAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [registrationModalVisible, setRegistrationModalVisible] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [filters, setFilters] = useState<{
    subject?: string;
    grade?: string;
    ability_level?: string;
  }>({});

  useEffect(() => {
    loadAssessments();
    loadCompletedAssessments();
  }, []);

  useEffect(() => {
    if (activeTab === 'available') {
      loadAssessments();
    } else {
      loadCompletedAssessments();
    }
  }, [filters, activeTab]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const response = await activityApi.getStudentAssessments(filters);
      setAssessments(response.activities || response.assessments || []);
    } catch (error: any) {
      console.error('Load assessments error:', error);
      message.error(error.response?.data?.message || '加载测评列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedAssessments = async () => {
    try {
      setLoading(true);
      // 使用 history API 获取已完成的测评
      const response = await activityApi.getStudentHistory({ type: 'assessment', ...filters });
      const history = response.history || [];
      const completed = history.filter(
        (h: any) => h.status === 'graded' || h.status === 'submitted'
      );
      setCompletedAssessments(completed);
    } catch (error: any) {
      console.error('Load completed assessments error:', error);
      message.error(error.response?.data?.message || '加载已完成测评列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async (assessmentId: number) => {
    navigate(`/student/activity/${assessmentId}`);
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

  const availableColumns = [
    { title: '测评名称', dataIndex: 'title', key: 'title', width: 250 },
    { title: '科目', dataIndex: 'subject', key: 'subject', width: 100, render: (s: string) => getSubjectTag(s) },
    { title: '年级', dataIndex: 'grade', key: 'grade', width: 100 },
    { title: '能力等级', dataIndex: 'ability_level', key: 'ability_level', width: 120, render: (l: string) => getAbilityLevelTag(l) },
    { title: '开始时间', dataIndex: 'start_time', key: 'start_time', width: 160, render: (t: string) => formatDateTime(t) },
    { title: '时长', dataIndex: 'duration', key: 'duration', width: 100, render: (d: number) => d ? `${d}分钟` : '-' },
    { title: '总分', dataIndex: 'total_score', key: 'total_score', width: 80 },
    {
      title: '官方测评', dataIndex: 'is_official', key: 'is_official', width: 100,
      render: (isOfficial: boolean) => isOfficial ? <Tag color="red">官方</Tag> : <Tag>非官方</Tag>,
    },
    {
      title: '报名状态', dataIndex: 'registration_status', key: 'registration_status', width: 100,
      render: (status: string, record: Assessment) => {
        if (!record.registration_enabled) return <Tag>无需报名</Tag>;
        const cfg: Record<string, { color: string; text: string }> = {
          confirmed: { color: 'success', text: '已报名' },
          pending: { color: 'processing', text: '待确认' },
          cancelled: { color: 'default', text: '已取消' },
          rejected: { color: 'error', text: '已拒绝' },
        };
        if (status && cfg[status]) return <Tag color={cfg[status].color}>{cfg[status].text}</Tag>;
        return <Tag color="warning">未报名</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 220, fixed: 'right' as const,
      render: (_: any, record: Assessment) => {
        const isRegistered = record.registration_status === 'confirmed';
        const needsRegistration = record.registration_enabled && !isRegistered;
        const canStart = !record.registration_enabled || isRegistered;
        return (
          <Space>
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/student/activity/${record.id}`)}>详情</Button>
            {needsRegistration && (
              <Button size="small" type="primary" icon={<FormOutlined />} onClick={() => handleRegisterClick(record)}>报名</Button>
            )}
            {canStart && (
              <Button size="small" type="primary" danger icon={<PlayCircleOutlined />} onClick={() => handleStartAssessment(record.id)}>开始</Button>
            )}
          </Space>
        );
      },
    },
  ];

  const completedColumns = [
    { title: '测评名称', dataIndex: 'title', key: 'title', width: 250 },
    { title: '科目', dataIndex: 'subject', key: 'subject', width: 100, render: (s: string) => getSubjectTag(s) },
    { title: '年级', dataIndex: 'grade', key: 'grade', width: 100, render: (g: string) => g || '-' },
    {
      title: '类型', key: 'is_official', width: 100,
      render: (_: any, record: HistoryAssessment) => record.is_official ? <Tag color="red">官方</Tag> : <Tag>非官方</Tag>,
    },
    {
      title: '得分', key: 'score', width: 120,
      sorter: (a: HistoryAssessment, b: HistoryAssessment) => (Number(a.score) || 0) - (Number(b.score) || 0),
      render: (_: any, record: HistoryAssessment) => {
        const myScore = Number(record.score) || 0;
        const totalScore = Number(record.total_score) || 0;
        const pct = totalScore > 0 ? myScore / totalScore : 0;
        const color = pct >= 0.9 ? '#52c41a' : pct >= 0.6 ? '#16a34a' : '#ff4d4f';
        return (
          <span style={{ fontSize: 16, fontWeight: 'bold', color }}>
            {myScore.toFixed(1)} / {totalScore}
          </span>
        );
      },
    },
    {
      title: '完成时间', dataIndex: 'submit_time', key: 'submit_time', width: 160,
      sorter: (a: HistoryAssessment, b: HistoryAssessment) =>
        new Date(a.submit_time).getTime() - new Date(b.submit_time).getTime(),
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
      render: (_: any, record: HistoryAssessment) => (
        <Button size="small" type="primary" icon={<TrophyOutlined />}
          onClick={() => navigate(`/student/results/${record.id}`)}>
          查看结果
        </Button>
      ),
    },
  ];

  const handleRegisterClick = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setRegistrationModalVisible(true);
  };

  const handleRegistrationSuccess = () => {
    loadAssessments();
  };

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
            <Button icon={<UnorderedListOutlined />} onClick={() => navigate('/student/registrations')}>
              我的报名
            </Button>
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
            label: `可参加测评 (${assessments.length})`,
            children: (
              <Table columns={availableColumns} dataSource={assessments} rowKey="id" scroll={{ x: 1300 }}
                locale={{ emptyText: '暂无可用测评' }}
                pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 个测评` }} />
            ),
          },
          {
            key: 'completed',
            label: `已完成 (${completedAssessments.length})`,
            children: (
              <Table columns={completedColumns} dataSource={completedAssessments} rowKey="id" scroll={{ x: 1200 }}
                locale={{ emptyText: '暂无已完成的测评' }}
                pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 个测评` }} />
            ),
          },
        ]} />
      </Card>

      {selectedAssessment && (
        <AssessmentRegistrationModal
          visible={registrationModalVisible}
          activityId={selectedAssessment.id}
          activityTitle={selectedAssessment.title}
          abilityLevel={selectedAssessment.ability_level}
          onClose={() => { setRegistrationModalVisible(false); setSelectedAssessment(null); }}
          onSuccess={handleRegistrationSuccess}
        />
      )}
    </div>
  );
};

export default AssessmentCenterPage;
