import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  message,
  Spin,
  Statistic,
  Popconfirm,
  Divider,
  Tooltip,
  Empty,
  Alert,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  ClearOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { activityApi } from '../../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { Search } = Input;

interface Activity {
  id: number;
  title: string;
  description?: string;
  subject: string;
  grade: string;
  type: 'practice' | 'assessment';
  total_score: number;
  pass_score: number;
  status: string;
}

interface Question {
  id: number;
  question_code: string;
  type: string;
  content: string;
  difficulty: string;
  level: string;
  suggested_score: number;
  knowledge_points: string[];
  subject: string;
  grade: string;
}

interface ActivityQuestion {
  activity_question_id: number;
  question_id: number;
  order_index: number;
  score: number;
  is_required: boolean;
  section: string | null;
  question_code: string;
  type: string;
  content: string;
  difficulty: string;
  level: string;
  knowledge_points: string[];
}

interface PaperStats {
  activity_id: number;
  title: string;
  total_score: number;
  question_count: number;
  single_choice_count: number;
  multiple_choice_count: number;
  blank_count: number;
  essay_count: number;
  code_count: number;
  easy_count: number;
  medium_count: number;
  hard_count: number;
}

const PaperGenerationPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const activityId = id ? parseInt(id) : 0;

  // State
  const [activity, setActivity] = useState<Activity | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<ActivityQuestion[]>([]);
  const [paperStats, setPaperStats] = useState<PaperStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    type: undefined as string | undefined,
    difficulty: undefined as string | undefined,
    level: undefined as string | undefined,
    search: '',
  });

  // Modal state
  const [addQuestionModalVisible, setAddQuestionModalVisible] = useState(false);
  const [editQuestionModalVisible, setEditQuestionModalVisible] = useState(false);
  const [previewQuestionModalVisible, setPreviewQuestionModalVisible] = useState(false);
  const [currentEditingQuestion, setCurrentEditingQuestion] = useState<ActivityQuestion | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | ActivityQuestion | null>(null);

  // State for batch remove
  const [selectedPaperRowKeys, setSelectedPaperRowKeys] = useState<React.Key[]>([]);

  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    if (activityId) {
      loadData();
    }
  }, [activityId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadActivity(),
        loadAvailableQuestions(),
        loadActivityPaper(),
        loadPaperStats(),
      ]);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      const response = await activityApi.getActivity(activityId);
      setActivity(response.activity);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载活动信息失败');
    }
  };

  const loadAvailableQuestions = async () => {
    try {
      const response = await activityApi.getAvailableQuestions(activityId, filters);
      setAvailableQuestions(response.questions || []);
    } catch (error: any) {
      console.error('Load available questions error:', error);
    }
  };

  const loadActivityPaper = async () => {
    try {
      const response = await activityApi.getActivityPaper(activityId);
      setSelectedQuestions(response.questions || []);
    } catch (error: any) {
      console.error('Load activity paper error:', error);
    }
  };

  const loadPaperStats = async () => {
    try {
      const response = await activityApi.getActivityPaperStats(activityId);
      setPaperStats(response.stats);
    } catch (error: any) {
      console.error('Load paper stats error:', error);
    }
  };

  // Filter handlers
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    loadAvailableQuestions();
  };

  const handleResetFilters = () => {
    setFilters({
      type: undefined,
      difficulty: undefined,
      level: undefined,
      search: '',
    });
    setTimeout(() => loadAvailableQuestions(), 100);
  };

  // Add question handlers
  const handleOpenAddModal = () => {
    setAddQuestionModalVisible(true);
    addForm.resetFields();
  };

  const handleAddQuestion = async (values: any) => {
    setAddingQuestion(true);
    try {
      await activityApi.addQuestionToActivity(activityId, {
        questionId: values.questionId,
        score: values.score,
        isRequired: values.isRequired !== undefined ? values.isRequired : true,
        section: values.section,
      });
      message.success('题目添加成功');
      setAddQuestionModalVisible(false);
      addForm.resetFields();
      await loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '添加题目失败');
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleBatchAddQuestions = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要添加的题目');
      return;
    }

    setAddingQuestion(true);
    try {
      const questions = selectedRowKeys.map(key => {
        const question = availableQuestions.find(q => q.id === key);
        return {
          questionId: key as number,
          score: question?.suggested_score || 5,
          isRequired: true,
        };
      });

      const response = await activityApi.batchAddQuestions(activityId, questions);

      if (response.errors && response.errors.length > 0) {
        message.warning(`成功添加 ${response.added.length} 道题目，失败 ${response.errors.length} 道`);
      } else {
        message.success(`成功添加 ${response.added.length} 道题目`);
      }

      setSelectedRowKeys([]);
      await loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '批量添加题目失败');
    } finally {
      setAddingQuestion(false);
    }
  };

  // Edit question handlers
  const handleEditQuestion = (question: ActivityQuestion) => {
    setCurrentEditingQuestion(question);
    editForm.setFieldsValue({
      score: question.score,
      isRequired: question.is_required,
      section: question.section,
    });
    setEditQuestionModalVisible(true);
  };

  const handleUpdateQuestion = async (values: any) => {
    if (!currentEditingQuestion) return;

    try {
      await activityApi.updateActivityQuestion(
        activityId,
        currentEditingQuestion.question_id,
        values
      );
      message.success('题目更新成功');
      setEditQuestionModalVisible(false);
      setCurrentEditingQuestion(null);
      await loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '更新题目失败');
    }
  };

  // Remove question handlers
  const handleRemoveQuestion = async (questionId: number) => {
    try {
      await activityApi.removeQuestionFromActivity(activityId, questionId);
      message.success('题目移除成功');
      await loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '移除题目失败');
    }
  };

  // Clear paper handler
  const handleClearPaper = async () => {
    try {
      const response = await activityApi.clearActivityPaper(activityId);
      message.success(`已清空试卷，移除了 ${response.removed} 道题目`);
      await loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '清空试卷失败');
    }
  };

  // Validate paper handler
  const handleValidatePaper = async () => {
    try {
      const response = await activityApi.validateActivityPaper(activityId);

      if (response.valid) {
        Modal.success({
          title: '试卷验证通过',
          content: (
            <div>
              <p>试卷满足发布要求</p>
              <p>总分：{response.stats.total_score}</p>
              <p>题目数量：{response.stats.question_count}</p>
            </div>
          ),
        });
      } else {
        Modal.error({
          title: '试卷验证失败',
          content: (
            <div>
              <p>试卷存在以下问题：</p>
              <ul>
                {response.errors.map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          ),
        });
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '验证试卷失败');
    }
  };

  // Preview question handler
  const handlePreviewQuestion = (question: Question | ActivityQuestion) => {
    setPreviewQuestion(question);
    setPreviewQuestionModalVisible(true);
  };

  // Batch remove handler
  const handleBatchRemoveQuestions = async () => {
    if (selectedPaperRowKeys.length === 0) {
      message.warning('请先选择要删除的题目');
      return;
    }

    try {
      const questionIds = selectedPaperRowKeys.map(key => {
        const question = selectedQuestions.find(q => q.activity_question_id === key);
        return question?.question_id;
      }).filter(id => id !== undefined) as number[];

      const response = await activityApi.batchRemoveQuestions(activityId, questionIds);

      if (response.errors && response.errors.length > 0) {
        message.warning(`成功移除 ${response.removed.length} 道题目，失败 ${response.errors.length} 道`);
      } else {
        message.success(`成功移除 ${response.removed.length} 道题目`);
      }

      setSelectedPaperRowKeys([]);
      await loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '批量删除题目失败');
    }
  };

  // Drag and drop handler (for future implementation)
  // const handleDragEnd = async (dragIndex: number, hoverIndex: number) => {
  //   if (dragIndex === hoverIndex) return;
  //   const newQuestions = [...selectedQuestions];
  //   const [removed] = newQuestions.splice(dragIndex, 1);
  //   newQuestions.splice(hoverIndex, 0, removed);
  //   const orderUpdates = newQuestions.map((q, index) => ({
  //     questionId: q.question_id,
  //     orderIndex: index + 1,
  //   }));
  //   try {
  //     await activityApi.reorderQuestions(activityId, orderUpdates);
  //     message.success('题目顺序已更新');
  //     await loadData();
  //   } catch (error: any) {
  //     message.error(error.response?.data?.message || '更新顺序失败');
  //   }
  // };

  // Get type tag
  const getTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      single: { color: 'blue', text: '单选题' },
      multiple: { color: 'purple', text: '多选题' },
      blank: { color: 'cyan', text: '填空题' },
      essay: { color: 'orange', text: '问答题' },
      code: { color: 'green', text: '编程题' },
    };
    const typeInfo = typeMap[type] || { color: 'default', text: type };
    return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
  };

  // Get difficulty tag
  const getDifficultyTag = (difficulty: string) => {
    const difficultyMap: Record<string, { color: string; text: string }> = {
      easy: { color: 'green', text: '简单' },
      medium: { color: 'orange', text: '中等' },
      hard: { color: 'red', text: '困难' },
    };
    const difficultyInfo = difficultyMap[difficulty] || { color: 'default', text: difficulty };
    return <Tag color={difficultyInfo.color}>{difficultyInfo.text}</Tag>;
  };

  // Available questions table columns
  const availableQuestionColumns: ColumnsType<Question> = [
    {
      title: '题目编号',
      dataIndex: 'question_code',
      key: 'question_code',
      width: 150,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => getTypeTag(type),
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text.substring(0, 50)}{text.length > 50 ? '...' : ''}</span>
        </Tooltip>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 100,
      render: (difficulty: string) => getDifficultyTag(difficulty),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
    },
    {
      title: '建议分值',
      dataIndex: 'suggested_score',
      key: 'suggested_score',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handlePreviewQuestion(record)}
          >
            预览
          </Button>
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => {
              addForm.setFieldsValue({
                questionId: record.id,
                score: record.suggested_score,
                isRequired: true,
              });
              handleOpenAddModal();
            }}
          >
            添加
          </Button>
        </Space>
      ),
    },
  ];

  // Selected questions table columns
  const selectedQuestionColumns: ColumnsType<ActivityQuestion> = [
    {
      title: '序号',
      dataIndex: 'order_index',
      key: 'order_index',
      width: 80,
    },
    {
      title: '题目编号',
      dataIndex: 'question_code',
      key: 'question_code',
      width: 150,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => getTypeTag(type),
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text.substring(0, 50)}{text.length > 50 ? '...' : ''}</span>
        </Tooltip>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 100,
      render: (difficulty: string) => getDifficultyTag(difficulty),
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 80,
    },
    {
      title: '必答',
      dataIndex: 'is_required',
      key: 'is_required',
      width: 80,
      render: (isRequired: boolean) => (
        <Tag color={isRequired ? 'green' : 'default'}>
          {isRequired ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '章节',
      dataIndex: 'section',
      key: 'section',
      width: 120,
      render: (section: string | null) => section || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handlePreviewQuestion(record)}
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
            title="确定要移除这道题目吗？"
            onConfirm={() => handleRemoveQuestion(record.question_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const paperRowSelection = {
    selectedRowKeys: selectedPaperRowKeys,
    onChange: (keys: React.Key[]) => setSelectedPaperRowKeys(keys),
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!activity) {
    return (
      <Card>
        <Empty description="活动不存在" />
      </Card>
    );
  }

  // Check if activity can be edited
  const canEdit = activity.status === 'draft';

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            />
            <span>组卷管理 - {activity.title}</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              刷新
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={handleValidatePaper}
            >
              验证试卷
            </Button>
          </Space>
        }
      >
        {!canEdit && (
          <Alert
            message="此活动已发布，不能修改题目"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Statistics */}
        {paperStats && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={4}>
              <Statistic
                title="总题数"
                value={paperStats.question_count}
                prefix={<BarChartOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic title="总分" value={paperStats.total_score} />
            </Col>
            <Col span={4}>
              <Statistic title="单选题" value={paperStats.single_choice_count} />
            </Col>
            <Col span={4}>
              <Statistic title="多选题" value={paperStats.multiple_choice_count} />
            </Col>
            <Col span={4}>
              <Statistic title="填空题" value={paperStats.blank_count} />
            </Col>
            <Col span={4}>
              <Statistic title="问答题" value={paperStats.essay_count} />
            </Col>
          </Row>
        )}

        <Divider />

        {/* Selected Questions */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>已选题目 ({selectedQuestions.length})</h3>
            {canEdit && (
              <Space>
                <Popconfirm
                  title={`确定要删除选中的 ${selectedPaperRowKeys.length} 道题目吗？`}
                  onConfirm={handleBatchRemoveQuestions}
                  okText="确定"
                  cancelText="取消"
                  disabled={selectedPaperRowKeys.length === 0}
                >
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    disabled={selectedPaperRowKeys.length === 0}
                  >
                    批量删除 ({selectedPaperRowKeys.length})
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="确定要清空试卷吗？这将移除所有已选题目。"
                  onConfirm={handleClearPaper}
                  okText="确定"
                  cancelText="取消"
                  disabled={selectedQuestions.length === 0}
                >
                  <Button
                    icon={<ClearOutlined />}
                    danger
                    disabled={selectedQuestions.length === 0}
                  >
                    清空试卷
                  </Button>
                </Popconfirm>
              </Space>
            )}
          </div>

          <Table
            columns={selectedQuestionColumns}
            dataSource={selectedQuestions}
            rowKey="activity_question_id"
            rowSelection={canEdit ? paperRowSelection : undefined}
            pagination={false}
            scroll={{ y: 400 }}
            locale={{ emptyText: '暂无题目，请从下方添加' }}
          />
        </div>

        <Divider />

        {/* Available Questions */}
        {canEdit && (
          <div>
            <h3>可用题目</h3>

            {/* Filters */}
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={4}>
                  <Select
                    placeholder="题型"
                    allowClear
                    value={filters.type}
                    onChange={(value) => handleFilterChange('type', value)}
                    style={{ width: '100%' }}
                    virtual={false}
                  >
                    <Option value="single">单选题</Option>
                    <Option value="multiple">多选题</Option>
                    <Option value="blank">填空题</Option>
                    <Option value="essay">问答题</Option>
                    <Option value="code">编程题</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="难度"
                    allowClear
                    value={filters.difficulty}
                    onChange={(value) => handleFilterChange('difficulty', value)}
                    style={{ width: '100%' }}
                    virtual={false}
                  >
                    <Option value="easy">简单</Option>
                    <Option value="medium">中等</Option>
                    <Option value="hard">困难</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="级别"
                    allowClear
                    value={filters.level}
                    onChange={(value) => handleFilterChange('level', value)}
                    style={{ width: '100%' }}
                    virtual={false}
                  >
                    <Option value="基础">基础</Option>
                    <Option value="提高">提高</Option>
                    <Option value="拓展">拓展</Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <Search
                    placeholder="搜索题目内容或编号"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    onSearch={handleSearch}
                    allowClear
                  />
                </Col>
                <Col span={4}>
                  <Space>
                    <Button onClick={handleSearch}>搜索</Button>
                    <Button onClick={handleResetFilters}>重置</Button>
                  </Space>
                </Col>
              </Row>
            </div>

            {/* Batch actions */}
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleBatchAddQuestions}
                  loading={addingQuestion}
                  disabled={selectedRowKeys.length === 0}
                >
                  批量添加 ({selectedRowKeys.length})
                </Button>
              </Space>
            </div>

            {/* Available questions table */}
            <Table
              columns={availableQuestionColumns}
              dataSource={availableQuestions}
              rowKey="id"
              rowSelection={rowSelection}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 道题目`,
              }}
              scroll={{ y: 400 }}
            />
          </div>
        )}
      </Card>

      {/* Add Question Modal */}
      <Modal
        title="添加题目"
        open={addQuestionModalVisible}
        onOk={() => addForm.submit()}
        onCancel={() => {
          setAddQuestionModalVisible(false);
          addForm.resetFields();
        }}
        confirmLoading={addingQuestion}
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddQuestion}>
          <Form.Item name="questionId" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            label="分值"
            name="score"
            rules={[{ required: true, message: '请输入分值' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="是否必答" name="isRequired" valuePropName="checked">
            <Select style={{ width: '100%' }} virtual={false}>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>

          <Form.Item label="章节" name="section">
            <Input placeholder="如：第一章" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Question Modal */}
      <Modal
        title="编辑题目"
        open={editQuestionModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditQuestionModalVisible(false);
          setCurrentEditingQuestion(null);
          editForm.resetFields();
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateQuestion}>
          <Form.Item
            label="分值"
            name="score"
            rules={[{ required: true, message: '请输入分值' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="是否必答" name="isRequired" valuePropName="checked">
            <Select style={{ width: '100%' }} virtual={false}>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>

          <Form.Item label="章节" name="section">
            <Input placeholder="如：第一章" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Question Modal */}
      <Modal
        title="题目预览"
        open={previewQuestionModalVisible}
        onCancel={() => {
          setPreviewQuestionModalVisible(false);
          setPreviewQuestion(null);
        }}
        footer={[
          <Button key="close" onClick={() => setPreviewQuestionModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {previewQuestion && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="题目编号" span={2}>
                {(previewQuestion as any).question_code}
              </Descriptions.Item>
              <Descriptions.Item label="题型">
                {getTypeTag((previewQuestion as any).type)}
              </Descriptions.Item>
              <Descriptions.Item label="难度">
                {getDifficultyTag((previewQuestion as any).difficulty)}
              </Descriptions.Item>
              <Descriptions.Item label="级别">
                {(previewQuestion as any).level}
              </Descriptions.Item>
              <Descriptions.Item label="科目">
                {(previewQuestion as any).subject}
              </Descriptions.Item>
              <Descriptions.Item label="年级">
                {(previewQuestion as any).grade}
              </Descriptions.Item>
              <Descriptions.Item label="建议分值">
                {(previewQuestion as any).suggested_score}
              </Descriptions.Item>
              {(previewQuestion as any).knowledge_points && (
                <Descriptions.Item label="知识点" span={2}>
                  {Array.isArray((previewQuestion as any).knowledge_points)
                    ? (previewQuestion as any).knowledge_points.join(', ')
                    : (previewQuestion as any).knowledge_points}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="题目内容" span={2}>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {(previewQuestion as any).content}
                </div>
              </Descriptions.Item>
              {(previewQuestion as any).options && (
                <Descriptions.Item label="选项" span={2}>
                  <div>
                    {Array.isArray((previewQuestion as any).options)
                      ? (previewQuestion as any).options.map((opt: string, idx: number) => (
                          <div key={idx}>
                            {String.fromCharCode(65 + idx)}. {opt}
                          </div>
                        ))
                      : (previewQuestion as any).options}
                  </div>
                </Descriptions.Item>
              )}
              {(previewQuestion as any).correct_answer && (
                <Descriptions.Item label="正确答案" span={2}>
                  <Tag color="green">{(previewQuestion as any).correct_answer}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaperGenerationPage;
