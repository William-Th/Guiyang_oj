/**
 * API Test: Activity Permission Boundaries (P1 - High Priority)
 *
 * Tests activity creation permissions across different admin levels
 *
 * Test Scenarios:
 * - APB001: School admin cannot create assessment activities (403 rejection)
 * - APB002: District admin can create assessment activities
 * - APB003: Base school admin can create assessment activities
 * - APB004: Municipal school admin can create assessment activities
 * - APB005: Municipal admin can create assessment activities
 * - APB006: Activity scope is auto-determined by user role
 * - APB007: All admin levels can create practice activities
 *
 * Related Files:
 * - backend/src/middleware/activityPermission.js
 * - backend/src/routes/activities.js
 * - docs/COMPREHENSIVE_PERMISSION_GUIDE.md
 * - docs/PERMISSION_TEST_COVERAGE_ANALYSIS.md
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
  magenta: '\x1b[35m',
};

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Test data storage
let testData = {
  adminToken: null,                      // admin (system_admin - highest level)
  districtAdminToken: null,              // yunyan_admin (district_admin)
  baseSchoolAdminToken: null,            // base_school_admin (base_school_admin)
  municipalSchoolAdminToken: null,       // municipal_school_admin (municipal_school_admin)
  schoolAdminToken: null,                // school_admin_01 (school_admin)
  teacherToken: null,                    // teacher_yy_ps_math (teacher)

  // Created activity IDs for cleanup
  createdActivityIds: [],
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
    if (error.response) {
      log(`  Response: ${error.response}`, colors.red);
    }
  }
}

function assert(condition, message, response = null) {
  if (!condition) {
    const error = new Error(message || 'Assertion failed');
    if (response) {
      error.response = response;
    }
    throw error;
  }
}

// Login helpers
async function login(username, password) {
  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  assert(response.statusCode === 200, `Login should succeed for ${username}`, response.body);
  const data = JSON.parse(response.body);
  return data.token;
}

// Activity creation helper
async function createAssessment(token, activityData = {}) {
  const defaultData = {
    title: `测试测评-${Date.now()}`,
    description: '测试用测评活动',
    subject: '数学',
    grade: '三年级',
    abilityLevel: 'L3',
    duration: 60,
    totalScore: 100,
    passScore: 60,
    timeLimitType: 'unlimited',
  };

  const data = { ...defaultData, ...activityData };

  const response = await makeRequest(`${API_URL}/api/activities/assessment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return response;
}

async function createPractice(token, activityData = {}) {
  const defaultData = {
    title: `测试练习-${Date.now()}`,
    description: '测试用练习活动',
    subject: '数学',
    grade: '三年级',
    abilityLevel: 'L3',
    duration: 60,
    totalScore: 100,
    passScore: 60,
    timeLimitType: 'unlimited',
  };

  const data = { ...defaultData, ...activityData };

  const response = await makeRequest(`${API_URL}/api/activities/practice`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return response;
}

// Test suite
async function runTests() {
  log('\n=== Activity Permission Boundaries API Tests (P1 - High Priority) ===\n', colors.cyan);
  log('Testing activity creation permissions across different admin levels\n', colors.cyan);

  // ========== Authentication Tests ==========
  log('\n--- 1. Authentication: Login all roles ---\n', colors.yellow);

  await test('APB-AUTH-01: System admin can login', async () => {
    testData.adminToken = await login('admin', 'password123');
    assert(testData.adminToken, 'Should receive token');
  });

  await test('APB-AUTH-02: District admin can login', async () => {
    testData.districtAdminToken = await login('yunyan_admin', 'password123');
    assert(testData.districtAdminToken, 'Should receive token');
  });

  await test('APB-AUTH-03: Base school admin can login', async () => {
    testData.baseSchoolAdminToken = await login('base_school_admin', 'password123');
    assert(testData.baseSchoolAdminToken, 'Should receive token');
  });

  await test('APB-AUTH-04: Municipal school admin can login', async () => {
    testData.municipalSchoolAdminToken = await login('municipal_school_admin', 'password123');
    assert(testData.municipalSchoolAdminToken, 'Should receive token');
  });

  await test('APB-AUTH-05: School admin can login', async () => {
    testData.schoolAdminToken = await login('school_admin_01', 'password123');
    assert(testData.schoolAdminToken, 'Should receive token');
  });

  await test('APB-AUTH-06: Teacher can login', async () => {
    testData.teacherToken = await login('teacher_yy_ps_math', 'password123');
    assert(testData.teacherToken, 'Should receive token');
  });

  // ========== Assessment Creation Permission Tests ==========
  log('\n--- 2. Assessment Creation Permissions (Critical!) ---\n', colors.yellow);

  await test('APB001: School admin cannot create assessment (403)', async () => {
    const response = await createAssessment(testData.schoolAdminToken, {
      title: `APB001-校级管理员测试-${Date.now()}`,
    });

    // Critical: School admin MUST be rejected
    assert(
      response.statusCode === 403,
      `School admin should be rejected (got ${response.statusCode})`,
      response.body
    );

    const errorData = JSON.parse(response.body);
    log(`  Rejection message: ${errorData.message}`, colors.blue);

    // Verify error message mentions permission
    assert(
      errorData.message && errorData.message.includes('没有权限'),
      'Error message should mention permission denial',
      response.body
    );

    log(`  ✓ School admin correctly rejected from creating assessments`, colors.green);
  });

  await test('APB002: District admin can create assessment', async () => {
    const response = await createAssessment(testData.districtAdminToken, {
      title: `APB002-区级管理员测试-${Date.now()}`,
    });

    assert(
      response.statusCode === 201,
      `District admin should create assessment successfully (got ${response.statusCode})`,
      response.body
    );

    const data = JSON.parse(response.body);
    assert(data.success === true, 'Response should be successful');
    assert(data.activity, 'Should return activity object');
    assert(data.activity.type === 'assessment', 'Activity type should be assessment');

    testData.createdActivityIds.push(data.activity.id);
    log(`  Created assessment ID: ${data.activity.id}`, colors.blue);
  });

  await test('APB003: Base school admin can create assessment', async () => {
    const response = await createAssessment(testData.baseSchoolAdminToken, {
      title: `APB003-基地校管理员测试-${Date.now()}`,
    });

    assert(
      response.statusCode === 201,
      `Base school admin should create assessment successfully (got ${response.statusCode})`,
      response.body
    );

    const data = JSON.parse(response.body);
    assert(data.success === true, 'Response should be successful');
    assert(data.activity.type === 'assessment', 'Activity type should be assessment');

    testData.createdActivityIds.push(data.activity.id);
    log(`  Created assessment ID: ${data.activity.id}`, colors.blue);
  });

  await test('APB004: Municipal school admin can create assessment', async () => {
    const response = await createAssessment(testData.municipalSchoolAdminToken, {
      title: `APB004-市直学校管理员测试-${Date.now()}`,
    });

    assert(
      response.statusCode === 201,
      `Municipal school admin should create assessment successfully (got ${response.statusCode})`,
      response.body
    );

    const data = JSON.parse(response.body);
    assert(data.success === true, 'Response should be successful');
    assert(data.activity.type === 'assessment', 'Activity type should be assessment');

    testData.createdActivityIds.push(data.activity.id);
    log(`  Created assessment ID: ${data.activity.id}`, colors.blue);
  });

  await test('APB005: System admin can create assessment', async () => {
    const response = await createAssessment(testData.adminToken, {
      title: `APB005-系统管理员测试-${Date.now()}`,
    });

    assert(
      response.statusCode === 201,
      `System admin should create assessment successfully (got ${response.statusCode})`,
      response.body
    );

    const data = JSON.parse(response.body);
    assert(data.success === true, 'Response should be successful');
    assert(data.activity.type === 'assessment', 'Activity type should be assessment');

    testData.createdActivityIds.push(data.activity.id);
    log(`  Created assessment ID: ${data.activity.id}`, colors.blue);
  });

  // ========== Scope Auto-Determination Tests ==========
  log('\n--- 3. Activity Scope Auto-Determination ---\n', colors.yellow);

  await test('APB006: Activity scope is auto-determined by user role', async () => {
    // Test teacher → class scope
    const teacherResponse = await createPractice(testData.teacherToken, {
      title: `APB006-教师练习-${Date.now()}`,
    });

    assert(teacherResponse.statusCode === 201, 'Teacher should create practice', teacherResponse.body);
    const teacherData = JSON.parse(teacherResponse.body);
    assert(teacherData.activity.scope === 'class', 'Teacher activity scope should be "class"');
    testData.createdActivityIds.push(teacherData.activity.id);
    log(`  Teacher activity scope: ${teacherData.activity.scope} ✓`, colors.blue);

    // Test school admin → school scope
    const schoolAdminResponse = await createPractice(testData.schoolAdminToken, {
      title: `APB006-校级管理员练习-${Date.now()}`,
    });

    assert(schoolAdminResponse.statusCode === 201, 'School admin should create practice', schoolAdminResponse.body);
    const schoolAdminData = JSON.parse(schoolAdminResponse.body);
    assert(schoolAdminData.activity.scope === 'school', 'School admin activity scope should be "school"');
    testData.createdActivityIds.push(schoolAdminData.activity.id);
    log(`  School admin activity scope: ${schoolAdminData.activity.scope} ✓`, colors.blue);

    // Test district admin → district scope (assessment)
    const districtResponse = await createAssessment(testData.districtAdminToken, {
      title: `APB006-区级管理员测评-${Date.now()}`,
    });

    assert(districtResponse.statusCode === 201, 'District admin should create assessment', districtResponse.body);
    const districtData = JSON.parse(districtResponse.body);
    assert(districtData.activity.scope === 'district', 'District admin activity scope should be "district"');
    testData.createdActivityIds.push(districtData.activity.id);
    log(`  District admin activity scope: ${districtData.activity.scope} ✓`, colors.blue);

    // Test base school admin → base_school scope
    const baseSchoolResponse = await createAssessment(testData.baseSchoolAdminToken, {
      title: `APB006-基地校管理员测评-${Date.now()}`,
    });

    assert(baseSchoolResponse.statusCode === 201, 'Base school admin should create assessment', baseSchoolResponse.body);
    const baseSchoolData = JSON.parse(baseSchoolResponse.body);
    assert(baseSchoolData.activity.scope === 'base_school', 'Base school admin activity scope should be "base_school"');
    testData.createdActivityIds.push(baseSchoolData.activity.id);
    log(`  Base school admin activity scope: ${baseSchoolData.activity.scope} ✓`, colors.blue);

    // Test municipal school admin → municipal_school scope
    const municipalSchoolResponse = await createAssessment(testData.municipalSchoolAdminToken, {
      title: `APB006-市直学校管理员测评-${Date.now()}`,
    });

    assert(municipalSchoolResponse.statusCode === 201, 'Municipal school admin should create assessment', municipalSchoolResponse.body);
    const municipalSchoolData = JSON.parse(municipalSchoolResponse.body);
    assert(municipalSchoolData.activity.scope === 'municipal_school', 'Municipal school admin activity scope should be "municipal_school"');
    testData.createdActivityIds.push(municipalSchoolData.activity.id);
    log(`  Municipal school admin activity scope: ${municipalSchoolData.activity.scope} ✓`, colors.blue);

    // Test system admin → system scope
    const systemResponse = await createAssessment(testData.adminToken, {
      title: `APB006-系统管理员测评-${Date.now()}`,
    });

    assert(systemResponse.statusCode === 201, 'System admin should create assessment', systemResponse.body);
    const systemData = JSON.parse(systemResponse.body);
    assert(systemData.activity.scope === 'system', 'System admin activity scope should be "system"');
    testData.createdActivityIds.push(systemData.activity.id);
    log(`  System admin activity scope: ${systemData.activity.scope} ✓`, colors.blue);

    log(`  All roles have correct scope auto-determination ✓`, colors.green);
  });

  // ========== Practice Creation Permission Tests ==========
  log('\n--- 4. Practice Creation Permissions (All should succeed) ---\n', colors.yellow);

  await test('APB007: All admin levels can create practice activities', async () => {
    // Teacher
    const teacherResponse = await createPractice(testData.teacherToken, {
      title: `APB007-教师练习-${Date.now()}`,
    });
    assert(teacherResponse.statusCode === 201, 'Teacher should create practice', teacherResponse.body);
    const teacherData = JSON.parse(teacherResponse.body);
    testData.createdActivityIds.push(teacherData.activity.id);
    log(`  Teacher can create practice ✓`, colors.blue);

    // School admin
    const schoolResponse = await createPractice(testData.schoolAdminToken, {
      title: `APB007-校级管理员练习-${Date.now()}`,
    });
    assert(schoolResponse.statusCode === 201, 'School admin should create practice', schoolResponse.body);
    const schoolData = JSON.parse(schoolResponse.body);
    testData.createdActivityIds.push(schoolData.activity.id);
    log(`  School admin can create practice ✓`, colors.blue);

    // District admin
    const districtResponse = await createPractice(testData.districtAdminToken, {
      title: `APB007-区级管理员练习-${Date.now()}`,
    });
    assert(districtResponse.statusCode === 201, 'District admin should create practice', districtResponse.body);
    const districtData = JSON.parse(districtResponse.body);
    testData.createdActivityIds.push(districtData.activity.id);
    log(`  District admin can create practice ✓`, colors.blue);

    // Base school admin
    const baseSchoolResponse = await createPractice(testData.baseSchoolAdminToken, {
      title: `APB007-基地校管理员练习-${Date.now()}`,
    });
    assert(baseSchoolResponse.statusCode === 201, 'Base school admin should create practice', baseSchoolResponse.body);
    const baseSchoolData = JSON.parse(baseSchoolResponse.body);
    testData.createdActivityIds.push(baseSchoolData.activity.id);
    log(`  Base school admin can create practice ✓`, colors.blue);

    // Municipal school admin
    const municipalSchoolResponse = await createPractice(testData.municipalSchoolAdminToken, {
      title: `APB007-市直学校管理员练习-${Date.now()}`,
    });
    assert(municipalSchoolResponse.statusCode === 201, 'Municipal school admin should create practice', municipalSchoolResponse.body);
    const municipalSchoolData = JSON.parse(municipalSchoolResponse.body);
    testData.createdActivityIds.push(municipalSchoolData.activity.id);
    log(`  Municipal school admin can create practice ✓`, colors.blue);

    // System admin
    const systemResponse = await createPractice(testData.adminToken, {
      title: `APB007-系统管理员练习-${Date.now()}`,
    });
    assert(systemResponse.statusCode === 201, 'System admin should create practice', systemResponse.body);
    const systemData = JSON.parse(systemResponse.body);
    testData.createdActivityIds.push(systemData.activity.id);
    log(`  System admin can create practice ✓`, colors.blue);

    log(`  All roles can create practice activities ✓`, colors.green);
  });

  // ========== Test Summary ==========
  log('\n--- Test Summary ---\n', colors.cyan);
  log(`Total tests: ${totalTests}`, colors.blue);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.green);
  log(`\nCreated ${testData.createdActivityIds.length} test activities`, colors.blue);

  if (failedTests === 0) {
    log('\n✓ All activity permission boundary tests passed!', colors.green);
    log('Activity creation permissions are correctly enforced across all admin levels.', colors.green);
  } else {
    log(`\n✗ ${failedTests} test(s) failed. Please check the errors above.`, colors.red);
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  log(`\n✗ Test suite failed with error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
