import React, { useState } from 'react'
import { Card, Button, Space, Progress, Modal } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import QuestionDisplay from '../components/questions/QuestionDisplay'

const ExamPage: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, any>>({})

  const mockQuestions = [
    {
      id: 1,
      type: 'single',
      content: '下列哪个是中国的首都？',
      options: ['A. 上海', 'B. 北京', 'C. 广州', 'D. 深圳'],
      score: 5,
    },
    {
      id: 2,
      type: 'multiple',
      content: '下列哪些是水果？（多选）',
      options: ['A. 苹果', 'B. 香蕉', 'C. 土豆', 'D. 橙子'],
      score: 10,
    },
    {
      id: 3,
      type: 'true_false',
      content: '地球是圆的。',
      score: 5,
    },
    {
      id: 4,
      type: 'blank',
      content: '中国的首都是____，有____座著名的天安门。',
      score: 10,
      blanks_count: 2,
    },
    {
      id: 5,
      type: 'essay',
      content: '请简述你对环保的理解，以及在日常生活中可以采取哪些环保措施？',
      score: 20,
    },
  ]

  const handleAnswer = (value: any) => {
    setAnswers({ ...answers, [currentQuestion]: value })
  }

  const handleNext = () => {
    if (currentQuestion < mockQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSubmit = () => {
    Modal.confirm({
      title: '确认提交',
      content: '确定要提交试卷吗？提交后将无法修改答案。',
      onOk() {
        console.log('提交答案', answers)
      },
    })
  }

  const question = mockQuestions[currentQuestion]

  return (
    <div>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>在线考试</span>
            <Space>
              <ClockCircleOutlined />
              <span>剩余时间: 45:00</span>
            </Space>
          </div>
        }
      >
        <Progress
          percent={((currentQuestion + 1) / mockQuestions.length) * 100}
          showInfo={false}
          style={{ marginBottom: '20px' }}
        />
        
        <div style={{ fontSize: '16px', marginBottom: '20px' }}>
          第 {currentQuestion + 1} 题（共 {mockQuestions.length} 题，{question.score} 分）
        </div>

        <QuestionDisplay
          question={question as any}
          value={answers[currentQuestion]}
          onChange={handleAnswer}
        />

        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handlePrev} disabled={currentQuestion === 0}>
            上一题
          </Button>
          <Space>
            {Array.from({ length: mockQuestions.length }, (_, i) => (
              <Button
                key={i}
                size="small"
                type={answers[i] ? 'primary' : 'default'}
                onClick={() => setCurrentQuestion(i)}
              >
                {i + 1}
              </Button>
            ))}
          </Space>
          {currentQuestion === mockQuestions.length - 1 ? (
            <Button type="primary" danger onClick={handleSubmit}>
              提交试卷
            </Button>
          ) : (
            <Button type="primary" onClick={handleNext}>
              下一题
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

export default ExamPage