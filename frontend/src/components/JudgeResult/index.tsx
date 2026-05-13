/**
 * Judge Result Component - Display code judging results
 */

import React from 'react';
import { Tag, Progress, Collapse, Typography, Space, Descriptions } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;

// Judge status definitions
export type JudgeStatus = 'pending' | 'judging' | 'AC' | 'WA' | 'CE' | 'RE' | 'TLE' | 'MLE' | 'OLE' | 'SE';

export interface TestCaseResult {
  caseNumber: number;
  status: JudgeStatus;
  match?: boolean;
  score?: number;
  earned?: number;
  executionTime?: number;
  output?: string;
  expected?: string;
  stderr?: string;
  isSample?: boolean;
}

export interface JudgeResultData {
  status: JudgeStatus;
  score?: number;
  maxScore?: number;
  compileOutput?: string;
  executionTime?: number;
  testResults?: TestCaseResult[];
  error?: string;
  output?: string;
  stderr?: string;
  match?: boolean;
}

interface JudgeResultProps {
  result: JudgeResultData | null;
  loading?: boolean;
}

// Status configuration
const STATUS_CONFIG: Record<JudgeStatus, {
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}> = {
  pending: {
    label: 'Pending',
    color: 'default',
    icon: <ClockCircleOutlined />,
    description: 'Waiting in queue',
  },
  judging: {
    label: 'Judging',
    color: 'processing',
    icon: <LoadingOutlined spin />,
    description: 'Running tests',
  },
  AC: {
    label: 'Accepted',
    color: 'success',
    icon: <CheckCircleOutlined />,
    description: 'All test cases passed',
  },
  WA: {
    label: 'Wrong Answer',
    color: 'error',
    icon: <CloseCircleOutlined />,
    description: 'Output does not match expected',
  },
  CE: {
    label: 'Compile Error',
    color: 'warning',
    icon: <WarningOutlined />,
    description: 'Code failed to compile',
  },
  RE: {
    label: 'Runtime Error',
    color: 'error',
    icon: <ExclamationCircleOutlined />,
    description: 'Program crashed during execution',
  },
  TLE: {
    label: 'Time Limit Exceeded',
    color: 'orange',
    icon: <ClockCircleOutlined />,
    description: 'Program took too long to execute',
  },
  MLE: {
    label: 'Memory Limit Exceeded',
    color: 'orange',
    icon: <ExclamationCircleOutlined />,
    description: 'Program used too much memory',
  },
  OLE: {
    label: 'Output Limit Exceeded',
    color: 'orange',
    icon: <ExclamationCircleOutlined />,
    description: 'Program output too much data',
  },
  SE: {
    label: 'System Error',
    color: 'default',
    icon: <ExclamationCircleOutlined />,
    description: 'Internal system error',
  },
};

const JudgeResult: React.FC<JudgeResultProps> = ({ result, loading }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <LoadingOutlined style={{ fontSize: 24 }} spin />
        <div style={{ marginTop: 8 }}>Judging...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
        Submit your code to see results
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[result.status] || STATUS_CONFIG.SE;
  const percentage = result.maxScore ? Math.round((result.score || 0) / result.maxScore * 100) : 0;

  return (
    <div>
      {/* Status header */}
      <div style={{ marginBottom: 16 }}>
        <Space size="large" align="center">
          <Tag
            color={statusConfig.color}
            icon={statusConfig.icon}
            style={{ fontSize: 16, padding: '4px 12px' }}
          >
            {statusConfig.label}
          </Tag>
          {result.maxScore !== undefined && (
            <Text strong>
              Score: {result.score || 0} / {result.maxScore}
            </Text>
          )}
          {result.executionTime !== undefined && (
            <Text type="secondary">
              Time: {result.executionTime}ms
            </Text>
          )}
        </Space>
      </div>

      {/* Progress bar for partial scores */}
      {result.maxScore !== undefined && result.maxScore > 0 && (
        <Progress
          percent={percentage}
          status={result.status === 'AC' ? 'success' : percentage > 0 ? 'normal' : 'exception'}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Compile error output */}
      {result.status === 'CE' && result.compileOutput && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>Compile Error:</Text>
          <pre style={{
            background: '#f3f4f6',
            padding: 12,
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: 200,
            fontSize: 12,
            marginTop: 8,
          }}>
            {result.compileOutput}
          </pre>
        </div>
      )}

      {/* System error */}
      {result.error && (
        <div style={{ marginBottom: 16 }}>
          <Text type="danger">{result.error}</Text>
        </div>
      )}

      {/* Test case results */}
      {result.testResults && result.testResults.length > 0 && (
        <Collapse defaultActiveKey={result.testResults.filter(t => t.status !== 'AC').map(t => t.caseNumber.toString())}>
          {result.testResults.map((tc) => {
            const tcStatus = STATUS_CONFIG[tc.status] || STATUS_CONFIG.SE;
            return (
              <Panel
                key={tc.caseNumber}
                header={
                  <Space>
                    <Tag color={tcStatus.color} icon={tcStatus.icon}>
                      {tcStatus.label}
                    </Tag>
                    <span>Test Case #{tc.caseNumber}</span>
                    {tc.isSample && <Tag>Sample</Tag>}
                    {tc.executionTime !== undefined && (
                      <Text type="secondary">{tc.executionTime}ms</Text>
                    )}
                    {tc.score !== undefined && (
                      <Text type="secondary">
                        {tc.earned || 0}/{tc.score} pts
                      </Text>
                    )}
                  </Space>
                }
              >
                <Descriptions column={1} size="small">
                  {tc.output !== undefined && (
                    <Descriptions.Item label="Your Output">
                      <pre style={{
                        background: '#f3f4f6',
                        padding: 8,
                        borderRadius: 4,
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}>
                        {tc.output || '(empty)'}
                      </pre>
                    </Descriptions.Item>
                  )}
                  {tc.expected !== undefined && (
                    <Descriptions.Item label="Expected Output">
                      <pre style={{
                        background: '#f0fff0',
                        padding: 8,
                        borderRadius: 4,
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}>
                        {tc.expected || '(empty)'}
                      </pre>
                    </Descriptions.Item>
                  )}
                  {tc.stderr && (
                    <Descriptions.Item label="Error Output">
                      <pre style={{
                        background: '#fff0f0',
                        padding: 8,
                        borderRadius: 4,
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}>
                        {tc.stderr}
                      </pre>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Panel>
            );
          })}
        </Collapse>
      )}
    </div>
  );
};

export default JudgeResult;
