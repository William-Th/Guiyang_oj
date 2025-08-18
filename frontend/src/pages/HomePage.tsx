import React, { useState } from 'react';
import { Row, Col, Card, Statistic, Button, Space, Modal, message } from 'antd';
import {
  BookOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { certificateApi } from '../services/api';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleApplyCertificate = async () => {
    try {
      setLoading(true);
      
      // Get available certificates first
      const availableCerts = await certificateApi.getAvailable();
      
      if (availableCerts.length === 0) {
        message.warning('您目前没有可申请的证书，请先完成考试并取得优秀成绩');
        return;
      }

      // Show confirmation modal
      Modal.confirm({
        title: '申请证书',
        content: `您有 ${availableCerts.length} 个证书可以申请，是否确认申请？`,
        icon: <SafetyCertificateOutlined />,
        onOk: async () => {
          try {
            // Apply for all available certificates
            for (const cert of availableCerts) {
              await certificateApi.apply(cert.examId);
            }
            message.success('证书申请成功！您可以在成绩页面下载证书');
            setTimeout(() => navigate('/results'), 2000);
          } catch (error) {
            console.error('Certificate application failed:', error);
            message.error('证书申请失败，请稍后重试');
          }
        }
      });
    } catch (error) {
      console.error('Failed to get available certificates:', error);
      message.error('获取可申请证书列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>欢迎来到贵阳市小学生测评平台</h1>
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/exams')}>
            <Statistic
              title="可参加考试"
              value={5}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="已完成考试"
              value={12}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="平均分数"
              value={85.5}
              prefix={<TrophyOutlined />}
              suffix="分"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="下次考试"
              value="3天后"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="快速操作" style={{ marginTop: '24px' }}>
        <Space size="large">
          <Button type="primary" size="large" onClick={() => navigate('/exams')}>
            参加考试
          </Button>
          <Button size="large" onClick={() => navigate('/results')}>
            查看成绩
          </Button>
          <Button 
            size="large" 
            loading={loading}
            onClick={handleApplyCertificate}
            icon={<SafetyCertificateOutlined />}
          >
            申请证书
          </Button>
          <Button 
            size="large" 
            onClick={() => navigate('/verify')}
            icon={<SafetyCertificateOutlined />}
          >
            证书验证
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="最近考试">
            <div>暂无最近考试记录</div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="公告通知">
            <div>暂无公告</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HomePage;