/**
 * Code Question Form Component
 * Form fields for programming question configuration (test cases, limits, etc.)
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Table,
  Modal,
  Checkbox,
  message,
  Tooltip,
  Alert,
  Row,
  Col,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { testCaseAPI, judgeAPI } from '../../services/api';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

export interface TestCase {
  id?: number;
  case_number?: number;
  input_data: string;
  expected_output: string;
  score: number;
  time_limit: number;
  memory_limit: number;
  is_sample: boolean;
  description?: string;
}

export interface CodeQuestionConfig {
  code_template?: string;
  time_limit: number;
  memory_limit: number;
  judge_mode: 'standard' | 'special';
  special_judge_code?: string;
  supported_languages: string[];
  testCases: TestCase[];
}

interface CodeQuestionFormProps {
  questionId?: number;
  initialConfig?: Partial<CodeQuestionConfig>;
  onChange?: (config: CodeQuestionConfig) => void;
  onTestCasesSave?: (testCases: TestCase[]) => Promise<void>;
  readOnly?: boolean;
}

const DEFAULT_CONFIG: CodeQuestionConfig = {
  time_limit: 1000,
  memory_limit: 256,
  judge_mode: 'standard',
  supported_languages: ['cpp', 'c'],
  testCases: [],
};

const CodeQuestionForm: React.FC<CodeQuestionFormProps> = ({
  questionId,
  initialConfig,
  onChange,
  onTestCasesSave,
  readOnly = false,
}) => {
  const [config, setConfig] = useState<CodeQuestionConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [testCases, setTestCases] = useState<TestCase[]>(initialConfig?.testCases || []);
  const [supportedLanguages, setSupportedLanguages] = useState<Array<{ id: string; name: string }>>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Fetch supported languages on mount
  useEffect(() => {
    judgeAPI.getLanguages().then((res) => {
      if (res.success && res.data) {
        setSupportedLanguages(res.data);
      }
    }).catch(console.error);
  }, []);

  // Load existing test cases if questionId provided
  useEffect(() => {
    if (questionId) {
      loadTestCases();
    }
  }, [questionId]);

  const loadTestCases = async () => {
    if (!questionId) return;
    try {
      setLoading(true);
      const response = await testCaseAPI.getTestCases(questionId);
      if (response.success) {
        setTestCases(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load test cases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Notify parent of config changes
  useEffect(() => {
    const fullConfig = { ...config, testCases };
    onChange?.(fullConfig);
  }, [config, testCases]);

  const handleConfigChange = (field: keyof CodeQuestionConfig, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTestCase = () => {
    setEditingIndex(-1);
    form.resetFields();
    form.setFieldsValue({
      input_data: '',
      expected_output: '',
      score: 10,
      time_limit: config.time_limit,
      memory_limit: config.memory_limit,
      is_sample: false,
    });
    setEditModalVisible(true);
  };

  const handleEditTestCase = (testCase: TestCase, index: number) => {
    setEditingIndex(index);
    form.setFieldsValue(testCase);
    setEditModalVisible(true);
  };

  const handleDeleteTestCase = (index: number) => {
    Modal.confirm({
      title: '删除测试用例',
      content: '确定要删除这个测试用例吗？',
      onOk: () => {
        const newTestCases = [...testCases];
        newTestCases.splice(index, 1);
        setTestCases(newTestCases);
        message.success('测试用例已删除');
      },
    });
  };

  const handleDuplicateTestCase = (testCase: TestCase) => {
    const newTestCase = {
      ...testCase,
      id: undefined,
      is_sample: false,
      description: testCase.description ? `${testCase.description} (副本)` : undefined,
    };
    setTestCases([...testCases, newTestCase]);
    message.success('测试用例已复制');
  };

  const handleSaveTestCase = async () => {
    try {
      const values = await form.validateFields();
      const testCase: TestCase = {
        ...values,
        input_data: values.input_data || '',
        time_limit: values.time_limit || config.time_limit,
        memory_limit: values.memory_limit || config.memory_limit,
      };

      if (editingIndex >= 0) {
        // Update existing
        const newTestCases = [...testCases];
        newTestCases[editingIndex] = { ...newTestCases[editingIndex], ...testCase };
        setTestCases(newTestCases);
      } else {
        // Add new
        setTestCases([...testCases, testCase]);
      }

      setEditModalVisible(false);
      form.resetFields();
      message.success(editingIndex >= 0 ? '测试用例已更新' : '测试用例已添加');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleSaveAllTestCases = async () => {
    if (!questionId) {
      message.warning('请先保存题目，然后再添加测试用例');
      return;
    }

    try {
      setLoading(true);
      if (onTestCasesSave) {
        await onTestCasesSave(testCases);
      } else {
        await testCaseAPI.bulkCreate(questionId, testCases, true);
      }
      message.success('测试用例保存成功');
      await loadTestCases();
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存测试用例失败');
    } finally {
      setLoading(false);
    }
  };

  const testCaseColumns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '输入',
      dataIndex: 'input_data',
      key: 'input_data',
      ellipsis: true,
      width: 200,
      render: (text: string) => (
        <Text code style={{ maxWidth: 180 }}>
          {text ? (text.length > 30 ? text.substring(0, 30) + '...' : text) : '(空)'}
        </Text>
      ),
    },
    {
      title: '期望输出',
      dataIndex: 'expected_output',
      key: 'expected_output',
      ellipsis: true,
      width: 200,
      render: (text: string) => (
        <Text code style={{ maxWidth: 180 }}>
          {text ? (text.length > 30 ? text.substring(0, 30) + '...' : text) : '(空)'}
        </Text>
      ),
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 70,
    },
    {
      title: '时限(ms)',
      dataIndex: 'time_limit',
      key: 'time_limit',
      width: 80,
    },
    {
      title: '样例',
      dataIndex: 'is_sample',
      key: 'is_sample',
      width: 70,
      render: (isSample: boolean) => (isSample ? '是' : '否'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: TestCase, index: number) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditTestCase(record, index)}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicateTestCase(record)}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteTestCase(index)}
              disabled={readOnly}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const totalScore = testCases.reduce((sum, tc) => sum + (tc.score || 0), 0);
  const sampleCount = testCases.filter((tc) => tc.is_sample).length;

  return (
    <div className="code-question-form">
      <Card title="编程题配置" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label={
                <span>
                  时间限制 (ms)
                  <Tooltip title="每个测试用例的最大执行时间">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber
                min={100}
                max={10000}
                step={100}
                value={config.time_limit}
                onChange={(v) => handleConfigChange('time_limit', v || 1000)}
                style={{ width: '100%' }}
                disabled={readOnly}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={
                <span>
                  内存限制 (MB)
                  <Tooltip title="允许的最大内存使用量">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber
                min={16}
                max={512}
                step={16}
                value={config.memory_limit}
                onChange={(v) => handleConfigChange('memory_limit', v || 256)}
                style={{ width: '100%' }}
                disabled={readOnly}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={
                <span>
                  判题模式
                  <Tooltip title="标准模式：精确匹配输出；特殊判题：自定义判题逻辑">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
            >
              <Select
                value={config.judge_mode}
                onChange={(v) => handleConfigChange('judge_mode', v)}
                disabled={readOnly}
              >
                <Option value="standard">标准判题</Option>
                <Option value="special">特殊判题</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="支持语言">
          <Select
            mode="multiple"
            value={config.supported_languages}
            onChange={(v) => handleConfigChange('supported_languages', v)}
            style={{ width: '100%' }}
            disabled={readOnly}
          >
            {supportedLanguages.map((lang) => (
              <Option key={lang.id} value={lang.id}>
                {lang.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={
            <span>
              代码模板
              <Tooltip title="展示给学生的初始代码，可用注释引导他们">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
        >
          <TextArea
            rows={6}
            value={config.code_template}
            onChange={(e) => handleConfigChange('code_template', e.target.value)}
            placeholder={`// 在此输入代码模板
#include <iostream>
using namespace std;

int main() {
    // 在此编写解决方案
    return 0;
}`}
            style={{ fontFamily: 'monospace' }}
            disabled={readOnly}
          />
        </Form.Item>

        {config.judge_mode === 'special' && (
          <Form.Item
            label={
              <span>
                特殊判题代码
                <Tooltip title="自定义判题代码，用于比较输出结果。正确答案必须返回 0。">
                  <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </span>
            }
          >
            <TextArea
              rows={8}
              value={config.special_judge_code}
              onChange={(e) => handleConfigChange('special_judge_code', e.target.value)}
              placeholder="// 特殊判题代码 (C++)"
              style={{ fontFamily: 'monospace' }}
              disabled={readOnly}
            />
          </Form.Item>
        )}
      </Card>

      <Card
        title="测试用例"
        extra={
          <Space>
            <Text type="secondary">
              共 {testCases.length} 个 | 样例: {sampleCount} | 总分: {totalScore}
            </Text>
            {questionId && !readOnly && (
              <Button
                type="primary"
                onClick={handleSaveAllTestCases}
                loading={loading}
              >
                保存测试用例
              </Button>
            )}
          </Space>
        }
      >
        {testCases.length === 0 && (
          <Alert
            message="暂无测试用例"
            description="请添加至少一个测试用例。标记为样例的测试用例会展示给学生。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Table
          columns={testCaseColumns}
          dataSource={testCases}
          rowKey={(_, index) => `testcase-${index}`}
          pagination={false}
          size="small"
          loading={loading}
        />

        {!readOnly && (
          <Button
            type="dashed"
            onClick={handleAddTestCase}
            block
            icon={<PlusOutlined />}
            style={{ marginTop: 16 }}
          >
            添加测试用例
          </Button>
        )}
      </Card>

      {/* Test Case Edit Modal */}
      <Modal
        title={editingIndex >= 0 ? '编辑测试用例' : '添加测试用例'}
        open={editModalVisible}
        onOk={handleSaveTestCase}
        onCancel={() => setEditModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="input_data"
                label="输入数据"
                help="程序通过标准输入接收的数据"
              >
                <TextArea
                  rows={6}
                  placeholder="输入数据（可以为空）"
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expected_output"
                label="期望输出"
                rules={[{ required: true, message: '期望输出不能为空' }]}
                help="程序期望的精确输出"
              >
                <TextArea
                  rows={6}
                  placeholder="请输入期望输出"
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="score"
                label="分值"
                initialValue={10}
                rules={[{ required: true, message: '分值不能为空' }]}
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="time_limit"
                label="时间限制 (ms)"
                initialValue={config.time_limit}
              >
                <InputNumber min={100} max={10000} step={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="memory_limit"
                label="内存限制 (MB)"
                initialValue={config.memory_limit}
              >
                <InputNumber min={16} max={512} step={16} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_sample" valuePropName="checked" initialValue={false}>
                <Checkbox>
                  显示为样例测试用例
                  <Tooltip title="样例测试用例会在学生提交前展示给他们">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="描述（可选）">
                <Input placeholder="例如：负数边界情况" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default CodeQuestionForm;
