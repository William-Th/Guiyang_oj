import React from 'react'
import { Card, Row, Col, Statistic, Table } from 'antd'
import { UserOutlined, FileTextOutlined, TrophyOutlined, TeamOutlined } from '@ant-design/icons'

const AdminDashboard: React.FC = () => {
  const recentExams = [
    { id: 1, name: '语文期中考试', participants: 245, avgScore: 82.5, date: '2024-03-10' },
    { id: 2, name: '数学期中考试', participants: 238, avgScore: 78.3, date: '2024-03-08' },
  ]

  const columns = [
    { title: '考试名称', dataIndex: 'name', key: 'name' },
    { title: '参与人数', dataIndex: 'participants', key: 'participants' },
    { title: '平均分', dataIndex: 'avgScore', key: 'avgScore' },
    { title: '日期', dataIndex: 'date', key: 'date' },
  ]

  return (
    <div>
      <h2>管理后台</h2>
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总学生数"
              value={1234}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总考试数"
              value={56}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月考试"
              value={8}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="在线教师"
              value={12}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近考试" style={{ marginTop: '24px' }}>
        <Table columns={columns} dataSource={recentExams} rowKey="id" pagination={false} />
      </Card>
    </div>
  )
}

export default AdminDashboard