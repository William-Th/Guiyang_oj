#!/usr/bin/env node
/**
 * Question Bank Withdraw API Test
 * 题库撤回功能 API 测试
 *
 * 覆盖场景:
 *   - 撤回原因为空 → 400
 *   - 无 token → 401
 *   - 撤回不存在的发布记录 → 404
 *   - 教师撤回他人发布且无管理权限的题目 → 403
 *   - 管理员撤回任意已发布题目 → 200，状态 inactive
 *   - 重复撤回已撤回的题目 → 400（"只能撤回已发布的题目"）
 *   - 验证数据库字段 withdrawn_by / withdrawn_at / withdraw_reason 正确写入
 *
 * 前置条件:
 *   - 系统已运行 (docker-compose up)
 *   - 已运行迁移 042 (withdraw 字段)
 *   - 数据库存在至少 1 条 admin 发布的 active + published 题目
 *   - 数据库存在至少 1 条非 teacher01 发布的 active + published 题目
 *
 * 运行方式:
 *   node tests/api/question-bank-withdraw-test.js
 */

const http = require('http');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3003';
const TIMEOUT = 10000;

const tokens = { admin: null, teacher: null };
const results = { passed: 0, failed: 0, total: 0, tests: [] };

const colors = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m'
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, API_BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      timeout: TIMEOUT
    };
    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : {} });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function logTest(name, passed, message = '') {
  results.total++;
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    if (message) console.log(`  ${colors.blue}${message}${colors.reset}`);
  } else {
    results.failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (message) console.log(`  ${colors.red}${message}${colors.reset}`);
  }
}

async function login(username, password) {
  const res = await makeRequest(
    { method: 'POST', path: '/api/auth/login' },
    { username, password }
  );
  if (res.status !== 200 || !res.data.token) {
    throw new Error(`登录失败 ${username}: ${JSON.stringify(res.data)}`);
  }
  return res.data.token;
}

async function findQuestionPublishedByOther(token, excludeUserId) {
  // 列出已发布题目并找到 published_by != excludeUserId 且 is_active=true 的记录
  const res = await makeRequest({
    method: 'GET',
    path: '/api/question-bank/bank?status=published&limit=50',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status !== 200 || !res.data.data) {
    throw new Error('获取题库列表失败');
  }
  return res.data.data.find(q => q.published_by !== excludeUserId && q.is_active === true);
}

async function findQuestionByAdmin(token, adminId) {
  const res = await makeRequest({
    method: 'GET',
    path: '/api/question-bank/bank?status=published&limit=50',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status !== 200 || !res.data.data) {
    throw new Error('获取题库列表失败');
  }
  return res.data.data.find(q => q.published_by === adminId && q.is_active === true);
}

async function getQuestionRaw(token, id) {
  const res = await makeRequest({
    method: 'GET',
    path: `/api/question-bank/bank/${id}`,
    headers: { Authorization: `Bearer ${token}` }
  });
  return res;
}

async function withdraw(token, id, reason) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return makeRequest(
    { method: 'POST', path: `/api/question-bank/bank/${id}/withdraw`, headers },
    reason !== undefined ? { reason } : null
  );
}

async function runTests() {
  console.log(`${colors.cyan}=== 题库撤回功能 API 测试 ===${colors.reset}\n`);

  // === Setup ===
  console.log(`${colors.yellow}[Setup] 登录${colors.reset}`);
  tokens.admin = await login('admin', 'password123');
  tokens.teacher = await login('teacher01', 'password123');
  console.log(`  ${colors.green}✓${colors.reset} admin / teacher01 已登录\n`);

  console.log(`${colors.yellow}[Setup] 查找测试目标题目${colors.reset}`);
  const adminId = 1;
  const teacherId = 9; // teacher01
  const adminQuestion = await findQuestionByAdmin(tokens.admin, adminId);
  if (!adminQuestion) {
    console.log(`  ${colors.red}✗${colors.reset} 未找到 admin 发布的 active+published 题目，无法继续`);
    process.exit(1);
  }
  console.log(`  ${colors.green}✓${colors.reset} 目标题目 id=${adminQuestion.id} (admin 发布)`);

  const otherQuestion = await findQuestionPublishedByOther(tokens.admin, teacherId);
  if (!otherQuestion) {
    console.log(`  ${colors.red}✗${colors.reset} 未找到非 teacher01 发布的 active+published 题目`);
    process.exit(1);
  }
  console.log(`  ${colors.green}✓${colors.reset} 权限测试题目 id=${otherQuestion.id} (published_by=${otherQuestion.published_by})\n`);

  // === 1. 撤回原因为空 ===
  {
    const res = await withdraw(tokens.admin, adminQuestion.id, '');
    logTest(
      '1. 撤回原因为空应返回 400',
      res.status === 400 && /撤回原因/.test(res.data.error || ''),
      `status=${res.status}, error=${res.data.error}`
    );
  }

  // === 2. 无 token ===
  {
    const res = await withdraw(null, adminQuestion.id, '测试');
    logTest(
      '2. 无 token 应返回 401',
      res.status === 401,
      `status=${res.status}`
    );
  }

  // === 3. 撤回不存在ID ===
  {
    const res = await withdraw(tokens.admin, 999999, '测试');
    logTest(
      '3. 撤回不存在ID 应返回 404',
      res.status === 404 && /不存在/.test(res.data.error || ''),
      `status=${res.status}, error=${res.data.error}`
    );
  }

  // === 4. 教师撤回他人发布的题目 → 403 ===
  {
    const res = await withdraw(tokens.teacher, otherQuestion.id, 'teacher 尝试撤回');
    logTest(
      '4. 教师撤回他人题目应返回 403',
      res.status === 403 && /权限/.test(res.data.error || ''),
      `status=${res.status}, error=${res.data.error}`
    );
  }

  // === 5. 管理员撤回 → 200 ===
  let withdrawnId = null;
  {
    const reason = '集成测试自动撤回';
    const res = await withdraw(tokens.admin, adminQuestion.id, reason);
    const passed =
      res.status === 200 &&
      res.data.success === true &&
      res.data.data &&
      res.data.data.status === 'inactive' &&
      res.data.data.withdrawn_by === adminId &&
      res.data.data.withdraw_reason === reason &&
      res.data.data.withdrawn_at;
    logTest(
      '5. 管理员撤回应成功且字段正确',
      passed,
      `status=${res.status}, returned status=${res.data.data && res.data.data.status}, withdrawn_by=${res.data.data && res.data.data.withdrawn_by}`
    );
    if (passed) withdrawnId = adminQuestion.id;
  }

  // === 6. 重复撤回 → 400 ===
  if (withdrawnId) {
    const res = await withdraw(tokens.admin, withdrawnId, '再次撤回');
    logTest(
      '6. 重复撤回应返回 400',
      res.status === 400 && /已发布/.test(res.data.error || ''),
      `status=${res.status}, error=${res.data.error}`
    );
  } else {
    logTest('6. 重复撤回测试（跳过）', false, '上一步失败');
  }

  // === 7. 通过 GET 校验 DB 字段（通过 list API 验证已撤回记录可见 inactive 状态）===
  if (withdrawnId) {
    const res = await makeRequest({
      method: 'GET',
      path: `/api/question-bank/bank?status=inactive&limit=200`,
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    const found = res.data && res.data.data &&
      res.data.data.find(q => q.id === withdrawnId);
    logTest(
      '7. 已撤回记录在 inactive 列表中可查',
      !!found && found.status === 'inactive',
      found ? `withdraw_reason="${found.withdraw_reason}"` : 'not found'
    );
  } else {
    logTest('7. inactive 列表查询（跳过）', false, '上一步失败');
  }

  // === 总结 ===
  console.log(`\n${colors.cyan}=== 测试结果 ===${colors.reset}`);
  console.log(`总计: ${results.total}, 通过: ${colors.green}${results.passed}${colors.reset}, 失败: ${colors.red}${results.failed}${colors.reset}`);

  if (results.failed > 0) {
    console.log(`\n${colors.red}失败项:${colors.reset}`);
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.message}`);
    });
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error(`${colors.red}测试异常: ${err.message}${colors.reset}`);
  console.error(err.stack);
  process.exit(2);
});
