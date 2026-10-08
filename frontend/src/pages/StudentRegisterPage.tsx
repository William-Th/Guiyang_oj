import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Select, DatePicker, Space, Typography, Alert, ConfigProvider, Popover } from 'antd';
import { message, modal } from '../lib/feedback';
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
        idCard: values.idCard,
        districtCode: values.districtCode,
        schoolCode: values.schoolCode,
        grade: values.grade
      });

      if (response.data.success) {
        message.success(response.data.message || '注册申请提交成功');

        // 查询方式：手机号 + 身份证号（查询码方式退役）
        const { estimatedReviewTime } = response.data.data;
        modal.success({
          title: '注册申请已提交',
          width: 520,
          content: (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>预计{estimatedReviewTime}完成审核。</Text>
              <Text>可用注册手机号和身份证号随时查询审核进度。</Text>
            </Space>
          ),
          okText: '查看审核进度',
          onOk: () => navigate(`/register-status/${values.phone}`)
        });
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

  // 注册完整说明（tip 气泡内容）
  const registerRules = (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9 }}>
      <li>请确保填写的信息真实准确</li>
      <li>手机号将用于接收审核通知和登录账号</li>
      <li>审核通过后，初始密码为：身份证后4位 + 出生年月日（如：12342015年05月15日）</li>
      <li>提交后可用手机号和身份证号查询审核进度</li>
    </ul>
  );

  return (
    <ConfigProvider
      locale={locale}
      theme={{ components: { Form: { itemMarginBottom: 16 } } }}
    >
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Card
        style={{
          width: '100%',
          maxWidth: '540px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <Title level={2} style={{ marginBottom: '4px' }}>学生注册申请</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            填写以下信息提交注册申请，学校管理员将在3个工作日内审核
          </Paragraph>
        </div>

        {/* 单行 tip：完整规则见「查看完整说明」气泡 */}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
          message={
            <span>
              注册说明：请确保填写的信息真实准确；手机号将用于接收审核通知和登录账号。
              <Popover
                trigger="click"
                placement="bottom"
                title="完整注册说明"
                content={registerRules}
              >
                <Button type="link" size="small" style={{ padding: 0, height: 'auto' }}>
                  查看完整说明
                </Button>
              </Popover>
            </span>
          }
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
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
            label="身份证号"
            name="idCard"
            rules={[
              { required: true, message: '请输入身份证号' },
              { pattern: /^\d{17}[\dXx]$/, message: '请输入完整的18位身份证号' }
            ]}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder="请输入18位身份证号，自动识别出生日期"
              maxLength={18}
              onChange={(e) => {
                // 证件第 7-14 位即出生日期：自动回填，避免与证件矛盾
                const m = /^(\d{6})(\d{4})(\d{2})(\d{2})/.exec(e.target.value || '');
                if (m) form.setFieldsValue({ birthDate: dayjs(`${m[2]}-${m[3]}-${m[4]}`) });
              }}
            />
          </Form.Item>

          <Form.Item
            label="出生日期"
            name="birthDate"
            rules={[{ required: true, message: '请选择出生日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="填写身份证号后自动识别"
              disabledDate={(current) => {
                // 禁用未来日期和30年前的日期
                return current && (current > dayjs().endOf('day') || current < dayjs().subtract(30, 'year'));
              }}
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
            <Space direction="vertical" style={{ width: '100%' }} size="small">
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
