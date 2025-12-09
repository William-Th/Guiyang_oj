/**
 * Code Question Component - Programming question interface with code editor and judge
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Select,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  message,
  Tabs,
  Input,
  Spin,
  Collapse,
  Tag,
} from 'antd';
import {
  PlayCircleOutlined,
  SendOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import CodeEditor, { CODE_TEMPLATES } from '../CodeEditor';
import JudgeResult, { JudgeResultData } from '../JudgeResult';
import { judgeAPI } from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;

export interface SampleTestCase {
  caseNumber: number;
  input: string;
  expectedOutput: string;
  description?: string;
}

export interface CodeQuestionData {
  id: number;
  content: string;
  codeTemplate?: string;
  timeLimit?: number;
  memoryLimit?: number;
  supportedLanguages?: string[];
  sampleTestCases?: SampleTestCase[];
}

interface CodeQuestionProps {
  question: CodeQuestionData;
  activityId?: number;
  onSubmitSuccess?: (submissionId: number) => void;
  readOnly?: boolean;
}

const CodeQuestion: React.FC<CodeQuestionProps> = ({
  question,
  activityId,
  onSubmitSuccess,
  readOnly = false,
}) => {
  // State
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('cpp');
  const [customInput, setCustomInput] = useState<string>('');
  const [runResult, setRunResult] = useState<JudgeResultData | null>(null);
  const [submitResult, setSubmitResult] = useState<JudgeResultData | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState<Array<{ id: string; name: string }>>([]);
  const [sampleCases, setSampleCases] = useState<SampleTestCase[]>([]);
  const [activeTab, setActiveTab] = useState('run');

  // Initialize code and fetch data
  useEffect(() => {
    // Set initial code from template or question
    if (question.codeTemplate) {
      setCode(question.codeTemplate);
    } else if (CODE_TEMPLATES[language]) {
      setCode(CODE_TEMPLATES[language]);
    }

    // Fetch supported languages
    judgeAPI.getLanguages().then((res) => {
      if (res.success && res.data) {
        setSupportedLanguages(res.data);
      }
    }).catch(console.error);

    // Fetch sample test cases
    judgeAPI.getSampleTestCases(question.id).then((res) => {
      if (res.success && res.data) {
        setSampleCases(res.data);
        // Set first sample as custom input
        if (res.data.length > 0) {
          setCustomInput(res.data[0].input || '');
        }
      }
    }).catch(console.error);
  }, [question.id, question.codeTemplate, language]);

  // Handle language change
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    // Update code template if current code is empty or is a template
    const currentTemplate = CODE_TEMPLATES[language] || '';
    if (!code || code === currentTemplate) {
      setCode(CODE_TEMPLATES[newLang] || '');
    }
  };

  // Reset code to template
  const handleReset = () => {
    if (question.codeTemplate) {
      setCode(question.codeTemplate);
    } else {
      setCode(CODE_TEMPLATES[language] || '');
    }
    setRunResult(null);
  };

  // Run code with custom input
  const handleRun = async () => {
    if (!code.trim()) {
      message.warning('Please enter your code first');
      return;
    }

    setRunning(true);
    setRunResult(null);

    try {
      const response = await judgeAPI.run({
        code,
        language,
        input: customInput,
      });

      if (response.success) {
        setRunResult(response.data);
        setActiveTab('run');
      } else {
        message.error(response.message || 'Run failed');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Network error');
    } finally {
      setRunning(false);
    }
  };

  // Submit code for judging
  const handleSubmit = async () => {
    if (!code.trim()) {
      message.warning('Please enter your code first');
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await judgeAPI.submit({
        questionId: question.id,
        activityId,
        code,
        language,
      });

      if (response.success) {
        const submissionId = response.data.submissionId;
        message.success('Code submitted, judging...');

        // Poll for result
        pollSubmissionResult(submissionId);
      } else {
        message.error(response.message || 'Submit failed');
        setSubmitting(false);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Network error');
      setSubmitting(false);
    }
  };

  // Poll submission result
  const pollSubmissionResult = useCallback(async (submissionId: number) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await judgeAPI.getStatus(submissionId);

        if (response.success) {
          const result = response.data;

          if (result.status === 'pending' || result.status === 'judging') {
            // Still processing, continue polling
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(poll, 1000);
            } else {
              message.warning('Judging timeout, please check later');
              setSubmitting(false);
            }
          } else {
            // Judging complete
            setSubmitResult(result);
            setActiveTab('submit');
            setSubmitting(false);

            if (result.status === 'AC') {
              message.success('Accepted! All test cases passed!');
            }

            if (onSubmitSuccess) {
              onSubmitSuccess(submissionId);
            }
          }
        }
      } catch (error) {
        console.error('Poll error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setSubmitting(false);
        }
      }
    };

    poll();
  }, [onSubmitSuccess]);

  // Load sample input
  const loadSampleInput = (sample: SampleTestCase) => {
    setCustomInput(sample.input || '');
  };

  return (
    <div>
      {/* Question content */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={5}>
          <FileTextOutlined /> Problem Description
        </Title>
        <div
          style={{ fontSize: 14 }}
          dangerouslySetInnerHTML={{ __html: question.content }}
        />

        {/* Limits info */}
        <Divider />
        <Space>
          {question.timeLimit && (
            <Tag>Time Limit: {question.timeLimit}ms</Tag>
          )}
          {question.memoryLimit && (
            <Tag>Memory Limit: {question.memoryLimit}MB</Tag>
          )}
        </Space>

        {/* Sample test cases */}
        {sampleCases.length > 0 && (
          <>
            <Divider />
            <Title level={5}>Sample Test Cases</Title>
            <Collapse>
              {sampleCases.map((sample, index) => (
                <Panel
                  key={index}
                  header={`Sample ${index + 1}`}
                  extra={
                    <Button
                      type="link"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadSampleInput(sample);
                      }}
                    >
                      Use as input
                    </Button>
                  }
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Input:</Text>
                      <pre style={{
                        background: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {sample.input || '(empty)'}
                      </pre>
                    </Col>
                    <Col span={12}>
                      <Text strong>Expected Output:</Text>
                      <pre style={{
                        background: '#f0fff0',
                        padding: 8,
                        borderRadius: 4,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {sample.expectedOutput}
                      </pre>
                    </Col>
                  </Row>
                  {sample.description && (
                    <Text type="secondary">{sample.description}</Text>
                  )}
                </Panel>
              ))}
            </Collapse>
          </>
        )}
      </Card>

      {/* Code editor section */}
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <Text strong>Language:</Text>
              <Select
                value={language}
                onChange={handleLanguageChange}
                style={{ width: 120 }}
                disabled={readOnly}
              >
                {supportedLanguages.map((lang) => (
                  <Option key={lang.id} value={lang.id}>
                    {lang.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={readOnly}
              >
                Reset
              </Button>
              <Button
                type="default"
                icon={<PlayCircleOutlined />}
                onClick={handleRun}
                loading={running}
                disabled={readOnly}
              >
                Run
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={submitting}
                disabled={readOnly}
              >
                Submit
              </Button>
            </Space>
          </Col>
        </Row>

        <CodeEditor
          value={code}
          onChange={setCode}
          language={language}
          height="400px"
          readOnly={readOnly}
        />

        <Divider />

        {/* Input/Output tabs */}
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={<span><PlayCircleOutlined /> Run Result</span>}
            key="run"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Custom Input:</Text>
                <TextArea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter test input here..."
                  rows={6}
                  style={{ marginTop: 8, fontFamily: 'monospace' }}
                  disabled={readOnly}
                />
              </Col>
              <Col span={12}>
                <Text strong>Output:</Text>
                <div style={{ marginTop: 8 }}>
                  {running ? (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <Spin tip="Running..." />
                    </div>
                  ) : runResult ? (
                    <div>
                      <Tag color={runResult.status === 'AC' ? 'success' : 'error'}>
                        {runResult.status}
                      </Tag>
                      {runResult.executionTime && (
                        <Text type="secondary"> ({runResult.executionTime}ms)</Text>
                      )}
                      <pre style={{
                        background: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        marginTop: 8,
                        whiteSpace: 'pre-wrap',
                        minHeight: 100,
                      }}>
                        {runResult.output || runResult.error || '(no output)'}
                      </pre>
                      {runResult.stderr && (
                        <pre style={{
                          background: '#fff0f0',
                          padding: 8,
                          borderRadius: 4,
                          marginTop: 8,
                          whiteSpace: 'pre-wrap',
                        }}>
                          {runResult.stderr}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      background: '#f5f5f5',
                      padding: 20,
                      borderRadius: 4,
                      textAlign: 'center',
                      color: '#999',
                    }}>
                      Click &quot;Run&quot; to test your code
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </TabPane>

          <TabPane
            tab={<span><SendOutlined /> Submit Result</span>}
            key="submit"
          >
            <JudgeResult result={submitResult} loading={submitting} />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default CodeQuestion;
