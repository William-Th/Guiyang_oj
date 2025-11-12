import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Input,
  Select,
  Upload,
  Spin,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  EyeOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { questionBankApi } from '../../services/api';
import { SUBJECTS, getGradesBySubject, getAllGrades } from '../../config/subjects';

interface Question {
  id: number;
  type: string;
  subject: string;
  grade: string;
  level?: string;
  content: string;
  options?: string[];
  correct_answer: any;
  score: number;
  suggested_score?: number;
  difficulty: string;
  explanation?: string;
  tags?: string[];
  scope?: string[];       // 题库范围（如["assessment", "practice_municipal"]）
  usage_count: number;
  success_rate?: number;
  created_at: string;
  creator_name?: string;  // 出题人姓名
  reviewer_name?: string; // 审核人姓名
}

const QuestionBankPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    subject?: string;
    grade?: string;
    difficulty?: string;
    type?: string;
    scopes?: string[];
  }>({});
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [availableScopes, setAvailableScopes] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableScopes();
    // 从 localStorage 恢复上次选择的 scopes
    const savedScopes = localStorage.getItem('selectedScopes');
    if (savedScopes) {
      try {
        const scopes = JSON.parse(savedScopes);
        setSelectedScopes(scopes);
        setFilters(prev => ({ ...prev, scopes }));
      } catch (error) {
        console.error('Failed to parse saved scopes:', error);
      }
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [currentPage, pageSize, filters]);

  const loadAvailableScopes = async () => {
    try {
      const response = await questionBankApi.getMyScopes();
      setAvailableScopes(response.data || []);
    } catch (error: any) {
      console.error('Load available scopes error:', error);
      // 如果加载失败，使用默认的 scopes
      setAvailableScopes(['assessment', 'practice_municipal', 'practice_district', 'practice_school']);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * pageSize;
      const response = await questionBankApi.getAllQuestions({
        ...filters,
        limit: pageSize,
        offset,
      });

      setQuestions(response.data || []);
      setTotal(response.meta?.total || response.data?.length || 0);
    } catch (error: any) {
      console.error('Load questions error:', error);
      message.error(error.response?.data?.error || '加载题目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadQuestions();
      return;
    }

    try {
      setLoading(true);
      const response = await questionBankApi.searchQuestions(searchTerm, {
        subject: filters.subject,
        grade: filters.grade,
      });
      setQuestions(response.data || []);
      setTotal(response.data?.length || 0);
    } catch (error: any) {
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await questionBankApi.deleteQuestion(id);
      message.success('删除成功');
      loadQuestions();
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleImport = async (file: File) => {
    try {
      setLoading(true);
      const response = await questionBankApi.importQuestions(file);

      if (response.success) {
        message.success(
          `导入完成！成功: ${response.data.successful}, 失败: ${response.data.failed}`
        );
        if (response.data.errors.length > 0) {
          Modal.info({
            title: '导入错误详情',
            content: (
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                {response.data.errors.map((err: any, idx: number) => (
                  <p key={idx}>
                    第 {err.row} 行: {err.error}
                  </p>
                ))}
              </div>
            ),
            width: 600,
          });
        }
        loadQuestions();
      }
    } catch (error: any) {
      message.error('导入失败');
    } finally {
      setLoading(false);
    }
    return false; // Prevent auto upload
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await questionBankApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'question_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      message.error('下载模板失败');
    }
  };

  const handleScopeChange = (scopes: string[]) => {
    setSelectedScopes(scopes);
    setFilters({ ...filters, scopes });
    // 保存到 localStorage
    localStorage.setItem('selectedScopes', JSON.stringify(scopes));
  };

  const getScopeText = (scope: string): { text: string; color: string } => {
    const scopes: Record<string, { text: string; color: string }> = {
      assessment: { text: '测评题库', color: 'orange' },
      practice_municipal: { text: '市级练习', color: 'blue' },
      practice_district: { text: '区级练习', color: 'cyan' },
      practice_school: { text: '校级题库', color: 'green' },
    };
    // Handle dynamic scopes like practice_district_nanming
    if (scope.startsWith('practice_district_')) {
      return { text: `区级练习 (${scope.replace('practice_district_', '')})`, color: 'cyan' };
    }
    if (scope.startsWith('practice_school_')) {
      return { text: `校级题库 (${scope.replace('practice_school_', '')})`, color: 'green' };
    }
    return scopes[scope] || { text: scope, color: 'default' };
  };

  const getQuestionTypeText = (type: string) => {
    const types: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      blank: '填空题',
      true_false: '判断题',
      essay: '问答题',
      code: '编程题',
      matching: '匹配题',
    };
    return types[type] || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'green',
      medium: 'orange',
      hard: 'red',
    };
    return colors[difficulty] || 'default';
  };

  const getDifficultyText = (difficulty: string) => {
    const texts: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    };
    return texts[difficulty] || difficulty;
  };

  const getLevelColor = (level: string) => {
    const levelNum = parseInt(level.replace('L', ''));
    if (levelNum <= 3) return 'green';
    if (levelNum <= 6) return 'blue';
    return 'red';
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '题目编码',
      dataIndex: 'question_code',
      key: 'question_code',
      width: 130,
      render: (code: string) => (
        <Tag color="cyan" style={{ fontFamily: 'monospace' }}>{code || '-'}</Tag>
      ),
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (type: string) => (
        <Tag color="blue">{getQuestionTypeText(type)}</Tag>
      ),
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 80,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => level ? (
        <Tag color={getLevelColor(level)}>{level}</Tag>
      ) : '-',
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text.length > 50 ? text.substring(0, 50) + '...' : text}</span>
        </Tooltip>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty: string) => (
        <Tag color={getDifficultyColor(difficulty)}>
          {getDifficultyText(difficulty)}
        </Tag>
      ),
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 60,
    },
    {
      title: '使用次数',
      dataIndex: 'usage_count',
      key: 'usage_count',
      width: 90,
    },
    {
      title: '出题人',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 100,
      render: (name: string) => name || '-',
    },
    {
      title: '审核人',
      dataIndex: 'reviewer_name',
      key: 'reviewer_name',
      width: 100,
      render: (name: string) => name || '-',
    },
    {
      title: '题库范围',
      dataIndex: 'scope',
      key: 'scope',
      width: 200,
      render: (scopes: string[]) => {
        if (!scopes || scopes.length === 0) return '-';
        return (
          <Space size="small" wrap>
            {scopes.map((scope) => {
              const config = getScopeText(scope);
              return <Tag key={scope} color={config.color}>{config.text}</Tag>;
            })}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Question) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setPreviewQuestion(record);
                setPreviewVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/teacher/question-bank/edit/${record.id}`)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这道题目吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="题库管理"
        extra={
          <Space>
            <Button
              icon={<InboxOutlined />}
              onClick={() => navigate('/teacher/question-bank/drafts')}
            >
              草稿箱
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              下载模板
            </Button>
            <Upload
              beforeUpload={handleImport}
              showUploadList={false}
              accept=".csv,.xlsx,.xls"
            >
              <Button icon={<UploadOutlined />}>批量导入</Button>
            </Upload>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/teacher/question-bank/create')}
            >
              新建题目
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Search Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontWeight: 500, color: '#666' }}>搜索：</span>
            <Input.Search
              placeholder="输入题目内容或题目编码进行搜索"
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: 400 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500, color: '#666' }}>筛选：</span>
            <Select
              mode="multiple"
              placeholder="选择题库范围"
              style={{ width: 280 }}
              value={selectedScopes}
              onChange={handleScopeChange}
              maxTagCount="responsive"
              allowClear
            >
              {availableScopes.map((scope) => {
                const config = getScopeText(scope);
                return (
                  <Select.Option key={scope} value={scope}>
                    <Tag color={config.color}>{config.text}</Tag>
                  </Select.Option>
                );
              })}
            </Select>
            <Select
              placeholder="选择科目"
              style={{ width: 120 }}
              allowClear
              onChange={(value) => {
                setFilters({ ...filters, subject: value, grade: undefined });
              }}
              value={filters.subject}
            >
              {SUBJECTS.map(subject => (
                <Select.Option key={subject.value} value={subject.value}>
                  {subject.label}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder={filters.subject ? '选择年级' : '请先选择科目'}
              style={{ width: 120 }}
              allowClear
              onChange={(value) => setFilters({ ...filters, grade: value })}
              value={filters.grade}
              disabled={!filters.subject}
            >
              {filters.subject
                ? getGradesBySubject(filters.subject).map(grade => (
                    <Select.Option key={grade.value} value={grade.value}>
                      {grade.label}
                    </Select.Option>
                  ))
                : getAllGrades().map(grade => (
                    <Select.Option key={grade.value} value={grade.value}>
                      {grade.label}
                    </Select.Option>
                  ))
              }
            </Select>
            <Select
              placeholder="选择难度"
              style={{ width: 120 }}
              allowClear
              onChange={(value) => setFilters({ ...filters, difficulty: value })}
              value={filters.difficulty}
            >
              <Select.Option value="easy">简单</Select.Option>
              <Select.Option value="medium">中等</Select.Option>
              <Select.Option value="hard">困难</Select.Option>
            </Select>
            <Select
              placeholder="选择题型"
              style={{ width: 120 }}
              allowClear
              onChange={(value) => setFilters({ ...filters, type: value })}
              value={filters.type}
            >
              <Select.Option value="single">单选题</Select.Option>
              <Select.Option value="multiple">多选题</Select.Option>
              <Select.Option value="blank">填空题</Select.Option>
              <Select.Option value="true_false">判断题</Select.Option>
              <Select.Option value="essay">问答题</Select.Option>
              <Select.Option value="code">编程题</Select.Option>
            </Select>
            <Button
              onClick={() => {
                setSearchTerm('');
                setFilters({});
                setSelectedScopes([]);
                setCurrentPage(1);
                localStorage.removeItem('selectedScopes');
              }}
            >
              重置筛选
            </Button>
          </div>

          {/* Selected Scopes Display */}
          {selectedScopes.length > 0 && (
            <div style={{ padding: '8px 12px', background: '#f0f2f5', borderRadius: 4 }}>
              <Space size="small">
                <span style={{ color: '#666', fontWeight: 500 }}>当前筛选范围：</span>
                {selectedScopes.map((scope) => {
                  const config = getScopeText(scope);
                  return (
                    <Tag key={scope} color={config.color}>
                      {config.text}
                    </Tag>
                  );
                })}
              </Space>
            </div>
          )}

          {/* Table */}
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={questions}
              rowKey="id"
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 道题目`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                },
              }}
            />
          </Spin>
        </Space>
      </Card>

      {/* Preview Modal */}
      <Modal
        title="题目预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {previewQuestion && (
          <div>
            <p>
              <strong>题型：</strong>
              <Tag color="blue">{getQuestionTypeText(previewQuestion.type)}</Tag>
            </p>
            <p>
              <strong>科目：</strong>{previewQuestion.subject}
              <strong style={{ marginLeft: 20 }}>年级：</strong>{previewQuestion.grade}
              {previewQuestion.level && (
                <>
                  <strong style={{ marginLeft: 20 }}>级别：</strong>
                  <Tag color={getLevelColor(previewQuestion.level)}>
                    {previewQuestion.level}
                  </Tag>
                </>
              )}
              <strong style={{ marginLeft: 20 }}>难度：</strong>
              <Tag color={getDifficultyColor(previewQuestion.difficulty)}>
                {getDifficultyText(previewQuestion.difficulty)}
              </Tag>
            </p>
            <p>
              <strong>题目内容：</strong>
            </p>
            <p style={{ fontSize: '16px', marginLeft: 20 }}>{previewQuestion.content}</p>

            {previewQuestion.options && previewQuestion.options.length > 0 && (
              <>
                <p>
                  <strong>选项：</strong>
                </p>
                {previewQuestion.options.map((option, idx) => (
                  <p key={idx} style={{ marginLeft: 20 }}>
                    {String.fromCharCode(65 + idx)}. {option}
                  </p>
                ))}
              </>
            )}

            <p>
              <strong>正确答案：</strong>
              <Tag color="green" style={{ marginLeft: 10 }}>
                {typeof previewQuestion.correct_answer === 'object'
                  ? JSON.stringify(previewQuestion.correct_answer)
                  : previewQuestion.correct_answer}
              </Tag>
            </p>

            {previewQuestion.explanation && (
              <>
                <p>
                  <strong>解析：</strong>
                </p>
                <p style={{ marginLeft: 20, color: '#666' }}>
                  {previewQuestion.explanation}
                </p>
              </>
            )}

            <p>
              <strong>分值：</strong>{previewQuestion.score} 分
              <strong style={{ marginLeft: 20 }}>使用次数：</strong>
              {previewQuestion.usage_count} 次
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuestionBankPage;
