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
    label: '等待中',
    color: 'default',
    icon: <ClockCircleOutlined />,
    description: '排队等待中',
  },
  judging: {
    label: '判题中',
    color: 'processing',
    icon: <LoadingOutlined spin />,
    description: '正在运行测试',
  },
  AC: {
    label: '通过',
    color: 'success',
    icon: <CheckCircleOutlined />,
    description: '所有测试用例通过',
  },
  WA: {
    label: '答案错误',
    color: 'error',
    icon: <CloseCircleOutlined />,
    description: '输出与期望不符',
  },
  CE: {
    label: '编译错误',
    color: 'warning',
    icon: <WarningOutlined />,
    description: '代码编译失败',
  },
  RE: {
    label: '运行错误',
    color: 'error',
    icon: <ExclamationCircleOutlined />,
    description: '程序运行时崩溃',
  },
  TLE: {
    label: '超时',
    color: 'orange',
    icon: <ClockCircleOutlined />,
    description: '程序执行时间超限',
  },
  MLE: {
    label: '内存超限',
    color: 'orange',
    icon: <ExclamationCircleOutlined />,
    description: '程序内存使用超限',
  },
  OLE: {
    label: '输出超限',
    color: 'orange',
    icon: <ExclamationCircleOutlined />,
    description: '程序输出数据过多',
  },
  SE: {
    label: '系统错误',
    color: 'default',
    icon: <ExclamationCircleOutlined />,
    description: '系统内部错误',
  },
};

const JudgeResult: React.FC<JudgeResultProps> = ({ result, loading }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <LoadingOutlined style={{ fontSize: 24 }} spin />
        <div style={{ marginTop: 8 }}>判题中...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
        提交代码后查看结果
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
              得分: {result.score || 0} / {result.maxScore}
            </Text>
          )}
          {result.executionTime !== undefined && (
            <Text type="secondary">
              用时: {result.executionTime}ms
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
          <Text strong>编译错误:</Text>
          <pre style={{
            background: '#f5f5f5',
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
                    <span>测试用例 #{tc.caseNumber}</span>
                    {tc.isSample && <Tag>样例</Tag>}
                    {tc.executionTime !== undefined && (
                      <Text type="secondary">{tc.executionTime}ms</Text>
                    )}
                    {tc.score !== undefined && (
                      <Text type="secondary">
                        {tc.earned || 0}/{tc.score} 分
                      </Text>
                    )}
                  </Space>
                }
              >
                <Descriptions column={1} size="small">
                  {tc.output !== undefined && (
                    <Descriptions.Item label="你的输出">
                      <pre style={{
                        background: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}>
                        {tc.output || '(空)'}
                      </pre>
                    </Descriptions.Item>
                  )}
                  {tc.expected !== undefined && (
                    <Descriptions.Item label="期望输出">
                      <pre style={{
                        background: '#f0fff0',
                        padding: 8,
                        borderRadius: 4,
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}>
                        {tc.expected || '(空)'}
                      </pre>
                    </Descriptions.Item>
                  )}
                  {tc.stderr && (
                    <Descriptions.Item label="错误输出">
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
