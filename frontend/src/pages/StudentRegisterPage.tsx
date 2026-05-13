import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Select, DatePicker, message, Space, Typography, Alert, ConfigProvider } from 'antd';
import { UserOutlined, PhoneOutlined, IdcardOutlined, BankOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import dayjs from 'dayjs';
import locale from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface District {
  code: string;
  name: string;
}

interface School {
  code: string;
  name: string;
  districtId: string;
  districtName: string;
}

const StudentRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);

  // 年级选项
  const gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];

  // 加载区县列表
  useEffect(() => {
    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const response = await api.get('/registration/config/districts');
        if (response.data.success) {
          setDistricts(response.data.data);
        } else {
          message.error('加载区县列表失败');
        }
      } catch (error: any) {
        message.error(error.response?.data?.message || '加载区县列表失败');
      } finally {
        setLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, []);

  // 当选择区县时，加载学校列表
  const handleDistrictChange = async (districtCode: string) => {
    setSelectedDistrict(districtCode);
    form.setFieldsValue({ schoolCode: undefined }); // 清空学校选择
    setSchools([]);

    if (!districtCode) return;

    setLoadingSchools(true);
    try {
      const response = await api.get(`/registration/config/schools/${districtCode}`);
      if (response.data.success) {
        setSchools(response.data.data);
      } else {
        message.error('加载学校列表失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载学校列表失败');
    } finally {
      setLoadingSchools(false);
    }
  };

  // 提交注册申请
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/registration/student', {
        phone: values.phone,
        realName: values.realName,
        birthDate: values.birthDate.format('YYYY-MM-DD'),
        idCardLast4: values.idCardLast4,
        districtCode: values.districtCode,
        schoolCode: values.schoolCode,
        grade: values.grade
      });

      if (response.data.success) {
        message.success(response.data.message || '注册申请提交成功');

        // 显示申请ID和预计审核时间
        const { id, estimatedReviewTime } = response.data.data;
        message.info(`申请ID: ${id}，预计${estimatedReviewTime}完成审核`, 5);

        // 3秒后跳转到状态查询页面
        setTimeout(() => {
          navigate(`/register-status/${values.phone}`);
        }, 3000);
      } else {
        message.error(response.data.message || '提交失败');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || '提交失败';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider locale={locale}>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--bohe-logo-from) 0%, var(--bohe-logo-to) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Card
        style={{
          width: '100%',
          maxWidth: '600px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ marginBottom: '8px' }}>学生注册申请</Title>
          <Paragraph type="secondary">
            填写以下信息提交注册申请，学校管理员将在3个工作日内审核
          </Paragraph>
        </div>

        <Alert
          message="注册说明"
          description={
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>请确保填写的信息真实准确</li>
              <li>手机号将用于接收审核通知和登录账号</li>
              <li>审核通过后，初始密码为：身份证后4位 + 出生年月日（如：12342015年05月15日）</li>
              <li>提交后可使用手机号查询审核状态</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="请输入11位手机号"
              maxLength={11}
            />
          </Form.Item>

          <Form.Item
            label="姓名"
            name="realName"
            rules={[
              { required: true, message: '请输入姓名' },
              { min: 2, max: 20, message: '姓名长度为2-20个字符' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入真实姓名"
            />
          </Form.Item>

          <Form.Item
            label="出生日期"
            name="birthDate"
            rules={[{ required: true, message: '请选择出生日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="请选择出生日期"
              disabledDate={(current) => {
                // 禁用未来日期和30年前的日期
                return current && (current > dayjs().endOf('day') || current < dayjs().subtract(30, 'year'));
              }}
            />
          </Form.Item>

          <Form.Item
            label="身份证后4位"
            name="idCardLast4"
            rules={[
              { required: true, message: '请输入身份证后4位' },
              { pattern: /^\d{4}$/, message: '请输入正确的4位数字' }
            ]}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder="请输入身份证后4位数字"
              maxLength={4}
            />
          </Form.Item>

          <Form.Item
            label="所在区县"
            name="districtCode"
            rules={[{ required: true, message: '请选择所在区县' }]}
          >
            <Select
              placeholder="请选择所在区县"
              loading={loadingDistricts}
              onChange={handleDistrictChange}
              suffixIcon={<BankOutlined />}
              virtual={false}  // 禁用虚拟滚动以支持 E2E 测试
            >
              {districts.map(district => (
                <Option key={district.code} value={district.code}>
                  {district.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="所在学校"
            name="schoolCode"
            rules={[{ required: true, message: '请选择所在学校' }]}
          >
            <Select
              placeholder="请先选择区县"
              loading={loadingSchools}
              disabled={!selectedDistrict}
              suffixIcon={<BankOutlined />}
              virtual={false}  // 禁用虚拟滚动以支持 E2E 测试
            >
              {schools.map(school => (
                <Option key={school.code} value={school.code}>
                  {school.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="年级"
            name="grade"
            rules={[{ required: true, message: '请选择年级' }]}
          >
            <Select
              placeholder="请选择年级"
              suffixIcon={<BookOutlined />}
              virtual={false}  // 禁用虚拟滚动以支持 E2E 测试
            >
              {gradeOptions.map(grade => (
                <Option key={grade} value={grade}>
                  {grade}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
              >
                提交注册申请
              </Button>
              <Button
                block
                size="large"
                onClick={() => navigate('/login')}
              >
                返回登录
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary">
            已提交申请？
            <Button
              type="link"
              onClick={() => {
                const phone = form.getFieldValue('phone');
                if (phone && /^1[3-9]\d{9}$/.test(phone)) {
                  navigate(`/register-status/${phone}`);
                } else {
                  message.warning('请输入正确的手机号查询状态');
                }
              }}
            >
              查询审核状态
            </Button>
          </Text>
        </div>
      </Card>
    </div>
    </ConfigProvider>
  );
};

export default StudentRegisterPage;
