import React, { useState } from 'react'
import { Card, Form, Input, Button, Avatar, Row, Col, message, Descriptions } from 'antd'
import { UserOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import { useSelector } from 'react-redux'
import { RootState } from '../store'

const ProfilePage: React.FC = () => {
  const [form] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user } = useSelector((state: RootState) => state.auth)

  const handleEdit = () => {
    setIsEditing(true)
    form.setFieldsValue({
      realName: user?.realName || '',
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      school: user?.school || '',
      grade: user?.grade || '',
      class: user?.class || '',
    })
  }

  const handleSave = async (values: any) => {
    try {
      setLoading(true)
      // TODO: Call API to update user profile
      console.log('Updating profile with:', values)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      message.success('个人信息更新成功')
      setIsEditing(false)
    } catch (error) {
      message.error('更新失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    form.resetFields()
  }

  const getUserRole = (role: string) => {
    const roleMap: Record<string, string> = {
      student: '学生',
      teacher: '教师',
      admin: '管理员'
    }
    return roleMap[role] || role
  }

  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Avatar size={120} icon={<UserOutlined />} style={{ marginBottom: '16px' }} />
              <h2>{user?.realName || user?.username}</h2>
              <p style={{ color: '#666' }}>{getUserRole(user?.role || '')}</p>
              {!isEditing && (
                <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
                  编辑个人信息
                </Button>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="个人信息" style={{ minHeight: '400px' }}>
            {!isEditing ? (
              <Descriptions column={1} labelStyle={{ width: '120px' }}>
                <Descriptions.Item label="真实姓名">
                  {user?.realName || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="用户名">
                  {user?.username}
                </Descriptions.Item>
                <Descriptions.Item label="身份证号">
                  {user?.idCard || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="邮箱">
                  {user?.email || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="手机号">
                  {user?.phone || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="所属学校">
                  {user?.school || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="年级">
                  {user?.grade || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="班级">
                  {user?.class || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="用户角色">
                  {getUserRole(user?.role || '')}
                </Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '未知'}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                initialValues={{
                  realName: user?.realName || '',
                  username: user?.username || '',
                  email: user?.email || '',
                  phone: user?.phone || '',
                  school: user?.school || '',
                  grade: user?.grade || '',
                  class: user?.class || '',
                }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="真实姓名"
                      name="realName"
                      rules={[{ required: true, message: '请输入真实姓名' }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="用户名" name="username">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="邮箱"
                      name="email"
                      rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="手机号"
                      name="phone"
                      rules={[
                        { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
                      ]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="所属学校" name="school">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="年级" name="grade">
                      <Input placeholder="如：三年级" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="班级" name="class">
                      <Input placeholder="如：1班" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />}
                    loading={loading}
                    style={{ marginRight: '8px' }}
                  >
                    保存
                  </Button>
                  <Button onClick={handleCancel}>
                    取消
                  </Button>
                </Form.Item>
              </Form>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ProfilePage