/**
 * Student Registration to Login - Complete Business Flow Test
 * 学生注册到登录完整业务流程测试
 *
 * 测试流程:
 * 1. 学生提交注册申请
 * 2. 查询注册状态（pending）
 * 3. 学校管理员审批通过
 * 4. 查询注册状态（approved）
 * 5. 学生使用新账号登录
 * 6. 验证学生信息
 *
 * 运行方式:
 *   node tests/api/student-registration-flow.test.js
 */

const http = require('http');

// 配置
const API_URL = 'http://localhost:3001';
const TIMEOUT = 10000;

// ANSI颜色
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

// 测试结果统计
let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  startTime: Date.now()
};

// 测试数据
const timestamp = Date.now();
const testData = {
  student: {
    phone: `139${timestamp.toString().slice(-8)}`,
    realName: `测试学生${timestamp.toString().slice(-4)}`,
    birthDate: '2010-05-15',
    idCardLast4: '1234',
    districtCode: 'NM', // 南明区
    schoolCode: 'GY002', // 贵阳市第二小学
    grade: '四年级'
  },
  admin: {
    username: 'admin',
    password: 'password123'
  }
};

let testContext = {
  adminToken: null,
  registrationId: null,
  studentUserId: null,
  studentUsername: null,
  registrationId2: null,  // 第二个注册申请ID（拒绝测试用）
  createdUserIds: [],     // 所有创建的用户ID
  createdRegistrationIds: []  // 所有创建的注册申请ID
};

// 辅助函数
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: TIMEOUT
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function test(name, fn) {
  stats.total++;
  try {
    await fn();
    stats.passed++;
    log(`✓ ${name}`, colors.green);
    return true;
  } catch (error) {
    stats.failed++;
    log(`✗ ${name}`, colors.red);
    log(`  Error: ${error.message}`, colors.red);
    if (error.stack) {
      log(`  ${error.stack.split('\n').slice(1, 3).join('\n')}`, colors.yellow);
    }
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
    const details = `Expected status ${expectedStatus}, got ${response.statusCode}. Body: ${response.body}`;
    throw new Error(message ? `${message}\n  ${details}` : details);
  }
}

// ==================== 测试套件 ====================

async function setup() {
  log('\n╔════════════════════════════════════════════════════════╗', colors.cyan);
  log('║  Student Registration to Login - Flow Test            ║', colors.cyan);
  log('║  学生注册到登录完整业务流程测试                        ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════╝', colors.cyan);

  log('\n=== 测试准备 ===', colors.magenta);

  // 1. 管理员登录
  await test('SETUP-01: 管理员登录获取Token', async () => {
    const response = await makeRequest('POST', '/api/auth/login', {
      username: testData.admin.username,
      password: testData.admin.password
    });

    assertStatus(response, 200, 'Should return 200 for admin login');
    assert(response.json.token, 'Should return token');

    testContext.adminToken = response.json.token;
  });

  log(`  测试学生信息:`, colors.blue);
  log(`    手机号: ${testData.student.phone}`, colors.blue);
  log(`    姓名: ${testData.student.realName}`, colors.blue);
  log(`    学校代码: ${testData.student.schoolCode}`, colors.blue);
}

async function testStep1_StudentRegistration() {
  log('\n=== 步骤1: 学生提交注册申请 ===', colors.magenta);

  // 1.1 获取区县列表
  await test('STEP1-01: 获取区县列表', async () => {
    const response = await makeRequest('GET', '/api/registration/config/districts');

    assertStatus(response, 200, 'Should return 200');
    assert(response.json.success, 'Response should indicate success');
    assert(Array.isArray(response.json.data), 'Should return districts array');
    assert(response.json.data.length > 0, 'Should have at least one district');
  });

  // 1.2 获取学校列表
  await test('STEP1-02: 获取指定区县的学校列表', async () => {
    const response = await makeRequest(
      'GET',
      `/api/registration/config/schools/${testData.student.districtCode}`
    );

    assertStatus(response, 200, 'Should return 200');
    assert(response.json.success, 'Response should indicate success');
    assert(Array.isArray(response.json.data), 'Should return schools array');
  });

  // 1.3 提交注册申请（数据验证失败）
  await test('STEP1-03: 提交注册申请-手机号格式错误（应失败）', async () => {
    const response = await makeRequest('POST', '/api/registration/student', {
      ...testData.student,
      phone: '12345' // 错误的手机号
    });

    assertStatus(response, 400, 'Should return 400 for invalid phone');
    assert(!response.json.success, 'Response should indicate failure');
  });

  // 1.4 提交正确的注册申请
  await test('STEP1-04: 提交注册申请-正确数据', async () => {
    const response = await makeRequest('POST', '/api/registration/student', testData.student);

    assertStatus(response, 201, 'Should return 201 for successful registration');
    assert(response.json.success, 'Response should indicate success');
    assert(response.json.data.id, 'Should return registration ID');

    testContext.registrationId = response.json.data.id;
    testContext.createdRegistrationIds.push(testContext.registrationId);

    log(`  注册ID: ${testContext.registrationId}`, colors.blue);
  });

  // 1.5 尝试重复提交
  await test('STEP1-05: 尝试重复提交（应失败）', async () => {
    const response = await makeRequest('POST', '/api/registration/student', testData.student);

    assertStatus(response, 400, 'Should return 400 for duplicate submission');
    assert(!response.json.success, 'Response should indicate failure');
    assert(
      response.json.message.includes('审核中') || response.json.message.includes('已被注册'),
      'Should indicate duplicate submission'
    );
  });
}

async function testStep2_CheckPendingStatus() {
  log('\n=== 步骤2: 查询注册状态（pending） ===', colors.magenta);

  await test('STEP2-01: 查询注册状态', async () => {
    const response = await makeRequest('GET', `/api/registration/status/${testData.student.phone}`);

    assertStatus(response, 200, 'Should return 200');
    assert(response.json.success, 'Response should indicate success');
    assert(response.json.data, 'Should return registration data');
    assertEqual(response.json.data.status, 'pending', 'Status should be pending');
    assertEqual(response.json.data.phone, testData.student.phone, 'Phone should match');

    log(`  状态: ${response.json.data.statusText}`, colors.blue);
    log(`  当前审核级别: ${response.json.data.current_reviewer_level}`, colors.blue);
  });

  await test('STEP2-02: 查询不存在的手机号（应失败）', async () => {
    const response = await makeRequest('GET', '/api/registration/status/13800000000');

    assertStatus(response, 404, 'Should return 404 for non-existent phone');
    assert(!response.json.success, 'Response should indicate failure');
  });
}

async function testStep3_AdminApproval() {
  log('\n=== 步骤3: 学校管理员审批通过 ===', colors.magenta);

  // 3.1 获取待审核列表
  await test('STEP3-01: 管理员获取待审核列表', async () => {
    const response = await makeRequest(
      'GET',
      '/api/registration/admin/requests?status=pending',
      null,
      testContext.adminToken
    );

    assertStatus(response, 200, 'Should return 200');
    assert(response.json.success, 'Response should indicate success');
    assert(response.json.data, 'Should return data object');
    assert(response.json.data.requests, 'Should have requests property');
    assert(Array.isArray(response.json.data.requests), 'Requests should be an array');

    // 验证我们提交的申请在列表中
    const ourRequest = response.json.data.requests.find(r => r.id === testContext.registrationId);
    assert(ourRequest, 'Should find our registration request in the list');

    log(`  待审核申请数: ${response.json.data.total}`, colors.blue);
  });

  // 3.2 查看申请审核历史
  await test('STEP3-02: 管理员查看申请审核历史', async () => {
    const response = await makeRequest(
      'GET',
      `/api/registration/admin/requests/${testContext.registrationId}/history`,
      null,
      testContext.adminToken
    );

    assertStatus(response, 200, 'Should return 200');
    assert(response.json.success, 'Response should indicate success');
    assert(response.json.data, 'Should return data object');
    assert(response.json.data.history, 'Should have history property');
    assert(Array.isArray(response.json.data.history), 'History should be an array');
  });

  // 3.3 批准申请
  await test('STEP3-03: 管理员批准注册申请', async () => {
    const response = await makeRequest(
      'POST',
      `/api/registration/admin/requests/${testContext.registrationId}/approve`,
      {
        comment: '学生信息核验无误，批准注册'
      },
      testContext.adminToken
    );

    assertStatus(response, 200, 'Should return 200 for successful approval');
    assert(response.json.success, 'Response should indicate success');
    assert(response.json.data.studentUserId, 'Should return created user ID');
    assert(response.json.data.username, 'Should return username');
    assert(response.json.data.initialPassword, 'Should return temporary password');

    testContext.studentUserId = response.json.data.studentUserId;
    testContext.studentUsername = response.json.data.username;
    testData.student.generatedPassword = response.json.data.initialPassword;
    testContext.createdUserIds.push(testContext.studentUserId);

    log(`  创建的用户ID: ${testContext.studentUserId}`, colors.blue);
    log(`  用户名: ${testContext.studentUsername}`, colors.blue);
    log(`  初始密码: ${testData.student.generatedPassword}`, colors.blue);
  });

  // 3.4 尝试重复批准（应失败）
  await test('STEP3-04: 尝试重复批准（应失败）', async () => {
    const response = await makeRequest(
      'POST',
      `/api/registration/admin/requests/${testContext.registrationId}/approve`,
      {
        comment: '重复批准测试'
      },
      testContext.adminToken
    );

    assertStatus(response, 400, 'Should return 400 for duplicate approval');
    assert(!response.json.success, 'Response should indicate failure');
  });
}

async function testStep4_CheckApprovedStatus() {
  log('\n=== 步骤4: 查询注册状态（approved） ===', colors.magenta);

  await test('STEP4-01: 查询注册状态-已批准', async () => {
    const response = await makeRequest('GET', `/api/registration/status/${testData.student.phone}`);

    assertStatus(response, 200, 'Should return 200');
    assert(response.json.success, 'Response should indicate success');
    assertEqual(response.json.data.status, 'approved', 'Status should be approved');
    assert(response.json.data.reviewed_at, 'Should have reviewed_at timestamp');
    assert(response.json.data.review_comment, 'Should have review comment');

    log(`  状态: ${response.json.data.statusText}`, colors.green);
    log(`  审核时间: ${response.json.data.reviewed_at}`, colors.blue);
    log(`  审核意见: ${response.json.data.review_comment}`, colors.blue);
  });
}

async function testStep5_StudentLogin() {
  log('\n=== 步骤5: 学生使用新账号登录 ===', colors.magenta);

  // 5.1 使用错误密码登录
  await test('STEP5-01: 使用错误密码登录（应失败）', async () => {
    const response = await makeRequest('POST', '/api/auth/login', {
      username: testContext.studentUsername,
      password: 'wrongpassword'
    });

    assert(
      response.statusCode === 401 || response.statusCode === 400,
      'Should return 401 or 400 for wrong password'
    );
  });

  // 5.2 使用正确密码登录
  let studentToken = null;
  await test('STEP5-02: 使用正确密码登录', async () => {
    const response = await makeRequest('POST', '/api/auth/login', {
      username: testContext.studentUsername,
      password: testData.student.generatedPassword
    });

    assertStatus(response, 200, 'Should return 200 for successful login');
    assert(response.json.token, 'Should return token');
    assert(response.json.user, 'Should return user info');
    assertEqual(response.json.user.role, 'student', 'Role should be student');
    assertEqual(response.json.user.username, testContext.studentUsername, 'Username should match');

    studentToken = response.json.token;

    log(`  登录成功`, colors.green);
    log(`  用户角色: ${response.json.user.role}`, colors.blue);
  });

  // 5.3 验证学生信息
  await test('STEP5-03: 获取学生个人信息', async () => {
    const response = await makeRequest('GET', '/api/users/profile', null, studentToken);

    assertStatus(response, 200, 'Should return 200');
    assert(response.json.user, 'Should return user profile');
    assertEqual(response.json.user.id, testContext.studentUserId, 'User ID should match');
    assertEqual(response.json.user.role, 'student', 'Role should be student');
    assertEqual(response.json.user.real_name, testData.student.realName, 'Real name should match');

    log(`  用户ID: ${response.json.user.id}`, colors.blue);
    log(`  真实姓名: ${response.json.user.real_name}`, colors.blue);
    log(`  学校ID: ${response.json.user.school_id || 'N/A'}`, colors.blue);
  });

  // 5.4 验证学生可以访问学生端功能
  await test('STEP5-04: 验证学生可以访问练习活动列表', async () => {
    const response = await makeRequest('GET', '/api/student/activities/practice', null, studentToken);

    assertStatus(response, 200, 'Should return 200 for student accessing practice activities');
    assert(response.json.success || Array.isArray(response.json), 'Should return activities list');

    log(`  可访问学生功能: 练习活动列表`, colors.green);
  });
}

async function testStep6_NegativeScenarios() {
  log('\n=== 步骤6: 负面场景测试 ===', colors.magenta);

  // 6.1 学生尝试访问管理员功能
  await test('STEP6-01: 学生尝试访问管理员功能（应失败）', async () => {
    // 先登录学生账号
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      username: testContext.studentUsername,
      password: testData.student.generatedPassword
    });
    const studentToken = loginResponse.json.token;

    // 尝试访问管理员的审核列表
    const response = await makeRequest(
      'GET',
      '/api/registration/admin/requests',
      null,
      studentToken
    );

    assert(
      response.statusCode === 403 || response.statusCode === 401,
      'Should return 403 or 401 for unauthorized access'
    );
  });

  // 6.2 创建另一个待审核的申请并测试拒绝流程
  const timestamp2 = Date.now() + 1;
  const testPhone2 = `138${timestamp2.toString().slice(-8)}`;

  await test('STEP6-02: 创建第二个注册申请用于测试拒绝流程', async () => {
    const response = await makeRequest('POST', '/api/registration/student', {
      ...testData.student,
      phone: testPhone2,
      realName: `测试学生B${timestamp2.toString().slice(-4)}`
    });

    assertStatus(response, 201, 'Should return 201');
    assert(response.json.success, 'Response should indicate success');
    testContext.registrationId2 = response.json.data.id;
    testContext.createdRegistrationIds.push(testContext.registrationId2);
  });

  await test('STEP6-03: 管理员拒绝注册申请', async () => {
    const response = await makeRequest(
      'POST',
      `/api/registration/admin/requests/${testContext.registrationId2}/reject`,
      {
        comment: '学生信息不完整，拒绝注册'
      },
      testContext.adminToken
    );

    assertStatus(response, 200, 'Should return 200 for successful rejection');
    assert(response.json.success, 'Response should indicate success');

    log(`  拒绝申请成功`, colors.yellow);
  });

  await test('STEP6-04: 查询被拒绝申请的状态', async () => {
    const response = await makeRequest('GET', `/api/registration/status/${testPhone2}`);

    assertStatus(response, 200, 'Should return 200');
    assertEqual(response.json.data.status, 'rejected', 'Status should be rejected');
    assert(response.json.data.review_comment, 'Should have rejection reason');

    log(`  拒绝原因: ${response.json.data.review_comment}`, colors.yellow);
  });
}

async function cleanupTestData() {
  log('\n开始清理测试数据...', colors.yellow);

  try {
    // 收集所有需要删除的学生用户ID
    const userIds = [
      testContext.studentUserId,
      ...testContext.createdUserIds
    ].filter(id => id != null);

    if (userIds.length === 0) {
      log('没有需要清理的测试数据', colors.yellow);
      return;
    }

    // 确保有admin token用于删除操作
    if (!testContext.adminToken) {
      log('⚠️  没有管理员令牌，尝试获取...', colors.yellow);
      try {
        const loginRes = await makeRequest('POST', '/api/auth/login', testData.admin);
        testContext.adminToken = loginRes.token;
        log('✓ 已获取管理员令牌', colors.green);
      } catch (err) {
        log(`⚠️  无法获取管理员令牌: ${err.message}`, colors.red);
        log('无法清理测试数据，请手动删除', colors.yellow);
        return;
      }
    }

    let deletedCount = 0;
    let failedCount = 0;

    // 去重用户ID
    const uniqueUserIds = Array.from(new Set(userIds));

    // 使用新的DELETE API删除学生账号（会自动处理外键约束）
    for (const userId of uniqueUserIds) {
      try {
        const response = await makeRequest(
          'DELETE',
          `/api/users/student/${userId}`,
          null,
          testContext.adminToken
        );

        if (response.statusCode === 200) {
          log(`✓ 删除学生账号 (ID: ${userId})`, colors.green);
          deletedCount++;
        } else if (response.statusCode === 404) {
          log(`- 学生账号已不存在 (ID: ${userId})`, colors.cyan);
        } else {
          const errorMsg = response.json?.message || '未知错误';
          log(`⚠️  删除学生账号失败 (ID: ${userId}): ${errorMsg}`, colors.yellow);
          failedCount++;
        }
      } catch (error) {
        log(`⚠️  删除学生账号出错 (ID: ${userId}): ${error.message}`, colors.yellow);
        failedCount++;
      }
    }

    log(`\n✅ 测试数据清理完成！成功删除 ${deletedCount} 个学生账号`, colors.green);
    if (failedCount > 0) {
      log(`⚠️  ${failedCount} 个账号删除失败，可能需要手动清理`, colors.yellow);
    }

  } catch (error) {
    log(`⚠️  清理测试数据失败: ${error.message}`, colors.red);
    log('这不会影响测试结果，但可能需要手动清理数据库', colors.yellow);
  }
}

async function printSummary() {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);

  log('\n' + '='.repeat(60), colors.cyan);
  log('测试总结', colors.cyan);
  log('='.repeat(60), colors.cyan);
  log(`总测试数:  ${stats.total}`, colors.blue);
  log(`通过:      ${stats.passed}`, colors.green);
  log(`失败:      ${stats.failed}`, stats.failed > 0 ? colors.red : colors.green);
  log(`成功率:    ${((stats.passed / stats.total) * 100).toFixed(1)}%`,
    stats.passed === stats.total ? colors.green : colors.yellow);
  log(`执行时间:  ${duration}秒`, colors.blue);
  log('='.repeat(60), colors.cyan);

  if (stats.failed === 0) {
    log('\n✅ 所有测试通过！学生注册到登录业务流程正常运行。', colors.green);
  } else {
    log(`\n⚠️  有 ${stats.failed} 个测试失败，请检查日志。`, colors.yellow);
  }
}

// ==================== 主函数 ====================

async function runTests() {
  try {
    await setup();
    await testStep1_StudentRegistration();
    await testStep2_CheckPendingStatus();
    await testStep3_AdminApproval();
    await testStep4_CheckApprovedStatus();
    await testStep5_StudentLogin();
    await testStep6_NegativeScenarios();
  } catch (error) {
    log(`\n✗ 测试执行出错: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    await cleanupTestData();  // 清理测试数据
    await printSummary();
    process.exit(stats.failed > 0 ? 1 : 0);
  }
}

// 错误处理
process.on('unhandledRejection', (error) => {
  log(`\nUnhandled rejection: ${error.message}`, colors.red);
  process.exit(1);
});

// 运行测试
log('\n启动测试...', colors.yellow);
log(`目标服务器: ${API_URL}`, colors.yellow);
log(`超时时间: ${TIMEOUT}ms\n`, colors.yellow);

runTests();
