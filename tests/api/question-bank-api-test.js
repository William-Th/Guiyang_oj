/**
 * API Test: Question Bank
 * Tests all question bank API endpoints including CRUD operations
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
    throw new Error(message || 'Assertion failed');
  }
}

// Login helpers
async function loginAsTeacher() {
  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'teacher01',
      password: 'password123',
    }),
  });

  assert(response.statusCode === 200, 'Teacher login should succeed');
  const data = JSON.parse(response.body);
  return data.token;
}

async function loginAsAdmin() {
  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'password123',
    }),
  });

  assert(response.statusCode === 200, 'Admin login should succeed');
  const data = JSON.parse(response.body);
  return data.token;
}

async function loginAsStudent() {
  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: '520102200801011234',
      password: 'password123',
    }),
  });

  assert(response.statusCode === 200, 'Student login should succeed');
  const data = JSON.parse(response.body);
  return data.token;
}

// Test suite
async function runTests() {
  log('\n=== Question Bank API Tests ===\n', colors.cyan);

  let teacherToken;
  let adminToken;
  let studentToken;
  let createdQuestionId;

  // Authentication Tests
  log('\n--- Authentication Tests ---\n', colors.yellow);

  await test('Teacher can login', async () => {
    teacherToken = await loginAsTeacher();
    assert(teacherToken, 'Should receive token');
  });

  await test('Admin can login', async () => {
    adminToken = await loginAsAdmin();
    assert(adminToken, 'Should receive token');
  });

  await test('Student can login', async () => {
    studentToken = await loginAsStudent();
    assert(studentToken, 'Should receive token');
  });

  // Create Question Tests
  log('\n--- Create Question Tests ---\n', colors.yellow);

  await test('Teacher can create single choice question', async () => {
    const questionData = {
      type: 'single',
      subject: '数学',
      grade: '三年级',
      content: '1 + 1 = ?',
      options: ['1', '2', '3', '4'],
      correct_answer: 'B',
      score: 5,
      difficulty: 'easy',
      explanation: '基础加法运算',
      tags: ['加法', '基础运算'],
    };

    const response = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
    });

    assert(response.statusCode === 201, 'Should return 201');
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(data.data.id, 'Should return question ID');
    createdQuestionId = data.data.id;
    log(`  Created question ID: ${createdQuestionId}`, colors.blue);
  });

  await test('Admin can create multiple choice question', async () => {
    const questionData = {
      type: 'multiple',
      subject: '语文',
      grade: '三年级',
      content: '下列哪些是声母？',
      options: ['a', 'b', 'c', 'd'],
      correct_answer: ['B', 'C', 'D'],
      score: 10,
      difficulty: 'medium',
    };

    const response = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
    });

    assert(response.statusCode === 201, 'Should return 201');
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
  });

  await test('Student cannot create question', async () => {
    const questionData = {
      type: 'single',
      subject: '数学',
      grade: '三年级',
      content: 'Test question',
      options: ['A', 'B'],
      correct_answer: 'A',
    };

    const response = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
    });

    assert(response.statusCode === 403, 'Should return 403 Forbidden');
  });

  // Read Question Tests
  log('\n--- Read Question Tests ---\n', colors.yellow);

  await test('Teacher can get all questions', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200');
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(Array.isArray(data.data), 'Should return array');
    log(`  Found ${data.data.length} questions`, colors.blue);
  });

  await test('Get questions with subject filter', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/bank?subject=数学`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200');
    const data = JSON.parse(response.body);
    assert(Array.isArray(data.data), 'Should return array');
    data.data.forEach(q => {
      assert(q.subject === '数学', 'All questions should be 数学');
    });
  });

  await test('Get questions with grade filter', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/bank?grade=三年级`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200');
    const data = JSON.parse(response.body);
    assert(Array.isArray(data.data), 'Should return array');
  });

  await test('Get single question by ID', async () => {
    if (!createdQuestionId) {
      throw new Error('No question ID available');
    }

    const response = await makeRequest(
      `${API_URL}/api/question-bank/bank/${createdQuestionId}`,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );

    assert(response.statusCode === 200, 'Should return 200');
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(data.data.id === createdQuestionId, 'Should return correct question');
  });

  await test('Search questions by content', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/bank/search?q=1+1`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200');
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(Array.isArray(data.data), 'Should return array');
  });

  // Update Question Tests
  log('\n--- Update Question Tests ---\n', colors.yellow);

  await test('Teacher can update question', async () => {
    if (!createdQuestionId) {
      throw new Error('No question ID available');
    }

    const updateData = {
      content: '1 + 1 = ? (Updated)',
      difficulty: 'medium',
    };

    const response = await makeRequest(
      `${API_URL}/api/question-bank/bank/${createdQuestionId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    assert(response.statusCode === 200, 'Should return 200');
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(data.data.content.includes('Updated'), 'Content should be updated');
  });

  await test('Student cannot update question', async () => {
    if (!createdQuestionId) {
      throw new Error('No question ID available');
    }

    const updateData = { difficulty: 'hard' };

    const response = await makeRequest(
      `${API_URL}/api/question-bank/bank/${createdQuestionId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    assert(response.statusCode === 403, 'Should return 403 Forbidden');
  });

  // Category Tests
  log('\n--- Category Tests ---\n', colors.yellow);

  await test('Get all categories', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/categories`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200');
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(Array.isArray(data.data), 'Should return array');
  });

  // Delete Question Tests
  log('\n--- Delete Question Tests ---\n', colors.yellow);

  await test('Teacher cannot delete question (admin only)', async () => {
    if (!createdQuestionId) {
      throw new Error('No question ID available');
    }

    const response = await makeRequest(
      `${API_URL}/api/question-bank/bank/${createdQuestionId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );

    assert(response.statusCode === 403, 'Should return 403 Forbidden');
  });

  await test('Admin can delete question', async () => {
    if (!createdQuestionId) {
      throw new Error('No question ID available');
    }

    const response = await makeRequest(
      `${API_URL}/api/question-bank/bank/${createdQuestionId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    assert(response.statusCode === 200, 'Should return 200');
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
  });

  await test('Cannot get deleted question', async () => {
    if (!createdQuestionId) {
      throw new Error('No question ID available');
    }

    const response = await makeRequest(
      `${API_URL}/api/question-bank/bank/${createdQuestionId}`,
      {
        headers: { Authorization: `Bearer ${teacherToken}` },
      }
    );

    assert(response.statusCode === 404, 'Should return 404');
  });

  // Print summary
  log('\n=== Test Summary ===\n', colors.cyan);
  log(`Total Tests: ${totalTests}`, colors.blue);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${failedTests}`, colors.red);
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, colors.yellow);

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\nTest suite error: ${error.message}`, colors.red);
  process.exit(1);
});
