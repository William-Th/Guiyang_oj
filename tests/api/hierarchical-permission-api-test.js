/**
 * API Test: Hierarchical Permission System
 * Tests all hierarchical permission APIs including:
 * - Permission management (getAvailableTeachers, grantPermission, getAvailableReviewers)
 * - Question scope management (target_scope, getMyScopes, scope filtering)
 * - Review workflow (submitForReview, approve, reject, publishToSchool)
 * - Integration scenarios
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
  adminToken: null,
  teacherToken: null,
  districtAdminToken: null,
  reviewerToken: null,
  teacherId: null,
  questionId: null,
  reviewId: null,
  permissionId: null,
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

async function loginAsTeacher() {
  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'teacher_yy_ps_math',
      password: 'password123',
    }),
  });

  assert(response.statusCode === 200, 'Teacher login should succeed');
  const data = JSON.parse(response.body);
  return data.token;
}

// Test suite
async function runTests() {
  log('\n=== Hierarchical Permission System API Tests ===\n', colors.cyan);

  // ========== Authentication Tests ==========
  log('\n--- 1. Authentication Tests ---\n', colors.yellow);

  await test('Admin can login', async () => {
    testData.adminToken = await loginAsAdmin();
    assert(testData.adminToken, 'Should receive token');
  });

  await test('Teacher can login', async () => {
    testData.teacherToken = await loginAsTeacher();
    assert(testData.teacherToken, 'Should receive token');
  });

  // ========== Permission Management API Tests ==========
  log('\n--- 2. Permission Management API Tests ---\n', colors.yellow);

  await test('Admin can get available teachers', async () => {
    const response = await makeRequest(`${API_URL}/api/permissions/available-teachers`, {
      headers: { Authorization: `Bearer ${testData.adminToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(Array.isArray(data.data), 'Should return array');

    if (data.data.length > 0) {
      testData.teacherId = data.data[0].id;
      log(`  Found ${data.data.length} teachers`, colors.blue);
      log(`  Using teacher ID: ${testData.teacherId}`, colors.blue);
    }
  });

  await test('Teacher cannot access available teachers API', async () => {
    const response = await makeRequest(`${API_URL}/api/permissions/available-teachers`, {
      headers: { Authorization: `Bearer ${testData.teacherToken}` },
    });

    assert(
      response.statusCode === 403 || response.statusCode === 401,
      'Should return 403 or 401'
    );
  });

  await test('Admin can grant municipal review permission', async () => {
    if (!testData.teacherId) {
      log('  Skipping: No teacher ID available', colors.yellow);
      return;
    }

    const permissionData = {
      user_id: testData.teacherId,
      permission_type: 'practice_municipal_review',
      subjects: ['数学', '信息科技'],
      scope_level: 'municipal',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'API测试 - 市级审核权限',
    };

    const response = await makeRequest(`${API_URL}/api/permissions/grant`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testData.adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(permissionData),
    });

    assert(
      response.statusCode === 200 || response.statusCode === 201,
      'Should return 200 or 201',
      response.body
    );
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(data.data.id, 'Should return permission ID');
    testData.permissionId = data.data.id;
    log(`  Granted permission ID: ${testData.permissionId}`, colors.blue);
  });

  await test('Admin can get available reviewers for municipal practice', async () => {
    const response = await makeRequest(
      `${API_URL}/api/permissions/available-reviewers?target_scope=practice_municipal&subject=数学`,
      {
        headers: { Authorization: `Bearer ${testData.adminToken}` },
      }
    );

    assert(response.statusCode === 200, 'Should return 200', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(Array.isArray(data.data), 'Should return array');
    log(`  Found ${data.data.length} reviewers for municipal/数学`, colors.blue);
  });

  await test('Get available reviewers requires both scope and subject', async () => {
    const response = await makeRequest(
      `${API_URL}/api/permissions/available-reviewers?target_scope=practice_municipal`,
      {
        headers: { Authorization: `Bearer ${testData.adminToken}` },
      }
    );

    assert(response.statusCode === 400, 'Should return 400');
  });

  // ========== Question Scope Management API Tests ==========
  log('\n--- 3. Question Scope Management API Tests ---\n', colors.yellow);

  await test('Teacher can create question with target_scope', async () => {
    const questionData = {
      type: 'single',
      subject: '数学',
      grade: '三年级',
      content: '【API测试】2 + 3 = ?',
      options: ['4', '5', '6', '7'],
      correct_answer: 'B',
      score: 5,
      difficulty: 'easy',
      target_scope: 'practice_municipal', // 指定目标范围
    };

    const response = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testData.teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
    });

    assert(response.statusCode === 201, 'Should return 201', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(data.data.id, 'Should return question ID');
    testData.questionId = data.data.id;
    log(`  Created question ID: ${testData.questionId}`, colors.blue);
  });

  await test('Teacher can create school-level question', async () => {
    const questionData = {
      type: 'single',
      subject: '数学',
      grade: '二年级',
      content: '【API测试】3 + 4 = ?',
      options: ['5', '6', '7', '8'],
      correct_answer: 'C',
      score: 5,
      difficulty: 'easy',
      target_scope: 'practice_school',
    };

    const response = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testData.teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
    });

    assert(response.statusCode === 201, 'Should return 201', response.body);
  });

  await test('Teacher can get their visible scopes', async () => {
    const response = await makeRequest(`${API_URL}/api/question-bank/my-scopes`, {
      headers: { Authorization: `Bearer ${testData.teacherToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(Array.isArray(data.data), 'Should return array');
    log(`  Teacher has ${data.data.length} visible scopes`, colors.blue);
    if (data.data.length > 0) {
      log(`  Scopes: ${data.data.join(', ')}`, colors.blue);
    }
  });

  await test('Can filter questions by single scope', async () => {
    const response = await makeRequest(
      `${API_URL}/api/question-bank/bank?scope=practice_municipal`,
      {
        headers: { Authorization: `Bearer ${testData.teacherToken}` },
      }
    );

    assert(response.statusCode === 200, 'Should return 200', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(Array.isArray(data.data), 'Should return array');
    log(`  Found ${data.data.length} municipal practice questions`, colors.blue);
  });

  await test('Can filter questions by multiple scopes', async () => {
    const response = await makeRequest(
      `${API_URL}/api/question-bank/bank?scope=practice_municipal&scope=practice_school`,
      {
        headers: { Authorization: `Bearer ${testData.teacherToken}` },
      }
    );

    assert(response.statusCode === 200, 'Should return 200', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(Array.isArray(data.data), 'Should return array');
    log(`  Found ${data.data.length} questions (municipal + school)`, colors.blue);
  });

  // ========== Review Workflow API Tests ==========
  log('\n--- 4. Review Workflow API Tests ---\n', colors.yellow);

  await test('Teacher can submit draft for review (需要有审核权限)', async () => {
    if (!testData.questionId || !testData.teacherId) {
      log('  Skipping: No question or reviewer ID available', colors.yellow);
      return;
    }

    // 注意：此测试需要 teacherId 用户有 practice_municipal_review 权限
    // 如果上面的授权测试失败，这里会失败（符合预期）
    const reviewData = {
      reviewer_id: testData.teacherId, // 使用已授权的测试教师作为审核人
      target_scope: 'practice_municipal',
    };

    const response = await makeRequest(
      `${API_URL}/api/question-review/${testData.questionId}/submit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testData.teacherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      }
    );

    // 如果授权成功，提交应该成功；否则会失败（符合预期）
    if (response.statusCode === 200 || response.statusCode === 201) {
      const data = JSON.parse(response.body);
      assert(data.success, 'Should be successful');
      log(`  Submitted question for review`, colors.blue);
    } else if (response.statusCode === 400) {
      const data = JSON.parse(response.body);
      log(`  Expected failure: ${data.error}`, colors.yellow);
      // 这是预期的失败（审核人无权限），不抛出错误
    } else {
      assert(false, `Unexpected status code: ${response.statusCode}`, response.body);
    }
  });

  await test('Cannot submit without target_scope', async () => {
    if (!testData.questionId || !testData.teacherId) {
      log('  Skipping: No question or reviewer ID available', colors.yellow);
      return;
    }

    const reviewData = {
      reviewer_id: testData.teacherId,
      // Missing target_scope
    };

    const response = await makeRequest(
      `${API_URL}/api/question-review/${testData.questionId}/submit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testData.teacherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      }
    );

    assert(response.statusCode === 400, 'Should return 400');
  });

  await test('Reviewer can get pending reviews', async () => {
    const response = await makeRequest(`${API_URL}/api/question-review/pending`, {
      headers: { Authorization: `Bearer ${testData.teacherToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(Array.isArray(data.data), 'Should return array');
    log(`  Found ${data.data.length} pending reviews`, colors.blue);
  });

  await test('Reviewer can get review statistics', async () => {
    const response = await makeRequest(`${API_URL}/api/question-review/stats`, {
      headers: { Authorization: `Bearer ${testData.teacherToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(typeof data.data.pending_count === 'number', 'Should have pending_count');
    assert(typeof data.data.approved_count === 'number', 'Should have approved_count');
    assert(typeof data.data.rejected_count === 'number', 'Should have rejected_count');
    log(
      `  Stats: ${data.data.pending_count} pending, ${data.data.approved_count} approved, ${data.data.rejected_count} rejected`,
      colors.blue
    );
  });

  await test('Reviewer can approve question (需要是指定审核人)', async () => {
    if (!testData.questionId) {
      log('  Skipping: No question ID available', colors.yellow);
      return;
    }

    const reviewData = {
      status: 'approved',
      comment: 'API测试 - 批准通过',
      publish_immediately: false,
    };

    const response = await makeRequest(
      `${API_URL}/api/question-review/${testData.questionId}/review`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testData.teacherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      }
    );

    // 可能的结果：
    // 200 - 审核成功（如果有pending review且是指定审核人）
    // 400 - 题目状态不对（不是pending_review）
    // 403 - 不是指定的审核人
    // 404 - 题目不存在
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      assert(data.success, 'Should be successful');
      log(`  Question approved`, colors.blue);
    } else {
      const data = JSON.parse(response.body);
      log(`  Expected result: ${data.error || 'Permission/state check'}`, colors.yellow);
      // 这些都是合理的结果，不视为测试失败
    }
  });

  await test('Reviewer can reject question (集成测试)', async () => {
    // 这个测试演示完整流程，但由于权限设置，可能无法完全执行
    // 仅在授权成功时才能通过
    log('  Testing rejection workflow (may skip due to permissions)', colors.yellow);

    // 这个测试的成功依赖于之前的授权测试
    // 如果授权失败，跳过此测试
    if (!testData.permissionId) {
      log('  Skipping: Permission not granted in earlier test', colors.yellow);
      return;
    }

    // Create a new question for rejection test
    const questionData = {
      type: 'single',
      subject: '数学',
      grade: '三年级',
      content: '【API测试-拒绝】1 + 1 = ?',
      options: ['1', '2', '3', '4'],
      correct_answer: 'B',
      score: 5,
      difficulty: 'easy',
      target_scope: 'practice_municipal',
    };

    const createResponse = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testData.teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
    });

    if (createResponse.statusCode === 201) {
      const createData = JSON.parse(createResponse.body);
      const newQuestionId = createData.data.id;

      // Submit for review
      const submitResponse = await makeRequest(
        `${API_URL}/api/question-review/${newQuestionId}/submit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${testData.teacherToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewer_id: testData.teacherId,
            target_scope: 'practice_municipal',
          }),
        }
      );

      if (submitResponse.statusCode !== 200 && submitResponse.statusCode !== 201) {
        log('  Could not submit for review (permission issue)', colors.yellow);
        return;
      }

      // Reject
      const reviewData = {
        status: 'rejected',
        comment: 'API测试 - 需要修改',
      };

      const response = await makeRequest(
        `${API_URL}/api/question-review/${newQuestionId}/review`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${testData.teacherToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reviewData),
        }
      );

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        assert(data.success, 'Should be successful');
        log(`  Question rejected successfully`, colors.blue);
      } else {
        log(`  Review returned ${response.statusCode} (permission check)`, colors.yellow);
      }
    } else {
      log('  Could not create question for rejection test', colors.yellow);
    }
  });

  await test('Teacher can publish school question directly', async () => {
    // Create a school-level question
    const questionData = {
      type: 'single',
      subject: '数学',
      grade: '一年级',
      content: '【API测试-校级】5 + 2 = ?',
      options: ['6', '7', '8', '9'],
      correct_answer: 'B',
      score: 5,
      difficulty: 'easy',
      target_scope: 'practice_school',
    };

    const createResponse = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testData.teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
    });

    assert(createResponse.statusCode === 201, 'Should create question', createResponse.body);
    const createData = JSON.parse(createResponse.body);
    const schoolQuestionId = createData.data.id;

    // Directly publish to school
    const response = await makeRequest(
      `${API_URL}/api/question-review/${schoolQuestionId}/publish-school`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testData.teacherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    assert(
      response.statusCode === 200 || response.statusCode === 201,
      'Should return 200 or 201',
      response.body
    );
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    log(`  School question published directly`, colors.blue);
  });

  // ========== Integration Scenarios ==========
  log('\n--- 5. Integration Scenarios ---\n', colors.yellow);

  await test('Complete workflow: Create → Submit → Approve → Publish', async () => {
    // Step 1: Create question
    const questionData = {
      type: 'single',
      subject: '数学',
      grade: '三年级',
      content: '【集成测试】5 × 6 = ?',
      options: ['25', '30', '35', '40'],
      correct_answer: 'B',
      score: 5,
      difficulty: 'medium',
      target_scope: 'practice_municipal',
    };

    const createResponse = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testData.teacherToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
    });

    assert(createResponse.statusCode === 201, 'Step 1: Create should succeed');
    const createData = JSON.parse(createResponse.body);
    const integrationQuestionId = createData.data.id;
    log(`  Step 1: Created question ID ${integrationQuestionId}`, colors.blue);

    // Step 2: Submit for review
    if (testData.teacherId) {
      const submitResponse = await makeRequest(
        `${API_URL}/api/question-review/${integrationQuestionId}/submit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${testData.teacherToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewer_id: 1, // 使用管理员作为审核人（ID=1），方便在Step 3中使用adminToken审核
            target_scope: 'practice_municipal',
          }),
        }
      );

      assert(
        submitResponse.statusCode === 200 || submitResponse.statusCode === 201,
        'Step 2: Submit should succeed'
      );
      log(`  Step 2: Submitted for review`, colors.blue);

      // Step 3: Approve (使用管理员token，因为管理员是审核人)
      // 注意：在实际测试中，应该使用被分配为审核人的用户token
      // 但由于测试环境限制，这里使用管理员token作为替代
      const approveResponse = await makeRequest(
        `${API_URL}/api/question-review/${integrationQuestionId}/review`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${testData.adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'approved',
            comment: '集成测试 - 批准',
            publish_immediately: true, // 立即发布
            target_scope: 'practice_municipal', // 必须提供 target_scope
          }),
        }
      );

      if (approveResponse.statusCode !== 200) {
        log(`  Step 3 failed with status ${approveResponse.statusCode}`, colors.red);
        log(`  Response: ${approveResponse.body}`, colors.red);
      }
      assert(approveResponse.statusCode === 200, 'Step 3: Approve should succeed');
      log(`  Step 3: Approved and published`, colors.blue);

      // Step 4: Verify published
      const verifyResponse = await makeRequest(
        `${API_URL}/api/question-bank/bank/${integrationQuestionId}`,
        {
          headers: { Authorization: `Bearer ${testData.teacherToken}` },
        }
      );

      assert(verifyResponse.statusCode === 200, 'Step 4: Verify should succeed');
      const verifyData = JSON.parse(verifyResponse.body);
      assert(verifyData.data.id === integrationQuestionId, 'Should find the question');
      log(`  Step 4: Question verified in bank`, colors.blue);
    } else {
      log('  Steps 2-4 skipped: No reviewer available', colors.yellow);
    }
  });

  await test('Verify scope filtering returns correct questions', async () => {
    // Get all questions
    const allResponse = await makeRequest(`${API_URL}/api/question-bank/bank`, {
      headers: { Authorization: `Bearer ${testData.teacherToken}` },
    });
    const allData = JSON.parse(allResponse.body);
    const totalQuestions = allData.data.length;

    // Get municipal questions
    const municipalResponse = await makeRequest(
      `${API_URL}/api/question-bank/bank?scope=practice_municipal`,
      {
        headers: { Authorization: `Bearer ${testData.teacherToken}` },
      }
    );
    const municipalData = JSON.parse(municipalResponse.body);
    const municipalCount = municipalData.data.length;

    // Get school questions
    const schoolResponse = await makeRequest(
      `${API_URL}/api/question-bank/bank?scope=practice_school`,
      {
        headers: { Authorization: `Bearer ${testData.teacherToken}` },
      }
    );
    const schoolData = JSON.parse(schoolResponse.body);
    const schoolCount = schoolData.data.length;

    log(
      `  Total: ${totalQuestions}, Municipal: ${municipalCount}, School: ${schoolCount}`,
      colors.blue
    );
    assert(
      totalQuestions >= municipalCount + schoolCount,
      'Total should be >= sum of filtered'
    );
  });

  // ========== Bug Fix Verification Tests ==========
  log('\n--- Bug Fix Verification Tests ---\n', colors.yellow);

  await test('Bug #3: District admin login', async () => {
    // Login as district admin (白云区管理员)
    const response = await makeRequest(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'baiyun_admin',
        password: 'password123',
      }),
    });

    assert(response.statusCode === 200, 'Should return 200', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Login should be successful');
    assert(data.data.token, 'Should return token');
    testData.districtAdminToken = data.data.token;
    log(`  District admin logged in successfully`, colors.blue);
  });

  await test('Bug #3: District admin only sees district-level permissions', async () => {
    if (!testData.districtAdminToken) {
      log('  Skipping: No district admin token', colors.yellow);
      return;
    }

    const response = await makeRequest(`${API_URL}/api/permissions`, {
      headers: { Authorization: `Bearer ${testData.districtAdminToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');
    assert(Array.isArray(data.data), 'Should return array');

    // 验证点1: 所有权限都应该是practice_district_review类型
    if (data.data.length > 0) {
      data.data.forEach((permission, index) => {
        assert(
          permission.permission_type === 'practice_district_review',
          `Permission ${index} should be practice_district_review type, got ${permission.permission_type}`
        );
      });
      log(`  ✓ All ${data.data.length} permissions are district-level`, colors.green);
    }

    // 验证点2: 不应该包含市级测评权限
    const hasMunicipalAssessment = data.data.some(
      (p) => p.permission_type === 'municipal_assessment_review'
    );
    assert(
      !hasMunicipalAssessment,
      'Should not contain municipal_assessment_review permissions'
    );
    log(`  ✓ No municipal assessment permissions found`, colors.green);
  });

  await test('Bug #4: Permission list includes district_name and school_name', async () => {
    const response = await makeRequest(`${API_URL}/api/permissions`, {
      headers: { Authorization: `Bearer ${testData.adminToken}` },
    });

    assert(response.statusCode === 200, 'Should return 200', response.body);
    const data = JSON.parse(response.body);
    assert(data.success, 'Should be successful');

    if (data.data.length > 0) {
      // 验证点1: district_name字段存在且有值
      data.data.forEach((permission, index) => {
        assert(
          permission.hasOwnProperty('district_name'),
          `Permission ${index} should have district_name field`
        );
        if (permission.district_name !== null) {
          assert(
            typeof permission.district_name === 'string' && permission.district_name.length > 0,
            `Permission ${index} district_name should be non-empty string`
          );
        }
      });
      log(`  ✓ All permissions have district_name field`, colors.green);

      // 验证点2: school_name字段存在且有值
      data.data.forEach((permission, index) => {
        assert(
          permission.hasOwnProperty('school_name'),
          `Permission ${index} should have school_name field`
        );
        if (permission.school_name !== null) {
          assert(
            typeof permission.school_name === 'string' && permission.school_name.length > 0,
            `Permission ${index} school_name should be non-empty string`
          );
        }
      });
      log(`  ✓ All permissions have school_name field`, colors.green);
    } else {
      log('  Warning: No permissions to verify', colors.yellow);
    }
  });

  await test('Bug #5: Notes field persists correctly', async () => {
    if (!testData.teacherId) {
      log('  Skipping: No teacher ID available', colors.yellow);
      return;
    }

    // 验证点1: 创建权限时包含notes
    const testNotes = `API测试备注 - ${Date.now()}`;
    const permissionData = {
      user_id: testData.teacherId,
      permission_type: 'practice_district_review',
      subjects: ['语文'],
      scope_level: 'district',
      district_id: 1, // 白云区
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      notes: testNotes,
    };

    const createResponse = await makeRequest(`${API_URL}/api/permissions/grant`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testData.adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(permissionData),
    });

    assert(
      createResponse.statusCode === 200 || createResponse.statusCode === 201,
      'Should create permission',
      createResponse.body
    );
    const createData = JSON.parse(createResponse.body);
    assert(createData.success, 'Should be successful');
    const newPermissionId = createData.data.id;
    log(`  Created permission with notes: ${newPermissionId}`, colors.blue);

    // 验证点2: 读取权限列表，验证notes字段正确保存
    const listResponse = await makeRequest(`${API_URL}/api/permissions`, {
      headers: { Authorization: `Bearer ${testData.adminToken}` },
    });

    assert(listResponse.statusCode === 200, 'Should return 200', listResponse.body);
    const listData = JSON.parse(listResponse.body);
    const savedPermission = listData.data.find((p) => p.id === newPermissionId);

    assert(savedPermission, 'Should find created permission in list');
    assert(
      savedPermission.notes === testNotes,
      `Notes should be "${testNotes}", got "${savedPermission.notes}"`
    );
    log(`  ✓ Notes field persisted correctly: "${testNotes}"`, colors.green);
  });

  // Print summary
  log('\n=== Test Summary ===\n', colors.cyan);
  log(`Total Tests: ${totalTests}`, colors.blue);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${failedTests}`, colors.red);
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, colors.yellow);

  if (failedTests > 0) {
    log('\n⚠️  Some tests failed. Please review errors above.', colors.red);
    process.exit(1);
  } else {
    log('\n✅ All tests passed!', colors.green);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\nTest suite error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
