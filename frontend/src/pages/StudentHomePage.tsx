import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  BookOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const StudentHomePage: React.FC = () => {

  return (
    <div>
      <h1>欢迎来到贵阳市小学生测评平台</h1>
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable>
            <Statistic
              title="可参加考试"
              value={5}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable>
            <Statistic
              title="已完成考试"
              value={12}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
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

export default StudentHomePage;
