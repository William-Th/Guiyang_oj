#!/usr/bin/env node
/**
 * Paper Generation API Test Suite
 * 组卷功能 API 测试套件
 *
 * 测试范围:
 * - 获取可用题目列表
 * - 添加题目到活动
 * - 批量添加题目
 * - 移除题目
 * - 批量删除题目
 * - 更新题目属性
 * - 重排题目顺序
 * - 获取活动试卷
 * - 获取试卷统计
 * - 验证试卷
 * - 权限控制测试
 *
 * 运行方式:
 *   node tests/api/paper-generation-api-test.js
 */

const http = require('http');

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TIMEOUT = 10000; // 10秒超时

// 测试数据
let authTokens = {
  teacher: null,
  admin: null
};

let testData = {
  activityId: null,
  questionIds: [],
  addedQuestionIds: []
};

// 测试结果
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  tests: []
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

/**
 * HTTP请求封装
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, API_BASE_URL);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: TIMEOUT
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json: () => {
            try {
              return JSON.parse(data);
            } catch (e) {
              return null;
            }
          }
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

/**
 * 测试函数
 */
async function test(name, fn) {
  results.total++;
  process.stdout.write(`  ${colors.cyan}→${colors.reset} ${name} ... `);

  try {
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'passed' });
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    return true;
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.log(`    ${colors.red}Error: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * 断言函数
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * 登录辅助函数
 */
async function login(username, password) {
  const res = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username, password }));

  const data = res.json();
  assert(res.statusCode === 200, `Login failed with status ${res.statusCode}: ${data.message || JSON.stringify(data)}`);
  assert(data.token, 'Login should return token');

  return data.token;
}

/**
 * 创建测试活动
 */
async function createTestActivity(token) {
  const timestamp = Date.now();
  const activityData = {
    title: `组卷测试活动-${timestamp}`,
    description: '用于测试组卷功能',
    subject: '数学',
    grade: '二年级',
    abilityLevel: 'L1',
    totalScore: 100,
    passScore: 60,
    timeLimitType: 'unlimited'
  };

  const res = await makeRequest({
    path: '/api/activities/practice',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, JSON.stringify(activityData));

  const data = res.json();
  assert(res.statusCode === 201, `Create activity failed: ${data.message || res.statusCode}`);
  assert(data.success, 'Create activity response success should be true');
  assert(data.activity, 'Response should contain activity');
  assert(data.activity.id, 'Activity should have an ID');

  return data.activity.id;
}

/**
 * 获取可用题目（用于测试）
 */
async function getPublishedQuestions(token, subject = '数学', grade = '二年级', limit = 10) {
  const res = await makeRequest({
    path: '/api/question-bank',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = res.json();
  if (res.statusCode === 200 && data.success && data.questions) {
    // Filter by subject and grade
    return data.questions
      .filter(q => q.subject === subject && q.grade === grade && q.status === 'published')
      .slice(0, limit)
      .map(q => q.id);
  }

  return [];
}

/**
 * 测试套件
 */
async function runTests() {
  console.log(`\n${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}  Paper Generation API Test Suite${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}\n`);

  // 1. 登录测试
  console.log(`${colors.cyan}[1] Authentication Tests${colors.reset}`);

  await test('Login as teacher', async () => {
    authTokens.teacher = await login('teacher01', 'password123');
  });

  await test('Login as admin', async () => {
    authTokens.admin = await login('admin', 'password123');
  });

  // 2. 准备测试数据
  console.log(`\n${colors.cyan}[2] Setup Test Data${colors.reset}`);

  await test('Create test activity', async () => {
    testData.activityId = await createTestActivity(authTokens.teacher);
    assert(testData.activityId > 0, 'Activity ID should be positive');
  });

  await test('Get published questions for testing', async () => {
    testData.questionIds = await getPublishedQuestions(authTokens.teacher, '数学', '二年级', 10);
    assert(testData.questionIds.length >= 5, `Need at least 5 questions for testing, got ${testData.questionIds.length}`);
  });

  // 3. 获取可用题目测试
  console.log(`\n${colors.cyan}[3] Get Available Questions Tests${colors.reset}`);

  await test('Get available questions for activity', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/available-questions`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const data = res.json();
    assert(res.statusCode === 200, `Get available questions failed: ${data.message}`);
    assert(data.success, 'Response success should be true');
    assert(Array.isArray(data.questions), 'Response should contain questions array');
    assert(data.paperStats, 'Response should contain paperStats');
  });

  await test('Get available questions with filters', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/available-questions?type=single&difficulty=easy`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const data = res.json();
    assert(res.statusCode === 200, 'Status code should be 200');
    assert(data.success, 'Response success should be true');
    assert(Array.isArray(data.questions), 'Questions should be an array');
  });

  // 4. 添加题目测试
  console.log(`\n${colors.cyan}[4] Add Question Tests${colors.reset}`);

  await test('Add a question to activity', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/questions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, JSON.stringify({
      questionId: testData.questionIds[0],
      score: 10,
      isRequired: true
    }));

    const data = res.json();
    assert(res.statusCode === 200, `Add question failed: ${data.message}`);
    assert(data.success, 'Response success should be true');
    assert(data.question, 'Response should contain question');

    testData.addedQuestionIds.push(testData.questionIds[0]);
  });

  await test('Cannot add duplicate question', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/questions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, JSON.stringify({
      questionId: testData.questionIds[0],
      score: 10
    }));

    const data = res.json();
    assert(res.statusCode === 400, 'Should return 400 for duplicate question');
    assert(!data.success, 'Response success should be false');
  });

  await test('Batch add questions', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/questions/batch`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, JSON.stringify({
      questions: [
        { questionId: testData.questionIds[1], score: 10 },
        { questionId: testData.questionIds[2], score: 15 }
      ]
    }));

    const data = res.json();
    assert(res.statusCode === 200, `Batch add failed: ${data.message}`);
    assert(data.success, 'Response success should be true');
    assert(Array.isArray(data.added), 'Response should contain added array');
    assert(data.added.length === 2, `Should add 2 questions, added ${data.added.length}`);

    testData.addedQuestionIds.push(testData.questionIds[1], testData.questionIds[2]);
  });

  // 5. 获取活动试卷测试
  console.log(`\n${colors.cyan}[5] Get Activity Paper Tests${colors.reset}`);

  await test('Get activity paper', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/paper`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const data = res.json();
    assert(res.statusCode === 200, `Get paper failed: ${data.message}`);
    assert(data.success, 'Response success should be true');
    assert(data.activity, 'Response should contain activity');
    assert(Array.isArray(data.questions), 'Response should contain questions array');
    assert(data.questions.length === 3, `Should have 3 questions, got ${data.questions.length}`);
    assert(data.paperStats, 'Response should contain paperStats');
  });

  await test('Get activity paper statistics', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/paper/stats`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const data = res.json();
    assert(res.statusCode === 200, `Get stats failed: ${data.message}`);
    assert(data.success, 'Response success should be true');
    assert(data.stats, 'Response should contain stats');
    assert(data.stats.question_count === 3, `Question count should be 3, got ${data.stats.question_count}`);
  });

  // 6. 更新题目测试
  console.log(`\n${colors.cyan}[6] Update Question Tests${colors.reset}`);

  await test('Update question score', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/questions/${testData.questionIds[0]}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, JSON.stringify({
      score: 20
    }));

    const data = res.json();
    assert(res.statusCode === 200, `Update failed: ${data.message}`);
    assert(data.success, 'Response success should be true');
    assert(data.question, 'Response should contain updated question');
  });

  // 7. 移除题目测试
  console.log(`\n${colors.cyan}[7] Remove Question Tests${colors.reset}`);

  await test('Remove a question from activity', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/questions/${testData.questionIds[2]}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const data = res.json();
    assert(res.statusCode === 200, `Remove failed: ${data.message}`);
    assert(data.success, 'Response success should be true');
  });

  await test('Verify question removed', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/paper`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const data = res.json();
    assert(res.statusCode === 200, 'Status should be 200');
    assert(data.questions.length === 2, `Should have 2 questions after removal, got ${data.questions.length}`);
  });

  // 8. 批量删除题目测试
  console.log(`\n${colors.cyan}[8] Batch Remove Questions Tests${colors.reset}`);

  await test('Add questions for batch delete test', async () => {
    // Add 3 questions for batch delete testing
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/questions/batch`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, JSON.stringify({
      questions: [
        { questionId: testData.questionIds[2], score: 10 },
        { questionId: testData.questionIds[3], score: 10 },
        { questionId: testData.questionIds[4], score: 10 }
      ]
    }));

    const data = res.json();
    assert(res.statusCode === 200, `Batch add failed: ${data.message}`);
    assert(data.added.length === 3, `Should add 3 questions, added ${data.added.length}`);
  });

  await test('Batch remove questions from activity', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/questions/batch`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, JSON.stringify({
      questionIds: [testData.questionIds[2], testData.questionIds[3]]
    }));

    const data = res.json();
    assert(res.statusCode === 200, `Batch remove failed: ${data.message}`);
    assert(data.success, 'Response success should be true');
    assert(data.removed.length === 2, `Should remove 2 questions, removed ${data.removed.length}`);
    assert(data.removed.includes(testData.questionIds[2]), 'Should remove question 2');
    assert(data.removed.includes(testData.questionIds[3]), 'Should remove question 3');
  });

  await test('Verify batch remove result', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/paper`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const data = res.json();
    assert(res.statusCode === 200, 'Status should be 200');
    assert(data.questions.length === 3, `Should have 3 questions (2 original + 1 remaining from batch), got ${data.questions.length}`);
  });

  await test('Batch remove with invalid question ID', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/questions/batch`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, JSON.stringify({
      questionIds: [99999] // Non-existent question ID
    }));

    const data = res.json();
    assert(res.statusCode === 200, 'Status should be 200');
    assert(data.success, 'Response success should be true');
    assert(data.errors.length === 1, 'Should have 1 error for invalid question');
  });

  await test('Batch remove with empty array', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/questions/batch`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, JSON.stringify({
      questionIds: []
    }));

    const data = res.json();
    assert(res.statusCode === 400, 'Should return 400 for empty array');
    assert(!data.success, 'Response success should be false');
  });

  // 9. 验证试卷测试
  console.log(`\n${colors.cyan}[9] Validate Paper Tests${colors.reset}`);

  await test('Validate activity paper', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/paper/validate`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const data = res.json();
    assert(res.statusCode === 200, `Validate failed: ${data.message}`);
    assert(data.success, 'Response success should be true');
    assert(typeof data.valid === 'boolean', 'Response should contain valid boolean');
    assert(Array.isArray(data.errors), 'Response should contain errors array');
  });

  // 10. 权限控制测试
  console.log(`\n${colors.cyan}[10] Permission Tests${colors.reset}`);

  await test('Teacher cannot access other teacher\'s activity', async () => {
    // Create activity with admin
    const adminActivityId = await createTestActivity(authTokens.admin);

    // Try to add question as teacher
    const res = await makeRequest({
      path: `/api/activities/${adminActivityId}/questions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, JSON.stringify({
      questionId: testData.questionIds[0],
      score: 10
    }));

    const data = res.json();
    assert(res.statusCode === 403, 'Should return 403 for permission denied');
    assert(!data.success, 'Response success should be false');
  });

  // 11. 清空试卷测试
  console.log(`\n${colors.cyan}[11] Clear Paper Tests${colors.reset}`);

  await test('Clear all questions from activity', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/paper`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const data = res.json();
    assert(res.statusCode === 200, `Clear failed: ${data.message}`);
    assert(data.success, 'Response success should be true');
    assert(data.removed === 3, `Should remove 3 questions, removed ${data.removed}`);
  });

  await test('Verify paper cleared', async () => {
    const res = await makeRequest({
      path: `/api/activities/${testData.activityId}/paper`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const data = res.json();
    assert(res.statusCode === 200, 'Status should be 200');
    assert(data.questions.length === 0, `Should have 0 questions after clearing, got ${data.questions.length}`);
  });
}

/**
 * 打印测试结果
 */
function printResults() {
  console.log(`\n${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}  Test Results${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`  Total:   ${results.total}`);
  console.log(`  ${colors.green}Passed:  ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed:  ${results.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}Skipped: ${results.skipped}${colors.reset}`);

  const passRate = ((results.passed / results.total) * 100).toFixed(2);
  console.log(`  Pass Rate: ${passRate}%`);

  if (results.failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
      console.log(`    Error: ${t.error}`);
    });
  }

  console.log();
  process.exit(results.failed > 0 ? 1 : 0);
}

/**
 * 主函数
 */
async function main() {
  try {
    await runTests();
    printResults();
  } catch (error) {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// 运行测试
main();
