import React, { useState } from 'react';
import { Card, Descriptions, Badge, Button, Spin, Alert, Typography, Space, Input } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SyncOutlined, PhoneOutlined, UserOutlined, IdcardOutlined } from '@ant-design/icons';
import api from '@/services/api';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

interface RegistrationStatus {
  id: number;
  school_name: string;
  grade: string;
  status: string;
  statusText: string;
  current_reviewer_level: number;
  submitted_at: string;
  reviewed_at: string | null;
  review_comment: string | null;
}

const RegisterStatusPage: React.FC = () => {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [error, setError] = useState<string>('');
  // 与小程序一致：手机号 + 完整身份证号查询（2026-10 起查询码方式退役）
  const [phoneInput, setPhoneInput] = useState<string>(phone ?? '');
  const [idCard, setIdCard] = useState<string>('');

  const fetchStatus = async (targetPhone: string, targetIdCard: string) => {
    if (!/^1[3-9]\d{9}$/.test(targetPhone)) {
      setError('请输入正确的 11 位手机号');
      return;
    }
    if (!/^\d{17}[\dXx]$/.test(targetIdCard)) {
      setError('请输入完整的 18 位身份证号');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/registration/status', { phone: targetPhone, idCard: targetIdCard });
      if (response.data.success) {
        setStatus(response.data.data);
      } else {
        setError(response.data.message || '查询失败');
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setError('手机号或身份证号不正确，未找到匹配的注册申请');
      } else {
        setError(error.response?.data?.message || '查询失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取审核层级名称
  const getReviewerLevelName = (level: number) => {
    const levelMap: Record<number, string> = {
      2: '校级管理员',
      3: '区县管理员',
      4: '市级管理员'
    };
    return levelMap[level] || '未知';
  };

  // 获取审核人联系方式（示例数据，实际应该从后端获取）
  const getReviewerContact = (level: number, schoolName: string) => {
    if (level === 2) {
      return {
        name: `${schoolName}审核管理员`,
        phone: '请联系学校教务处'
      };
    } else if (level === 3) {
      return {
        name: '区县教育局审核管理员',
        phone: '请联系区县教育局'
      };
    } else if (level === 4) {
      return {
        name: '市教育局审核管理员',
        phone: '请联系市教育局'
      };
    }
    return { name: '未知', phone: '-' };
  };

  // 获取状态徽章
  const getStatusBadge = (statusValue: string) => {
    const statusMap: Record<string, { status: any; text: string }> = {
      'pending': { status: 'processing', text: '审核中' },
      'approved': { status: 'success', text: '已批准' },
      'rejected': { status: 'error', text: '已拒绝' }
    };
    const config = statusMap[statusValue] || { status: 'default', text: '未知' };
    return <Badge status={config.status} text={config.text} />;
  };

  if (error || !status) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Card style={{ maxWidth: '500px', width: '100%' }}>
          <Title level={3} style={{ marginTop: 0 }}>查询注册进度</Title>
          {error && (
            <Alert message={error} type="error" showIcon style={{ marginBottom: '16px' }} />
          )}
          <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }} size="middle">
            <Input
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              onPressEnter={() => fetchStatus(phoneInput, idCard)}
              maxLength={11}
              placeholder="注册时填写的手机号"
              prefix={<PhoneOutlined />}
            />
            <Input
              value={idCard}
              onChange={(event) => setIdCard(event.target.value)}
              onPressEnter={() => fetchStatus(phoneInput, idCard)}
              maxLength={18}
              placeholder="注册时填写的 18 位身份证号"
              prefix={<IdcardOutlined />}
            />
            <Button type="primary" block loading={loading} onClick={() => fetchStatus(phoneInput, idCard)}>
              查询审核进度
            </Button>
          </Space>
          <Space wrap>
            <Button onClick={() => navigate('/register')}>
              返回注册
            </Button>
            <Button type="primary" onClick={() => navigate('/login')}>
              去登录
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Card
          style={{
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={2}>注册申请状态</Title>
            <Paragraph type="secondary">
              手机号：{(phone || phoneInput) ? (phone || phoneInput).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '-'}
            </Paragraph>
          </div>

          {/* 状态卡片 */}
          <Alert
            message={
              <Space>
                <Text strong>当前状态：</Text>
                {getStatusBadge(status.status)}
              </Space>
            }
            description={
              status.status === 'pending' ? (
                <div>
                  <p>您的申请正在 {getReviewerLevelName(status.current_reviewer_level)} 审核中</p>
                  <p>提交时间：{dayjs(status.submitted_at).format('YYYY-MM-DD HH:mm:ss')}</p>
                  <p style={{ marginBottom: 0 }}>
                    <Text type="secondary">如超过3个工作日未处理，将自动升级到上级管理员审核</Text>
                  </p>
                </div>
              ) : status.status === 'approved' ? (
                <div>
                  <p>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                    恭喜！您的注册申请已通过审核
                  </p>
                  <p>审核时间：{status.reviewed_at ? dayjs(status.reviewed_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</p>
                  <p>
                    <Text strong>初始密码：</Text>
                    <Text code>身份证后4位 + 出生年月日</Text>
                  </p>
                  <p style={{ marginBottom: 0 }}>
                    <Text type="secondary">例如：身份证后4位1234，出生日期2015-05-15，则密码为：12342015年05月15日</Text>
                  </p>
                </div>
              ) : (
                <div>
                  <p>
                    <CloseCircleOutlined style={{ color: '#f5222d', marginRight: '8px' }} />
                    很抱歉，您的申请未通过审核
                  </p>
                  <p>审核时间：{status.reviewed_at ? dayjs(status.reviewed_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</p>
                  {status.review_comment && (
                    <p>拒绝原因：{status.review_comment}</p>
                  )}
                  <p style={{ marginBottom: 0 }}>
                    <Text type="secondary">如有疑问，请联系学校管理员</Text>
                  </p>
                </div>
              )
            }
            type={
              status.status === 'pending' ? 'info' :
              status.status === 'approved' ? 'success' : 'error'
            }
            showIcon
            icon={
              status.status === 'pending' ? <SyncOutlined spin /> :
              status.status === 'approved' ? <CheckCircleOutlined /> :
              <CloseCircleOutlined />
            }
            style={{ marginBottom: '32px' }}
          />

          {/* 当前审核人信息 */}
          {status.status === 'pending' && (
            <Alert
              message="当前审核人信息"
              description={
                <div style={{ marginTop: '12px' }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <UserOutlined style={{ marginRight: '8px', color: '#0ea5e9' }} />
                      <Text strong>审核人：</Text>
                      <Text>{getReviewerContact(status.current_reviewer_level, status.school_name).name}</Text>
                    </div>
                    <div>
                      <PhoneOutlined style={{ marginRight: '8px', color: '#0ea5e9' }} />
                      <Text strong>联系方式：</Text>
                      <Text>{getReviewerContact(status.current_reviewer_level, status.school_name).phone}</Text>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        提示：如需咨询审核进度，请通过上述联系方式联系审核人
                      </Text>
                    </div>
                  </Space>
                </div>
              }
              type="info"
              showIcon
              icon={<ClockCircleOutlined />}
              style={{ marginBottom: '32px' }}
            />
          )}

          {/* 申请详情 */}
          <div>
            <Title level={4}>申请详情</Title>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="学校">{status.school_name}</Descriptions.Item>
              <Descriptions.Item label="年级">{status.grade}</Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}>
                {dayjs(status.submitted_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {status.reviewed_at && (
                <Descriptions.Item label="审核时间" span={2}>
                  {dayjs(status.reviewed_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {status.review_comment && (
                <Descriptions.Item label="审核意见" span={2}>
                  {status.review_comment}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>

          {/* 操作按钮 */}
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <Space size="large">
              <Button onClick={() => window.location.reload()}>
                刷新状态
              </Button>
              {status.status === 'approved' && (
                <Button type="primary" onClick={() => navigate('/login')}>
                  去登录
                </Button>
              )}
              {status.status === 'rejected' && (
                <Button type="primary" onClick={() => navigate('/register')}>
                  重新申请
                </Button>
              )}
              <Button onClick={() => navigate('/login')}>
                返回登录页
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    </div>
    </Spin>
  );
};

export default RegisterStatusPage;
