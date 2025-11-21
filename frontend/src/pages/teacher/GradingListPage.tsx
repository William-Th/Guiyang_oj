import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, message, Spin, Select, Statistic, Row, Col, DatePicker, Input, Modal } from 'antd';
import { EyeOutlined, CheckCircleOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gradingApi, activityApi } from '../../services/api';
import { ApiError, FilterParams } from '../../types';

interface PendingSubmission {
  student_activity_id: number;
  student_id: number;
  activity_id: number;
  status: string;
  grading_status: string;
  score: number | null;
  submit_time: string;
  attempt_number: number;
  student_name: string;
  student_username: string;
  activity_title: string;
  activity_type: string;
  subject: string;
  grade: string;
  pending_answers: number;
  total_answers: number;
}

const { RangePicker } = DatePicker;
const { Search } = Input;

interface Activity {
  id: number;
  title: string;
}

const GradingListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filters, setFilters] = useState<{
    activityId?: number;
    subject?: string;
    grade?: string;
    grading_status?: string;
    startDate?: string;
    endDate?: string;
    searchText?: string;
  }>({});

  // Initialize filters from URL params
  useEffect(() => {
    const initialFilters: FilterParams = {};
    if (searchParams.get('activityId')) initialFilters.activityId = parseInt(searchParams.get('activityId')!);
    if (searchParams.get('subject')) initialFilters.subject = searchParams.get('subject');
    if (searchParams.get('grade')) initialFilters.grade = searchParams.get('grade');
    if (searchParams.get('grading_status')) initialFilters.grading_status = searchParams.get('grading_status');
    if (searchParams.get('startDate')) initialFilters.startDate = searchParams.get('startDate');
    if (searchParams.get('endDate')) initialFilters.endDate = searchParams.get('endDate');
    if (searchParams.get('searchText')) initialFilters.searchText = searchParams.get('searchText');

    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
    }

    loadActivities();
  }, []);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    });
    setSearchParams(params, { replace: true });

    loadPendingGrading();
  }, [filters]);

  const loadActivities = async (retryCount = 0) => {
    try {
      const response = await activityApi.getMyActivities();
      setActivities(response.activities || []);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Load activities error:', apiError);

      // Network error - retry silently
      if (apiError.code === 'ERR_NETWORK' || apiError.message?.includes('Network Error')) {
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return loadActivities(retryCount + 1);
        } else {
          // Failed after retries - show warning but don't block
          message.warning('加载活动列表失败，筛选功能可能受限');
        }
      }
    }
  };

  const loadPendingGrading = async (retryCount = 0) => {
    try {
      setLoading(true);
      const response = await gradingApi.getPendingGrading(filters);
      setSubmissions(response.submissions || []);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Load pending grading error:', apiError);

      // Network error - retry mechanism
      if (apiError.code === 'ERR_NETWORK' || apiError.message?.includes('Network Error')) {
        if (retryCount < 2) {
          message.warning(`网络错误，正在重试... (${retryCount + 1}/2)`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return loadPendingGrading(retryCount + 1);
        } else {
          Modal.error({
            title: '网络连接失败',
            content: '请检查网络后点击重新加载',
            okText: '重新加载',
            onOk: () => {
              loadPendingGrading(0);
            },
          });
        }
      } else {
        const errorMsg = apiError.response?.data?.message || '加载待评卷列表失败';
        message.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = (studentActivityId: number) => {
    navigate(`/teacher/grading/${studentActivityId}`);
  };

  const getGradingStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待评卷' },
      auto_graded: { color: 'blue', text: '自动评分' },
      partial_graded: { color: 'cyan', text: '部分评分' },
      completed: { color: 'green', text: '已完成' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
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

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'activity_title',
      key: 'activity_title',
      width: 200,
    },
    {
      title: '学生',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 120,
      render: (name: string, record: PendingSubmission) => (
        <div>
          <div>{name}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.student_username}</div>
        </div>
      ),
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 100,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 100,
    },
    {
      title: '提交时间',
      dataIndex: 'submit_time',
      key: 'submit_time',
      width: 160,
      render: (time: string) => formatDateTime(time),
    },
    {
      title: '评卷状态',
      dataIndex: 'grading_status',
      key: 'grading_status',
      width: 120,
      render: (status: string) => getGradingStatusTag(status),
    },
    {
      title: '待评题目',
      key: 'pending',
      width: 120,
      render: (_: any, record: PendingSubmission) => (
        <span>
          {record.pending_answers} / {record.total_answers}
        </span>
      ),
    },
    {
      title: '当前得分',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      render: (score: number | null) => score !== null ? score : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: PendingSubmission) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleGrade(record.student_activity_id)}
          >
            评卷
          </Button>
        </Space>
      ),
    },
  ];

  // Calculate statistics
  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.grading_status === 'pending').length,
    autoGraded: submissions.filter(s => s.grading_status === 'auto_graded').length,
    partialGraded: submissions.filter(s => s.grading_status === 'partial_graded').length,
    completed: submissions.filter(s => s.grading_status === 'completed').length,
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载评卷列表中..." />
      </div>
    );
  }

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总提交数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待评卷"
              value={stats.pending}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="部分评分"
              value={stats.partialGraded}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="待评卷列表"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => setFilters({})}
            >
              重置筛选
            </Button>
          </Space>
        }
      >
        {/* 筛选器 */}
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            placeholder="选择活动"
            allowClear
            style={{ width: 200 }}
            value={filters.activityId}
            onChange={(value) => setFilters({ ...filters, activityId: value })}
            virtual={false}
            showSearch
            filterOption={(input, option) => {
              if (!option?.children) return false;
              return String(option.children).toLowerCase().includes(input.toLowerCase());
            }}
          >
            {activities.map(activity => (
              <Select.Option key={activity.id} value={activity.id}>
                {activity.title}
              </Select.Option>
            ))}
          </Select>

          <Select
            placeholder="科目"
            allowClear
            style={{ width: 120 }}
            value={filters.subject}
            onChange={(value) => setFilters({ ...filters, subject: value })}
            virtual={false}
          >
            <Select.Option value="语文">语文</Select.Option>
            <Select.Option value="数学">数学</Select.Option>
            <Select.Option value="英语">英语</Select.Option>
            <Select.Option value="科学">科学</Select.Option>
            <Select.Option value="计算机">计算机</Select.Option>
          </Select>

          <Select
            placeholder="年级"
            allowClear
            style={{ width: 120 }}
            value={filters.grade}
            onChange={(value) => setFilters({ ...filters, grade: value })}
            virtual={false}
          >
            <Select.Option value="一年级">一年级</Select.Option>
            <Select.Option value="二年级">二年级</Select.Option>
            <Select.Option value="三年级">三年级</Select.Option>
            <Select.Option value="四年级">四年级</Select.Option>
            <Select.Option value="五年级">五年级</Select.Option>
            <Select.Option value="六年级">六年级</Select.Option>
          </Select>

          <Select
            placeholder="评卷状态"
            allowClear
            style={{ width: 120 }}
            value={filters.grading_status}
            onChange={(value) => setFilters({ ...filters, grading_status: value })}
            virtual={false}
          >
            <Select.Option value="pending">待评卷</Select.Option>
            <Select.Option value="auto_graded">自动评分</Select.Option>
            <Select.Option value="partial_graded">部分评分</Select.Option>
          </Select>

          <RangePicker
            placeholder={['开始日期', '结束日期']}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setFilters({
                  ...filters,
                  startDate: dates[0].format('YYYY-MM-DD'),
                  endDate: dates[1].format('YYYY-MM-DD'),
                });
              } else {
                const { startDate: _startDate, endDate: _endDate, ...rest } = filters;
                setFilters(rest);
              }
            }}
          />

          <Search
            placeholder="搜索学生姓名/学号"
            allowClear
            style={{ width: 200 }}
            value={filters.searchText}
            onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
            onSearch={(value) => setFilters({ ...filters, searchText: value })}
            enterButton={<SearchOutlined />}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={submissions}
          rowKey="student_activity_id"
          scroll={{ x: 1200 }}
          locale={{ emptyText: '暂无待评卷提交' }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个提交`,
          }}
        />
      </Card>
    </div>
  );
};

export default GradingListPage;
