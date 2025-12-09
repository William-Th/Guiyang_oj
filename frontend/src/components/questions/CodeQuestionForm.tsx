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
      title: 'Delete Test Case',
      content: 'Are you sure you want to delete this test case?',
      onOk: () => {
        const newTestCases = [...testCases];
        newTestCases.splice(index, 1);
        setTestCases(newTestCases);
        message.success('Test case deleted');
      },
    });
  };

  const handleDuplicateTestCase = (testCase: TestCase) => {
    const newTestCase = {
      ...testCase,
      id: undefined,
      is_sample: false,
      description: testCase.description ? `${testCase.description} (copy)` : undefined,
    };
    setTestCases([...testCases, newTestCase]);
    message.success('Test case duplicated');
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
      message.success(editingIndex >= 0 ? 'Test case updated' : 'Test case added');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleSaveAllTestCases = async () => {
    if (!questionId) {
      message.warning('Please save the question first before adding test cases');
      return;
    }

    try {
      setLoading(true);
      if (onTestCasesSave) {
        await onTestCasesSave(testCases);
      } else {
        await testCaseAPI.bulkCreate(questionId, testCases, true);
      }
      message.success('Test cases saved successfully');
      await loadTestCases();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to save test cases');
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
      title: 'Input',
      dataIndex: 'input_data',
      key: 'input_data',
      ellipsis: true,
      width: 200,
      render: (text: string) => (
        <Text code style={{ maxWidth: 180 }}>
          {text ? (text.length > 30 ? text.substring(0, 30) + '...' : text) : '(empty)'}
        </Text>
      ),
    },
    {
      title: 'Expected Output',
      dataIndex: 'expected_output',
      key: 'expected_output',
      ellipsis: true,
      width: 200,
      render: (text: string) => (
        <Text code style={{ maxWidth: 180 }}>
          {text ? (text.length > 30 ? text.substring(0, 30) + '...' : text) : '(empty)'}
        </Text>
      ),
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      width: 70,
    },
    {
      title: 'Time(ms)',
      dataIndex: 'time_limit',
      key: 'time_limit',
      width: 80,
    },
    {
      title: 'Sample',
      dataIndex: 'is_sample',
      key: 'is_sample',
      width: 70,
      render: (isSample: boolean) => (isSample ? 'Yes' : 'No'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: TestCase, index: number) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditTestCase(record, index)}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="Duplicate">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicateTestCase(record)}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="Delete">
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
      <Card title="Programming Question Configuration" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label={
                <span>
                  Time Limit (ms)
                  <Tooltip title="Maximum execution time for each test case">
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
                  Memory Limit (MB)
                  <Tooltip title="Maximum memory usage allowed">
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
                  Judge Mode
                  <Tooltip title="Standard: exact output match; Special: custom judge logic">
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
                <Option value="standard">Standard</Option>
                <Option value="special">Special Judge</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Supported Languages">
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
              Code Template
              <Tooltip title="Initial code shown to students. Use comments to guide them.">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
        >
          <TextArea
            rows={6}
            value={config.code_template}
            onChange={(e) => handleConfigChange('code_template', e.target.value)}
            placeholder={`// Your code template here
#include <iostream>
using namespace std;

int main() {
    // Write your solution here
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
                Special Judge Code
                <Tooltip title="Custom judge code to compare output. Must return 0 for correct answer.">
                  <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                </Tooltip>
              </span>
            }
          >
            <TextArea
              rows={8}
              value={config.special_judge_code}
              onChange={(e) => handleConfigChange('special_judge_code', e.target.value)}
              placeholder="// Special judge code (C++)"
              style={{ fontFamily: 'monospace' }}
              disabled={readOnly}
            />
          </Form.Item>
        )}
      </Card>

      <Card
        title="Test Cases"
        extra={
          <Space>
            <Text type="secondary">
              Total: {testCases.length} | Samples: {sampleCount} | Total Score: {totalScore}
            </Text>
            {questionId && !readOnly && (
              <Button
                type="primary"
                onClick={handleSaveAllTestCases}
                loading={loading}
              >
                Save Test Cases
              </Button>
            )}
          </Space>
        }
      >
        {testCases.length === 0 && (
          <Alert
            message="No test cases yet"
            description="Add at least one test case. Mark some as 'Sample' to show them to students."
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
            Add Test Case
          </Button>
        )}
      </Card>

      {/* Test Case Edit Modal */}
      <Modal
        title={editingIndex >= 0 ? 'Edit Test Case' : 'Add Test Case'}
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
                label="Input Data"
                help="The input that will be provided to the program via stdin"
              >
                <TextArea
                  rows={6}
                  placeholder="Enter input data (can be empty)"
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expected_output"
                label="Expected Output"
                rules={[{ required: true, message: 'Expected output is required' }]}
                help="The exact output expected from the program"
              >
                <TextArea
                  rows={6}
                  placeholder="Enter expected output"
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="score"
                label="Score"
                initialValue={10}
                rules={[{ required: true, message: 'Score is required' }]}
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="time_limit"
                label="Time Limit (ms)"
                initialValue={config.time_limit}
              >
                <InputNumber min={100} max={10000} step={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="memory_limit"
                label="Memory Limit (MB)"
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
                  Show as sample test case
                  <Tooltip title="Sample test cases are visible to students before they submit">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="Description (optional)">
                <Input placeholder="e.g., Edge case with negative numbers" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default CodeQuestionForm;
