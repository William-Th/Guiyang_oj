import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Space,
  Button,
  Card,
  Statistic,
  Row,
  Col,
  message,
  Popconfirm,
  Tag,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  SortAscendingOutlined,
  BookOutlined
} from '@ant-design/icons';
import QuestionBankSelector from './QuestionBankSelector';
import QuestionDisplay from './QuestionDisplay';

interface ExamQuestion {
  id: number
  exam_id: number
  question_id: number
  order: number
  score: number
  question: {
    id: number
    type: 'single' | 'multiple' | 'blank' | 'essay' | 'code' | 'true_false' | 'matching'
    content: string
    subject: string
    difficulty: 'easy' | 'medium' | 'hard'
    score: number
    tags: string[]
    options?: string[]
    correct_answer?: any
    explanation?: string
  }
}

interface ExamQuestionManagerProps {
  visible: boolean
  onCancel: () => void
  examId: number
  examTitle: string
  examSubject: string
}

const ExamQuestionManager: React.FC<ExamQuestionManagerProps> = ({
  visible,
  onCancel,
  examId,
  examTitle,
  examSubject
}) => {
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [bankSelectorVisible, setBankSelectorVisible] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<ExamQuestion | null>(null);

  // 模拟数据
  useEffect(() => {
    if (visible) {
      loadExamQuestions();
    }
  }, [visible, examId]);

  const loadExamQuestions = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      const mockExamQuestions: ExamQuestion[] = [
        {
          id: 1,
          exam_id: examId,
          question_id: 1,
          order: 1,
          score: 5,
          question: {
            id: 1,
            type: 'single',
            content: '下列哪个是中国的首都？',
            subject: 'chinese',
            difficulty: 'easy',
            score: 5,
            tags: ['地理', '基础知识'],
            options: ['北京', '上海', '广州', '深圳'],
            correct_answer: '北京',
            explanation: '北京是中华人民共和国的首都。'
          }
        },
        {
          id: 2,
          exam_id: examId,
          question_id: 2,
          order: 2,
          score: 10,
          question: {
            id: 2,
            type: 'multiple',
            content: '下列哪些是水果？（多选）',
            subject: 'science',
            difficulty: 'medium',
            score: 10,
            tags: ['生物', '分类'],
            options: ['苹果', '萝卜', '香蕉', '白菜'],
            correct_answer: ['苹果', '香蕉'],
            explanation: '苹果和香蕉是水果，萝卜和白菜是蔬菜。'
          }
        }
      ];
      
      setExamQuestions(mockExamQuestions);
    } catch (error) {
      message.error('加载考试题目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestionsFromBank = (questions: any[]) => {
    const maxOrder = Math.max(0, ...examQuestions.map(eq => eq.order));
    
    const newExamQuestions: ExamQuestion[] = questions.map((q, index) => ({
      id: Date.now() + index, // 临时ID
      exam_id: examId,
      question_id: q.id,
      order: maxOrder + index + 1,
      score: q.score,
      question: q
    }));

    setExamQuestions([...examQuestions, ...newExamQuestions]);
    setBankSelectorVisible(false);
    message.success(`成功添加 ${questions.length} 道题目`);
  };

  const handleRemoveQuestion = (examQuestionId: number) => {
    setExamQuestions(examQuestions.filter(eq => eq.id !== examQuestionId));
    message.success('题目移除成功');
  };

  const handleScoreChange = (examQuestionId: number, newScore: number) => {
    setExamQuestions(examQuestions.map(eq => 
      eq.id === examQuestionId ? { ...eq, score: newScore } : eq
    ));
  };

  const handleReorderQuestions = () => {
    // 简单的重新排序：按当前顺序重新分配order
    const reorderedQuestions = examQuestions.map((eq, index) => ({
      ...eq,
      order: index + 1
    }));
    setExamQuestions(reorderedQuestions);
    message.success('题目顺序已重新排列');
  };

  const totalScore = examQuestions.reduce((sum, eq) => sum + eq.score, 0);
  const totalQuestions = examQuestions.length;
  const selectedQuestionIds = examQuestions.map(eq => eq.question_id);

  const questionTypeStats = examQuestions.reduce((stats, eq) => {
    const type = eq.question.type;
    stats[type] = (stats[type] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);

  const columns = [
    {
      title: '序号',
      dataIndex: 'order',
      key: 'order',
      width: 60,
      sorter: (a: ExamQuestion, b: ExamQuestion) => a.order - b.order,
    },
    {
      title: '题目内容',
      key: 'content',
      render: (record: ExamQuestion) => record.question.content,
      ellipsis: true,
      width: 300,
    },
    {
      title: '题型',
      key: 'type',
      width: 100,
      render: (record: ExamQuestion) => {
        const typeMap: Record<string, string> = {
          single: '单选题',
          multiple: '多选题',
          blank: '填空题',
          essay: '问答题',
          true_false: '判断题',
          code: '编程题',
          matching: '匹配题'
        };
        return typeMap[record.question.type] || record.question.type;
      }
    },
    {
      title: '难度',
      key: 'difficulty',
      width: 80,
      render: (record: ExamQuestion) => {
        const difficultyMap = {
          easy: { text: '简单', color: 'green' },
          medium: { text: '中等', color: 'orange' },
          hard: { text: '困难', color: 'red' }
        };
        const { text, color } = difficultyMap[record.question.difficulty];
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '分值',
      key: 'score',
      width: 100,
      render: (record: ExamQuestion) => (
        <InputNumber
          min={1}
          max={50}
          value={record.score}
          onChange={(value) => handleScoreChange(record.id, value || 1)}
          size="small"
        />
      )
    },
    {
      title: '标签',
      key: 'tags',
      width: 150,
      render: (record: ExamQuestion) => (
        <>
          {record.question.tags.map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (record: ExamQuestion) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setPreviewQuestion(record)}
          >
            预览
          </Button>
          <Popconfirm
            title="确定要移除这道题目吗？"
            onConfirm={() => handleRemoveQuestion(record.id)}
          >
            <Button 
              type="link" 
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={`管理考试题目 - ${examTitle}`}
        open={visible}
        onCancel={onCancel}
        width={1200}
        style={{ top: 20 }}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            关闭
          </Button>
        ]}
      >
        {/* 统计信息 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col>
              <Statistic title="题目总数" value={totalQuestions} suffix="道" />
            </Col>
            <Col>
              <Statistic title="总分值" value={totalScore} suffix="分" />
            </Col>
            <Col>
              <div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>题型分布</div>
                <Space size="small">
                  {Object.entries(questionTypeStats).map(([type, count]) => {
                    const typeMap: Record<string, string> = {
                      single: '单选',
                      multiple: '多选',
                      blank: '填空',
                      essay: '问答',
                      true_false: '判断',
                      code: '编程',
                      matching: '匹配'
                    };
                    return (
                      <Tag key={type} color="blue">
                        {typeMap[type] || type}: {count}
                      </Tag>
                    );
                  })}
                </Space>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 操作按钮 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setBankSelectorVisible(true)}
            >
              从题库添加
            </Button>
            <Button 
              icon={<SortAscendingOutlined />}
              onClick={handleReorderQuestions}
            >
              重新排序
            </Button>
            <Button 
              icon={<BookOutlined />}
              onClick={() => {
                // 导出题目功能
                message.info('导出功能开发中...');
              }}
            >
              导出题目
            </Button>
          </Space>
        </Card>

        {/* 题目列表 */}
        <Table
          columns={columns}
          dataSource={examQuestions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 道题目`
          }}
          scroll={{ y: 500 }}
        />
      </Modal>

      {/* 题库选择器 */}
      <QuestionBankSelector
        visible={bankSelectorVisible}
        onCancel={() => setBankSelectorVisible(false)}
        onAddQuestions={handleAddQuestionsFromBank}
        examSubject={examSubject}
        selectedQuestionIds={selectedQuestionIds}
      />

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
            question={previewQuestion.question}
            readonly={true}
            showAnswer={true}
            correctAnswer={previewQuestion.question.correct_answer}
          />
        )}
      </Modal>
    </>
  );
};

export default ExamQuestionManager;