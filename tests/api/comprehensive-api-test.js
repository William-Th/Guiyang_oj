/**
 * Comprehensive API Test Suite
 * Tests: Question Review, User Management, System Configuration
 * Date: 2025-10-30
 */

const http = require('http');

// Test configuration
const API_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 10000; // 10 seconds

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let testStartTime;

// Test user credentials
const TEST_USERS = {
  teacher: { username: 'teacher_yy_ps_math', password: 'password123' },
  admin: { username: 'admin', password: 'password123' },
  student: { username: '520102200801011234', password: 'password123' }
};

// Global tokens for authenticated requests
const tokens = {};

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
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            json: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            json: null
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function login(username, password) {
  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    body: { username, password }
  });

  if (response.statusCode === 200 && response.json.token) {
    return response.json.token;
  }
  throw new Error(`Login failed for ${username}: ${response.json?.message || 'Unknown error'}`);
}

async function runTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    log(`�?${testName}`, colors.green);
    return true;
  } catch (error) {
    failedTests++;
    log(`�?${testName}`, colors.red);
    log(`  Error: ${error.message}`, colors.red);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertStatus(response, expectedStatus, message) {
  if (response.statusCode !== expectedStatus) {
    throw new Error(
      message ||
      `Expected status ${expectedStatus}, got ${response.statusCode}. Body: ${response.body}`
    );
  }
}

// Test suites
async function setupAuthentication() {
  log('\n=== Setting up authentication ===', colors.cyan);

  try {
    tokens.teacher = await login(TEST_USERS.teacher.username, TEST_USERS.teacher.password);
    log('�?Teacher login successful', colors.green);
  } catch (error) {
    log(`�?Teacher login failed: ${error.message}`, colors.red);
  }

  try {
    tokens.admin = await login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    log('�?Admin login successful', colors.green);
  } catch (error) {
    log(`�?Admin login failed: ${error.message}`, colors.red);
  }

  try {
    tokens.student = await login(TEST_USERS.student.username, TEST_USERS.student.password);
    log('�?Student login successful', colors.green);
  } catch (error) {
    log(`�?Student login failed: ${error.message}`, colors.red);
  }
}

// ==================== Question Review API Tests ====================
async function testQuestionReviewAPI() {
  log('\n=== Testing Question Review API ===', colors.magenta);

  // Test 1: Get drafts (teacher)
  await runTest('QR-001: Get teacher drafts', async () => {
    const response = await makeRequest(`${API_URL}/api/question-review/drafts`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 200, 'Should return 200 for getting drafts');
    assert(response.json.success, 'Response should indicate success');
    assert(Array.isArray(response.json.data), 'Should return array of drafts');
  });

  // Test 2: Get my submissions (teacher)
  await runTest('QR-002: Get teacher submissions', async () => {
    const response = await makeRequest(`${API_URL}/api/question-review/my-submissions`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 200, 'Should return 200 for getting submissions');
    assert(response.json.success, 'Response should indicate success');
    assert(Array.isArray(response.json.data), 'Should return array of submissions');
  });

  // Test 3: Get available reviewers - missing subject parameter
  await runTest('QR-003: Get reviewers without subject (should fail)', async () => {
    const response = await makeRequest(`${API_URL}/api/question-review/available-reviewers`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 400, 'Should return 400 for missing subject');
    assert(!response.json.success, 'Response should indicate failure');
  });

  // Test 4: Get available reviewers - with subject
  await runTest('QR-004: Get reviewers with subject', async () => {
    const response = await makeRequest(
      `${API_URL}/api/question-review/available-reviewers?subject=数学&scope=practice`,
      { headers: { Authorization: `Bearer ${tokens.teacher}` } }
    );
    assertStatus(response, 200, 'Should return 200 for getting reviewers');
    assert(response.json.success, 'Response should indicate success');
    assert(Array.isArray(response.json.data), 'Should return array of reviewers');
  });

  // Test 5: Unauthorized access
  await runTest('QR-005: Access without authentication (should fail)', async () => {
    const response = await makeRequest(`${API_URL}/api/question-review/drafts`);
    assert(
      response.statusCode === 401 || response.statusCode === 403,
      'Should return 401 or 403 for unauthorized access'
    );
  });
}

// ==================== User Management API Tests ====================
async function testUserManagementAPI() {
  log('\n=== Testing User Management API ===', colors.magenta);

  // Test 1: Get current user profile (teacher)
  await runTest('UM-001: Get teacher profile', async () => {
    const response = await makeRequest(`${API_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 200, 'Should return 200 for getting profile');
    assert(response.json.user, 'Should return user object');
    assert(response.json.user.username, 'User should have username');
    assert(!response.json.user.password, 'Password should not be in response');
  });

  // Test 2: Get current user profile (admin)
  await runTest('UM-002: Get admin profile', async () => {
    const response = await makeRequest(`${API_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    assertStatus(response, 200, 'Should return 200 for getting profile');
    assert(response.json.user, 'Should return user object');
    assert(response.json.user.role, 'User should have role');
  });

  // Test 3: Get current user profile (student)
  await runTest('UM-003: Get student profile', async () => {
    const response = await makeRequest(`${API_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });
    assertStatus(response, 200, 'Should return 200 for getting profile');
    assert(response.json.user, 'Should return user object');
    assertEqual(response.json.user.role, 'student', 'User role should be student');
  });

  // Test 4: Update user profile
  await runTest('UM-004: Update teacher profile', async () => {
    const response = await makeRequest(`${API_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokens.teacher}` },
      body: {
        realName: '李老师-测试',
        phone: '13800138000'
      }
    });
    assertStatus(response, 200, 'Should return 200 for updating profile');
    assert(response.json.message, 'Should return success message');
  });

  // Test 5: Get all users (admin only)
  await runTest('UM-005: Admin get all users', async () => {
    const response = await makeRequest(`${API_URL}/api/users/all`, {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    assertStatus(response, 200, 'Should return 200 for admin getting all users');
    assert(Array.isArray(response.json) || Array.isArray(response.json.users), 'Should return array of users');
  });

  // Test 6: Get all users (teacher - should fail)
  await runTest('UM-006: Teacher get all users (should fail)', async () => {
    const response = await makeRequest(`${API_URL}/api/users/all`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assert(
      response.statusCode === 403,
      'Should return 403 for non-admin accessing all users'
    );
  });

  // Test 7: Filter users by role (admin)
  await runTest('UM-007: Admin filter users by role', async () => {
    const response = await makeRequest(`${API_URL}/api/users/all?role=teacher`, {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    assertStatus(response, 200, 'Should return 200 for filtered users');
  });

  // Test 8: Unauthorized access
  await runTest('UM-008: Access without authentication (should fail)', async () => {
    const response = await makeRequest(`${API_URL}/api/users/profile`);
    assert(
      response.statusCode === 401 || response.statusCode === 403,
      'Should return 401 or 403 for unauthorized access'
    );
  });
}

// ==================== Question Bank API Tests ====================
async function testQuestionBankAPI() {
  log('\n=== Testing Question Bank API ===', colors.magenta);

  // Test 1: Get all question banks (teacher)
  await runTest('QB-001: Get all question banks', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 200, 'Should return 200 for getting question banks');
    assert(response.json.success, 'Response should indicate success');
    assert(Array.isArray(response.json.data) || Array.isArray(response.json.questions), 'Should return question bank list');
  });

  // Test 2: Filter by subject
  await runTest('QB-002: Filter question banks by subject', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/bank?subject=${encodeURIComponent('数学')}`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 200, 'Should return 200 for filtered questions');
    assert(response.json.success, 'Response should indicate success');
  });

  // Test 3: Filter by grade
  await runTest('QB-003: Filter question banks by grade', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/bank?grade=${encodeURIComponent('三年�?)}`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 200, 'Should return 200 for filtered questions');
    assert(response.json.success, 'Response should indicate success');
  });

  // Test 4: Filter by status
  await runTest('QB-004: Filter question banks by status', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/bank?status=approved`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 200, 'Should return 200 for filtered questions');
    assert(response.json.success, 'Response should indicate success');
  });

  // Test 5: Pagination
  await runTest('QB-005: Question bank pagination', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/bank?limit=10&offset=0`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 200, 'Should return 200 for paginated questions');
    assert(response.json.success, 'Response should indicate success');
  });
}

// ==================== Activity API Tests ====================
async function testActivityAPI() {
  log('\n=== Testing Activity API ===', colors.magenta);

  // Test 1: Get all activities (teacher)
  await runTest('ACT-001: Get teacher activities', async () => {
    const response = await makeRequest(`${API_URL}/api/activities`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 200, 'Should return 200 for getting activities');
    assert(response.json.activities || Array.isArray(response.json), 'Should return activities list');
  });

  // Test 2: Get student practice activities
  await runTest('ACT-002: Get student practice activities', async () => {
    const response = await makeRequest(`${API_URL}/api/student/activities/practice`, {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });
    assertStatus(response, 200, 'Should return 200 for student practice activities');
    assert(response.json.success || Array.isArray(response.json.activities) || Array.isArray(response.json),
      'Should return practice activities list');
  });

  // Test 3: Filter activities by type
  await runTest('ACT-003: Filter activities by type', async () => {
    const response = await makeRequest(`${API_URL}/api/activities?type=practice`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assertStatus(response, 200, 'Should return 200 for filtered activities');
  });
}

// ==================== Permission API Tests ====================
async function testPermissionAPI() {
  log('\n=== Testing Permission API ===', colors.magenta);

  // Test 1: Get teacher permissions
  await runTest('PERM-001: Get teacher permissions', async () => {
    const response = await makeRequest(`${API_URL}/api/permissions/teacher`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });
    assert(
      response.statusCode === 200 || response.statusCode === 404,
      'Should return 200 or 404 for permissions'
    );
  });

  // Test 2: Get all permissions (admin)
  await runTest('PERM-002: Admin get all permissions', async () => {
    const response = await makeRequest(`${API_URL}/api/permissions`, {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    assert(
      response.statusCode === 200 || response.statusCode === 403,
      'Should return 200 or 403'
    );
  });
}

// ==================== Health Check ====================
async function testHealthCheck() {
  log('\n=== Testing System Health ===', colors.magenta);

  await runTest('HEALTH-001: API health check', async () => {
    const response = await makeRequest(`${API_URL}/health`);
    assertStatus(response, 200, 'Health endpoint should return 200');
  });

  await runTest('HEALTH-002: API root endpoint', async () => {
    const response = await makeRequest(`${API_URL}/`);
    assert(
      response.statusCode === 200 || response.statusCode === 404,
      'Root endpoint should be accessible'
    );
  });
}

// ==================== Main Test Runner ====================
async function runAllTests() {
  testStartTime = Date.now();

  log('╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('�?       Comprehensive API Test Suite                       �?, colors.cyan);
  log('�?       Question Review, User Management, System Config     �?, colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);

  try {
    // Setup
    await setupAuthentication();

    // Run test suites
    await testHealthCheck();
    await testQuestionReviewAPI();
    await testUserManagementAPI();
    await testQuestionBankAPI();
    await testActivityAPI();
    await testPermissionAPI();

  } catch (error) {
    log(`\n�?Test execution error: ${error.message}`, colors.red);
  }

  // Print summary
  const duration = ((Date.now() - testStartTime) / 1000).toFixed(2);

  log('\n' + '='.repeat(60), colors.cyan);
  log('Test Summary', colors.cyan);
  log('='.repeat(60), colors.cyan);
  log(`Total Tests:  ${totalTests}`, colors.blue);
  log(`Passed:       ${passedTests}`, colors.green);
  log(`Failed:       ${failedTests}`, failedTests > 0 ? colors.red : colors.green);
  log(`Duration:     ${duration}s`, colors.blue);
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`,
    passedTests === totalTests ? colors.green : colors.yellow);
  log('='.repeat(60), colors.cyan);

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  log(`\nUnhandled rejection: ${error.message}`, colors.red);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`\nUncaught exception: ${error.message}`, colors.red);
  process.exit(1);
});

// Run tests
log('\nStarting API tests...', colors.yellow);
log(`Target: ${API_URL}`, colors.yellow);
log(`Timeout: ${TEST_TIMEOUT}ms\n`, colors.yellow);

runAllTests();
