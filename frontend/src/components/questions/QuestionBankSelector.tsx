import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Space,
  Button,
  Select,
  Input,
  Tag,
  message,
  Statistic,
  Card,
  Row,
  Col
} from 'antd';
import { SearchOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
import QuestionDisplay from './QuestionDisplay';

const { Option } = Select;

interface Question {
  id: number
  type: 'single' | 'multiple' | 'blank' | 'essay' | 'code' | 'true_false' | 'matching'
  content: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  score: number
  tags: string[]
  created_at: string
  options?: string[]
  correct_answer?: any
  explanation?: string
}

interface QuestionBankSelectorProps {
  visible: boolean
  onCancel: () => void
  onAddQuestions: (questions: Question[]) => void
  examSubject?: string
  selectedQuestionIds?: number[]
}

const QuestionBankSelector: React.FC<QuestionBankSelectorProps> = ({
  visible,
  onCancel,
  onAddQuestions,
  examSubject,
  selectedQuestionIds = []
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Question[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  
  // 过滤条件
  const [filters, setFilters] = useState({
    type: '',
    difficulty: '',
    subject: examSubject || '',
    searchText: ''
  });

  // 模拟数据 - 实际应该从API获取
  useEffect(() => {
    if (visible) {
      loadQuestions();
    }
  }, [visible]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      const mockQuestions: Question[] = [
        {
          id: 1,
          type: 'single',
          content: '下列哪个是中国的首都？',
          subject: 'chinese',
          difficulty: 'easy',
          score: 5,
          tags: ['地理', '基础知识'],
          created_at: '2024-03-10',
          options: ['北京', '上海', '广州', '深圳'],
          correct_answer: '北京',
          explanation: '北京是中华人民共和国的首都。'
        },
        {
          id: 2,
          type: 'multiple',
          content: '下列哪些是水果？（多选）',
          subject: 'science',
          difficulty: 'medium',
          score: 10,
          tags: ['生物', '分类'],
          created_at: '2024-03-11',
          options: ['苹果', '萝卜', '香蕉', '白菜'],
          correct_answer: ['苹果', '香蕉'],
          explanation: '苹果和香蕉是水果，萝卜和白菜是蔬菜。'
        },
        {
          id: 3,
          type: 'true_false',
          content: '地球是太阳系中唯一有生命的星球。',
          subject: 'science',
          difficulty: 'medium',
          score: 5,
          tags: ['天文', '地球科学'],
          created_at: '2024-03-12',
          correct_answer: false,
          explanation: '目前科学界认为地球是太阳系中唯一已知有生命的星球，但不能说是唯一有生命的星球。'
        },
        {
          id: 4,
          type: 'blank',
          content: '中国有___个省级行政区，其中包括___个省、___个自治区、___个直辖市和___个特别行政区。',
          subject: 'chinese',
          difficulty: 'hard',
          score: 15,
          tags: ['地理', '行政区划'],
          created_at: '2024-03-13',
          correct_answer: ['34', '23', '5', '4', '2'],
          explanation: '中国共有34个省级行政区：23个省、5个自治区、4个直辖市、2个特别行政区。'
        },
        {
          id: 5,
          type: 'essay',
          content: '请简述春夏秋冬四季的特点，每季至少写出三个特点。',
          subject: 'chinese',
          difficulty: 'medium',
          score: 20,
          tags: ['语文', '作文', '自然'],
          created_at: '2024-03-14',
          explanation: '参考答案：春季：万物复苏、温度回暖、花开草绿；夏季：气温炎热、阳光充足、植物茂盛；秋季：果实成熟、叶子变黄、天气凉爽；冬季：天气寒冷、雪花飞舞、植物休眠。'
        }
      ];
      
      setQuestions(mockQuestions);
      setFilteredQuestions(mockQuestions);
    } catch (error) {
      message.error('加载题目失败');
    } finally {
      setLoading(false);
    }
  };

  // 应用过滤条件
  useEffect(() => {
    let filtered = questions;

    // 科目过滤
    if (filters.subject) {
      filtered = filtered.filter(q => q.subject === filters.subject);
    }

    // 题型过滤
    if (filters.type) {
      filtered = filtered.filter(q => q.type === filters.type);
    }

    // 难度过滤
    if (filters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === filters.difficulty);
    }

    // 搜索过滤
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(q => 
        q.content.toLowerCase().includes(searchLower) ||
        q.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // 排除已添加的题目
    filtered = filtered.filter(q => !selectedQuestionIds.includes(q.id));

    setFilteredQuestions(filtered);
  }, [filters, questions, selectedQuestionIds]);

  const columns = [
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
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          single: '单选题',
          multiple: '多选题',
          blank: '填空题',
          essay: '问答题',
          true_false: '判断题',
          code: '编程题',
          matching: '匹配题'
        };
        return typeMap[type] || type;
      }
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 80,
      render: (subject: string) => {
        const subjectMap: Record<string, string> = {
          math: '数学',
          chinese: '语文',
          english: '英语',
          science: '科学',
          computer: '计算机',
          art: '美术',
          music: '音乐',
          pe: '体育'
        };
        return subjectMap[subject] || subject;
      }
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty: string) => {
        const difficultyMap = {
          easy: { text: '简单', color: 'green' },
          medium: { text: '中等', color: 'orange' },
          hard: { text: '困难', color: 'red' }
        };
        const { text, color } = difficultyMap[difficulty as keyof typeof difficultyMap];
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 60,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
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
      width: 100,
      render: (_: any, record: Question) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => setPreviewQuestion(record)}
        >
          预览
        </Button>
      ),
    },
  ];

  const handleAddSelected = () => {
    if (selectedRows.length === 0) {
      message.warning('请选择要添加的题目');
      return;
    }
    
    onAddQuestions(selectedRows);
    setSelectedRows([]);
    setSelectedRowKeys([]);
    message.success(`成功添加 ${selectedRows.length} 道题目`);
  };

  const totalScore = selectedRows.reduce((sum, q) => sum + q.score, 0);

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[], selectedRows: Question[]) => {
      setSelectedRowKeys(selectedRowKeys as number[]);
      setSelectedRows(selectedRows);
    },
  };

  return (
    <>
      <Modal
        title="从题库选择题目"
        open={visible}
        onCancel={onCancel}
        width={1200}
        style={{ top: 20 }}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            取消
          </Button>,
          <Button 
            key="add" 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddSelected}
            disabled={selectedRows.length === 0}
          >
            添加选中的题目 ({selectedRows.length})
          </Button>
        ]}
      >
        {/* 过滤条件 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Space>
                <FilterOutlined />
                <span>筛选条件：</span>
              </Space>
            </Col>
            <Col>
              <Select
                placeholder="题型"
                allowClear
                style={{ width: 100 }}
                value={filters.type || undefined}
                onChange={(value) => setFilters({ ...filters, type: value || '' })}
              >
                <Option value="single">单选题</Option>
                <Option value="multiple">多选题</Option>
                <Option value="true_false">判断题</Option>
                <Option value="blank">填空题</Option>
                <Option value="essay">问答题</Option>
                <Option value="code">编程题</Option>
                <Option value="matching">匹配题</Option>
              </Select>
            </Col>
            <Col>
              <Select
                placeholder="难度"
                allowClear
                style={{ width: 100 }}
                value={filters.difficulty || undefined}
                onChange={(value) => setFilters({ ...filters, difficulty: value || '' })}
              >
                <Option value="easy">简单</Option>
                <Option value="medium">中等</Option>
                <Option value="hard">困难</Option>
              </Select>
            </Col>
            <Col>
              <Select
                placeholder="科目"
                allowClear
                style={{ width: 100 }}
                value={filters.subject || undefined}
                onChange={(value) => setFilters({ ...filters, subject: value || '' })}
              >
                <Option value="math">数学</Option>
                <Option value="chinese">语文</Option>
                <Option value="english">英语</Option>
                <Option value="science">科学</Option>
                <Option value="computer">计算机</Option>
                <Option value="art">美术</Option>
                <Option value="music">音乐</Option>
                <Option value="pe">体育</Option>
              </Select>
            </Col>
            <Col flex="auto">
              <Input
                placeholder="搜索题目内容或标签"
                prefix={<SearchOutlined />}
                allowClear
                value={filters.searchText}
                onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
              />
            </Col>
          </Row>
        </Card>

        {/* 选择统计 */}
        {selectedRows.length > 0 && (
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed' }}>
            <Row gutter={16}>
              <Col>
                <Statistic title="已选题目" value={selectedRows.length} suffix="道" />
              </Col>
              <Col>
                <Statistic title="总分值" value={totalScore} suffix="分" />
              </Col>
            </Row>
          </Card>
        )}

        {/* 题目列表 */}
        <Table
          columns={columns}
          dataSource={filteredQuestions}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条题目`
          }}
          scroll={{ y: 400 }}
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
            question={previewQuestion}
            readonly={true}
            showAnswer={true}
            correctAnswer={previewQuestion.correct_answer}
          />
        )}
      </Modal>
    </>
  );
};

export default QuestionBankSelector;