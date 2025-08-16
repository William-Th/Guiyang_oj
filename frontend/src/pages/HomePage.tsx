import React from 'react'
import { Row, Col, Card, Statistic, Button, Space } from 'antd'
import {
  BookOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const HomePage: React.FC = () => {
  const navigate = useNavigate()

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
          <Button size="large">
            申请证书
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
  )
}

export default HomePage