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
  Tabs,
  Badge,
  Image,
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
  FilePdfOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { activityApi, paperExportApi } from '../../services/api';
import type { ColumnsType } from 'antd/es/table';
import { getAbilityLevelsBySubject } from '../../config/subjects';

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
  actual_total_score: number | string;
  question_count: number;
  single_choice_count: number | string;
  multiple_choice_count: number | string;
  blank_count: number | string;
  essay_count: number | string;
  code_count: number | string;
  easy_count: number | string;
  medium_count: number | string;
  hard_count: number | string;
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
  const [previewQuestionModalVisible, setPreviewQuestionModalVisible] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | ActivityQuestion | null>(null);
  const [paperPreviewModalVisible, setPaperPreviewModalVisible] = useState(false);

  // State for batch remove
  const [selectedPaperRowKeys, setSelectedPaperRowKeys] = useState<React.Key[]>([]);

  // State for inline score editing
  const [editingScoreId, setEditingScoreId] = useState<number | null>(null);
  const [editingScoreValue, setEditingScoreValue] = useState<number>(0);

  // State for question type tab
  const [activeTypeTab, setActiveTypeTab] = useState<string>('all');

  // State for pagination per type
  const [paginationState, setPaginationState] = useState<Record<string, number>>({});

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

  // Add question handlers - 直接添加到列表，使用建议分值
  const handleQuickAddQuestion = async (question: Question) => {
    setAddingQuestion(true);
    try {
      const response = await activityApi.addQuestionToActivity(activityId, {
        questionId: question.id,
        score: question.suggested_score || 5,
      });
      // C3 同质化提示
      const warning = response?.question?.homogeneity_warning || response?.data?.question?.homogeneity_warning;
      if (warning) {
        message.warning(warning.message);
      } else {
        message.success('题目添加成功');
      }
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

  // Inline score editing handlers
  const handleStartEditScore = (question: ActivityQuestion) => {
    setEditingScoreId(question.activity_question_id);
    setEditingScoreValue(question.score);
  };

  const handleSaveScore = async (questionId: number) => {
    try {
      await activityApi.updateActivityQuestion(
        activityId,
        questionId,
        { score: editingScoreValue }
      );
      message.success('分值更新成功');
      setEditingScoreId(null);
      await loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '更新分值失败');
    }
  };

  const handleCancelEditScore = () => {
    setEditingScoreId(null);
    setEditingScoreValue(0);
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

      // 额外检查总分是否一致 - 使用 Math.round 避免小数精度问题
      const questionTotalScore = Math.round(Number(paperStats?.actual_total_score || 0) * 100) / 100;
      const activityTotalScore = Math.round(Number(activity?.total_score || 0) * 100) / 100;
      const scoreMatch = questionTotalScore === activityTotalScore;

      if (response.valid && scoreMatch) {
        Modal.success({
          title: '试卷验证通过',
          content: (
            <div>
              <p>试卷满足发布要求</p>
              <p>活动设置总分：{activityTotalScore} 分</p>
              <p>题目分数总和：{questionTotalScore} 分</p>
              <p>题目数量：{response.stats.question_count}</p>
            </div>
          ),
        });
      } else {
        const errors = [...(response.errors || [])];
        if (!scoreMatch) {
          errors.push(`题目分数总和(${questionTotalScore}分)与活动设置的总分(${activityTotalScore}分)不一致`);
        }
        Modal.error({
          title: '试卷验证失败',
          content: (
            <div>
              <p>试卷存在以下问题：</p>
              <ul>
                {errors.map((error: string, index: number) => (
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
      true_false: { color: 'lime', text: '判断题' },
      blank: { color: 'cyan', text: '填空题' },
      essay: { color: 'orange', text: '问答题' },
      code: { color: 'green', text: '编程题' },
      matching: { color: 'magenta', text: '匹配题' },
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
      width: 120,
      render: (score: number, record: ActivityQuestion) => {
        if (editingScoreId === record.activity_question_id && canEdit) {
          return (
            <Space size="small">
              <InputNumber
                min={0}
                max={100}
                value={editingScoreValue}
                onChange={(val) => setEditingScoreValue(val || 0)}
                style={{ width: 60 }}
                size="small"
              />
              <Button
                type="link"
                size="small"
                onClick={() => handleSaveScore(record.question_id)}
              >
                保存
              </Button>
              <Button
                type="link"
                size="small"
                onClick={handleCancelEditScore}
              >
                取消
              </Button>
            </Space>
          );
        }
        return (
          <span
            style={{ cursor: canEdit ? 'pointer' : 'default' }}
            onClick={() => canEdit && handleStartEditScore(record)}
          >
            {score}
            {canEdit && <EditOutlined style={{ marginLeft: 4, fontSize: 12, color: '#16a34a' }} />}
          </span>
        );
      },
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
          <Popconfirm
            title="确定要移除这道题目吗？"
            onConfirm={() => handleRemoveQuestion(record.question_id)}
            okText="确定"
            cancelText="取消"
            disabled={!canEdit}
          >
            <Button type="link" danger icon={<DeleteOutlined />} disabled={!canEdit}>
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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

  // Group questions by type for Tabs
  const groupQuestionsByType = (questions: Question[]) => {
    const typeMap: Record<string, { color: string; text: string; order: number }> = {
      single: { color: 'blue', text: '单选题', order: 1 },
      multiple: { color: 'purple', text: '多选题', order: 2 },
      true_false: { color: 'lime', text: '判断题', order: 3 },
      blank: { color: 'cyan', text: '填空题', order: 4 },
      essay: { color: 'orange', text: '问答题', order: 5 },
      code: { color: 'green', text: '编程题', order: 6 },
      matching: { color: 'magenta', text: '匹配题', order: 7 },
    };

    const groups: Record<string, { questions: Question[]; info: any }> = {};

    // Initialize all type groups
    Object.keys(typeMap).forEach(type => {
      groups[type] = {
        questions: [],
        info: typeMap[type]
      };
    });

    // Group questions
    questions.forEach(question => {
      const type = question.type;
      if (!groups[type]) {
        groups[type] = {
          questions: [],
          info: { color: 'default', text: type, order: 99 }
        };
      }
      groups[type].questions.push(question);
    });

    // Convert to array and sort by order (show all types even if empty)
    return Object.entries(groups)
      .sort(([, a], [, b]) => a.info.order - b.info.order)
      .map(([type, data]) => ({ type, ...data }));
  };

  const questionGroups = groupQuestionsByType(availableQuestions);

  const getSelectedCountByType = (type: string) => {
    return selectedQuestions.filter(q => q.type === type).length;
  };

  const getQuestionsByType = (type: string): Question[] => {
    if (type === 'all') {
      return availableQuestions;
    }
    const group = questionGroups.find(g => g.type === type);
    return group ? group.questions : [];
  };

  const getCurrentQuestions = (): Question[] => {
    return getQuestionsByType(activeTypeTab);
  };

  const handlePageChange = (page: number) => {
    setPaginationState(prev => ({ ...prev, [activeTypeTab]: page }));
  };

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
              icon={<FilePdfOutlined />}
              onClick={() => {
                const token = localStorage.getItem('token');
                const url = paperExportApi.exportPaperPdfUrl(activityId);
                // 带token下载PDF
                fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
                  .then((r) => {
                    if (!r.ok) throw new Error('导出失败');
                    return r.blob();
                  })
                  .then((blob) => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `paper-${activityId}.pdf`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  })
                  .catch(() => message.error('导出 PDF 失败'));
              }}
            >
              导出PDF
            </Button>
            <Button
              type="primary"
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
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Statistic
                  title="总题数"
                  value={paperStats.question_count}
                  prefix={<BarChartOutlined />}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="活动设置总分"
                  value={activity.total_score}
                  valueStyle={{ color: '#16a34a' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="题目分数和"
                  value={Math.round(Number(paperStats.actual_total_score || 0) * 100) / 100}
                  valueStyle={{
                    color: Math.round(Number(paperStats.actual_total_score || 0) * 100) / 100 === Math.round(Number(activity.total_score) * 100) / 100
                      ? '#52c41a'
                      : '#ff4d4f'
                  }}
                />
              </Col>
              <Col span={3}>
                <Statistic title="单选题" value={paperStats.single_choice_count} />
              </Col>
              <Col span={3}>
                <Statistic title="多选题" value={paperStats.multiple_choice_count} />
              </Col>
              <Col span={3}>
                <Statistic title="填空题" value={paperStats.blank_count} />
              </Col>
              <Col span={3}>
                <Statistic title="问答题" value={paperStats.essay_count} />
              </Col>
            </Row>
            {Math.round(Number(paperStats.actual_total_score || 0) * 100) / 100 !== Math.round(Number(activity.total_score) * 100) / 100 && (
              <Alert
                message={`总分不一致：活动设置总分 ${activity.total_score} 分，题目分数和 ${Math.round(Number(paperStats.actual_total_score || 0) * 100) / 100} 分`}
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </>
        )}

        <Divider />

        {/* Selected Questions */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>已选题目 ({selectedQuestions.length})</h3>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setPaperPreviewModalVisible(true)}
                disabled={selectedQuestions.length === 0}
              >
                预览试卷
              </Button>
              {canEdit && (
                <>
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
                </>
              )}
            </Space>
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
            <h3>按题型选择题目</h3>

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
                    <Option value="true_false">判断题</Option>
                    <Option value="blank">填空题</Option>
                    <Option value="essay">问答题</Option>
                    <Option value="code">编程题</Option>
                    <Option value="matching">匹配题</Option>
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
                    {activity && getAbilityLevelsBySubject(activity.subject).map(level => (
                      <Option key={level.value} value={level.value}>{level.label}</Option>
                    ))}
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

            {/* Question type Tabs with card styling */}
            <Tabs
              activeKey={activeTypeTab}
              onChange={(key) => {
                setActiveTypeTab(key);
                if (!paginationState[key]) {
                  setPaginationState(prev => ({ ...prev, [key]: 1 }));
                }
              }}
            >
              <Tabs.TabPane tab="全部" key="all"></Tabs.TabPane>
              {questionGroups.map(({ type, info, questions }) => {
                const selectedCount = getSelectedCountByType(type);
                const isSelected = activeTypeTab === type;
                return (
                  <Tabs.TabPane
                    key={type}
                    tab={
                      <div
                        style={{
                          padding: '4px 12px',
                          border: '1px solid #d9d9d9',
                          borderRadius: '6px',
                          background: isSelected ? '#f0fdf4' : '#fff',
                          borderColor: isSelected ? info.color : '#d9d9d9',
                        }}
                      >
                        <Tag color={info.color} style={{ margin: 0 }}>{info.text}</Tag>
                        <Badge count={questions.length} showZero style={{ backgroundColor: '#52c41a', marginLeft: 4 }} />
                        {selectedCount > 0 && (
                          <Tag color="blue" style={{ marginLeft: 4 }}>已选{selectedCount}</Tag>
                        )}
                      </div>
                    }
                  >
                  </Tabs.TabPane>
                );
              })}
            </Tabs>

            {/* Questions display for current tab */}
            <div style={{ marginTop: 16 }}>
              {(() => {
                const currentQuestions = getCurrentQuestions();
                const currentPage = paginationState[activeTypeTab] || 1;
                const pageSize = 10;
                const totalPages = Math.ceil(currentQuestions.length / pageSize);
                const startIdx = (currentPage - 1) * pageSize;
                const endIdx = startIdx + pageSize;
                const displayedQuestions = currentQuestions.slice(startIdx, endIdx);

                const currentTypeInfo = activeTypeTab === 'all'
                  ? { color: 'default', text: '全部' }
                  : questionGroups.find(g => g.type === activeTypeTab)?.info || { color: 'default', text: '' };

                return (
                  <>
                    {/* Pagination controls */}
                    <div style={{ marginBottom: 12 }}>
                      <Space wrap>
                        {activeTypeTab !== 'all' && (
                          <>
                            <Button
                              size="small"
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={() => {
                                const allKeys = currentQuestions.map(q => q.id);
                                setSelectedRowKeys([...new Set([...selectedRowKeys, ...allKeys])]);
                                message.success(`已全选 ${currentTypeInfo.text}`);
                              }}
                            >
                              全选本题型
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                const allKeys = currentQuestions.map(q => q.id);
                                setSelectedRowKeys(selectedRowKeys.filter(k => !allKeys.includes(k as number)));
                              }}
                            >
                              取消全选
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={<PlusOutlined />}
                              onClick={async () => {
                                const typeSelectedKeys = selectedRowKeys.filter(k =>
                                  currentQuestions.some(q => q.id === (k as number))
                                );
                                if (typeSelectedKeys.length === 0) {
                                  message.warning('请先勾选题目');
                                  return;
                                }
                                await handleBatchAddQuestions();
                              }}
                            >
                              批量添加本题型 ({selectedRowKeys.filter(k => currentQuestions.some(q => q.id === (k as number))).length})
                            </Button>
                            <Divider type="vertical" />
                          </>
                        )}
                        <span style={{ fontSize: 12, color: '#999' }}>
                          第 {currentPage} / {totalPages} 页 (共 {currentQuestions.length} 题)
                        </span>
                        {currentPage > 1 && (
                          <Button size="small" onClick={() => handlePageChange(currentPage - 1)}>上一页</Button>
                        )}
                        {currentPage < totalPages && (
                          <Button size="small" onClick={() => handlePageChange(currentPage + 1)}>下一页</Button>
                        )}
                      </Space>
                    </div>

                    {/* Questions grid */}
                    <Row gutter={[12, 12]}>
                      {displayedQuestions.map((question) => {
                        const isSelected = selectedRowKeys.includes(question.id);
                        const questionTypeInfo = questionGroups.find(g => g.type === question.type)?.info || { color: 'default' };
                        return (
                          <Col key={question.id} span={12}>
                            <Card
                              size="small"
                              hoverable
                              style={{
                                border: isSelected ? '2px solid #16a34a' : '1px solid #d9d9d9',
                                backgroundColor: isSelected ? '#f0fdf4' : undefined,
                                cursor: 'pointer',
                                height: '100%',
                              }}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedRowKeys(selectedRowKeys.filter(k => k !== question.id));
                                } else {
                                  setSelectedRowKeys([...selectedRowKeys, question.id]);
                                }
                              }}
                              bodyStyle={{ padding: 12 }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ marginBottom: 8 }}>
                                    <Space size={4}>
                                      <Tag color={questionTypeInfo.color} style={{ margin: 0 }}>
                                        {question.question_code}
                                      </Tag>
                                      {getDifficultyTag(question.difficulty)}
                                      {isSelected && <Tag color="blue">已选</Tag>}
                                    </Space>
                                  </div>
                                  <div style={{ fontSize: 13, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.5', maxHeight: 39 }} title={question.content}>
                                    {question.content}
                                  </div>
                                  <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                                    分值: {question.suggested_score} │ 级别: {question.level}
                                  </div>
                                </div>
                                <div style={{ marginLeft: 12 }}>
                                  <Button
                                    size="small"
                                    type={isSelected ? 'primary' : 'default'}
                                    icon={isSelected ? <CheckCircleOutlined /> : <PlusOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickAddQuestion(question);
                                    }}
                                  >
                                    {isSelected ? '已选' : '添加'}
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                    {currentQuestions.length === 0 && (
                      <Empty description="该题型暂无可用题目" style={{ padding: '20px 0' }} />
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </Card>

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
                {(previewQuestion as any).image_url && (
                  <div style={{ marginTop: 8 }}>
                    <Image
                      src={(previewQuestion as any).image_url}
                      alt="题目图片"
                      style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 4 }}
                    />
                  </div>
                )}
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

      {/* Paper Preview Modal */}
      <Modal
        title={`试卷预览 - ${activity?.title || ''}`}
        open={paperPreviewModalVisible}
        onCancel={() => setPaperPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPaperPreviewModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="print"
            type="primary"
            onClick={() => {
              window.print();
            }}
          >
            打印
          </Button>,
        ]}
        width={900}
        style={{ top: 20 }}
      >
        <div style={{ padding: '20px', background: '#fff', minHeight: 600 }}>
          {/* Paper Header */}
          <div style={{ textAlign: 'center', marginBottom: 30, paddingBottom: 20, borderBottom: '2px solid #000' }}>
            <h1 style={{ fontSize: 24, marginBottom: 10 }}>{activity?.title || ''}</h1>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#666' }}>
              <span>科目：{activity?.subject || ''}</span>
              <span>年级：{activity?.grade || ''}</span>
              <span>总分：{selectedQuestions.reduce((sum, q) => sum + (q.score || 0), 0)} 分</span>
            </div>
          </div>

          {/* Questions by Type */}
          {selectedQuestions.length === 0 ? (
            <Empty description="试卷暂无题目" />
          ) : (
            <div>
              {['single', 'multiple', 'true_false', 'blank', 'essay', 'code', 'matching'].map((type) => {
                const typeQuestions = selectedQuestions.filter(q => q.type === type);
                if (typeQuestions.length === 0) return null;

                const typeNames: Record<string, string> = {
                  single: '一、单选题',
                  multiple: '二、多选题',
                  true_false: '三、判断题',
                  blank: '四、填空题',
                  essay: '五、问答题',
                  code: '六、编程题',
                  matching: '七、匹配题',
                };

                const typeInstructions: Record<string, string> = {
                  single: '（每题只有一个正确答案，请将正确答案的序号填在括号内）',
                  multiple: '（每题有多个正确答案，请将所有正确答案的序号填在括号内）',
                  true_false: '（正确的打"√"，错误的打"×"）',
                  blank: '（请将答案填在横线上）',
                  essay: '（请简要回答下列问题）',
                  code: '（请编写代码解决问题）',
                  matching: '（请将左右两侧相关的内容连接起来）',
                };

                const globalQuestionNum = { value: 1 };
                const getQuestionNum = () => globalQuestionNum.value++;

                return (
                  <div key={type} style={{ marginBottom: 30 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
                      {typeNames[type]} {typeInstructions[type] || ''}
                    </h3>
                    {typeQuestions.map((question, idx) => (
                      <div key={question.activity_question_id} style={{ marginBottom: 20 }}>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 'bold' }}>
                            {type === 'blank' ? `${idx + 1}.` : `${getQuestionNum()}.`}
                          </span>
                          <span style={{ marginLeft: 8 }}>{question.content}</span>
                          {question.score && (
                            <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                              （{question.score}分）
                            </span>
                          )}
                        </div>

                        {/* Options for single/multiple choice */}
                        {(question.type === 'single' || question.type === 'multiple') && (question as any).options && (
                          <div style={{ marginLeft: 30, marginTop: 8 }}>
                            {Array.isArray((question as any).options)
                              ? (question as any).options.map((opt: string, optIdx: number) => (
                                  <div key={optIdx} style={{ marginBottom: 4 }}>
                                    {String.fromCharCode(65 + optIdx)}. {opt}
                                  </div>
                                ))
                              : null}
                          </div>
                        )}

                        {/* Answer space for essay/blank/code */}
                        {(question.type === 'essay' || question.type === 'code' || question.type === 'blank') && (
                          <div style={{ marginLeft: 30, marginTop: 8 }}>
                            <div style={{ borderTop: '1px dashed #ccc', minHeight: question.type === 'code' ? 200 : 60 }}></div>
                          </div>
                        )}

                        {/* True/False options */}
                        {question.type === 'true_false' && (
                          <div style={{ marginLeft: 30, marginTop: 8 }}>
                            <span style={{ marginRight: 20 }}>（  ）正确</span>
                            <span>（  ）错误</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PaperGenerationPage;
