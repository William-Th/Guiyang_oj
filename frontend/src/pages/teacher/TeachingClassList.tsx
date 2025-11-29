import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, message, Select, Modal, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SendOutlined,
  TeamOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { teachingClassApi } from '../../services/api';
import { SUBJECTS, getAllGrades } from '../../config/subjects';

interface TeachingClass {
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
  created_at: string;
  submitted_at: string;
  approved_at: string;
  rejection_reason: string;
  school_name: string;
  district_name: string;
  creator_name: string;
  student_count: number;
  teacher_count: number;
  activity_count: number;
}

const TeachingClassList: React.FC = () => {
  const navigate = useNavigate();
  const [teachingClasses, setTeachingClasses] = useState<TeachingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState<{
    scope?: string;
    status?: string;
    subject?: string;
    grade?: string;
  }>({});

  useEffect(() => {
    loadTeachingClasses();
  }, [filters, pagination.current, pagination.pageSize]);

  const loadTeachingClasses = async () => {
    try {
      setLoading(true);
      const response = await teachingClassApi.getList({
        ...filters,
        page: pagination.current,
        limit: pagination.pageSize
      });
      const data = response.data || response;
      setTeachingClasses(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0
      }));
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || '加载教学班列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个教学班吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await teachingClassApi.delete(id);
          message.success('删除成功');
          loadTeachingClasses();
        } catch (err) {
          const error = err as { response?: { data?: { message?: string } } };
          message.error(error.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const handleSubmitForApproval = async (id: number) => {
    Modal.confirm({
      title: '提交审批',
      content: '确定要提交此教学班进行审批吗？提交后将无法修改。',
      okText: '确认提交',
      cancelText: '取消',
      onOk: async () => {
        try {
          await teachingClassApi.submitForApproval(id);
          message.success('已提交审批');
          loadTeachingClasses();
        } catch (err) {
          const error = err as { response?: { data?: { message?: string } } };
          message.error(error.response?.data?.message || '提交失败');
        }
      },
    });
  };

  const handleArchive = async (id: number) => {
    Modal.confirm({
      title: '归档教学班',
      content: '确定要归档此教学班吗？归档后将不再显示在列表中。',
      okText: '确认归档',
      cancelText: '取消',
      onOk: async () => {
        try {
          await teachingClassApi.archive(id);
          message.success('已归档');
          loadTeachingClasses();
        } catch (err) {
          const error = err as { response?: { data?: { message?: string } } };
          message.error(error.response?.data?.message || '归档失败');
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

  const columns = [
    {
      title: '班级名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text: string, record: TeachingClass) => (
        <a onClick={() => navigate(`/teacher/teaching-classes/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '范围',
      dataIndex: 'scope',
      key: 'scope',
      width: 80,
      render: (scope: string) => getScopeTag(scope),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string, record: TeachingClass) => (
        <Tooltip title={record.rejection_reason ? `拒绝原因: ${record.rejection_reason}` : ''}>
          {getStatusTag(status)}
        </Tooltip>
      ),
    },
    {
      title: '学科',
      dataIndex: 'subject',
      key: 'subject',
      width: 80,
      render: (text: string) => text || '-',
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
      render: (text: string) => text || '-',
    },
    {
      title: '学年学期',
      dataIndex: 'academic_year',
      key: 'academic_year',
      width: 160,
    },
    {
      title: '学生数',
      dataIndex: 'student_count',
      key: 'student_count',
      width: 80,
      align: 'center' as const,
      render: (count: number) => <Tag>{count || 0}</Tag>,
    },
    {
      title: '活动数',
      dataIndex: 'activity_count',
      key: 'activity_count',
      width: 80,
      align: 'center' as const,
      render: (count: number) => <Tag>{count || 0}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: TeachingClass) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/teacher/teaching-classes/${record.id}`)}
            />
          </Tooltip>

          {record.status === 'draft' && (
            <>
              <Tooltip title="编辑">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/teacher/teaching-classes/${record.id}/edit`)}
                />
              </Tooltip>
              <Tooltip title="提交审批">
                <Button
                  type="link"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => handleSubmitForApproval(record.id)}
                />
              </Tooltip>
              <Tooltip title="删除">
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record.id)}
                />
              </Tooltip>
            </>
          )}

          {record.status === 'approved' && (
            <>
              <Tooltip title="学生管理">
                <Button
                  type="link"
                  size="small"
                  icon={<TeamOutlined />}
                  onClick={() => navigate(`/teacher/teaching-classes/${record.id}/students`)}
                />
              </Tooltip>
              <Tooltip title="归档">
                <Button
                  type="link"
                  size="small"
                  icon={<FolderOutlined />}
                  onClick={() => handleArchive(record.id)}
                />
              </Tooltip>
            </>
          )}

          {record.status === 'rejected' && (
            <Tooltip title="编辑后重新提交">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/teacher/teaching-classes/${record.id}/edit`)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="教学班管理"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/teacher/teaching-classes/create')}
        >
          创建教学班
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="范围"
          allowClear
          style={{ width: 120 }}
          value={filters.scope}
          onChange={(value) => setFilters({ ...filters, scope: value })}
          options={[
            { value: 'school', label: '校级' },
            { value: 'district', label: '区级' },
            { value: 'municipal', label: '市级' },
          ]}
        />
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 120 }}
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value })}
          options={[
            { value: 'draft', label: '草稿' },
            { value: 'pending', label: '待审批' },
            { value: 'approved', label: '已批准' },
            { value: 'rejected', label: '已拒绝' },
            { value: 'archived', label: '已归档' },
          ]}
        />
        <Select
          placeholder="学科"
          allowClear
          style={{ width: 120 }}
          value={filters.subject}
          onChange={(value) => setFilters({ ...filters, subject: value })}
          options={SUBJECTS.map(s => ({ value: s, label: s }))}
        />
        <Select
          placeholder="年级"
          allowClear
          style={{ width: 120 }}
          value={filters.grade}
          onChange={(value) => setFilters({ ...filters, grade: value })}
          options={getAllGrades().map(g => ({ value: g, label: g }))}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={teachingClasses}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize }));
          },
        }}
      />
    </Card>
  );
};

export default TeachingClassList;
