import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, message, Spin, Select, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { activityApi } from '../../services/api';
import { SUBJECTS, getAllGrades, getAllAbilityLevels } from '../../config/subjects';

interface Assessment {
  id: number;
  title: string;
  subject: string;
  grade: string;
  type: 'practice' | 'assessment';
  ability_level?: string;
  scope?: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_score: number;
  status: string;
  is_official: boolean;
  created_at: string;
  participant_count?: number;
}

const AssessmentManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    subject?: string;
    grade?: string;
    status?: string;
    type?: 'practice' | 'assessment';
    ability_level?: string;
  }>({});

  useEffect(() => {
    loadAssessments();
  }, [filters]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      // Use getMyActivities which calls GET /activities - backend will show all activities for admins
      const response = await activityApi.getMyActivities(filters);
      setAssessments(response.activities || []);
    } catch (error: any) {
      console.error('Load activities error:', error);
      message.error(error.response?.data?.message || '加载活动列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assessmentId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个测评吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await activityApi.deleteActivity(assessmentId);
          message.success('删除成功！');
          loadAssessments();
        } catch (error: any) {
          console.error('Delete error:', error);
          message.error(error.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const handlePublish = async (assessmentId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    const actionText = newStatus === 'published' ? '发布' : '取消发布';

    try {
      await activityApi.updateActivityStatus(assessmentId, newStatus);
      message.success(`${actionText}成功！`);
      loadAssessments();
    } catch (error: any) {
      console.error('Update status error:', error);
      message.error(error.response?.data?.message || `${actionText}失败`);
    }
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

  const getActivityTypeTag = (type: string) => {
    return type === 'assessment' ? (
      <Tag color="red">测评</Tag>
    ) : (
      <Tag color="blue">练习</Tag>
    );
  };

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => getActivityTypeTag(type),
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 80,
      render: (subject: string) => {
        const colors: Record<string, string> = {
          '语文': 'blue',
          '数学': 'green',
          '科学': 'purple',
          '英语': 'orange',
          '计算机': 'cyan',
        };
        return <Tag color={colors[subject] || 'default'}>{subject}</Tag>;
      },
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: Assessment) => getStatusTag(record.status),
    },
    {
      title: '参与人数',
      dataIndex: 'participant_count',
      key: 'participant_count',
      width: 100,
      render: (count: number) => count || 0,
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      fixed: 'right' as const,
      render: (_: any, record: Assessment) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/assessments/${record.id}`)}
          >
            查看
          </Button>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => navigate(`/admin/assessments/${record.id}/paper`)}
          >
            组卷
          </Button>
          {record.status === 'draft' && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/assessments/edit/${record.id}`)}
            >
              编辑
            </Button>
          )}
          <Button
            size="small"
            type={record.status === 'published' ? 'default' : 'primary'}
            onClick={() => handlePublish(record.id, record.status)}
            disabled={record.status === 'ongoing' || record.status === 'finished'}
          >
            {record.status === 'published' ? '取消发布' : '发布'}
          </Button>
          {record.status === 'draft' && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载活动列表中..." />
      </div>
    );
  }

  return (
    <div>
      <Card
        title="活动管理中心"
        extra={
          <Space>
            <Select
              placeholder="活动类型"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, type: value })}
              virtual={false}
            >
              <Select.Option value="practice">练习</Select.Option>
              <Select.Option value="assessment">测评</Select.Option>
            </Select>
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
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, status: value })}
              virtual={false}
            >
              <Select.Option value="draft">草稿</Select.Option>
              <Select.Option value="published">已发布</Select.Option>
              <Select.Option value="ongoing">进行中</Select.Option>
              <Select.Option value="finished">已结束</Select.Option>
            </Select>
            <Button
              type="primary"
              danger
              icon={<PlusOutlined />}
              onClick={() => navigate('/admin/assessments/create')}
            >
              创建活动
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={assessments}
          rowKey="id"
          scroll={{ x: 1200 }}
          locale={{ emptyText: '暂无活动数据' }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default AssessmentManagementPage;
