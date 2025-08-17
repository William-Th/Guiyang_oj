import React from 'react'
import { Card, Descriptions, Table, Tag, Button, Row, Col, Statistic } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'

const ExamDetailPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  // Mock data - in real implementation, fetch from API based on examId
  const examDetail = {
    id: parseInt(examId || '1'),
    examName: '2024年春季语文期中考试',
    subject: '语文',
    examTime: '2024-03-10',
    duration: 120,
    totalQuestions: 25,
    score: 85,
    totalScore: 100,
    rank: 12,
    totalParticipants: 150,
    status: 'good',
    submittedAt: '2024-03-10 15:30:00',
    correctAnswers: 20,
    wrongAnswers: 3,
    blankAnswers: 2,
  }

  const questionDetails = [
    {
      key: '1',
      questionNumber: 1,
      type: '单选题',
      content: '下列哪个是正确的汉字书写？',
      yourAnswer: 'A',
      correctAnswer: 'A',
      score: 4,
      maxScore: 4,
      isCorrect: true,
    },
    {
      key: '2',
      questionNumber: 2,
      type: '单选题',
      content: '《静夜思》的作者是谁？',
      yourAnswer: 'B',
      correctAnswer: 'A',
      score: 0,
      maxScore: 4,
      isCorrect: false,
    },
    {
      key: '3',
      questionNumber: 3,
      type: '填空题',
      content: '请填写下面诗句的空缺部分：床前明月光，___________。',
      yourAnswer: '疑是地上霜',
      correctAnswer: '疑是地上霜',
      score: 5,
      maxScore: 5,
      isCorrect: true,
    },
    {
      key: '4',
      questionNumber: 4,
      type: '单选题',
      content: '下列词语中，哪个是形容词？',
      yourAnswer: '',
      correctAnswer: 'C',
      score: 0,
      maxScore: 4,
      isCorrect: false,
    },
  ]

  const columns = [
    {
      title: '题号',
      dataIndex: 'questionNumber',
      key: 'questionNumber',
      width: 60,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '我的答案',
      dataIndex: 'yourAnswer',
      key: 'yourAnswer',
      width: 100,
      render: (answer: string) => answer || <span style={{ color: '#999' }}>未作答</span>,
    },
    {
      title: '正确答案',
      dataIndex: 'correctAnswer',
      key: 'correctAnswer',
      width: 100,
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number, record: any) => (
        <span style={{ color: record.isCorrect ? '#52c41a' : '#ff4d4f' }}>
          {score}/{record.maxScore}
        </span>
      ),
    },
    {
      title: '结果',
      dataIndex: 'isCorrect',
      key: 'isCorrect',
      width: 80,
      render: (isCorrect: boolean, record: any) => {
        if (record.yourAnswer === '') {
          return <Tag color="default">未答</Tag>
        }
        return (
          <Tag color={isCorrect ? 'success' : 'error'}>
            {isCorrect ? '正确' : '错误'}
          </Tag>
        )
      },
    },
  ]

  const getStatusConfig = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      excellent: { color: 'gold', text: '优秀' },
      good: { color: 'green', text: '良好' },
      pass: { color: 'blue', text: '及格' },
      fail: { color: 'red', text: '不及格' },
    }
    return statusConfig[status] || { color: 'default', text: '未知' }
  }

  const statusConfig = getStatusConfig(examDetail.status)

  return (
    <div>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/results')}
        style={{ marginBottom: '16px' }}
      >
        返回成绩列表
      </Button>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={18}>
          <Card title={`考试详情 - ${examDetail.examName}`}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="考试科目">{examDetail.subject}</Descriptions.Item>
              <Descriptions.Item label="考试时间">{examDetail.examTime}</Descriptions.Item>
              <Descriptions.Item label="考试时长">{examDetail.duration} 分钟</Descriptions.Item>
              <Descriptions.Item label="题目总数">{examDetail.totalQuestions} 题</Descriptions.Item>
              <Descriptions.Item label="提交时间">{examDetail.submittedAt}</Descriptions.Item>
              <Descriptions.Item label="考试状态">
                <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={6}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card>
                <Statistic 
                  title="总得分" 
                  value={examDetail.score} 
                  suffix={`/ ${examDetail.totalScore}`}
                  valueStyle={{ color: examDetail.score >= 60 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={24}>
              <Card>
                <Statistic 
                  title="排名" 
                  value={examDetail.rank} 
                  suffix={`/ ${examDetail.totalParticipants}`}
                  prefix="第"
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic 
              title="正确题数" 
              value={examDetail.correctAnswers} 
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic 
              title="错误题数" 
              value={examDetail.wrongAnswers} 
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic 
              title="未答题数" 
              value={examDetail.blankAnswers} 
              valueStyle={{ color: '#d48806' }}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="答题详情" 
        style={{ marginTop: '16px' }}
        extra={
          <Button icon={<DownloadOutlined />} type="link">
            导出答题记录
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={questionDetails} 
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  )
}

export default ExamDetailPage