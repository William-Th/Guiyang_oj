import React from 'react'
import { Radio, Checkbox, Input, Space } from 'antd'

interface Question {
  id: number
  type: 'single' | 'multiple' | 'blank' | 'essay' | 'code' | 'true_false' | 'matching'
  content: string
  options?: string[]
  score: number
  explanation?: string
  blanks_count?: number
}

interface QuestionDisplayProps {
  question: Question
  value?: any
  onChange?: (value: any) => void
  readonly?: boolean
  showAnswer?: boolean
  correctAnswer?: any
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  value,
  onChange,
  readonly = false,
  showAnswer = false,
  correctAnswer
}) => {
  const renderQuestionContent = () => {
    switch (question.type) {
      case 'single':
        return (
          <Radio.Group
            onChange={(e) => onChange?.(e.target.value)}
            value={value}
            disabled={readonly}
          >
            <Space direction="vertical">
              {question.options?.map((option, index) => (
                <Radio 
                  key={index} 
                  value={option} 
                  style={{ 
                    fontSize: '16px',
                    color: showAnswer && correctAnswer === option ? '#52c41a' : undefined
                  }}
                >
                  {option}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )

      case 'multiple':
        return (
          <Checkbox.Group
            onChange={onChange}
            value={value}
            disabled={readonly}
          >
            <Space direction="vertical">
              {question.options?.map((option, index) => (
                <Checkbox 
                  key={index} 
                  value={option} 
                  style={{ 
                    fontSize: '16px',
                    color: showAnswer && correctAnswer?.includes(option) ? '#52c41a' : undefined
                  }}
                >
                  {option}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        )

      case 'true_false':
        return (
          <Radio.Group
            onChange={(e) => onChange?.(e.target.value)}
            value={value}
            disabled={readonly}
          >
            <Space direction="vertical">
              <Radio 
                value={true} 
                style={{ 
                  fontSize: '16px',
                  color: showAnswer && correctAnswer === true ? '#52c41a' : undefined
                }}
              >
                正确
              </Radio>
              <Radio 
                value={false} 
                style={{ 
                  fontSize: '16px',
                  color: showAnswer && correctAnswer === false ? '#52c41a' : undefined
                }}
              >
                错误
              </Radio>
            </Space>
          </Radio.Group>
        )

      case 'blank':
        const blanksCount = question.blanks_count || 1
        const blankValues = Array.isArray(value) ? value : new Array(blanksCount).fill('')
        
        return (
          <Space direction="vertical" size="middle">
            {Array.from({ length: blanksCount }, (_, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '8px' }}>第{index + 1}空:</span>
                <Input
                  placeholder="请输入答案"
                  value={blankValues[index] || ''}
                  onChange={(e) => {
                    const newValues = [...blankValues]
                    newValues[index] = e.target.value
                    onChange?.(newValues)
                  }}
                  disabled={readonly}
                  style={{ 
                    width: '200px',
                    borderColor: showAnswer && correctAnswer?.[index] === blankValues[index] ? '#52c41a' : undefined
                  }}
                />
                {showAnswer && (
                  <span style={{ marginLeft: '8px', color: '#52c41a' }}>
                    答案: {correctAnswer?.[index]}
                  </span>
                )}
              </div>
            ))}
          </Space>
        )

      case 'essay':
        return (
          <div>
            <Input.TextArea
              rows={6}
              placeholder="请输入您的答案..."
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={readonly}
            />
            {showAnswer && question.explanation && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
                <strong>参考答案/评分标准:</strong>
                <div style={{ marginTop: '8px' }}>{question.explanation}</div>
              </div>
            )}
          </div>
        )

      case 'code':
        return (
          <div>
            <div style={{ marginBottom: '12px', color: '#666' }}>
              请在下方代码框中输入您的代码:
            </div>
            <Input.TextArea
              rows={8}
              placeholder="// 请在此处编写代码"
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={readonly}
              style={{ fontFamily: 'Monaco, Menlo, Consolas, monospace' }}
            />
            {showAnswer && question.explanation && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
                <strong>参考代码:</strong>
                <pre style={{ marginTop: '8px', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                  {question.explanation}
                </pre>
              </div>
            )}
          </div>
        )

      case 'matching':
        return (
          <div>
            <div style={{ marginBottom: '12px', color: '#666' }}>
              请将左侧选项与右侧选项进行匹配:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <strong>左侧选项:</strong>
                {question.options?.slice(0, Math.ceil(question.options.length / 2)).map((option, index) => (
                  <div key={index} style={{ padding: '8px', border: '1px solid #d9d9d9', margin: '4px 0', borderRadius: '4px' }}>
                    {option}
                  </div>
                ))}
              </div>
              <div>
                <strong>右侧选项:</strong>
                {question.options?.slice(Math.ceil(question.options.length / 2)).map((option, index) => (
                  <div key={index} style={{ padding: '8px', border: '1px solid #d9d9d9', margin: '4px 0', borderRadius: '4px' }}>
                    {option}
                  </div>
                ))}
              </div>
            </div>
            <Input.TextArea
              rows={3}
              placeholder="请输入匹配结果，如: A-1, B-3, C-2"
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={readonly}
              style={{ marginTop: '12px' }}
            />
          </div>
        )

      default:
        return <div>不支持的题目类型</div>
    }
  }

  return (
    <div>
      <div style={{ fontSize: '18px', marginBottom: '24px', lineHeight: '1.6' }}>
        {question.content}
      </div>
      {renderQuestionContent()}
      {showAnswer && question.explanation && question.type !== 'essay' && question.type !== 'code' && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
          <strong>解析:</strong>
          <div style={{ marginTop: '8px' }}>{question.explanation}</div>
        </div>
      )}
    </div>
  )
}

export default QuestionDisplay