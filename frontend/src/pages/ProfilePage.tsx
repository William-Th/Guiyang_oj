import React, { useState } from 'react';
import { Card, Form, Input, Button, Avatar, Row, Col, message, Descriptions, Select } from 'antd';
import { UserOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { loginSuccess } from '../store/authSlice';
import api from '../services/api';

const { Option } = Select;

const ProfilePage: React.FC = () => {
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  // Fetch schools list
  const fetchSchools = async () => {
    try {
      const response = await api.get('/users/schools');
      setSchools(response.data.schools || []);
    } catch (error: any) {
      message.error('获取学校列表失败');
      console.error('Fetch schools error:', error);
    }
  };

  const handleEdit = async () => {
    // Fetch schools list when entering edit mode
    await fetchSchools();

    setIsEditing(true);

    // Set initial form values based on user role
    const initialValues: any = {
      realName: user?.realName || '',
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      schoolId: user?.schoolId || undefined,
    };

    if (user?.role === 'student') {
      initialValues.grade = user?.grade || '';
      initialValues.class = user?.class || '';
      initialValues.guardianName = user?.guardianName || '';
      initialValues.guardianPhone = user?.guardianPhone || '';
    } else if (user?.role === 'teacher') {
      initialValues.subjects = user?.subjects || [];
      initialValues.title = user?.title || '';
    }

    form.setFieldsValue(initialValues);
  };

  const handleSave = async (values: any) => {
    try {
      setLoading(true);

      // Determine API endpoint based on user role
      let endpoint = '/users/profile';
      let updateData: any = {
        realName: values.realName,
        phone: values.phone,
        email: values.email,
      };

      if (user?.role === 'student') {
        endpoint = '/users/profile/student';
        updateData = {
          ...updateData,
          schoolId: values.schoolId,
          grade: values.grade,
          class: values.class,
          guardianName: values.guardianName,
          guardianPhone: values.guardianPhone,
        };
      } else if (user?.role === 'teacher') {
        endpoint = '/users/profile/teacher';
        updateData = {
          ...updateData,
          schoolId: values.schoolId,
          subjects: values.subjects,
          title: values.title,
        };
      }

      // Call API to update profile
      const response = await api.put(endpoint, updateData);

      // Update Redux store with new user data
      if (response.data.user) {
        dispatch(loginSuccess({
          user: response.data.user,
          token: localStorage.getItem('token') || ''
        }));
      }

      message.success('个人信息更新成功');
      setIsEditing(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '更新失败，请稍后重试';
      message.error(errorMessage);
      console.error('Update profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.resetFields();
  };

  const getUserRole = (role: string) => {
    const roleMap: Record<string, string> = {
      student: '学生',
      teacher: '教师',
      admin: '管理员',
      school_admin: '校级管理员',
      district_admin: '区级管理员',
      municipal_school_admin: '市级学校管理员',
      base_school_admin: '基地学校管理员',
      municipal_admin: '市级管理员',
      system_admin: '系统管理员'
    };
    return roleMap[role] || role;
  };

  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role && ['admin', 'school_admin', 'district_admin', 'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'].includes(user.role);

  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Avatar size={120} icon={<UserOutlined />} style={{ marginBottom: '16px' }} />
              <h2>{user?.realName || user?.username}</h2>
              <p style={{ color: '#4b5563' }}>{getUserRole(user?.role || '')}</p>
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
                <Descriptions.Item label="用户角色">
                  {getUserRole(user?.role || '')}
                </Descriptions.Item>

                {/* Teacher-specific fields */}
                {isTeacher && (
                  <>
                    <Descriptions.Item label="教师编号">
                      {user?.teacherNo || '未设置'}
                    </Descriptions.Item>
                    <Descriptions.Item label="任教科目">
                      {user?.subjects && user.subjects.length > 0 ? user.subjects.join('、') : '未设置'}
                    </Descriptions.Item>
                    <Descriptions.Item label="职称">
                      {user?.title || '未设置'}
                    </Descriptions.Item>
                    <Descriptions.Item label="所属学校">
                      {user?.school || '未设置'}
                    </Descriptions.Item>
                    <Descriptions.Item label="所属区域">
                      {user?.district || '未设置'}
                    </Descriptions.Item>
                  </>
                )}

                {/* Student-specific fields */}
                {isStudent && (
                  <>
                    <Descriptions.Item label="学号">
                      {user?.studentNo || '未设置'}
                    </Descriptions.Item>
                    <Descriptions.Item label="年级">
                      {user?.grade || '未设置'}
                    </Descriptions.Item>
                    <Descriptions.Item label="班级">
                      {user?.class || '未设置'}
                    </Descriptions.Item>
                    <Descriptions.Item label="所属学校">
                      {user?.school || '未设置'}
                    </Descriptions.Item>
                    <Descriptions.Item label="所属区域">
                      {user?.district || '未设置'}
                    </Descriptions.Item>
                    <Descriptions.Item label="监护人姓名">
                      {user?.guardianName || '未设置'}
                    </Descriptions.Item>
                    <Descriptions.Item label="监护人手机号">
                      {user?.guardianPhone || '未设置'}
                    </Descriptions.Item>
                  </>
                )}

                {/* Admin-specific fields */}
                {isAdmin && (
                  <>
                    <Descriptions.Item label="管理级别">
                      {user?.managementLevel || '未设置'}
                    </Descriptions.Item>
                    {user?.school && (
                      <Descriptions.Item label="管理学校">
                        {user.school}
                      </Descriptions.Item>
                    )}
                    {user?.district && (
                      <Descriptions.Item label="管理区域">
                        {user.district}
                      </Descriptions.Item>
                    )}
                  </>
                )}

                {/* Common fields */}
                <Descriptions.Item label="邮箱">
                  {user?.email || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="手机号">
                  {user?.phone || '未设置'}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
              >
                {/* Common fields for all roles */}
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

                {/* School field - dropdown for all roles */}
                {(isStudent || isTeacher) && (
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item label="所属学校" name="schoolId">
                        <Select
                          showSearch
                          placeholder="请选择学校"
                          filterOption={(input, option) =>
                            String(option?.children || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
                          }
                        >
                          {schools.map(school => (
                            <Option key={school.id} value={school.id}>
                              {school.name} ({school.district})
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {/* Student-specific fields */}
                {isStudent && (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="年级" name="grade">
                          <Input placeholder="如：三年级" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="班级" name="class">
                          <Input placeholder="如：1班" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="监护人姓名" name="guardianName">
                          <Input placeholder="请输入监护人姓名" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="监护人手机号"
                          name="guardianPhone"
                          rules={[
                            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
                          ]}
                        >
                          <Input placeholder="请输入监护人手机号" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )}

                {/* Teacher-specific fields */}
                {isTeacher && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="任教科目" name="subjects">
                        <Select
                          mode="multiple"
                          placeholder="请选择任教科目"
                          options={[
                            { label: '语文', value: '语文' },
                            { label: '数学', value: '数学' },
                            { label: '英语', value: '英语' },
                            { label: '物理', value: '物理' },
                            { label: '化学', value: '化学' },
                            { label: '生物', value: '生物' },
                            { label: '历史', value: '历史' },
                            { label: '地理', value: '地理' },
                            { label: '政治', value: '政治' },
                            { label: '音乐', value: '音乐' },
                            { label: '体育', value: '体育' },
                            { label: '美术', value: '美术' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="职称" name="title">
                        <Input placeholder="如：高级教师" />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

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
  );
};

export default ProfilePage;