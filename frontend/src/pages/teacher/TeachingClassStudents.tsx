import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Modal,
  Input,
  Tag,
  Spin,
  Empty,
  Alert,
  Popconfirm
} from 'antd';
import {
  ArrowLeftOutlined,
  UserAddOutlined,
  DeleteOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { teachingClassApi } from '../../services/api';
import api from '../../services/api';

interface Student {
  id: number;
  user_id: number;
  student_no: string;
  username: string;
  real_name: string;
  phone: string;
  school_id: number;
  school_name: string;
  grade: string;
  class: string;
  joined_at: string;
  is_active: boolean;
}

interface TeachingClass {
  id: number;
  name: string;
  scope: string;
  status: string;
  school_id: number;
  district_id: number;
  school_name: string;
  district_name: string;
  grade: string;
}

interface AvailableStudent {
  key: string;
  id: number;
  student_no: string;
  real_name: string;
  school_name: string;
  grade: string;
  class: string;
}

const TeachingClassStudents: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [teachingClass, setTeachingClass] = useState<TeachingClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [selectedStudentKeys, setSelectedStudentKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [detailRes, studentsRes] = await Promise.all([
        teachingClassApi.getDetail(Number(id)),
        teachingClassApi.getStudents(Number(id))
      ]);
      const classData = detailRes.data || detailRes;
      setTeachingClass(classData);
      const studentData = studentsRes.data || studentsRes;
      setStudents(Array.isArray(studentData) ? studentData : studentData.students || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStudents = async () => {
    try {
      setAddLoading(true);
      // Get students based on teaching class scope
      // This would be a new API endpoint to get available students
      // For now, we'll use a simplified approach
      const params: any = {};
      if (teachingClass?.scope === 'school' && teachingClass.school_id) {
        params.school_id = teachingClass.school_id;
      } else if (teachingClass?.scope === 'district' && teachingClass.district_id) {
        params.district_id = teachingClass.district_id;
      }
      if (teachingClass?.grade) {
        params.grade = teachingClass.grade;
      }

      // Call the students endpoint with optional filters
      const response = await api.get('/users/students', { params });
      const data = response.data;
      const allStudents = data.students || data.data || [];

      // Filter out students already in the class
      const currentStudentIds = students.filter(s => s.is_active).map(s => s.id);
      const available = allStudents
        .filter((s: any) => !currentStudentIds.includes(s.student_id || s.id))
        .map((s: any) => ({
          key: String(s.student_id || s.id),
          id: s.student_id || s.id,
          student_no: s.student_no || '-',
          real_name: s.real_name || s.name || '-',
          school_name: s.school_name || '-',
          grade: s.grade || '-',
          class: s.class || '-',
        }));

      setAvailableStudents(available);
    } catch (error: any) {
      message.error('加载可用学生列表失败');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudentKeys.length === 0) {
      message.warning('请选择要添加的学生');
      return;
    }

    try {
      setAddLoading(true);
      const studentIds = selectedStudentKeys.map(key => Number(key));

      if (studentIds.length === 1) {
        await teachingClassApi.addStudent(Number(id), studentIds[0]);
      } else {
        await teachingClassApi.addStudentsBatch(Number(id), studentIds);
      }

      message.success(`成功添加 ${studentIds.length} 名学生`);
      setAddModalVisible(false);
      setSelectedStudentKeys([]);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '添加学生失败');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    try {
      await teachingClassApi.removeStudent(Number(id), studentId);
      message.success('已移除学生');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '移除失败');
    }
  };

  const openAddModal = () => {
    setAddModalVisible(true);
    loadAvailableStudents();
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
      title: '学号',
      dataIndex: 'student_no',
      key: 'student_no',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'real_name',
      key: 'real_name',
      width: 100,
    },
    {
      title: '学校',
      dataIndex: 'school_name',
      key: 'school_name',
      width: 180,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
    },
    {
      title: '班级',
      dataIndex: 'class',
      key: 'class',
      width: 80,
    },
    {
      title: '加入时间',
      dataIndex: 'joined_at',
      key: 'joined_at',
      width: 150,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: Student) => (
        <Popconfirm
          title="确定要移除此学生吗？"
          onConfirm={() => handleRemoveStudent(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            移除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const filteredAvailableStudents = availableStudents.filter(
    s => !searchText ||
      s.real_name.includes(searchText) ||
      s.student_no.includes(searchText) ||
      s.school_name.includes(searchText)
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!teachingClass) {
    return (
      <Card>
        <Empty description="教学班不存在" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => navigate('/teacher/teaching-classes')}>返回列表</Button>
        </div>
      </Card>
    );
  }

  if (teachingClass.status !== 'approved') {
    return (
      <Card
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/teacher/teaching-classes/${id}`)}
            />
            <span>学生管理 - {teachingClass.name}</span>
          </Space>
        }
      >
        <Alert
          message="无法管理学生"
          description="只有已批准的教学班才能管理学生。请先提交审批并等待批准。"
          type="warning"
          showIcon
        />
      </Card>
    );
  }

  const activeStudents = students.filter(s => s.is_active);

  return (
    <Card
      title={
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/teacher/teaching-classes/${id}`)}
          />
          <span>学生管理 - {teachingClass.name}</span>
          <Tag color="blue">{activeStudents.length} 名学生</Tag>
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={openAddModal}
        >
          添加学生
        </Button>
      }
    >
      <Alert
        message={`班级范围: ${teachingClass.scope === 'school' ? '校级' : teachingClass.scope === 'district' ? '区级' : '市级'}`}
        description={
          teachingClass.scope === 'school'
            ? `只能添加 ${teachingClass.school_name || '本校'} 的学生`
            : teachingClass.scope === 'district'
              ? `可以添加 ${teachingClass.district_name || '本区'} 的学生`
              : '可以添加全市学生'
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={activeStudents}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showTotal: (total) => `共 ${total} 名学生`,
        }}
      />

      <Modal
        title="添加学生"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          setSelectedStudentKeys([]);
          setSearchText('');
        }}
        onOk={handleAddStudents}
        confirmLoading={addLoading}
        width={800}
        okText={`添加 ${selectedStudentKeys.length} 名学生`}
        okButtonProps={{ disabled: selectedStudentKeys.length === 0 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="搜索学生姓名、学号或学校"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          {addLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin />
            </div>
          ) : (
            <Table
              rowSelection={{
                type: 'checkbox',
                selectedRowKeys: selectedStudentKeys,
                onChange: (keys) => setSelectedStudentKeys(keys as string[]),
              }}
              columns={[
                { title: '学号', dataIndex: 'student_no', key: 'student_no', width: 100 },
                { title: '姓名', dataIndex: 'real_name', key: 'real_name', width: 80 },
                { title: '学校', dataIndex: 'school_name', key: 'school_name', width: 150 },
                { title: '年级', dataIndex: 'grade', key: 'grade', width: 70 },
                { title: '班级', dataIndex: 'class', key: 'class', width: 70 },
              ]}
              dataSource={filteredAvailableStudents}
              rowKey="key"
              size="small"
              pagination={{ pageSize: 10 }}
              scroll={{ y: 300 }}
            />
          )}

          {filteredAvailableStudents.length === 0 && !addLoading && (
            <Empty description="没有可添加的学生" />
          )}
        </Space>
      </Modal>
    </Card>
  );
};

export default TeachingClassStudents;
