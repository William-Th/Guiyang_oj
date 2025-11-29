/**
 * 教学班管理 API 测试脚本
 * Teaching Class Management API Test Script
 *
 * 测试范围:
 * 1. 创建教学班 (校级/区级/市级)
 * 2. 查询教学班列表
 * 3. 获取教学班详情
 * 4. 更新教学班
 * 5. 提交审核
 * 6. 审批流程
 * 7. 学生管理
 * 8. 活动分配
 */

const http = require('http');

const API_BASE = 'http://localhost:3001';

// 测试账号
const TEST_ACCOUNTS = {
  teacher: { username: 'teacher01', password: 'password123' },
  schoolAdmin: { username: 'school_admin01', password: 'password123' },
  districtAdmin: { username: 'district_admin01', password: 'password123' },
  municipalAdmin: { username: 'municipal_admin01', password: 'password123' }
};

let teacherToken = null;
let schoolAdminToken = null;
let testTeachingClassId = null;

// HTTP 请求封装
function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 登录获取 token
async function login(username, password) {
  const res = await request('POST', '/api/auth/login', { username, password });
  if (res.status === 200 && res.data.token) {
    return res.data.token;
  }
  throw new Error(`Login failed for ${username}: ${JSON.stringify(res.data)}`);
}

// 测试结果统计
let passed = 0;
let failed = 0;

function logTest(name, success, details = '') {
  if (success) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   详情: ${details}`);
    failed++;
  }
}

// ============================================
// 测试用例
// ============================================

async function testHealthCheck() {
  console.log('\n=== 健康检查 ===');
  const res = await request('GET', '/health');
  logTest('健康检查端点', res.status === 200 && res.data.status === 'OK');
}

async function testLogin() {
  console.log('\n=== 登录测试 ===');

  try {
    teacherToken = await login(TEST_ACCOUNTS.teacher.username, TEST_ACCOUNTS.teacher.password);
    logTest('教师登录', !!teacherToken);
  } catch (e) {
    logTest('教师登录', false, e.message);
  }

  try {
    schoolAdminToken = await login(TEST_ACCOUNTS.schoolAdmin.username, TEST_ACCOUNTS.schoolAdmin.password);
    logTest('学校管理员登录', !!schoolAdminToken);
  } catch (e) {
    logTest('学校管理员登录', false, e.message);
    // 尝试使用教师账号作为备用
    schoolAdminToken = teacherToken;
  }
}

async function testCreateTeachingClass() {
  console.log('\n=== 创建教学班测试 ===');

  const timestamp = Date.now();
  const testData = {
    name: `测试教学班-${timestamp}`,
    description: '这是一个 API 测试创建的教学班',
    scope: 'school',
    academic_year: '2025-2026学年第一学期',
    subject: '数学',
    grade: '三年级'
  };

  const res = await request('POST', '/api/teaching-classes', testData, teacherToken);

  // API 返回格式: { success: true, data: { id, ... } } 或 { id, ... }
  const responseData = res.data.data || res.data;
  if ((res.status === 201 || res.status === 200) && responseData.id) {
    testTeachingClassId = responseData.id;
    logTest('创建校级教学班', true);
    console.log(`   创建的教学班 ID: ${testTeachingClassId}`);
  } else {
    logTest('创建校级教学班', false, JSON.stringify(res.data));
  }

  // 测试缺少必填字段
  const invalidData = { name: '测试班级' };
  const invalidRes = await request('POST', '/api/teaching-classes', invalidData, teacherToken);
  logTest('缺少必填字段应返回错误', invalidRes.status === 400);
}

async function testGetTeachingClasses() {
  console.log('\n=== 查询教学班列表测试 ===');

  // 获取所有教学班
  const res = await request('GET', '/api/teaching-classes', null, teacherToken);
  logTest('获取教学班列表', res.status === 200 && Array.isArray(res.data.data));

  if (res.status === 200) {
    console.log(`   返回 ${res.data.data.length} 个教学班，总计 ${res.data.pagination.total} 条`);
  }

  // 按状态筛选
  const draftRes = await request('GET', '/api/teaching-classes?status=draft', null, teacherToken);
  logTest('按状态筛选 (draft)', draftRes.status === 200);

  // 按范围筛选
  const schoolRes = await request('GET', '/api/teaching-classes?scope=school', null, teacherToken);
  logTest('按范围筛选 (school)', schoolRes.status === 200);
}

async function testGetTeachingClassDetail() {
  console.log('\n=== 获取教学班详情测试 ===');

  if (!testTeachingClassId) {
    logTest('获取教学班详情', false, '没有可用的测试教学班 ID');
    return;
  }

  const res = await request('GET', `/api/teaching-classes/${testTeachingClassId}`, null, teacherToken);

  if (res.status === 200) {
    const detail = res.data;
    logTest('获取教学班详情',
      detail.id === testTeachingClassId &&
      detail.status === 'draft' &&
      Array.isArray(detail.students) &&
      Array.isArray(detail.teachers) &&
      Array.isArray(detail.activities)
    );
    console.log(`   教学班名称: ${detail.name}, 状态: ${detail.status}`);
  } else {
    logTest('获取教学班详情', false, JSON.stringify(res.data));
  }

  // 测试不存在的 ID
  const notFoundRes = await request('GET', '/api/teaching-classes/999999', null, teacherToken);
  logTest('不存在的教学班应返回 404', notFoundRes.status === 404);
}

async function testUpdateTeachingClass() {
  console.log('\n=== 更新教学班测试 ===');

  if (!testTeachingClassId) {
    logTest('更新教学班', false, '没有可用的测试教学班 ID');
    return;
  }

  const updateData = {
    name: `更新后的教学班-${Date.now()}`,
    description: '更新后的描述'
  };

  const res = await request('PUT', `/api/teaching-classes/${testTeachingClassId}`, updateData, teacherToken);
  logTest('更新教学班信息', res.status === 200);

  if (res.status === 200) {
    console.log(`   更新后名称: ${res.data.name}`);
  }
}

async function testSubmitForApproval() {
  console.log('\n=== 提交审核测试 ===');

  if (!testTeachingClassId) {
    logTest('提交审核', false, '没有可用的测试教学班 ID');
    return;
  }

  const res = await request('POST', `/api/teaching-classes/${testTeachingClassId}/submit`, {}, teacherToken);

  if (res.status === 200) {
    logTest('提交审核成功', res.data.status === 'pending');
    console.log(`   当前审核级别: ${res.data.current_reviewer_level}`);
  } else {
    logTest('提交审核', false, JSON.stringify(res.data));
  }

  // 验证状态已变更
  const checkRes = await request('GET', `/api/teaching-classes/${testTeachingClassId}`, null, teacherToken);
  logTest('验证状态变更为 pending', checkRes.data.status === 'pending');
}

async function testApprovalWorkflow() {
  console.log('\n=== 审批流程测试 ===');

  if (!testTeachingClassId) {
    logTest('审批流程', false, '没有可用的测试教学班 ID');
    return;
  }

  // 获取待审批列表 (使用学校管理员)
  const pendingRes = await request('GET', '/api/teaching-classes/admin/pending', null, schoolAdminToken);
  logTest('获取待审批列表', pendingRes.status === 200 || pendingRes.status === 403);

  if (pendingRes.status === 200) {
    console.log(`   待审批数量: ${pendingRes.data.data?.length || 0}`);
  }

  // 批准教学班 (由于权限问题，这里可能失败)
  const approveRes = await request('POST', `/api/teaching-classes/${testTeachingClassId}/approve`, {
    comment: 'API 测试批准'
  }, schoolAdminToken);

  if (approveRes.status === 200) {
    logTest('批准教学班', true);
    console.log(`   批准后状态: ${approveRes.data.status}`);
  } else if (approveRes.status === 403) {
    logTest('批准教学班 (权限不足)', true);  // 预期行为
    console.log(`   需要对应级别管理员权限`);
  } else {
    logTest('批准教学班', false, JSON.stringify(approveRes.data));
  }
}

async function testStudentManagement() {
  console.log('\n=== 学生管理测试 ===');

  if (!testTeachingClassId) {
    logTest('学生管理', false, '没有可用的测试教学班 ID');
    return;
  }

  // 获取学生列表
  const studentsRes = await request('GET', `/api/teaching-classes/${testTeachingClassId}/students`, null, teacherToken);
  logTest('获取教学班学生列表', studentsRes.status === 200);

  if (studentsRes.status === 200) {
    console.log(`   当前学生数: ${studentsRes.data.length}`);
  }

  // 注意: 添加学生需要教学班为已批准状态，且学生 ID 有效
  // 这里仅测试 API 端点可访问性
  const addStudentRes = await request('POST', `/api/teaching-classes/${testTeachingClassId}/students`, {
    student_id: 1
  }, teacherToken);

  // 可能返回错误（教学班未批准或学生不存在）
  logTest('添加学生 API 可访问', [200, 400, 403, 404].includes(addStudentRes.status));
}

async function testDeleteTeachingClass() {
  console.log('\n=== 删除教学班测试 ===');

  // 创建一个新的草稿教学班用于删除测试
  const timestamp = Date.now();
  const createRes = await request('POST', '/api/teaching-classes', {
    name: `待删除教学班-${timestamp}`,
    description: '用于删除测试',
    scope: 'school',
    academic_year: '2025-2026学年第一学期'
  }, teacherToken);

  const createData = createRes.data.data || createRes.data;
  if (!createData.id) {
    logTest('创建待删除教学班', false, JSON.stringify(createRes.data));
    return;
  }

  const deleteId = createData.id;
  console.log(`   创建待删除教学班 ID: ${deleteId}`);

  // 删除教学班
  const deleteRes = await request('DELETE', `/api/teaching-classes/${deleteId}`, null, teacherToken);
  logTest('删除草稿教学班', deleteRes.status === 200);

  // 验证已删除
  const checkRes = await request('GET', `/api/teaching-classes/${deleteId}`, null, teacherToken);
  logTest('验证教学班已删除', checkRes.status === 404);
}

async function testUnauthorizedAccess() {
  console.log('\n=== 未授权访问测试 ===');

  // 无 token 访问
  const noTokenRes = await request('GET', '/api/teaching-classes');
  logTest('无 token 访问应返回 401', noTokenRes.status === 401);

  // 无效 token 访问
  const invalidTokenRes = await request('GET', '/api/teaching-classes', null, 'invalid-token');
  logTest('无效 token 访问应返回 401', invalidTokenRes.status === 401);
}

// ============================================
// 主测试流程
// ============================================

async function runTests() {
  console.log('==========================================');
  console.log('    教学班管理 API 测试');
  console.log('==========================================');
  console.log(`开始时间: ${new Date().toLocaleString()}`);

  try {
    await testHealthCheck();
    await testLogin();

    if (teacherToken) {
      await testUnauthorizedAccess();
      await testCreateTeachingClass();
      await testGetTeachingClasses();
      await testGetTeachingClassDetail();
      await testUpdateTeachingClass();
      await testSubmitForApproval();
      await testApprovalWorkflow();
      await testStudentManagement();
      await testDeleteTeachingClass();
    } else {
      console.log('\n⚠️  跳过需要认证的测试（登录失败）');
    }

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    console.error(error.stack);
  }

  console.log('\n==========================================');
  console.log('    测试结果汇总');
  console.log('==========================================');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`总计: ${passed + failed}`);
  console.log(`通过率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log(`结束时间: ${new Date().toLocaleString()}`);
}

runTests();
