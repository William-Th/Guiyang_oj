#!/usr/bin/env node
/**
 * Exam API Complete Test Suite
 * 考试相关API完整测试套件
 *
 * 运行方式:
 *   node tests/api/exam-api-test.js
 */

const http = require('http');

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TIMEOUT = 10000; // 10秒超�?

// 测试数据
let authTokens = {
  student: null,
  teacher: null,
  admin: null
};

let testData = {
  examId: null,
  studentExamId: null,
  questionIds: []
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
 * 测试用例执行�?
 */
async function runTest(name, testFn, options = {}) {
  results.total++;
  const startTime = Date.now();

  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.passed++;
    results.tests.push({ name, status: 'PASS', duration });
    console.log(`${colors.green}�?{colors.reset} ${name} ${colors.blue}(${duration}ms)${colors.reset}`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (options.skipOnError && error.message.includes(options.skipOnError)) {
      results.skipped++;
      results.tests.push({ name, status: 'SKIP', reason: error.message, duration });
      console.log(`${colors.yellow}�?{colors.reset} ${name} ${colors.yellow}(SKIPPED)${colors.reset}`);
      return false;
    }

    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message, duration });
    console.log(`${colors.red}�?{colors.reset} ${name} ${colors.blue}(${duration}ms)${colors.reset}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
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
 * 认证辅助函数
 */
async function login(username, password) {
  const postData = JSON.stringify({
    username,
    password,
    loginType: username.includes('520102') ? 'idCard' : 'username'
  });

  const response = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  assert(response.statusCode === 200, `Login failed: ${response.statusCode}`);
  const data = response.json();
  assert(data && data.token, 'Login should return a token');

  return data.token;
}

/**
 * 测试套件
 */
async function runExamAPITests() {
  console.log(`\n${colors.cyan}=== Exam API Complete Test Suite ===${colors.reset}`);
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  // ==================== 准备阶段 ====================
  console.log(`\n${colors.cyan}--- Setup: Authentication ---${colors.reset}`);

  await runTest('Login as student', async () => {
    authTokens.student = await login('520102200801011234', 'password123');
  });

  await runTest('Login as teacher', async () => {
    authTokens.teacher = await login('teacher_yy_ps_math', 'password123');
  });

  await runTest('Login as admin', async () => {
    authTokens.admin = await login('admin', 'password123');
  });

  // ==================== 考试列表API测试 ====================
  console.log(`\n${colors.cyan}--- GET /api/exams - Get All Exams ---${colors.reset}`);

  await runTest('Get exams without auth (public)', async () => {
    const response = await makeRequest({ path: '/api/exams' });
    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && Array.isArray(data.exams), 'Should return exams array');
  });

  await runTest('Get exams as student', async () => {
    const response = await makeRequest({
      path: '/api/exams',
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    });
    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && Array.isArray(data.exams), 'Should return exams array');
  });

  await runTest('Get exams with filters (subject)', async () => {
    const response = await makeRequest({
      path: '/api/exams?subject=数学',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });
    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && Array.isArray(data.exams), 'Should return filtered exams');
  });

  await runTest('Get exams with filters (grade)', async () => {
    const response = await makeRequest({
      path: '/api/exams?grade=三年�?,
      headers: {
        'Authorization': `Bearer ${authTokens.admin}`
      }
    });
    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
  });

  // ==================== 考试详情API测试 ====================
  console.log(`\n${colors.cyan}--- GET /api/exams/:id - Get Exam Details ---${colors.reset}`);

  await runTest('Get exam details with valid ID', async () => {
    const response = await makeRequest({ path: '/api/exams/1' });

    if (response.statusCode === 404) {
      throw new Error('No exam data');
    }

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && data.exam, 'Should return exam object');
    testData.examId = data.exam.id;
  }, { skipOnError: 'No exam data' });

  await runTest('Get exam details with invalid ID', async () => {
    const response = await makeRequest({ path: '/api/exams/99999' });
    assert(response.statusCode === 404, `Expected 404, got ${response.statusCode}`);
  });

  await runTest('Get exam details with non-numeric ID', async () => {
    const response = await makeRequest({ path: '/api/exams/invalid' });
    assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
  });

  // ==================== 获取考试题目API测试 ====================
  console.log(`\n${colors.cyan}--- GET /api/exams/:id/questions - Get Exam Questions ---${colors.reset}`);

  await runTest('Get exam questions without auth', async () => {
    const response = await makeRequest({ path: '/api/exams/1/questions' });
    assert(response.statusCode === 401, `Expected 401, got ${response.statusCode}`);
  });

  await runTest('Get exam questions as student', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/questions`,
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    });

    if (response.statusCode === 404) {
      throw new Error('Exam has no questions');
    }

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && data.exam, 'Should return exam with questions');
    assert(Array.isArray(data.exam.questions), 'Should have questions array');

    // Student should not see correct answers
    if (data.exam.questions.length > 0) {
      assert(!data.exam.questions[0].correct_answer, 'Student should not see correct answers');
      testData.questionIds = data.exam.questions.map(q => q.id);
    }
  }, { skipOnError: 'Exam has no questions' });

  await runTest('Get exam questions as teacher (with answers)', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/questions`,
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    if (response.statusCode === 404) {
      throw new Error('Exam has no questions');
    }

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    const data = response.json();

    // Teacher should see correct answers
    if (data.exam.questions && data.exam.questions.length > 0) {
      assert(data.exam.questions[0].correct_answer !== undefined, 'Teacher should see correct answers');
    }
  }, { skipOnError: 'Exam has no questions' });

  // ==================== 创建考试API测试 ====================
  console.log(`\n${colors.cyan}--- POST /api/exams - Create Exam ---${colors.reset}`);

  await runTest('Create exam without auth', async () => {
    const postData = JSON.stringify({
      title: 'Test Exam',
      subject: '数学',
      grade: '三年�?,
      duration: 60,
      totalScore: 100,
      passScore: 60
    });

    const response = await makeRequest({
      path: '/api/exams',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    assert(response.statusCode === 401, `Expected 401, got ${response.statusCode}`);
  });

  await runTest('Create exam as student (should fail)', async () => {
    const postData = JSON.stringify({
      title: 'Test Exam',
      subject: '数学',
      grade: '三年�?,
      duration: 60,
      totalScore: 100,
      passScore: 60
    });

    const response = await makeRequest({
      path: '/api/exams',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${authTokens.student}`
      }
    }, postData);

    assert(response.statusCode === 403, `Expected 403, got ${response.statusCode}`);
  });

  await runTest('Create exam with missing required fields', async () => {
    const postData = JSON.stringify({
      title: 'Test Exam'
      // Missing required fields
    });

    const response = await makeRequest({
      path: '/api/exams',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, postData);

    assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
  });

  await runTest('Create exam as teacher (success)', async () => {
    const postData = JSON.stringify({
      title: 'API Test Exam ' + Date.now(),
      description: 'Created by automated test',
      subject: '数学',
      grade: '三年�?,
      duration: 60,
      totalScore: 100,
      passScore: 60,
      status: 'published'
    });

    const response = await makeRequest({
      path: '/api/exams',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, postData);

    assert(response.statusCode === 201, `Expected 201, got ${response.statusCode}`);
    const data = response.json();
    assert(data && data.exam, 'Should return created exam');
    assert(data.exam.id, 'Created exam should have an ID');

    // Store for later tests
    if (!testData.examId) {
      testData.examId = data.exam.id;
    }
  });

  // ==================== 报名考试API测试 ====================
  console.log(`\n${colors.cyan}--- POST /api/exams/:id/register - Register for Exam ---${colors.reset}`);

  await runTest('Register without auth', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/register`,
      method: 'POST'
    });

    assert(response.statusCode === 401, `Expected 401, got ${response.statusCode}`);
  });

  await runTest('Register as teacher (should fail)', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/register`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    assert(response.statusCode === 403, `Expected 403, got ${response.statusCode}`);
  });

  await runTest('Register for non-existent exam', async () => {
    const response = await makeRequest({
      path: '/api/exams/99999/register',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    });

    assert(response.statusCode === 404, `Expected 404, got ${response.statusCode}`);
  });

  await runTest('Register as student (success)', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/register`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    });

    // Could be 200 (success) or 400 (already registered)
    assert(response.statusCode === 200 || response.statusCode === 400,
      `Expected 200 or 400, got ${response.statusCode}`);

    if (response.statusCode === 200) {
      const data = response.json();
      assert(data && data.registrationId, 'Should return registration ID');
    }
  }, { skipOnError: 'No exam ID available' });

  await runTest('Register twice (should fail)', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/register`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    });

    assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
    const data = response.json();
    assert(data && data.message.includes('已报�?), 'Should indicate already registered');
  }, { skipOnError: 'No exam ID available' });

  // ==================== 开始考试API测试 ====================
  console.log(`\n${colors.cyan}--- POST /api/exams/:id/start - Start Exam ---${colors.reset}`);

  await runTest('Start exam without auth', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/start`,
      method: 'POST'
    });

    assert(response.statusCode === 401, `Expected 401, got ${response.statusCode}`);
  });

  await runTest('Start exam as teacher (should fail)', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/start`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    assert(response.statusCode === 403, `Expected 403, got ${response.statusCode}`);
  });

  await runTest('Start exam as student (success)', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/start`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    });

    // Could be 200 (success) or 400 (already started/not published)
    if (response.statusCode === 400) {
      const data = response.json();
      if (data.message.includes('已在进行�?) || data.message.includes('已完�?)) {
        // Already in progress or completed, this is acceptable
        return;
      }
      throw new Error(data.message);
    }

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && data.studentExamId, 'Should return student exam ID');
    assert(data.startTime, 'Should return start time');

    testData.studentExamId = data.studentExamId;
  }, { skipOnError: 'No exam ID available' });

  // ==================== 提交考试API测试 ====================
  console.log(`\n${colors.cyan}--- POST /api/exams/:id/submit - Submit Exam ---${colors.reset}`);

  await runTest('Submit exam without auth', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const postData = JSON.stringify({
      answers: []
    });

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    assert(response.statusCode === 401, `Expected 401, got ${response.statusCode}`);
  });

  await runTest('Submit exam with invalid data format', async () => {
    if (!testData.examId) {
      throw new Error('No exam ID available');
    }

    const postData = JSON.stringify({
      answers: 'invalid'
    });

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${authTokens.student}`
      }
    }, postData);

    assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
  });

  await runTest('Submit exam with valid answers', async () => {
    if (!testData.examId || testData.questionIds.length === 0) {
      throw new Error('No exam data or questions available');
    }

    const answers = testData.questionIds.map(qid => ({
      questionId: qid,
      answer: 'A'
    }));

    const postData = JSON.stringify({ answers });

    const response = await makeRequest({
      path: `/api/exams/${testData.examId}/submit`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${authTokens.student}`
      }
    }, postData);

    // Could be 200 (success) or 400 (not in progress/already submitted)
    if (response.statusCode === 400) {
      const data = response.json();
      if (data.message.includes('未在进行�?) || data.message.includes('已提�?)) {
        // Not in progress or already submitted, acceptable
        return;
      }
    }

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && data.score !== undefined, 'Should return score');
    assert(data.answersProcessed !== undefined, 'Should return answers processed count');
  }, { skipOnError: 'No exam data or questions available' });
}

/**
 * 主函�?
 */
async function main() {
  const startTime = Date.now();

  try {
    await runExamAPITests();
  } catch (error) {
    console.error(`\n${colors.red}Unexpected error: ${error.message}${colors.reset}`);
    console.error(error.stack);
  }

  const totalTime = Date.now() - startTime;

  // 打印总结
  console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}`);
  console.log(`Total: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${results.skipped}${colors.reset}`);
  console.log(`Duration: ${totalTime}ms\n`);

  // 按类别统�?
  const categories = {
    'Auth': results.tests.filter(t => t.name.includes('Login')),
    'List': results.tests.filter(t => t.name.includes('Get exams')),
    'Details': results.tests.filter(t => t.name.includes('Get exam details')),
    'Questions': results.tests.filter(t => t.name.includes('questions')),
    'Create': results.tests.filter(t => t.name.includes('Create exam')),
    'Register': results.tests.filter(t => t.name.includes('Register')),
    'Start': results.tests.filter(t => t.name.includes('Start exam')),
    'Submit': results.tests.filter(t => t.name.includes('Submit exam'))
  };

  console.log(`${colors.cyan}=== Test Categories ===${colors.reset}`);
  Object.entries(categories).forEach(([category, tests]) => {
    const passed = tests.filter(t => t.status === 'PASS').length;
    const failed = tests.filter(t => t.status === 'FAIL').length;
    const skipped = tests.filter(t => t.status === 'SKIP').length;
    console.log(`${category}: ${passed}/${tests.length} passed (${failed} failed, ${skipped} skipped)`);
  });
  console.log();

  // 如果有失败的测试，退出码�?
  if (results.failed > 0) {
    console.log(`${colors.red}Exam API tests FAILED${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}All Exam API tests PASSED${colors.reset}\n`);
    process.exit(0);
  }
}

// 运行测试
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
