import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Spin,
  Alert
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { teachingClassApi } from '../../services/api';
import { SUBJECTS, getAllGrades } from '../../config/subjects';

const { TextArea } = Input;

interface FormValues {
  name: string;
  description?: string;
  scope: 'school' | 'district' | 'municipal';
  academic_year: string;
  subject?: string;
  grade?: string;
}

const TeachingClassForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  const isEdit = !!id;

  // Generate academic year options
  const getAcademicYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      options.push(`${year}-${year + 1}学年第一学期`);
      options.push(`${year}-${year + 1}学年第二学期`);
    }
    return options;
  };

  useEffect(() => {
    if (isEdit) {
      loadDetail();
    }
  }, [id]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const response = await teachingClassApi.getDetail(Number(id));
      const data = response.data || response;
      setInitialData(data);
      form.setFieldsValue({
        name: data.name,
        description: data.description,
        scope: data.scope,
        academic_year: data.academic_year,
        subject: data.subject,
        grade: data.grade,
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: FormValues) => {
    try {
      setSubmitting(true);
      if (isEdit) {
        await teachingClassApi.update(Number(id), values);
        message.success('保存成功');
      } else {
        const response = await teachingClassApi.create(values);
        message.success('创建成功');
        const newId = response.data?.id || response.id;
        if (newId) {
          navigate(`/teacher/teaching-classes/${newId}`);
          return;
        }
      }
      navigate('/teacher/teaching-classes');
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let classId: number;
      if (isEdit) {
        await teachingClassApi.update(Number(id), values);
        classId = Number(id);
      } else {
        const response = await teachingClassApi.create(values);
        classId = response.data?.id || response.id;
      }

      // Submit for approval
      await teachingClassApi.submitForApproval(classId);
      message.success('已保存并提交审批');
      navigate('/teacher/teaching-classes');
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card
      title={
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/teacher/teaching-classes')}
          />
          <span>{isEdit ? '编辑教学班' : '创建教学班'}</span>
        </Space>
      }
    >
      {initialData?.status === 'rejected' && initialData?.rejection_reason && (
        <Alert
          message="审批被拒绝"
          description={`拒绝原因: ${initialData.rejection_reason}`}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          scope: 'school',
          academic_year: getAcademicYearOptions()[2], // Current semester
        }}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          name="name"
          label="班级名称"
          rules={[
            { required: true, message: '请输入班级名称' },
            { max: 50, message: '班级名称最多50个字符' }
          ]}
        >
          <Input placeholder="例如: 2024级数学提高班" />
        </Form.Item>

        <Form.Item
          name="scope"
          label="班级范围"
          rules={[{ required: true, message: '请选择班级范围' }]}
          extra="校级班级只能添加本校学生，区级可添加本区学生，市级可添加全市学生"
        >
          <Select
            placeholder="选择范围"
            disabled={isEdit}
            options={[
              { value: 'school', label: '校级 - 本校学生' },
              { value: 'district', label: '区级 - 本区学生' },
              { value: 'municipal', label: '市级 - 全市学生' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="academic_year"
          label="学年学期"
          rules={[{ required: true, message: '请选择学年学期' }]}
        >
          <Select
            placeholder="选择学年学期"
            options={getAcademicYearOptions().map(year => ({ value: year, label: year }))}
          />
        </Form.Item>

        <Form.Item
          name="subject"
          label="学科"
          extra="可选，指定学科方便后续活动关联"
        >
          <Select
            placeholder="选择学科"
            allowClear
            options={SUBJECTS.map(subject => ({ value: subject, label: subject }))}
          />
        </Form.Item>

        <Form.Item
          name="grade"
          label="年级"
          extra="可选，指定年级方便筛选学生"
        >
          <Select
            placeholder="选择年级"
            allowClear
            options={getAllGrades().map(grade => ({ value: grade, label: grade }))}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="班级描述"
        >
          <TextArea
            rows={4}
            placeholder="描述教学班的目的、特点等信息"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button onClick={() => navigate('/teacher/teaching-classes')}>
              取消
            </Button>
            <Button
              type="default"
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={submitting}
            >
              保存草稿
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSaveAndSubmit}
              loading={submitting}
            >
              保存并提交审批
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TeachingClassForm;
