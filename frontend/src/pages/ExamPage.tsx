import React, { useState } from 'react'
import { Card, Radio, Button, Space, Progress, Modal, Checkbox } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'

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
      type: 'single',
      content: '3 + 5 等于多少？',
      options: ['A. 6', 'B. 7', 'C. 8', 'D. 9'],
      score: 5,
    },
    {
      id: 3,
      type: 'multiple',
      content: '下列哪些是水果？（多选）',
      options: ['A. 苹果', 'B. 香蕉', 'C. 土豆', 'D. 橙子'],
      score: 10,
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

        <div style={{ fontSize: '18px', marginBottom: '24px' }}>
          {question.content}
        </div>

        {question.type === 'single' ? (
          <Radio.Group
            onChange={(e) => handleAnswer(e.target.value)}
            value={answers[currentQuestion]}
          >
            <Space direction="vertical">
              {question.options.map((option, index) => (
                <Radio key={index} value={option} style={{ fontSize: '16px' }}>
                  {option}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        ) : (
          <Checkbox.Group
            onChange={handleAnswer}
            value={answers[currentQuestion]}
          >
            <Space direction="vertical">
              {question.options.map((option, index) => (
                <Checkbox key={index} value={option} style={{ fontSize: '16px' }}>
                  {option}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        )}

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