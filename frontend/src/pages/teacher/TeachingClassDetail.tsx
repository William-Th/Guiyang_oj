import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  message,
  Spin,
  Tabs,
  Table,
  Timeline,
  Empty,
  Modal
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SendOutlined,
  TeamOutlined,
  BookOutlined,
  HistoryOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { teachingClassApi } from '../../services/api';

interface Student {
  id: number;
  user_id: number;
  student_no: string;
  username: string;
  real_name: string;
  phone: string;
  school_name: string;
  grade: string;
  class: string;
  joined_at: string;
  is_active: boolean;
}

interface Teacher {
  id: number;
  user_id: number;
  teacher_no: string;
  username: string;
  real_name: string;
  phone: string;
  role: string;
  assigned_at: string;
  is_active: boolean;
}

interface Activity {
  id: number;
  activity_id: number;
  title: string;
  type: string;
  subject: string;
  status: string;
  deadline: string;
  is_required: boolean;
  assigned_at: string;
}

interface ApprovalRecord {
  id: number;
  reviewer_id: number;
  reviewer_name: string;
  action: string;
  comment: string;
  reviewer_level: string;
  created_at: string;
}

interface TeachingClassDetail {
  id: number;
  name: string;
  description: string;
  scope: 'school' | 'district' | 'municipal';
  school_id: number;
  district_id: number;
  subject: string;
  grade: string;
  academic_year: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
  created_by: number;
  approved_by: number;
  created_at: string;
  submitted_at: string;
  approved_at: string;
  rejection_reason: string;
  current_reviewer_level: string;
  school_name: string;
  district_name: string;
  creator_name: string;
  approver_name: string;
  students: Student[];
  teachers: Teacher[];
  activities: Activity[];
  statistics: {
    student_count: number;
    teacher_count: number;
    activity_count: number;
  };
  approval_history: ApprovalRecord[];
}

const TeachingClassDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TeachingClassDetail | null>(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (id) {
      loadDetail();
    }
  }, [id]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const response = await teachingClassApi.getDetail(Number(id));
      setDetail(response.data || response);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    Modal.confirm({
      title: '提交审批',
      content: '确定要提交此教学班进行审批吗？提交后将无法修改。',
      okText: '确认提交',
      cancelText: '取消',
      onOk: async () => {
        try {
          await teachingClassApi.submitForApproval(Number(id));
          message.success('已提交审批');
          loadDetail();
        } catch (error: any) {
          message.error(error.response?.data?.message || '提交失败');
        }
      },
    });
  };

  const handleRemoveActivity = async (activityId: number) => {
    Modal.confirm({
      title: '移除活动',
      content: '确定要从教学班中移除此活动吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await teachingClassApi.removeActivity(Number(id), activityId);
          message.success('已移除活动');
          loadDetail();
        } catch (error: any) {
          message.error(error.response?.data?.message || '移除失败');
        }
      },
    });
  };

  const getScopeTag = (scope: string) => {
    const scopeMap: Record<string, { color: string; text: string }> = {
      school: { color: 'blue', text: '校级' },
      district: { color: 'orange', text: '区级' },
      municipal: { color: 'red', text: '市级' },
    };
    const info = scopeMap[scope] || { color: 'default', text: scope };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      draft: { color: 'default', text: '草稿' },
      pending: { color: 'processing', text: '待审批' },
      approved: { color: 'success', text: '已批准' },
      rejected: { color: 'error', text: '已拒绝' },
      archived: { color: 'default', text: '已归档' },
    };
    const info = statusMap[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getActionTag = (action: string) => {
    const actionMap: Record<string, { color: string; text: string }> = {
      approve: { color: 'success', text: '批准' },
      reject: { color: 'error', text: '拒绝' },
      escalate: { color: 'warning', text: '流转上级' },
      return: { color: 'default', text: '退回修改' },
    };
    const info = actionMap[action] || { color: 'default', text: action };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '-';
    return new Date(dateTimeString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!detail) {
    return (
      <Card>
        <Empty description="教学班不存在" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => navigate('/teacher/teaching-classes')}>返回列表</Button>
        </div>
      </Card>
    );
  }

  const studentColumns = [
    { title: '学号', dataIndex: 'student_no', key: 'student_no', width: 120 },
    { title: '姓名', dataIndex: 'real_name', key: 'real_name', width: 100 },
    { title: '学校', dataIndex: 'school_name', key: 'school_name', width: 180 },
    { title: '年级', dataIndex: 'grade', key: 'grade', width: 80 },
    { title: '班级', dataIndex: 'class', key: 'class', width: 80 },
    {
      title: '加入时间',
      dataIndex: 'joined_at',
      key: 'joined_at',
      width: 150,
      render: (text: string) => formatDateTime(text)
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean) => active ? <Tag color="green">在班</Tag> : <Tag>已移除</Tag>
    },
  ];

  const teacherColumns = [
    { title: '工号', dataIndex: 'teacher_no', key: 'teacher_no', width: 120 },
    { title: '姓名', dataIndex: 'real_name', key: 'real_name', width: 100 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 120 },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => {
        const roleMap: Record<string, string> = {
          creator: '创建者',
          teacher: '任课教师',
          assistant: '助教'
        };
        return roleMap[role] || role;
      }
    },
    {
      title: '分配时间',
      dataIndex: 'assigned_at',
      key: 'assigned_at',
      width: 150,
      render: (text: string) => formatDateTime(text)
    },
  ];

  const activityColumns = [
    { title: '活动名称', dataIndex: 'title', key: 'title', width: 200 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => type === 'assessment' ? <Tag color="red">测评</Tag> : <Tag color="blue">练习</Tag>
    },
    { title: '学科', dataIndex: 'subject', key: 'subject', width: 80 },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 150,
      render: (text: string) => text ? formatDateTime(text) : '-'
    },
    {
      title: '必做',
      dataIndex: 'is_required',
      key: 'is_required',
      width: 80,
      render: (required: boolean) => required ? <Tag color="red">必做</Tag> : <Tag>选做</Tag>
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: Activity) => (
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveActivity(record.activity_id)}
        >
          移除
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="班级名称">{detail.name}</Descriptions.Item>
          <Descriptions.Item label="范围">{getScopeTag(detail.scope)}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusTag(detail.status)}</Descriptions.Item>
          <Descriptions.Item label="学年学期">{detail.academic_year}</Descriptions.Item>
          <Descriptions.Item label="学科">{detail.subject || '-'}</Descriptions.Item>
          <Descriptions.Item label="年级">{detail.grade || '-'}</Descriptions.Item>
          {detail.scope === 'school' && (
            <Descriptions.Item label="所属学校">{detail.school_name || '-'}</Descriptions.Item>
          )}
          {(detail.scope === 'district' || detail.scope === 'municipal') && (
            <Descriptions.Item label="所属区县">{detail.district_name || '-'}</Descriptions.Item>
          )}
          <Descriptions.Item label="创建者">{detail.creator_name}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDateTime(detail.created_at)}</Descriptions.Item>
          {detail.submitted_at && (
            <Descriptions.Item label="提交时间">{formatDateTime(detail.submitted_at)}</Descriptions.Item>
          )}
          {detail.approved_at && (
            <>
              <Descriptions.Item label="审批人">{detail.approver_name}</Descriptions.Item>
              <Descriptions.Item label="审批时间">{formatDateTime(detail.approved_at)}</Descriptions.Item>
            </>
          )}
          {detail.rejection_reason && (
            <Descriptions.Item label="拒绝原因" span={2}>
              <span style={{ color: '#ff4d4f' }}>{detail.rejection_reason}</span>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="描述" span={2}>
            {detail.description || '-'}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'students',
      label: (
        <span>
          <TeamOutlined /> 学生 ({detail.statistics?.student_count || 0})
        </span>
      ),
      children: (
        <div>
          {detail.status === 'approved' && (
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<TeamOutlined />}
                onClick={() => navigate(`/teacher/teaching-classes/${id}/students`)}
              >
                管理学生
              </Button>
            </div>
          )}
          <Table
            columns={studentColumns}
            dataSource={detail.students?.filter(s => s.is_active) || []}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </div>
      ),
    },
    {
      key: 'teachers',
      label: (
        <span>
          教师 ({detail.statistics?.teacher_count || 0})
        </span>
      ),
      children: (
        <Table
          columns={teacherColumns}
          dataSource={detail.teachers?.filter(t => t.is_active) || []}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      ),
    },
    {
      key: 'activities',
      label: (
        <span>
          <BookOutlined /> 活动 ({detail.statistics?.activity_count || 0})
        </span>
      ),
      children: (
        <Table
          columns={activityColumns}
          dataSource={detail.activities || []}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined /> 审批历史
        </span>
      ),
      children: (
        <Timeline
          items={detail.approval_history?.map(record => ({
            children: (
              <div>
                <div>
                  {getActionTag(record.action)}
                  <span style={{ marginLeft: 8 }}>{record.reviewer_name}</span>
                  <span style={{ marginLeft: 8, color: '#999' }}>
                    ({record.reviewer_level === 'school' ? '校级' :
                      record.reviewer_level === 'district' ? '区级' : '市级'})
                  </span>
                </div>
                {record.comment && <div style={{ color: '#666', marginTop: 4 }}>{record.comment}</div>}
                <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                  {formatDateTime(record.created_at)}
                </div>
              </div>
            ),
          })) || []}
        />
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/teacher/teaching-classes')}
          />
          <span>教学班详情</span>
          {getStatusTag(detail.status)}
        </Space>
      }
      extra={
        <Space>
          {detail.status === 'draft' && (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/teacher/teaching-classes/${id}/edit`)}
              >
                编辑
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmitForApproval}
              >
                提交审批
              </Button>
            </>
          )}
          {detail.status === 'rejected' && (
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/teacher/teaching-classes/${id}/edit`)}
            >
              修改后重新提交
            </Button>
          )}
          {detail.status === 'approved' && (
            <Button
              type="primary"
              icon={<TeamOutlined />}
              onClick={() => navigate(`/teacher/teaching-classes/${id}/students`)}
            >
              管理学生
            </Button>
          )}
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Card>
  );
};

export default TeachingClassDetailPage;
