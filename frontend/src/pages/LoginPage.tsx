import React from 'react';
import { Form, Input, Button, Card, Tabs, Typography } from 'antd';
import { message } from '../lib/feedback';
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  BookOutlined,
  BarChartOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginStart, loginSuccess } from '@/store/authSlice';
import api from '@/services/api';
import './LoginPage.css';

const { Text } = Typography;

// 品牌平台标识（与主布局 Logo 同源）
const BrandMark: React.FC = () => (
  <span className="login-brand__mark" aria-hidden="true">
    <img src="/logo.png" alt="" />
  </span>
);

// 左侧品牌特性（图标 + 标题 + 一句话说明）
const BRAND_FEATURES = [
  { icon: <BookOutlined />, title: '趣味练习', desc: '紧扣课堂的智能题库，随学随练' },
  { icon: <BarChartOutlined />, title: '学情分析', desc: '多维度能力画像，看见成长轨迹' },
  { icon: <TrophyOutlined />, title: '测评激励', desc: '证书与成就体系，激发学习动力' },
];

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [studentForm] = Form.useForm();
  const [teacherForm] = Form.useForm();

  // 共用登录逻辑：用户名/手机号 + 密码，成功后按角色跳转
  const doLogin = async (username: string, password: string, redirectPath: string) => {
    dispatch(loginStart());
    try {
      // Clear any existing tokens before login
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Step 1: Login to get token
      const loginResponse = await api.post('/auth/login', {
        username,
        password,
        loginType: 'username'
      });

      const { token } = loginResponse.data;

      // Step 2: Fetch detailed profile with token
      const profileResponse = await api.get('/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      dispatch(loginSuccess({
        user: profileResponse.data.user,
        token: token
      }));
      message.success('登录成功');
      navigate(redirectPath);
    } catch (error: any) {
      message.error(error.response?.data?.message || error.message || '登录失败');
    }
  };

  const handleStudentLogin = async (values: any) => {
    await doLogin(values.phone, values.password, '/');
  };

  const handleTeacherLogin = async (values: any) => {
    await doLogin(values.username, values.password, '/');
  };

  return (
    <div className="login-page">
      {/* 背景配饰 */}
      <div className="login-decor login-decor--glow-1" aria-hidden="true" />
      <div className="login-decor login-decor--glow-2" aria-hidden="true" />
      <div className="login-decor login-decor--ring" aria-hidden="true" />
      <div className="login-decor login-decor--ring-sm" aria-hidden="true" />

      <div className="login-panel">
        {/* 左侧品牌区（窄屏隐藏） */}
        <div className="login-brand">
          <BrandMark />
          <h1 className="login-brand__title">贵阳市小学生测评平台</h1>
          <p className="login-brand__slogan">以测评看见每一步成长</p>
          <ul className="login-brand__features">
            {BRAND_FEATURES.map(({ icon, title, desc }) => (
              <li key={title}>
                <span className="login-brand__icon">{icon}</span>
                <div>
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 右侧登录卡片 */}
        <Card className="login-card">
          <div className="login-card__header">
            <h2>账号登录</h2>
            <p>欢迎回来，请选择对应入口</p>
          </div>
          <Tabs
          defaultActiveKey="student"
          items={[
            {
              key: 'student',
              label: '学生入口',
              children: (
                <Form form={studentForm} onFinish={handleStudentLogin} size="large">
                  <Form.Item
                    key="student-phone"
                    name="phone"
                    rules={[
                      { required: true, message: '请输入手机号' },
                      {
                        pattern: /^1[3-9]\d{9}$/,
                        message: '请输入正确的手机号格式'
                      }
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="手机号" />
                  </Form.Item>
                  <Form.Item
                    key="student-password"
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'teacher',
              label: '教师入口',
              children: (
                <Form form={teacherForm} onFinish={handleTeacherLogin} size="large">
                  <Form.Item
                    key="teacher-username"
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item
                    key="teacher-password"
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary">
            还没有账号？
            <Button type="link" onClick={() => navigate('/register')}>
              学生注册
            </Button>
          </Text>
        </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;