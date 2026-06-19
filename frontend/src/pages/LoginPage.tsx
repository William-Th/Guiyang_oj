import React from 'react';
import { Form, Input, Button, Card, Tabs, message, Space, Typography } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginStart, loginSuccess } from '@/store/authSlice';
import api from '@/services/api';
import './LoginPage.css';

const { Text } = Typography;

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
    <div className="login-container">
      <Card className="login-card" title="贵阳市小学生测评平台">
        <Tabs defaultActiveKey="student">
          <Tabs.TabPane tab="学生入口" key="student">
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
          </Tabs.TabPane>
          <Tabs.TabPane tab="教师入口" key="teacher">
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
          </Tabs.TabPane>
        </Tabs>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Space direction="vertical">
            <Text type="secondary">
              还没有账号？
              <Button type="link" onClick={() => navigate('/register')}>
                学生注册
              </Button>
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;