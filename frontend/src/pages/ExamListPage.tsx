import React from 'react'
import { Card, Table, Tag, Button, Space } from 'antd'
import { useNavigate } from 'react-router-dom'

const ExamListPage: React.FC = () => {
  const navigate = useNavigate()

  const columns = [
    {
      title: '考试名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject: string) => {
        const colors: Record<string, string> = {
          '语文': 'blue',
          '数学': 'green',
          '科学': 'purple',
          '英语': 'orange',
        }
        return <Tag color={colors[subject] || 'default'}>{subject}</Tag>
      },
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
    },
    {
      title: '考试时间',
      dataIndex: 'examTime',
      key: 'examTime',
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => `${duration}分钟`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          upcoming: { color: 'blue', text: '即将开始' },
          ongoing: { color: 'green', text: '进行中' },
          finished: { color: 'default', text: '已结束' },
        }
        const config = statusConfig[status] || statusConfig.finished
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'ongoing' && (
            <Button type="primary" onClick={() => navigate(`/exam/${record.id}`)}>
              开始考试
            </Button>
          )}
          {record.status === 'upcoming' && (
            <Button onClick={() => console.log('报名', record.id)}>
              报名
            </Button>
          )}
          {record.status === 'finished' && (
            <Button onClick={() => navigate(`/results?examId=${record.id}`)}>
              查看成绩
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const mockData = [
    {
      id: '1',
      title: '2024年春季语文期中考试',
      subject: '语文',
      grade: '三年级',
      examTime: '2024-03-15 09:00',
      duration: 90,
      status: 'ongoing',
    },
    {
      id: '2',
      title: '2024年春季数学期中考试',
      subject: '数学',
      grade: '三年级',
      examTime: '2024-03-16 09:00',
      duration: 60,
      status: 'upcoming',
    },
    {
      id: '3',
      title: '2024年春季科学测验',
      subject: '科学',
      grade: '三年级',
      examTime: '2024-03-10 09:00',
      duration: 45,
      status: 'finished',
    },
  ]

  return (
    <div>
      <Card title="考试列表">
        <Table columns={columns} dataSource={mockData} rowKey="id" />
      </Card>
    </div>
  )
}

export default ExamListPage