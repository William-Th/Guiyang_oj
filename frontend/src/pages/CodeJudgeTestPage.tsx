/**
 * Code Judge Test Page
 * Simple page to test the programming question judge functionality
 */

import React, { useState } from 'react';
import { Typography, Divider, Alert } from 'antd';
import CodeQuestion from '../components/CodeQuestion';
import type { CodeQuestionData } from '../components/CodeQuestion';

const { Title, Paragraph } = Typography;

// Sample code question for testing
const sampleQuestion: CodeQuestionData = {
  id: 1001,
  content: `
    <h3>A+B Problem</h3>
    <p>Calculate the sum of two integers.</p>
    <h4>Input</h4>
    <p>Two integers A and B separated by space, where -1000 ≤ A, B ≤ 1000.</p>
    <h4>Output</h4>
    <p>Output the sum of A and B.</p>
  `,
  timeLimit: 1000,
  memoryLimit: 256,
  supportedLanguages: ['cpp', 'c'],
  sampleTestCases: [
    {
      caseNumber: 1,
      input: '1 2',
      expectedOutput: '3',
      description: 'Simple addition'
    },
    {
      caseNumber: 2,
      input: '-5 10',
      expectedOutput: '5',
      description: 'Negative number'
    }
  ]
};

const CodeJudgeTestPage: React.FC = () => {
  const [lastSubmissionId, setLastSubmissionId] = useState<number | null>(null);

  const handleSubmitSuccess = (submissionId: number) => {
    setLastSubmissionId(submissionId);
    console.log('Submission successful:', submissionId);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Title level={2}>Programming Question Judge Test</Title>
      <Paragraph>
        This page is for testing the programming question judge functionality.
        You can write code, run it with custom input, and submit for full judging.
      </Paragraph>

      <Alert
        message="Test Environment"
        description="This is a test page. The code is executed in a sandboxed Docker container with resource limits."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {lastSubmissionId && (
        <Alert
          message={`Last Submission ID: ${lastSubmissionId}`}
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Divider />

      <CodeQuestion
        question={sampleQuestion}
        onSubmitSuccess={handleSubmitSuccess}
      />
    </div>
  );
};

export default CodeJudgeTestPage;
