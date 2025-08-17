import React, { useState } from 'react'
import { Card, Table, Tag, Button, Row, Col, Statistic, message } from 'antd'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { certificateApi } from '../services/api'

const ResultsPage: React.FC = () => {
  const navigate = useNavigate()
  const [downloadLoading, setDownloadLoading] = useState<Record<number, boolean>>({})

  const handleViewDetail = (examId: number) => {
    navigate(`/exam-detail/${examId}`)
  }

  const handleDownloadCertificate = async (examId: number, examName: string) => {
    try {
      setDownloadLoading(prev => ({ ...prev, [examId]: true }))
      
      const blob = await certificateApi.download(examId)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${examName}_证书.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      message.success('证书下载成功')
    } catch (error: any) {
      console.error('Certificate download failed:', error)
      if (error?.response?.status === 404) {
        message.warning('该考试暂无可下载的证书，请先申请证书')
      } else {
        message.error('证书下载失败，请稍后重试')
      }
    } finally {
      setDownloadLoading(prev => ({ ...prev, [examId]: false }))
    }
  }

  const columns = [
    {
      title: '考试名称',
      dataIndex: 'examName',
      key: 'examName',
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: '考试时间',
      dataIndex: 'examTime',
      key: 'examTime',
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      render: (score: number, record: any) => (
        <span style={{ color: score >= 60 ? '#52c41a' : '#ff4d4f' }}>
          {score}/{record.totalScore}
        </span>
      ),
    },
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      render: (rank: number) => `第${rank}名`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          excellent: { color: 'gold', text: '优秀' },
          good: { color: 'green', text: '良好' },
          pass: { color: 'blue', text: '及格' },
          fail: { color: 'red', text: '不及格' },
        }
        const config = statusConfig[status]
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <>
          <Button 
            type="link" 
            icon={<FileTextOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            查看详情
          </Button>
          <Button 
            type="link" 
            icon={<DownloadOutlined />}
            loading={downloadLoading[record.id]}
            onClick={() => handleDownloadCertificate(record.id, record.examName)}
          >
            下载证书
          </Button>
        </>
      ),
    },
  ]

  const mockData = [
    {
      id: 1,
      examName: '2024年春季语文期中考试',
      subject: '语文',
      examTime: '2024-03-10',
      score: 85,
      totalScore: 100,
      rank: 12,
      status: 'good',
    },
    {
      id: 2,
      examName: '2024年春季数学期中考试',
      subject: '数学',
      examTime: '2024-03-08',
      score: 92,
      totalScore: 100,
      rank: 5,
      status: 'excellent',
    },
  ]

  const chartData = [
    { month: '1月', score: 75 },
    { month: '2月', score: 82 },
    { month: '3月', score: 85 },
    { month: '4月', score: 88 },
    { month: '5月', score: 92 },
  ]

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="总考试次数" value={12} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="平均分数" value={85.5} suffix="分" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="最高排名" value={3} prefix="第" suffix="名" />
          </Card>
        </Col>
      </Row>

      <Card title="成绩趋势" style={{ marginTop: '16px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#8884d8" name="分数" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="考试记录" style={{ marginTop: '16px' }}>
        <Table columns={columns} dataSource={mockData} rowKey="id" />
      </Card>
    </div>
  )
}

export default ResultsPage