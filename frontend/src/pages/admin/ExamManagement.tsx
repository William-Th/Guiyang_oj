import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Table, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  InputNumber,
  message,
  Tabs,
  Tag,
  Popconfirm
} from 'antd'
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  BookOutlined 
} from '@ant-design/icons'
import QuestionEditor from '../../components/questions/QuestionEditor'
import QuestionDisplay from '../../components/questions/QuestionDisplay'

const { Option } = Select
const { RangePicker } = DatePicker
const { TabPane } = Tabs

interface Exam {
  id: number
  title: string
  subject: string
  grade: string
  start_time: string
  end_time: string
  duration: number
  total_score: number
  status: 'draft' | 'published' | 'completed'
  question_count: number
}

interface Question {
  id: number
  type: 'single' | 'multiple' | 'blank' | 'essay' | 'code' | 'true_false' | 'matching'
  content: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  score: number
  tags: string[]
  created_at: string
}

const ExamManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('exams')
  const [exams, setExams] = useState<Exam[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [examModalVisible, setExamModalVisible] = useState(false)
  const [questionModalVisible, setQuestionModalVisible] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)
  const [examForm] = Form.useForm()

  // 模拟数据
  useEffect(() => {
    setExams([
      {
        id: 1,
        title: '语文期中考试',
        subject: 'chinese',
        grade: '三年级',
        start_time: '2024-03-15 09:00:00',
        end_time: '2024-03-15 11:00:00',
        duration: 120,
        total_score: 100,
        status: 'published',
        question_count: 20
      },
      {
        id: 2,
        title: '数学单元测试',
        subject: 'math',
        grade: '四年级',
        start_time: '2024-03-20 14:00:00',
        end_time: '2024-03-20 15:30:00',
        duration: 90,
        total_score: 80,
        status: 'draft',
        question_count: 15
      }
    ])

    setQuestions([
      {
        id: 1,
        type: 'single',
        content: '下列哪个是中国的首都？',
        subject: 'chinese',
        difficulty: 'easy',
        score: 5,
        tags: ['地理', '基础知识'],
        created_at: '2024-03-10'
      },
      {
        id: 2,
        type: 'multiple',
        content: '下列哪些是水果？',
        subject: 'science',
        difficulty: 'medium',
        score: 10,
        tags: ['生物', '分类'],
        created_at: '2024-03-11'
      }
    ])
  }, [])

  const examColumns = [
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
        const subjectMap: Record<string, string> = {
          math: '数学',
          chinese: '语文',
          english: '英语',
          science: '科学'
        }
        return subjectMap[subject] || subject
      }
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          draft: { text: '草稿', color: 'default' },
          published: { text: '已发布', color: 'green' },
          completed: { text: '已结束', color: 'red' }
        }
        const { text, color } = statusMap[status as keyof typeof statusMap]
        return <Tag color={color}>{text}</Tag>
      }
    },
    {
      title: '题目数',
      dataIndex: 'question_count',
      key: 'question_count',
    },
    {
      title: '总分',
      dataIndex: 'total_score',
      key: 'total_score',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Exam) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => handleViewExam(record)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEditExam(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            icon={<BookOutlined />}
            onClick={() => handleManageQuestions(record)}
          >
            管理题目
          </Button>
          <Popconfirm
            title="确定要删除这个考试吗？"
            onConfirm={() => handleDeleteExam(record.id)}
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const questionColumns = [
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 300,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          single: '单选题',
          multiple: '多选题',
          blank: '填空题',
          essay: '问答题',
          true_false: '判断题',
          code: '编程题',
          matching: '匹配题'
        }
        return typeMap[type] || type
      }
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject: string) => {
        const subjectMap: Record<string, string> = {
          math: '数学',
          chinese: '语文',
          english: '英语',
          science: '科学'
        }
        return subjectMap[subject] || subject
      }
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty: string) => {
        const difficultyMap = {
          easy: { text: '简单', color: 'green' },
          medium: { text: '中等', color: 'orange' },
          hard: { text: '困难', color: 'red' }
        }
        const { text, color } = difficultyMap[difficulty as keyof typeof difficultyMap]
        return <Tag color={color}>{text}</Tag>
      }
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <>
          {tags.map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Question) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => setPreviewQuestion(record)}
          >
            预览
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEditQuestion(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个题目吗？"
            onConfirm={() => handleDeleteQuestion(record.id)}
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleCreateExam = () => {
    setEditingExam(null)
    examForm.resetFields()
    setExamModalVisible(true)
  }

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam)
    examForm.setFieldsValue(exam)
    setExamModalVisible(true)
  }

  const handleViewExam = (exam: Exam) => {
    message.info(`查看考试: ${exam.title}`)
  }

  const handleManageQuestions = (exam: Exam) => {
    message.info(`管理考试题目: ${exam.title}`)
    // 这里可以打开一个新的模态框来管理该考试的题目
  }

  const handleDeleteExam = (examId: number) => {
    setExams(exams.filter(exam => exam.id !== examId))
    message.success('考试删除成功')
  }

  const handleSaveExam = async (values: any) => {
    try {
      setLoading(true)
      // 这里应该调用API保存考试
      if (editingExam) {
        // 更新考试
        setExams(exams.map(exam => 
          exam.id === editingExam.id ? { ...exam, ...values } : exam
        ))
        message.success('考试更新成功')
      } else {
        // 创建新考试
        const newExam = {
          id: Date.now(),
          ...values,
          status: 'draft',
          question_count: 0
        }
        setExams([newExam, ...exams])
        message.success('考试创建成功')
      }
      setExamModalVisible(false)
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuestion = () => {
    setEditingQuestion(null)
    setQuestionModalVisible(true)
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setQuestionModalVisible(true)
  }

  const handleDeleteQuestion = (questionId: number) => {
    setQuestions(questions.filter(q => q.id !== questionId))
    message.success('题目删除成功')
  }

  const handleSaveQuestion = async (questionData: any) => {
    try {
      if (editingQuestion) {
        // 更新题目
        setQuestions(questions.map(q => 
          q.id === editingQuestion.id ? { ...q, ...questionData } : q
        ))
        message.success('题目更新成功')
      } else {
        // 创建新题目
        const newQuestion = {
          id: Date.now(),
          ...questionData,
          created_at: new Date().toISOString().split('T')[0]
        }
        setQuestions([newQuestion, ...questions])
        message.success('题目创建成功')
      }
      setQuestionModalVisible(false)
    } catch (error) {
      message.error('保存失败')
    }
  }

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="考试管理" key="exams">
          <Card
            title="考试管理"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateExam}
              >
                创建考试
              </Button>
            }
          >
            <Table
              columns={examColumns}
              dataSource={exams}
              rowKey="id"
              loading={loading}
            />
          </Card>
        </TabPane>

        <TabPane tab="题库管理" key="questions">
          <Card
            title="题库管理"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateQuestion}
              >
                添加题目
              </Button>
            }
          >
            <Table
              columns={questionColumns}
              dataSource={questions}
              rowKey="id"
              loading={loading}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 考试编辑模态框 */}
      <Modal
        title={editingExam ? '编辑考试' : '创建考试'}
        open={examModalVisible}
        onCancel={() => setExamModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={examForm}
          layout="vertical"
          onFinish={handleSaveExam}
        >
          <Form.Item
            label="考试名称"
            name="title"
            rules={[{ required: true, message: '请输入考试名称' }]}
          >
            <Input placeholder="请输入考试名称" />
          </Form.Item>

          <Space size="large" style={{ width: '100%' }}>
            <Form.Item
              label="科目"
              name="subject"
              rules={[{ required: true, message: '请选择科目' }]}
            >
              <Select placeholder="请选择科目" style={{ width: 120 }}>
                <Option value="math">数学</Option>
                <Option value="chinese">语文</Option>
                <Option value="english">英语</Option>
                <Option value="science">科学</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="年级"
              name="grade"
              rules={[{ required: true, message: '请输入年级' }]}
            >
              <Input placeholder="如：三年级" style={{ width: 120 }} />
            </Form.Item>

            <Form.Item
              label="考试时长(分钟)"
              name="duration"
              rules={[{ required: true, message: '请输入考试时长' }]}
            >
              <InputNumber min={30} max={300} style={{ width: 120 }} />
            </Form.Item>
          </Space>

          <Form.Item
            label="考试时间"
            name="exam_time"
            rules={[{ required: true, message: '请选择考试时间' }]}
          >
            <RangePicker 
              showTime 
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingExam ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setExamModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 题目编辑模态框 */}
      <Modal
        title={editingQuestion ? '编辑题目' : '添加题目'}
        open={questionModalVisible}
        onCancel={() => setQuestionModalVisible(false)}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <QuestionEditor
          initialData={editingQuestion || undefined}
          onSave={handleSaveQuestion}
          onCancel={() => setQuestionModalVisible(false)}
        />
      </Modal>

      {/* 题目预览模态框 */}
      <Modal
        title="题目预览"
        open={!!previewQuestion}
        onCancel={() => setPreviewQuestion(null)}
        footer={[
          <Button key="close" onClick={() => setPreviewQuestion(null)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {previewQuestion && (
          <QuestionDisplay
            question={previewQuestion as any}
            readonly={true}
            showAnswer={false}
          />
        )}
      </Modal>
    </div>
  )
}

export default ExamManagement