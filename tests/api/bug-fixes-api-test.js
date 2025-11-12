/**
 * API Test: Bug Fixes (Bug #7, #9, #11)
 * Tests API fixes for:
 * - Bug #7: Question bank pagination - meta.total field
 * - Bug #9: Question search by question_code
 * - Bug #11: User profile edit - realName field (camelCase)
 */

const http = require('http');

// Test configuration
const API_URL = 'http://localhost:3001';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Test data storage
let testData = {
  teacherToken: null,
  studentToken: null,
  teacherId: null,
  studentId: null,
  questionCode: null,
};

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    log(`✓ ${name}`, colors.green);
  } catch (error) {
    failedTests++;
    log(`✗ ${name}`, colors.red);
    log(`  Error: ${error.message}`, colors.red);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ========== SETUP: Login ==========
async function loginAsTeacher() {
  log('\n--- Setup: Teacher Login ---', colors.cyan);
  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'teacher01',
      password: 'password123',
    }),
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.token, 'Should return token');

  testData.teacherToken = result.token;
  testData.teacherId = result.user.id;

  log(`Teacher logged in successfully (ID: ${testData.teacherId})`, colors.green);
}

async function loginAsStudent() {
  log('\n--- Setup: Student Login ---', colors.cyan);
  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: '13800138003',
      password: 'password123',
    }),
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.token, 'Should return token');

  testData.studentToken = result.token;
  testData.studentId = result.user.id;

  log(`Student logged in successfully (ID: ${testData.studentId})`, colors.green);
}

// ========== MAIN TEST RUNNER ==========
async function runTests() {
  // ========== BUG #7: Pagination meta.total ==========
  log('\n========== Bug #7: Question Bank Pagination ===========', colors.blue);

  await test('Bug #7.1 - GET /api/question-bank/bank returns meta.total field', async () => {
  await loginAsTeacher();

  const response = await makeRequest(`${API_URL}/api/question-bank/bank?limit=10&offset=0`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.teacherToken}`,
    },
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.success, 'Request should succeed');
  assert(result.data, 'Should return data array');
  assert(result.meta, 'Should return meta object');
  assert(result.meta.total !== undefined, 'meta.total should exist');
  assert(typeof result.meta.total === 'number', 'meta.total should be a number');
  assert(result.meta.total >= 0, 'meta.total should be >= 0');

  log(`  meta.total = ${result.meta.total}, data.length = ${result.data.length}`, colors.cyan);
  assert(result.meta.total >= result.data.length, 'meta.total should be >= current page count');
});

await test('Bug #7.2 - meta.total reflects filtered results', async () => {
  // Test with subject filter
  const response = await makeRequest(`${API_URL}/api/question-bank/bank?subject=数学&limit=10&offset=0`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.teacherToken}`,
    },
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.success, 'Request should succeed');
  assert(result.meta && result.meta.total !== undefined, 'Filtered query should also return meta.total');
  assert(typeof result.meta.total === 'number', 'Filtered meta.total should be a number');

  log(`  Filtered (subject=数学): meta.total = ${result.meta.total}`, colors.cyan);
});

await test('Bug #7.3 - meta.total vs meta.count distinction', async () => {
  const response = await makeRequest(`${API_URL}/api/question-bank/bank?limit=5&offset=0`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.teacherToken}`,
    },
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.meta.count !== undefined, 'meta.count should exist (current page count)');
  assert(result.meta.total !== undefined, 'meta.total should exist (total database count)');

  log(`  meta.count = ${result.meta.count}, meta.total = ${result.meta.total}`, colors.cyan);

  // meta.count should equal data.length (current page)
  assert(result.meta.count === result.data.length, 'meta.count should equal current page data length');

  // meta.total should be >= meta.count
  assert(result.meta.total >= result.meta.count, 'meta.total should be >= meta.count');
});

// ========== BUG #9: Search by question_code ==========
log('\n========== Bug #9: Search by Question Code ===========', colors.blue);

await test('Bug #9.1 - Get a question code for testing', async () => {
  const response = await makeRequest(`${API_URL}/api/question-bank/bank?limit=1&offset=0`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.teacherToken}`,
    },
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.data && result.data.length > 0, 'Should have at least one question');
  assert(result.data[0].question_code, 'Question should have question_code');

  testData.questionCode = result.data[0].question_code;
  log(`  Found question_code: ${testData.questionCode}`, colors.cyan);
});

await test('Bug #9.2 - Search questions by question_code', async () => {
  assert(testData.questionCode, 'Question code should be set from previous test');

  const response = await makeRequest(`${API_URL}/api/question-bank/bank/search?q=${encodeURIComponent(testData.questionCode)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.teacherToken}`,
    },
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.success, 'Search should succeed');
  assert(result.data, 'Should return data array');
  assert(result.data.length > 0, 'Should find at least one matching question');

  // Verify the found question has the correct question_code
  const foundQuestion = result.data.find(q => q.question_code === testData.questionCode);
  assert(foundQuestion, `Should find question with code ${testData.questionCode}`);

  log(`  Found ${result.data.length} question(s) matching code ${testData.questionCode}`, colors.cyan);
});

await test('Bug #9.3 - Search by partial question_code', async () => {
  assert(testData.questionCode, 'Question code should be set');

  // Search by first 8 characters of question code
  const partialCode = testData.questionCode.substring(0, 8);
  const response = await makeRequest(`${API_URL}/api/question-bank/bank/search?q=${encodeURIComponent(partialCode)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.teacherToken}`,
    },
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.success, 'Search should succeed');

  if (result.data.length > 0) {
    log(`  Partial code search "${partialCode}" found ${result.data.length} results`, colors.cyan);
  } else {
    log(`  Partial code search returned no results (acceptable behavior)`, colors.yellow);
  }
});

await test('Bug #9.4 - Search still works for content (backward compatibility)', async () => {
  const response = await makeRequest(`${API_URL}/api/question-bank/bank/search?q=${encodeURIComponent('测试')}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.teacherToken}`,
    },
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.success, 'Content search should still work');
  assert(result.data, 'Should return data array');

  log(`  Content search "测试" found ${result.data.length} results`, colors.cyan);
});

// ========== BUG #11: Profile edit returns realName (camelCase) ==========
log('\n========== Bug #11: Profile Edit Field Naming ===========', colors.blue);

await test('Bug #11.1 - PUT /api/users/profile returns camelCase realName (Teacher)', async () => {
  const timestamp = Date.now();
  const newName = `Bug11Test-${timestamp}`;

  const response = await makeRequest(`${API_URL}/api/users/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${testData.teacherToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      realName: newName,
      phone: '13800000001',
    }),
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.success || result.message === '用户信息更新成功', 'Update should succeed');
  assert(result.user, 'Should return updated user object');

  // Bug #11 fix verification: should return realName (camelCase), not real_name (snake_case)
  assert(result.user.realName !== undefined, 'Should return realName field (camelCase)');
  assert(result.user.realName === newName, `realName should be updated to ${newName}`);
  assert(result.user.real_name === undefined, 'Should NOT return real_name field (snake_case)');

  log(`  ✅ Returns camelCase: realName = "${result.user.realName}"`, colors.cyan);
});

await test('Bug #11.2 - PUT /api/users/profile returns camelCase realName (Student)', async () => {
  await loginAsStudent();

  const timestamp = Date.now();
  const newName = `StudentBug11-${timestamp}`;

  const response = await makeRequest(`${API_URL}/api/users/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${testData.studentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      realName: newName,
      grade: '五年级',
    }),
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.success || result.message === '用户信息更新成功', 'Update should succeed');
  assert(result.user, 'Should return updated user object');

  // Verify camelCase naming
  assert(result.user.realName !== undefined, 'Student should also return realName field (camelCase)');
  assert(result.user.realName === newName, `realName should be updated to ${newName}`);
  assert(result.user.real_name === undefined, 'Should NOT return real_name field (snake_case)');

  log(`  ✅ Student also returns camelCase: realName = "${result.user.realName}"`, colors.cyan);
});

await test('Bug #11.3 - Verify consistency with GET /api/users/profile', async () => {
  const response = await makeRequest(`${API_URL}/api/users/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${testData.teacherToken}`,
    },
  });

  assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);

  const result = JSON.parse(response.body);
  assert(result.realName !== undefined, 'GET profile should also return realName (camelCase)');
  assert(result.real_name === undefined, 'GET profile should NOT return real_name (snake_case)');

  log(`  ✅ GET /api/users/profile also uses camelCase: realName = "${result.realName}"`, colors.cyan);
});

  // ========== TEST SUMMARY ==========
  log('\n========== Test Summary ==========', colors.blue);
  log(`Total Tests: ${totalTests}`, colors.cyan);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${failedTests}`, colors.red);

  if (failedTests === 0) {
    log('\n✅ All Bug Fix API tests passed!', colors.green);
    process.exit(0);
  } else {
    log('\n❌ Some tests failed', colors.red);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
