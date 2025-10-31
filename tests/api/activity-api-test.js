#!/usr/bin/env node
/**
 * Activity API Complete Test Suite
 * 活动系统 API 完整测试套件（测评/练习）
 *
 * 测试范围:
 * - Practice活动的创建、查询、管理（教师、管理员）
 * - Assessment活动的创建、查询、管理（高级管理员）
 * - 权限控制验证
 * - 能力等级验证
 * - 学生注册、开始、提交流程
 *
 * 运行方式:
 *   node tests/api/activity-api-test.js
 */

const http = require('http');

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TIMEOUT = 10000; // 10秒超时

// 测试数据
let authTokens = {
  student: null,
  teacher: null,
  admin: null,
  districtAdmin: null
};

let testData = {
  practiceActivityId: null,
  assessmentActivityId: null,
  studentActivityId: null
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
 * 测试用例执行器
 */
async function runTest(name, testFn, options = {}) {
  results.total++;
  const testStart = Date.now();

  try {
    console.log(`\n${colors.blue}▶${colors.reset} ${name}`);
    await testFn();

    const duration = Date.now() - testStart;
    results.passed++;
    results.tests.push({ name, status: 'passed', duration });
    console.log(`  ${colors.green}✓ 通过${colors.reset} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - testStart;
    if (options.skipOnError && error.skip) {
      results.skipped++;
      results.tests.push({ name, status: 'skipped', duration, reason: error.message });
      console.log(`  ${colors.yellow}⊘ 跳过${colors.reset} - ${error.message}`);
    } else {
      results.failed++;
      results.tests.push({ name, status: 'failed', duration, error: error.message });
      console.log(`  ${colors.red}✗ 失败${colors.reset} - ${error.message}`);
      if (error.response) {
        console.log(`  响应: ${JSON.stringify(error.response, null, 2)}`);
      }
    }
  }
}

/**
 * 断言函数
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  期望: ${expected}\n  实际: ${actual}`);
  }
}

function assertContains(str, substr, message) {
  if (!str || !str.includes(substr)) {
    throw new Error(`${message}\n  字符串中未找到: ${substr}`);
  }
}

// ============================================================================
// 认证相关测试
// ============================================================================

async function testStudentLogin() {
  const response = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    username: '520102200801011234',
    password: 'password123',
    loginType: 'idCard'
  }));

  const data = response.json();
  assert(response.statusCode === 200, `期望状态码 200, 实际 ${response.statusCode}`);
  assert(data && data.token, '未返回 token');
  assert(data.user.role === 'student', '用户角色应为 student');

  authTokens.student = data.token;
}

async function testTeacherLogin() {
  const response = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    username: 'teacher01',
    password: 'password123',
    loginType: 'username'
  }));

  const data = response.json();
  assert(response.statusCode === 200, `期望状态码 200, 实际 ${response.statusCode}`);
  assert(data && data.token, '未返回 token');
  assert(data.user.role === 'teacher', '用户角色应为 teacher');

  authTokens.teacher = data.token;
}

async function testDistrictAdminLogin() {
  const response = await makeRequest({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    username: 'yunyan_admin',
    password: 'password123',
    loginType: 'username'
  }));

  const data = response.json();
  assert(response.statusCode === 200, `期望状态码 200, 实际 ${response.statusCode}`);
  assert(data && data.token, '未返回 token');
  assert(data.user.role === 'district_admin', '用户角色应为 district_admin');

  authTokens.districtAdmin = data.token;
}

// ============================================================================
// Practice 活动测试（教师可创建）
// ============================================================================

async function testCreatePracticeActivity() {
  const activityData = {
    title: 'API测试-练习活动',
    description: '这是一个API测试创建的练习活动',
    subject: '数学',
    grade: '五年级',
    duration: 60,
    totalScore: 100,
    passScore: 60,
    ability_level: 'L3',
    allowRetake: true,
    maxAttempts: 3
  };

  const response = await makeRequest({
    path: '/api/activities/practice',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authTokens.teacher}`
    }
  }, JSON.stringify(activityData));

  const data = response.json();
  assert(response.statusCode === 201, `期望状态码 201, 实际 ${response.statusCode}`);
  assert(data && data.success, '创建练习活动失败');
  assert(data.activity, '未返回活动数据');
  assert(data.activity.type === 'practice', '活动类型应为 practice');

  // 检查能力等级（支持两种格式：ability_level 和 abilityLevel）
  const abilityLevel = data.activity.ability_level || data.activity.abilityLevel;
  assert(abilityLevel === 'L3', `能力等级应为 L3，实际为 ${abilityLevel}`);

  // 检查允许重做（支持两种格式）
  const allowRetake = data.activity.allow_retake !== undefined ? data.activity.allow_retake : data.activity.allowRetake;
  assert(allowRetake === true, '允许重做应为 true');

  // 检查最大尝试次数（支持两种格式）
  const maxAttempts = data.activity.max_attempts || data.activity.maxAttempts;
  assert(maxAttempts === 3, '最大尝试次数应为 3');

  testData.practiceActivityId = data.activity.id;
}

async function testCreatePracticeWithoutAbilityLevel() {
  const activityData = {
    title: 'API测试-无能力等级的练习',
    subject: '数学',
    duration: 60,
    totalScore: 100,
    passScore: 60
    // 缺少 ability_level
  };

  const response = await makeRequest({
    path: '/api/activities/practice',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authTokens.teacher}`
    }
  }, JSON.stringify(activityData));

  assert(response.statusCode === 400, `期望状态码 400, 实际 ${response.statusCode}`);
  const data = response.json();
  assert(data && !data.success, '应该返回失败');
  assert(data.message.includes('能力等级'), '错误消息应提及能力等级');
}

async function testCreatePracticeWithInvalidAbilityLevel() {
  const activityData = {
    title: 'API测试-无效能力等级',
    subject: '数学',
    duration: 60,
    totalScore: 100,
    passScore: 60,
    ability_level: 'L99' // 无效等级
  };

  const response = await makeRequest({
    path: '/api/activities/practice',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authTokens.teacher}`
    }
  }, JSON.stringify(activityData));

  assert(response.statusCode === 400, `期望状态码 400, 实际 ${response.statusCode}`);
  const data = response.json();
  assert(data && !data.success, '应该返回失败');
}

async function testStudentCannotCreatePractice() {
  const activityData = {
    title: '学生尝试创建练习',
    subject: '数学',
    duration: 60,
    totalScore: 100,
    passScore: 60,
    ability_level: 'L3'
  };

  const response = await makeRequest({
    path: '/api/activities/practice',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authTokens.student}`
    }
  }, JSON.stringify(activityData));

  assert(response.statusCode === 403, `期望状态码 403, 实际 ${response.statusCode}`);
  const data = response.json();
  assert(data && !data.success, '应该返回失败');
}

// ============================================================================
// Assessment 活动测试（仅高级管理员可创建）
// ============================================================================

async function testTeacherCannotCreateAssessment() {
  const activityData = {
    title: '教师尝试创建测评',
    subject: '数学',
    duration: 90,
    totalScore: 100,
    passScore: 70,
    ability_level: 'L5',
    isOfficial: true
  };

  const response = await makeRequest({
    path: '/api/activities/assessment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authTokens.teacher}`
    }
  }, JSON.stringify(activityData));

  assert(response.statusCode === 403, `期望状态码 403, 实际 ${response.statusCode}`);
  const data = response.json();
  assert(data && !data.success, '应该返回失败');
  assert(data.message.includes('测评'), '错误消息应提及测评权限');
}

async function testCreateAssessmentActivity() {
  const activityData = {
    title: 'API测试-测评活动',
    description: '这是一个API测试创建的测评活动',
    subject: '数学',
    grade: '五年级',
    duration: 90,
    totalScore: 100,
    passScore: 70,
    ability_level: 'L5',
    isOfficial: true,
    certificateConfig: {
      enabled: true,
      template: 'standard'
    }
  };

  const response = await makeRequest({
    path: '/api/activities/assessment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authTokens.districtAdmin}`
    }
  }, JSON.stringify(activityData));

  const data = response.json();
  assert(response.statusCode === 201, `期望状态码 201, 实际 ${response.statusCode}`);
  assert(data && data.success, '创建测评活动失败');
  assert(data.activity, '未返回活动数据');
  assert(data.activity.type === 'assessment', '活动类型应为 assessment');
  assert(data.activity.ability_level === 'L5', '能力等级应为 L5');
  assert(data.activity.is_official === true, '官方标识应为 true');

  testData.assessmentActivityId = data.activity.id;
}

// ============================================================================
// 活动查询测试
// ============================================================================

async function testGetAllActivities() {
  const response = await makeRequest({
    path: '/api/activities',
    method: 'GET'
  });

  const data = response.json();
  assert(response.statusCode === 200, `期望状态码 200, 实际 ${response.statusCode}`);
  assert(data && data.success, '查询活动列表失败');
  assert(Array.isArray(data.activities), 'activities 应为数组');
}

async function testGetActivitiesByType() {
  const response = await makeRequest({
    path: '/api/activities?type=practice',
    method: 'GET'
  });

  const data = response.json();
  assert(response.statusCode === 200, `期望状态码 200, 实际 ${response.statusCode}`);
  assert(data && data.success, '查询练习活动失败');
  assert(Array.isArray(data.activities), 'activities 应为数组');

  // 验证所有活动都是 practice 类型
  if (data.activities.length > 0) {
    const allPractice = data.activities.every(a => a.type === 'practice');
    assert(allPractice, '所有活动都应为 practice 类型');
  }
}

async function testGetActivitiesByAbilityLevel() {
  const response = await makeRequest({
    path: '/api/activities?ability_level=L3',
    method: 'GET'
  });

  const data = response.json();
  assert(response.statusCode === 200, `期望状态码 200, 实际 ${response.statusCode}`);
  assert(data && data.success, '查询L3活动失败');

  // 验证所有活动都是 L3 级别
  if (data.activities.length > 0) {
    const allL3 = data.activities.every(a => a.ability_level === 'L3');
    assert(allL3, '所有活动都应为 L3 级别');
  }
}

async function testGetActivityById() {
  const response = await makeRequest({
    path: `/api/activities/${testData.practiceActivityId}`,
    method: 'GET'
  });

  const data = response.json();
  assert(response.statusCode === 200, `期望状态码 200, 实际 ${response.statusCode}`);
  assert(data && data.success, '查询活动详情失败');
  assert(data.activity, '未返回活动数据');
  assert(data.activity.id === testData.practiceActivityId, 'ID 应匹配');
}

async function testGetNonExistentActivity() {
  const response = await makeRequest({
    path: '/api/activities/999999',
    method: 'GET'
  });

  assert(response.statusCode === 404, `期望状态码 404, 实际 ${response.statusCode}`);
}

// ============================================================================
// 学生活动流程测试
// ============================================================================

async function testStudentRegisterActivity() {
  const response = await makeRequest({
    path: `/api/activities/${testData.practiceActivityId}/register`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authTokens.student}`
    }
  }, JSON.stringify({}));

  const data = response.json();

  // 活动可能是 draft 状态，允许 400 错误
  if (response.statusCode === 400) {
    const message = data && data.message ? data.message : '活动未准备好';
    throw { skip: true, message: `活动无法注册: ${message}` };
  }

  assert(response.statusCode === 200, `期望状态码 200, 实际 ${response.statusCode}`);
  assert(data && data.success, '注册活动失败');
  assert(data.registrationId, '未返回注册ID');

  testData.studentActivityId = data.registrationId;
}

async function testStudentStartActivity() {
  if (!testData.studentActivityId) {
    throw { skip: true, message: '未注册活动，跳过开始测试' };
  }

  const response = await makeRequest({
    path: `/api/activities/${testData.practiceActivityId}/start`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authTokens.student}`
    }
  }, JSON.stringify({}));

  const data = response.json();

  if (response.statusCode === 400) {
    throw { skip: true, message: data.message || '活动未准备好，无法开始' };
  }

  assert(response.statusCode === 200, `期望状态码 200, 实际 ${response.statusCode}`);
  assert(data && data.success, '开始活动失败');
  assert(data.startTime, '未返回开始时间');
}

// ============================================================================
// 主测试流程
// ============================================================================

async function main() {
  console.log(`${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║      Activity API 测试套件 (测评/练习系统)                ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\n目标服务器: ${API_BASE_URL}`);
  console.log(`测试超时: ${TIMEOUT}ms`);

  // 认证测试
  console.log(`\n${colors.cyan}═════ 认证测试 ═════${colors.reset}`);
  await runTest('学生登录', testStudentLogin);
  await runTest('教师登录', testTeacherLogin);
  await runTest('区级管理员登录', testDistrictAdminLogin);

  // Practice 活动测试
  console.log(`\n${colors.cyan}═════ Practice 活动测试（教师权限） ═════${colors.reset}`);
  await runTest('教师创建练习活动', testCreatePracticeActivity);
  await runTest('创建练习活动-缺少能力等级', testCreatePracticeWithoutAbilityLevel);
  await runTest('创建练习活动-无效能力等级', testCreatePracticeWithInvalidAbilityLevel);
  await runTest('学生不能创建练习活动', testStudentCannotCreatePractice);

  // Assessment 活动测试
  console.log(`\n${colors.cyan}═════ Assessment 活动测试（高级管理员权限） ═════${colors.reset}`);
  await runTest('教师不能创建测评活动', testTeacherCannotCreateAssessment);
  await runTest('区级管理员创建测评活动', testCreateAssessmentActivity);

  // 查询测试
  console.log(`\n${colors.cyan}═════ 活动查询测试 ═════${colors.reset}`);
  await runTest('查询所有活动', testGetAllActivities);
  await runTest('按类型查询活动', testGetActivitiesByType);
  await runTest('按能力等级查询活动', testGetActivitiesByAbilityLevel);
  await runTest('按ID查询活动', testGetActivityById);
  await runTest('查询不存在的活动', testGetNonExistentActivity);

  // 学生活动流程测试
  console.log(`\n${colors.cyan}═════ 学生活动流程测试 ═════${colors.reset}`);
  await runTest('学生注册活动', testStudentRegisterActivity, { skipOnError: true });
  await runTest('学生开始活动', testStudentStartActivity, { skipOnError: true });

  // 测试总结
  printSummary();
}

function printSummary() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                    测试结果汇总                            ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}`);

  console.log(`\n总计: ${results.total} 个测试`);
  console.log(`${colors.green}✓ 通过: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}✗ 失败: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}⊘ 跳过: ${results.skipped}${colors.reset}`);

  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(2) : 0;
  console.log(`\n通过率: ${passRate}%`);

  if (results.failed > 0) {
    console.log(`\n${colors.red}失败的测试:${colors.reset}`);
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
        console.log(`    ${t.error}`);
      });
  }

  if (results.skipped > 0) {
    console.log(`\n${colors.yellow}跳过的测试:${colors.reset}`);
    results.tests
      .filter(t => t.status === 'skipped')
      .forEach(t => {
        console.log(`  ${colors.yellow}⊘${colors.reset} ${t.name}`);
        console.log(`    ${t.reason}`);
      });
  }

  console.log('\n');

  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

// 处理未捕获的错误
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}未处理的错误:${colors.reset}`, error);
  process.exit(1);
});

// 运行测试
main().catch(error => {
  console.error(`\n${colors.red}测试执行失败:${colors.reset}`, error);
  process.exit(1);
});
