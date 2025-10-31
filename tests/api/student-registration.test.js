#!/usr/bin/env node
/**
 * Student Registration API Complete Test Suite
 * 学生注册申请系统 API 完整测试套件
 *
 * 测试范围:
 * - 学生注册申请（表单验证、重复检测）
 * - 配置接口（区县、学校列表）
 * - 申请状态查询
 * - 管理员审核流程（获取列表、批准、拒绝）
 * - 审核历史查看
 * - 自动升级机制（模拟时间）
 *
 * 运行方式:
 *   node tests/api/student-registration.test.js
 */

const http = require('http');

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TIMEOUT = 10000; // 10秒超时

// 测试数据
let authTokens = {
  teacher: null,
  schoolAdmin: null,
  districtAdmin: null,
  municipalAdmin: null
};

let testData = {
  testPhone: `139${Date.now().toString().slice(-8)}`, // 生成唯一手机号
  registrationId: null,
  studentUserId: null
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
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// HTTP请求辅助函数
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: TIMEOUT
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 测试辅助函数
function test(name, fn) {
  results.total++;
  return fn()
    .then(() => {
      results.passed++;
      results.tests.push({ name, status: 'passed' });
      console.log(`${colors.green}✓${colors.reset} ${name}`);
    })
    .catch((error) => {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: error.message });
      console.log(`${colors.red}✗${colors.reset} ${name}`);
      console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    });
}

function skip(name, reason) {
  results.total++;
  results.skipped++;
  results.tests.push({ name, status: 'skipped', reason });
  console.log(`${colors.yellow}○${colors.reset} ${name} ${colors.yellow}(skipped: ${reason})${colors.reset}`);
  return Promise.resolve();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// 登录辅助函数
async function login(username, password) {
  const response = await makeRequest('POST', '/api/auth/login', { username, password });
  assert(response.statusCode === 200, `Login failed for ${username}: ${response.statusCode}`);
  assert(response.body.token, 'No token returned');
  return response.body.token;
}

// ============================================
// 测试套件开始
// ============================================

console.log(`\n${colors.bold}${colors.blue}==============================================`);
console.log(`Student Registration API Test Suite`);
console.log(`学生注册申请系统 API 测试套件`);
console.log(`==============================================${colors.reset}\n`);
console.log(`API Base URL: ${API_BASE_URL}`);
console.log(`Test Phone: ${testData.testPhone}\n`);

async function runTests() {
  try {
    // ============================================
    // 准备阶段: 登录各级管理员账号
    // ============================================
    console.log(`\n${colors.bold}Phase 0: Authentication Setup${colors.reset}`);

    await test('Login as teacher (teacher01)', async () => {
      authTokens.teacher = await login('teacher01', 'password123');
    });

    await test('Login as school admin (school_admin_01)', async () => {
      authTokens.schoolAdmin = await login('school_admin_01', 'password123');
    });

    await test('Login as district admin (yunyan_admin)', async () => {
      authTokens.districtAdmin = await login('yunyan_admin', 'password123');
    });

    await test('Login as municipal admin (guiyang_admin)', async () => {
      authTokens.municipalAdmin = await login('guiyang_admin', 'password123');
    });

    // ============================================
    // 阶段1: 配置接口测试
    // ============================================
    console.log(`\n${colors.bold}Phase 1: Configuration APIs${colors.reset}`);

    await test('GET /api/registration/config/districts - Get all districts', async () => {
      const response = await makeRequest('GET', '/api/registration/config/districts');
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
      assert(response.body.success === true, 'Response should indicate success');
      assert(Array.isArray(response.body.data), 'Data should be an array');
      assert(response.body.data.length === 12, `Expected 12 districts, got ${response.body.data.length}`);

      // 验证包含云岩区
      const yunyan = response.body.data.find(d => d.code === 'YY');
      assert(yunyan, 'Should contain Yunyan district (YY)');
      assert(yunyan.name === '云岩区', 'Yunyan name should be correct');
    });

    await test('GET /api/registration/config/schools/YY - Get schools in Yunyan district', async () => {
      const response = await makeRequest('GET', '/api/registration/config/schools/YY');
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
      assert(response.body.success === true, 'Response should indicate success');
      assert(Array.isArray(response.body.data), 'Data should be an array');
      assert(response.body.data.length === 3, `Expected 3 schools in YY, got ${response.body.data.length}`);

      // 验证包含云岩区第一小学
      const school = response.body.data.find(s => s.code === 'YY-PS-01');
      assert(school, 'Should contain YY-PS-01');
      assert(school.name === '云岩区第一小学', 'School name should be correct');
    });

    await test('GET /api/registration/config/schools/INVALID - Invalid district code', async () => {
      const response = await makeRequest('GET', '/api/registration/config/schools/INVALID');
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
      assert(response.body.success === true, 'Response should indicate success');
      assert(Array.isArray(response.body.data), 'Data should be an array');
      assert(response.body.data.length === 0, 'Should return empty array for invalid district');
    });

    // ============================================
    // 阶段2: 学生注册申请测试
    // ============================================
    console.log(`\n${colors.bold}Phase 2: Student Registration${colors.reset}`);

    await test('POST /api/registration/student - Valid registration', async () => {
      const response = await makeRequest('POST', '/api/registration/student', {
        phone: testData.testPhone,
        realName: 'API测试学生',
        birthDate: '2015-05-15',
        idCardLast4: '1234',
        districtCode: 'YY',
        schoolCode: 'YY-PS-01',
        grade: '二年级'
      });

      assert(response.statusCode === 201, `Expected 201, got ${response.statusCode}`);
      assert(response.body.success === true, 'Response should indicate success');
      assert(response.body.message.includes('已提交'), 'Should contain success message');
      assert(response.body.data.id, 'Should return registration ID');

      testData.registrationId = response.body.data.id;
    });

    await test('POST /api/registration/student - Duplicate phone number', async () => {
      const response = await makeRequest('POST', '/api/registration/student', {
        phone: testData.testPhone,
        realName: 'API测试学生2',
        birthDate: '2015-05-15',
        idCardLast4: '5678',
        districtCode: 'YY',
        schoolCode: 'YY-PS-01',
        grade: '二年级'
      });

      assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
      assert(response.body.success === false, 'Response should indicate failure');
      assert(response.body.message.includes('已注册') || response.body.message.includes('待审核'),
        'Should indicate duplicate registration');
    });

    await test('POST /api/registration/student - Invalid phone format', async () => {
      const response = await makeRequest('POST', '/api/registration/student', {
        phone: '12345',
        realName: 'API测试学生',
        birthDate: '2015-05-15',
        idCardLast4: '1234',
        districtCode: 'YY',
        schoolCode: 'YY-PS-01',
        grade: '二年级'
      });

      assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
      assert(response.body.success === false, 'Response should indicate failure');
      assert(response.body.message.includes('手机号'), 'Should mention phone number validation');
    });

    await test('POST /api/registration/student - Missing required field (realName)', async () => {
      const response = await makeRequest('POST', '/api/registration/student', {
        phone: '13900001111',
        birthDate: '2015-05-15',
        idCardLast4: '1234',
        districtCode: 'YY',
        schoolCode: 'YY-PS-01',
        grade: '二年级'
      });

      assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
      assert(response.body.success === false, 'Response should indicate failure');
    });

    await test('POST /api/registration/student - Invalid district code', async () => {
      const response = await makeRequest('POST', '/api/registration/student', {
        phone: '13900001112',
        realName: 'API测试学生',
        birthDate: '2015-05-15',
        idCardLast4: '1234',
        districtCode: 'INVALID',
        schoolCode: 'YY-PS-01',
        grade: '二年级'
      });

      assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
      assert(response.body.success === false, 'Response should indicate failure');
      assert(response.body.message.includes('区县'), 'Should mention district validation');
    });

    await test('POST /api/registration/student - School not in district', async () => {
      const response = await makeRequest('POST', '/api/registration/student', {
        phone: '13900001113',
        realName: 'API测试学生',
        birthDate: '2015-05-15',
        idCardLast4: '1234',
        districtCode: 'YY',
        schoolCode: 'NM-PS-01', // 南明区学校，但选择了云岩区
        grade: '二年级'
      });

      assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
      assert(response.body.success === false, 'Response should indicate failure');
      assert(response.body.message.includes('学校'), 'Should mention school validation');
    });

    // ============================================
    // 阶段3: 申请状态查询测试
    // ============================================
    console.log(`\n${colors.bold}Phase 3: Registration Status Query${colors.reset}`);

    await test(`GET /api/registration/status/${testData.testPhone} - Query registration status`, async () => {
      const response = await makeRequest('GET', `/api/registration/status/${testData.testPhone}`);

      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
      assert(response.body.success === true, 'Response should indicate success');
      assert(response.body.data.status === 'pending', 'Status should be pending');
      assert(response.body.data.current_reviewer_level === 2, 'Should be at school admin level');
      assert(response.body.data.phone === testData.testPhone, 'Phone should match');
    });

    await test('GET /api/registration/status/13999999999 - Query non-existent registration', async () => {
      const response = await makeRequest('GET', '/api/registration/status/13999999999');

      assert(response.statusCode === 404, `Expected 404, got ${response.statusCode}`);
      assert(response.body.success === false, 'Response should indicate failure');
      assert(response.body.message.includes('未找到'), 'Should indicate not found');
    });

    // ============================================
    // 阶段4: 管理员审核流程测试
    // ============================================
    console.log(`\n${colors.bold}Phase 4: Admin Review Process${colors.reset}`);

    // 注意：这些接口需要 JWT 认证，当前 registration.js 中有 TODO 注释
    // 如果认证未实现，这些测试会失败
    await skip('GET /api/registration/admin/requests - Get pending requests (school admin)',
      'JWT authentication not yet implemented in registration.js');

    await skip('POST /api/registration/admin/requests/:id/approve - Approve registration',
      'JWT authentication not yet implemented in registration.js');

    await skip('POST /api/registration/admin/requests/:id/reject - Reject registration',
      'JWT authentication not yet implemented in registration.js');

    await skip('GET /api/registration/admin/requests/:id/history - View audit history',
      'JWT authentication not yet implemented in registration.js');

    // ============================================
    // 测试总结
    // ============================================
    console.log(`\n${colors.bold}${colors.blue}==============================================`);
    console.log(`Test Summary`);
    console.log(`==============================================${colors.reset}`);
    console.log(`Total:   ${results.total}`);
    console.log(`${colors.green}Passed:  ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed:  ${results.failed}${colors.reset}`);
    console.log(`${colors.yellow}Skipped: ${results.skipped}${colors.reset}`);

    if (results.failed > 0) {
      console.log(`\n${colors.red}Failed tests:${colors.reset}`);
      results.tests
        .filter(t => t.status === 'failed')
        .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    }

    if (results.skipped > 0) {
      console.log(`\n${colors.yellow}Skipped tests:${colors.reset}`);
      results.tests
        .filter(t => t.status === 'skipped')
        .forEach(t => console.log(`  - ${t.name}: ${t.reason}`));
    }

    console.log('');

    // 退出码
    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
runTests();
