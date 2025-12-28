#!/usr/bin/env node
/**
 * API Smoke Test
 * 快速验证核心API功能是否正常工作
 *
 * 运行方式:
 *   node tests/api/smoke-test.js
 */

const http = require('http');

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3003';
const TIMEOUT = 5000; // 5秒超�?

// 测试结果
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
async function runTest(name, testFn) {
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
 * 测试套件
 */
async function runSmokeTests() {
  console.log(`\n${colors.blue}=== API Smoke Tests ===${colors.reset}`);
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  // 测试1: 健康检查
  await runTest('Health check endpoint', async () => {
    const response = await makeRequest({ path: '/health' });
    assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && data.status === 'OK', 'Health check should return status OK');
  });

  // 测试2: 数据库连接
  await runTest('Database connectivity', async () => {
    const response = await makeRequest({ path: '/health' });
    const data = response.json();
    assert(data && data.database === 'connected', 'Database should be connected');
  });

  // 测试4: 学生登录API (使用手机号作为username登录)
  await runTest('Student login endpoint', async () => {
    const postData = JSON.stringify({
      username: '13800138003',
      password: 'password123'
    });

    const response = await makeRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && data.token, 'Login should return a token');
    assert(data.user, 'Should return user data');
  });

  // 测试5: 管理员登录API
  await runTest('Admin login endpoint', async () => {
    const postData = JSON.stringify({
      username: 'admin',
      password: 'password123',
      loginType: 'username'
    });

    const response = await makeRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && data.token, 'Login should return a token');
    assert(data.user, 'Should return user data');
  });

  // 测试6: 教师登录API
  await runTest('Teacher login endpoint', async () => {
    const postData = JSON.stringify({
      username: 'teacher01',
      password: 'password123',
      loginType: 'username'
    });

    const response = await makeRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    assert(response.statusCode === 200, `Expected status 200, got ${response.statusCode}`);
    const data = response.json();
    assert(data && data.token, 'Login should return a token');
    assert(data.user, 'Should return user data');
  });

  // 测试7: 无效登录凭证
  await runTest('Invalid login credentials', async () => {
    const postData = JSON.stringify({
      username: 'invalid_user',
      password: 'wrong_password'
    });

    const response = await makeRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    assert(response.statusCode === 401, `Expected status 401, got ${response.statusCode}`);
  });

  // 测试8: 证书验证API（公开接口�?
  await runTest('Certificate verification endpoint', async () => {
    // 使用一个不存在的证书编号，应该返回404（或证书不存在的响应�?
    const response = await makeRequest({ path: '/api/certificate/verify/GY-2025-00000000' });
    // 接受404或其他表示证书不存在的状态码
    assert(response.statusCode >= 400 && response.statusCode < 500,
      `Expected 4xx status for non-existent certificate, got ${response.statusCode}`);
  });

  // 测试9: API路由是否正确配置
  await runTest('API routes configuration', async () => {
    const response = await makeRequest({ path: '/api/nonexistent' });
    assert(response.statusCode === 404, `Expected status 404 for non-existent route, got ${response.statusCode}`);
  });

  // 测试10: CORS配置 (使用允许的Origin: localhost:3100)
  await runTest('CORS headers', async () => {
    const response = await makeRequest({
      path: '/health',
      headers: {
        'Origin': 'http://localhost:3100'
      }
    });
    assert(response.headers['access-control-allow-origin'], 'CORS headers should be present');
  });
}

/**
 * 主函�?
 */
async function main() {
  const startTime = Date.now();

  try {
    await runSmokeTests();
  } catch (error) {
    console.error(`\n${colors.red}Unexpected error: ${error.message}${colors.reset}`);
  }

  const totalTime = Date.now() - startTime;

  // 打印总结
  console.log(`\n${colors.blue}=== Test Summary ===${colors.reset}`);
  console.log(`Total: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Duration: ${totalTime}ms\n`);

  // 如果有失败的测试，退出码�?
  if (results.failed > 0) {
    console.log(`${colors.red}Smoke tests FAILED${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}All smoke tests PASSED${colors.reset}\n`);
    process.exit(0);
  }
}

// 运行测试
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
