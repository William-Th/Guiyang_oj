import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  FileExcelOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { questionBankApi } from '../../services/api';
import { SUBJECTS, getGradesBySubject, getAllGrades } from '../../config/subjects';
import { getAllDistricts, District } from '../../config/districts';

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
  const user = useSelector((state: RootState) => state.auth.user);

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  // 防抖定时器 ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [filters, setFilters] = useState<{
    subject?: string;
    grade?: string;
    difficulty?: string;
    type?: string;
    scopes?: string[];
    district_code?: string;  // 🆕 区县筛选
  }>({});
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  // 🔧 固定的题库范围选项 - 所有教师端用户看到的选项相同
  const availableScopes = ['assessment', 'practice_municipal', 'practice_district', 'practice_school'];
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string | undefined>();  // 🆕 选中的区县
  const [districts] = useState<District[]>(getAllDistricts());  // 🆕 区县列表
  const [exportModalVisible, setExportModalVisible] = useState(false);  // 🆕 导出弹窗
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');  // 🆕 导出格式
  const [exportLoading, setExportLoading] = useState(false);  // 🆕 导出加载状态

  // 🆕 权限判断：是否可以使用区县筛选
  const canSelectDistrict = user?.role === 'system_admin' || user?.role === 'municipal_admin';

  useEffect(() => {
    // loadAvailableScopes(); // 🔧 不再从后端加载，使用固定选项
    // 从 localStorage 恢复上次选择的 scopes
    const savedScopes = localStorage.getItem('selectedScopes');
    if (savedScopes) {
      try {
        const scopes = JSON.parse(savedScopes);
        // 🔧 确保加载的数据是数组
        if (Array.isArray(scopes)) {
          setSelectedScopes(scopes);
          setFilters(prev => ({ ...prev, scopes }));
        } else {
          console.warn('Invalid saved scopes format, clearing localStorage');
          localStorage.removeItem('selectedScopes');
        }
      } catch (error) {
        console.error('Failed to parse saved scopes:', error);
        localStorage.removeItem('selectedScopes');
      }
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [currentPage, pageSize, filters]);

  // 🔧 loadAvailableScopes 函数已删除 - 现在使用固定的 availableScopes 常量

  // 使用 useCallback 创建稳定的 loadQuestions 函数
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * pageSize;

      // 🆕 准备API参数，包含district_code（如果有权限且已选择）
      const apiParams: any = {
        ...filters,
        limit: pageSize,
        offset,
      };

      // 🆕 只有系统/市级管理员才能传递district_code参数
      if (canSelectDistrict && filters.district_code) {
        apiParams.district_code = filters.district_code;
      }

      const response = await questionBankApi.getAllQuestions(apiParams);

      setQuestions(response.data || []);
      setTotal(response.meta?.total || response.data?.length || 0);
    } catch (error: any) {
      console.error('Load questions error:', error);
      message.error(error.response?.data?.error || '加载题目失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, canSelectDistrict]);

  // 🔧 防抖的筛选条件更新函数 - 避免快速切换时多次API调用
  const updateFiltersWithReset = useCallback((newFilters: Partial<typeof filters>) => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 重置到第一页
    setCurrentPage(1);

    // 立即更新状态（热更新）
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

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

  // 🆕 导出题目功能
  const handleExport = async (exportCurrentFilters: boolean = true) => {
    try {
      setExportLoading(true);

      // 准备导出参数
      const exportFilters: {
        subject?: string;
        grade?: string;
        difficulty?: string;
        type?: string;
        scopes?: string[];
        district_code?: string;
        format: 'excel' | 'csv';
      } = {
        format: exportFormat,
      };

      // 如果导出当前筛选结果，则使用当前筛选条件
      if (exportCurrentFilters) {
        if (filters.subject) exportFilters.subject = filters.subject;
        if (filters.grade) exportFilters.grade = filters.grade;
        if (filters.difficulty) exportFilters.difficulty = filters.difficulty;
        if (filters.type) exportFilters.type = filters.type;
        if (selectedScopes && selectedScopes.length > 0) exportFilters.scopes = selectedScopes;
        if (canSelectDistrict && filters.district_code) exportFilters.district_code = filters.district_code;
      }

      const response = await questionBankApi.exportQuestions(exportFilters);

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = exportFormat === 'excel'
        ? `题目导出_${timestamp}.xlsx`
        : `题目导出_${timestamp}.csv`;

      // 触发下载
      const url = window.URL.createObjectURL(new Blob([response.data], {
        type: exportFormat === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8'
      }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success(`导出成功！共导出文件：${fileName}`);
      setExportModalVisible(false);
    } catch (error: any) {
      console.error('Export error:', error);
      if (error.response?.status === 404) {
        message.warning('没有符合条件的题目可导出');
      } else {
        message.error(error.response?.data?.error || '导出失败');
      }
    } finally {
      setExportLoading(false);
    }
  };

  const handleScopeChange = (scopes: string[]) => {
    setSelectedScopes(scopes);
    // 🔧 题库范围变化时重置页码
    updateFiltersWithReset({ scopes });
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
      render: (scopes: string | string[]) => {
        // 🔧 处理 scopes 可能是字符串或数组的情况
        const scopeArray = Array.isArray(scopes)
          ? scopes
          : (typeof scopes === 'string' ? [scopes] : []);
        if (scopeArray.length === 0) return '-';
        return (
          <Space size="small" wrap>
            {scopeArray.map((scope) => {
              const config = getScopeText(scope);
              return <Tag key={scope} color={config.color}>{config.text}</Tag>;
            })}
          </Space>
        );
      },
    },
    // 🆕 区县信息列 - 仅在筛选区级题库时显示
    ...((selectedScopes || []).includes('practice_district') ? [{
      title: '所属区县',
      dataIndex: 'district_name',
      key: 'district_name',
      width: 120,
      render: (districtName: string, record: Question) => {
        // 如果有district_name字段，直接显示
        if (districtName) {
          return <Tag color="cyan">{districtName}</Tag>;
        }
        // 否则从scope中提取区县信息
        // 🔧 处理 scope 可能是字符串或数组的情况
        const scopeValue = record.scope;
        const scopeArray = Array.isArray(scopeValue)
          ? scopeValue
          : (typeof scopeValue === 'string' ? [scopeValue] : []);
        const districtScopes = scopeArray.filter(s => s.startsWith('practice_district_'));
        if (districtScopes.length > 0) {
          return (
            <Space size="small" wrap>
              {districtScopes.map(scope => {
                const code = scope.replace('practice_district_', '');
                const district = districts.find(d => d.code === code);
                return district ? (
                  <Tag key={scope} color="cyan">{district.name}</Tag>
                ) : (
                  <Tag key={scope} color="default">{code}</Tag>
                );
              })}
            </Space>
          );
        }
        return '-';
      },
    }] : []),
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
            {/* 草稿箱功能暂未实现，已移除 */}
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => setExportModalVisible(true)}
            >
              导出题目
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
              {(availableScopes || []).map((scope) => {
                const config = getScopeText(scope);
                return (
                  <Select.Option key={scope} value={scope}>
                    <Tag color={config.color}>{config.text}</Tag>
                  </Select.Option>
                );
              })}
            </Select>

            {/* 🆕 区县筛选 - 仅对系统管理员和市级管理员显示 */}
            {canSelectDistrict && (selectedScopes || []).includes('practice_district') && (
              <Select
                placeholder="选择区县"
                style={{ width: 150 }}
                allowClear
                value={selectedDistrictCode}
                onChange={(value) => {
                  setSelectedDistrictCode(value);
                  // 🔧 区县变化时重置页码
                  updateFiltersWithReset({ district_code: value });
                }}
              >
                {(districts || []).map((district) => (
                  <Select.Option key={district.code} value={district.code}>
                    {district.name}
                  </Select.Option>
                ))}
              </Select>
            )}
            <Select
              placeholder="选择科目"
              style={{ width: 120 }}
              allowClear
              onChange={(value) => {
                // 🔧 科目变化时清空年级并重置页码
                updateFiltersWithReset({ subject: value, grade: undefined });
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
              onChange={(value) => {
                // 🔧 年级变化时重置页码
                updateFiltersWithReset({ grade: value });
              }}
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
              onChange={(value) => {
                // 🔧 难度变化时重置页码
                updateFiltersWithReset({ difficulty: value });
              }}
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
              onChange={(value) => {
                // 🔧 题型变化时重置页码
                updateFiltersWithReset({ type: value });
              }}
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
                // 🔧 重置所有筛选条件
                setSearchTerm('');
                setFilters({});
                setSelectedScopes([]);
                setSelectedDistrictCode(undefined);
                setCurrentPage(1);
                localStorage.removeItem('selectedScopes');
              }}
            >
              重置筛选
            </Button>
          </div>

          {/* Selected Scopes Display */}
          {(selectedScopes || []).length > 0 && (
            <div style={{ padding: '8px 12px', background: '#f0f2f5', borderRadius: 4 }}>
              <Space size="small">
                <span style={{ color: '#666', fontWeight: 500 }}>当前筛选范围：</span>
                {(selectedScopes || []).map((scope) => {
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

      {/* 🆕 Export Modal */}
      <Modal
        title="导出题目"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="exportAll"
            onClick={() => handleExport(false)}
            loading={exportLoading}
          >
            导出全部题目
          </Button>,
          <Button
            key="exportFiltered"
            type="primary"
            onClick={() => handleExport(true)}
            loading={exportLoading}
          >
            导出当前筛选结果
          </Button>,
        ]}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 导出格式选择 */}
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>选择导出格式：</div>
            <Select
              style={{ width: '100%' }}
              value={exportFormat}
              onChange={setExportFormat}
            >
              <Select.Option value="excel">
                <FileExcelOutlined style={{ color: '#1dbf73', marginRight: 8 }} />
                Excel (.xlsx)
              </Select.Option>
              <Select.Option value="csv">
                <FileTextOutlined style={{ color: '#666', marginRight: 8 }} />
                CSV (.csv)
              </Select.Option>
            </Select>
          </div>

          {/* 当前筛选条件显示 */}
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>当前筛选条件：</div>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: 4 }}>
              {selectedScopes && selectedScopes.length > 0 ? (
                <Space size="small" wrap style={{ marginBottom: 8 }}>
                  <span>题库范围：</span>
                  {selectedScopes.map(scope => {
                    const config = getScopeText(scope);
                    return (
                      <Tag key={scope} color={config.color}>{config.text}</Tag>
                    );
                  })}
                </Space>
              ) : null}
              {filters.subject && (
                <div style={{ marginBottom: 4 }}>
                  <Tag color="blue">科目：{filters.subject}</Tag>
                </div>
              )}
              {filters.grade && (
                <div style={{ marginBottom: 4 }}>
                  <Tag color="green">年级：{filters.grade}</Tag>
                </div>
              )}
              {filters.difficulty && (
                <div style={{ marginBottom: 4 }}>
                  <Tag color="orange">难度：{getDifficultyText(filters.difficulty)}</Tag>
                </div>
              )}
              {filters.type && (
                <div style={{ marginBottom: 4 }}>
                  <Tag color="purple">题型：{getQuestionTypeText(filters.type)}</Tag>
                </div>
              )}
              {!selectedScopes?.length && !filters.subject && !filters.grade && !filters.difficulty && !filters.type && (
                <span style={{ color: '#999' }}>无筛选条件</span>
              )}
            </div>
          </div>

          {/* 说明 */}
          <div style={{ color: '#666', fontSize: 13 }}>
            <div>• <strong>导出全部题目</strong>：导出您有权限查看的所有题目</div>
            <div>• <strong>导出当前筛选结果</strong>：仅导出符合当前筛选条件的题目</div>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default QuestionBankPage;
