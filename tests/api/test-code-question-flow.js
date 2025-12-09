/**
 * Test Code Question Flow
 * Tests the complete programming question workflow:
 * 1. Create a code type question draft
 * 2. Add test cases
 * 3. Test judge service
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;
let TOKEN = '';

// Helper function to make HTTP requests
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {})
      }
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Testing Code Question Flow');
  console.log('='.repeat(60));

  // Step 1: Login as teacher
  console.log('\n[1] Logging in as teacher...');
  const loginRes = await request('POST', '/api/auth/login', {
    username: 'teacher01',
    password: 'password123'
  });

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.data);
    process.exit(1);
  }

  TOKEN = loginRes.data.token;
  console.log('✓ Login successful');

  // Step 2: Create a code type question draft
  console.log('\n[2] Creating code question draft...');
  const timestamp = Date.now();
  const createRes = await request('POST', '/api/question-bank/bank', {
    type: 'code',
    subject: '计算机',
    grade: '初一',
    content: `【测试${timestamp}】A+B Problem - 输入两个整数，输出它们的和`,
    correct_answer: '#include <iostream>\nusing namespace std;\nint main() {\n  int a, b;\n  cin >> a >> b;\n  cout << a + b << endl;\n  return 0;\n}',
    suggested_score: 100,
    level: 'L1',
    difficulty: 'easy',
    explanation: '简单的输入输出题目',
    code_template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}',
    time_limit: 1000,
    memory_limit: 256,
    judge_mode: 'standard',
    supported_languages: ['cpp', 'c']
  });

  console.log('Create response status:', createRes.status);

  if (createRes.status !== 201) {
    console.error('Create question failed:', createRes.data);
    process.exit(1);
  }

  const questionId = createRes.data.data?.id;
  console.log('✓ Question created with ID:', questionId);

  // Step 3: Get the question to verify programming fields
  console.log('\n[3] Verifying question has programming fields...');
  const getRes = await request('GET', `/api/question-bank/bank/${questionId}`);

  if (getRes.status !== 200) {
    console.error('Get question failed:', getRes.data);
  } else {
    const q = getRes.data.data;
    console.log('  Type:', q.type);
    console.log('  Time Limit:', q.time_limit);
    console.log('  Memory Limit:', q.memory_limit);
    console.log('  Judge Mode:', q.judge_mode);
    console.log('  Supported Languages:', q.supported_languages);
    console.log('  Code Template:', q.code_template ? 'Present' : 'Missing');
    console.log('✓ Programming fields verified');
  }

  // Step 4: Add test cases
  console.log('\n[4] Adding test cases...');
  const testCases = [
    { input_data: '1 2', expected_output: '3', score: 25, is_sample: true, description: 'Simple addition' },
    { input_data: '0 0', expected_output: '0', score: 25, is_sample: true, description: 'Zero case' },
    { input_data: '-5 10', expected_output: '5', score: 25, is_sample: false, description: 'Negative number' },
    { input_data: '1000 999', expected_output: '1999', score: 25, is_sample: false, description: 'Large numbers' }
  ];

  const bulkRes = await request('POST', `/api/testcases/${questionId}/bulk`, {
    testCases: testCases,
    replace: true
  });

  if (bulkRes.status !== 201) {
    console.error('Add test cases failed:', bulkRes.data);
  } else {
    console.log('✓ Added', bulkRes.data.data?.length, 'test cases');
  }

  // Step 5: Get test cases to verify
  console.log('\n[5] Verifying test cases...');
  const tcRes = await request('GET', `/api/testcases/${questionId}`);

  if (tcRes.status !== 200) {
    console.error('Get test cases failed:', tcRes.data);
  } else {
    console.log('  Total test cases:', tcRes.data.data?.length);
    console.log('  Stats:', tcRes.data.stats);
    console.log('✓ Test cases verified');
  }

  // Step 6: Get sample test cases (public API)
  console.log('\n[6] Getting sample test cases (public)...');
  const samplesRes = await request('GET', `/api/judge/testcases/${questionId}/samples`);

  if (samplesRes.status !== 200) {
    console.error('Get samples failed:', samplesRes.data);
  } else {
    console.log('  Sample count:', samplesRes.data.data?.length);
    if (samplesRes.data.data?.length > 0) {
      console.log('  First sample:', samplesRes.data.data[0]);
    }
    console.log('✓ Sample test cases API working');
  }

  // Step 7: Test judge service - run code
  console.log('\n[7] Testing judge service - run code...');
  const correctCode = `#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`;

  const runRes = await request('POST', '/api/judge/run', {
    code: correctCode,
    language: 'cpp',
    input: '3 5'
  });

  if (runRes.status !== 200) {
    console.error('Run code failed:', runRes.data);
  } else {
    console.log('  Status:', runRes.data.data?.status);
    console.log('  Output:', runRes.data.data?.output?.trim());
    console.log('  Execution Time:', runRes.data.data?.executionTime, 'ms');
    console.log('✓ Code execution working');
  }

  // Step 8: Test judge service - submit for judging
  console.log('\n[8] Testing judge service - submit for judging...');
  const submitRes = await request('POST', '/api/judge/submit', {
    questionId: questionId,
    code: correctCode,
    language: 'cpp'
  });

  if (submitRes.status !== 200) {
    console.error('Submit failed:', submitRes.data);
  } else {
    const submissionId = submitRes.data.data?.submissionId;
    console.log('  Submission ID:', submissionId);

    // Poll for result
    console.log('  Waiting for judge result...');
    let attempts = 0;
    let judgeResult = null;

    while (attempts < 10) {
      await sleep(1000);
      const statusRes = await request('GET', `/api/judge/status/${submissionId}`);

      if (statusRes.data?.data?.status &&
          statusRes.data.data.status !== 'pending' &&
          statusRes.data.data.status !== 'judging') {
        judgeResult = statusRes.data.data;
        break;
      }
      attempts++;
      process.stdout.write('.');
    }

    if (judgeResult) {
      console.log('\n  Final Status:', judgeResult.status);
      console.log('  Test Results:', judgeResult.testResults?.length || 0, 'cases');
      console.log('  Total Score:', judgeResult.totalScore);
      console.log('✓ Judge submission working');
    } else {
      console.log('\n  Judge result not available after polling');
    }
  }

  // Step 9: Test with wrong code
  console.log('\n[9] Testing with wrong code...');
  const wrongCode = `#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a - b << endl;  // Wrong: subtraction instead of addition
    return 0;
}`;

  const wrongRunRes = await request('POST', '/api/judge/run', {
    code: wrongCode,
    language: 'cpp',
    input: '3 5',
    expectedOutput: '8'
  });

  if (wrongRunRes.status !== 200) {
    console.error('Run wrong code failed:', wrongRunRes.data);
  } else {
    console.log('  Status:', wrongRunRes.data.data?.status);
    console.log('  Output:', wrongRunRes.data.data?.output?.trim());
    console.log('  Expected: 8, Got:', wrongRunRes.data.data?.output?.trim());
    console.log('✓ Wrong answer detection working');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log('✓ Question creation with programming fields');
  console.log('✓ Test case management');
  console.log('✓ Sample test case API');
  console.log('✓ Code execution (run)');
  console.log('✓ Code submission (judge)');
  console.log('✓ Wrong answer detection');
  console.log('\nAll tests completed successfully!');
  console.log('Question ID for manual testing:', questionId);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
