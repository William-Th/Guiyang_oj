import React from 'react'
import { Form, Input, Button, Card, Tabs, message } from 'antd'
import { UserOutlined, LockOutlined, IdcardOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { loginStart, loginSuccess } from '@/store/authSlice'
import './LoginPage.css'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [form] = Form.useForm()

  const handleStudentLogin = async (values: any) => {
    dispatch(loginStart())
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: values.idCard, 
          password: values.password, 
          loginType: 'idCard' 
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || '登录失败')
      }
      
      dispatch(loginSuccess({
        user: data.user,
        token: data.token
      }))
      message.success(data.message || '登录成功')
      navigate('/')
    } catch (error: any) {
      message.error(error.message || '登录失败')
    }
  }

  const handleTeacherLogin = async (values: any) => {
    dispatch(loginStart())
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: values.username, 
          password: values.password, 
          loginType: 'username' 
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || '登录失败')
      }
      
      dispatch(loginSuccess({
        user: data.user,
        token: data.token
      }))
      message.success(data.message || '登录成功')
      navigate('/')
    } catch (error: any) {
      message.error(error.message || '登录失败')
    }
  }

  return (
    <div className="login-container">
      <Card className="login-card" title="贵阳市小学生测评平台">
        <Tabs defaultActiveKey="student">
          <Tabs.TabPane tab="学生入口" key="student">
            <Form form={form} onFinish={handleStudentLogin} size="large">
              <Form.Item
                name="idCard"
                rules={[
                  { required: true, message: '请输入身份证号' },
                  { pattern: /^\d{18}$/, message: '请输入正确的身份证号' }
                ]}
              >
                <Input prefix={<IdcardOutlined />} placeholder="身份证号" />
              </Form.Item>
              <Form.Item
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
            <Form onFinish={handleTeacherLogin} size="large">
              <Form.Item
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="用户名" />
              </Form.Item>
              <Form.Item
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
      </Card>
    </div>
  )
}

export default LoginPage