import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Tag, message, Spin, Empty, Space } from 'antd';
import {
  BookOutlined,
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

interface TeacherStats {
  totalQuestions: number;
  totalActivities: number;
  activeActivities: number;
  completedActivities: number;
}

interface Question {
  id: number;
  type: string;
  subject: string;
  grade: string;
  content: string;
  difficulty: string;
  created_at: string;
}

interface Activity {
  id: number;
  title: string;
  subject: string;
  grade: string;
  type: 'practice' | 'assessment';
  start_time: string;
  end_time: string;
  status: string;
  total_score: number;
}

const TeacherDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TeacherStats>({
    totalQuestions: 0,
    totalActivities: 0,
    activeActivities: 0,
    completedActivities: 0
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // 获取教师统计数据
  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchQuestions(),
        fetchActivities()
      ]);
    } catch (error) {
      console.error('Failed to fetch teacher data:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取教师创建的题目
  const fetchQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const response = await api.get('/question-bank/bank', {
        params: {
          limit: 10,
          offset: 0
        }
      });
      const questionData = response.data.questions || [];
      setQuestions(questionData);

      // 更新统计数据
      setStats(prev => ({
        ...prev,
        totalQuestions: response.data.total || questionData.length
      }));
    } catch (error: any) {
      console.error('Failed to fetch questions:', error);
      message.error('获取题目列表失败');
    } finally {
      setQuestionsLoading(false);
    }
  };

  // 获取教师创建的活动（练习）
  const fetchActivities = async () => {
    setActivitiesLoading(true);
    try {
      const response = await api.get('/activities/my/created');
      const activityData = response.data.activities || [];

      setActivities(activityData);

      // 计算统计数据
      const now = new Date();
      const active = activityData.filter((activity: Activity) =>
        new Date(activity.start_time) <= now && new Date(activity.end_time) >= now
      ).length;
      const completed = activityData.filter((activity: Activity) =>
        new Date(activity.end_time) < now
      ).length;

      setStats(prev => ({
        ...prev,
        totalActivities: activityData.length,
        activeActivities: active,
        completedActivities: completed
      }));
    } catch (error: any) {
      console.error('Failed to fetch activities:', error);
      // 如果是空数据，不显示错误提示
      if (error.response?.status !== 404) {
        message.error('获取活动列表失败');
      }
    } finally {
      setActivitiesLoading(false);
    }
  };

  // 题目类型映射
  const questionTypeMap: { [key: string]: string } = {
    single: '单选题',
    multiple: '多选题',
    blank: '填空题',
    true_false: '判断题',
    essay: '问答题',
    code: '编程题',
    matching: '匹配题'
  };

  // 难度标签颜色
  const difficultyColorMap: { [key: string]: string } = {
    easy: 'green',
    medium: 'orange',
    hard: 'red'
  };

  // 难度映射
  const difficultyMap: { [key: string]: string } = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  };

  // 活动类型标签
  const getActivityTypeTag = (type: string) => {
    return type === 'assessment' ? (
      <Tag color="red">测评</Tag>
    ) : (
      <Tag color="blue">练习</Tag>
    );
  };

  // 活动状态
  const getActivityStatus = (activity: Activity) => {
    const now = new Date();
    const startTime = new Date(activity.start_time);
    const endTime = new Date(activity.end_time);

    if (now < startTime) {
      return { text: '未开始', color: 'blue' };
    } else if (now >= startTime && now <= endTime) {
      return { text: '进行中', color: 'green' };
    } else {
      return { text: '已结束', color: 'default' };
    }
  };

  // 删除题目
  const handleDeleteQuestion = async (id: number) => {
    try {
      await api.delete(`/question-bank/bank/${id}`);
      message.success('删除成功');
      fetchQuestions();
    } catch (error: any) {
      console.error('Failed to delete question:', error);
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  // 题目列表列定义
  const questionColumns = [
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => questionTypeMap[type] || type
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 80
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => text.length > 50 ? text.substring(0, 50) + '...' : text
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty: string) => (
        <Tag color={difficultyColorMap[difficulty]}>
          {difficultyMap[difficulty] || difficulty}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Question) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/teacher/question-bank/edit/${record.id}`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteQuestion(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  // 活动列表列定义
  const activityColumns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => getActivityTypeTag(type)
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 80
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80
    },
    {
      title: '总分',
      dataIndex: 'total_score',
      key: 'total_score',
      width: 80
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: Activity) => {
        const status = getActivityStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      }
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div>
      <h2>教师工作台</h2>

      {/* 教师个人信息 */}
      <Card title="个人信息" style={{ marginTop: '24px' }}>
        <Row gutter={[24, 16]}>
          <Col span={12}>
            <Space>
              <UserOutlined />
              <span><strong>姓名：</strong>{user?.realName || user?.username || '未设置'}</span>
            </Space>
          </Col>
          <Col span={12}>
            <Space>
              <IdcardOutlined />
              <span><strong>角色：</strong>教师</span>
            </Space>
          </Col>
          <Col span={12}>
            <Space>
              <PhoneOutlined />
              <span><strong>手机号：</strong>{user?.phone || '未设置'}</span>
            </Space>
          </Col>
          <Col span={12}>
            <Space>
              <MailOutlined />
              <span><strong>邮箱：</strong>{user?.email || '未设置'}</span>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 统计数据 */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="创建题目总数"
              value={stats.totalQuestions}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="创建活动总数"
              value={stats.totalActivities}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="进行中的活动"
              value={stats.activeActivities}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成的活动"
              value={stats.completedActivities}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 我创建的题目 */}
      <Card
        title="我创建的题目"
        style={{ marginTop: '24px' }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/teacher/question-bank/create')}
          >
            创建题目
          </Button>
        }
      >
        {questionsLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin tip="加载题目中..." />
          </div>
        ) : questions.length > 0 ? (
          <>
            <Table
              columns={questionColumns}
              dataSource={questions}
              rowKey="id"
              pagination={{
                pageSize: 5,
                showTotal: (total) => `共 ${total} 道题目`
              }}
            />
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Button
                type="link"
                onClick={() => navigate('/teacher/question-bank')}
              >
                查看全部题目 &gt;
              </Button>
            </div>
          </>
        ) : (
          <Empty description="暂无题目" />
        )}
      </Card>

      {/* 我创建的活动 */}
      <Card
        title="我创建的活动"
        style={{ marginTop: '24px' }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/teacher/activities')}
          >
            创建活动
          </Button>
        }
      >
        {activitiesLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin tip="加载活动中..." />
          </div>
        ) : activities.length > 0 ? (
          <>
            <Table
              columns={activityColumns}
              dataSource={activities}
              rowKey="id"
              pagination={{
                pageSize: 5,
                showTotal: (total) => `共 ${total} 个活动`
              }}
            />
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Button
                type="link"
                onClick={() => navigate('/teacher/activities')}
              >
                查看全部活动 &gt;
              </Button>
            </div>
          </>
        ) : (
          <Empty description="暂无活动" />
        )}
      </Card>
    </div>
  );
};

export default TeacherDashboard;
