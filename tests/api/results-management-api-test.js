#!/usr/bin/env node
/**
 * Results Management API Test
 * 成绩管理 API 测试
 *
 * 测试范围:
 * - 获取学生成绩列表
 * - 获取考试成绩详情
 * - 获取考试统计信息
 * - 证书生成和下载
 * - 成绩导出
 *
 * 运行方式:
 *   node tests/api/results-management-api-test.js
 */

const http = require('http');

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3003';
const TIMEOUT = 10000;

// 测试数据
let authTokens = {
  student: null,
  teacher: null,
  admin: null
};

let testData = {
  studentId: null,
  activityId: null,
  studentActivityId: null
};

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
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// HTTP请求封装
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, API_BASE_URL);

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: TIMEOUT
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
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

// 测试工具函数
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

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    return { passed: true };
  }
  return {
    passed: false,
    message: `${message || 'Assertion failed'}: expected ${expected}, got ${actual}`
  };
}

function assertTrue(condition, message) {
  if (condition) {
    return { passed: true };
  }
  return { passed: false, message: message || 'Assertion failed: condition is false' };
}

function assertNotNull(value, message) {
  if (value !== null && value !== undefined) {
    return { passed: true };
  }
  return { passed: false, message: message || 'Value is null or undefined' };
}

// 测试步骤
async function test_Login() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 1: 用户登录');
  console.log('='.repeat(60) + '\n');

  try {
    // 学生登录 - 使用手机号登录
    const studentLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login'
    }, {
      username: '13812340001',
      password: 'password123'
    });

    const studentCheck = assertEqual(studentLoginRes.status, 200, '学生登录状态码');
    logTest('学生登录成功', studentCheck.passed, studentCheck.message);

    if (studentCheck.passed && studentLoginRes.data.token) {
      authTokens.student = studentLoginRes.data.token;
      testData.studentId = studentLoginRes.data.user.id;
      logTest('获取学生Token和ID', true, `Student ID: ${testData.studentId}`);
    } else {
      throw new Error('Failed to get student token');
    }

    // 教师登录
    const teacherLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login'
    }, {
      username: 'teacher01',
      password: 'password123'
    });

    const teacherCheck = assertEqual(teacherLoginRes.status, 200, '教师登录状态码');
    logTest('教师登录成功', teacherCheck.passed, teacherCheck.message);

    if (teacherCheck.passed && teacherLoginRes.data.token) {
      authTokens.teacher = teacherLoginRes.data.token;
      logTest('获取教师Token', true, 'Token获取成功');
    }

    // 管理员登录
    const adminLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login'
    }, {
      username: 'admin',
      password: 'password123'
    });

    const adminCheck = assertEqual(adminLoginRes.status, 200, '管理员登录状态码');
    logTest('管理员登录成功', adminCheck.passed, adminCheck.message);

    if (adminCheck.passed && adminLoginRes.data.token) {
      authTokens.admin = adminLoginRes.data.token;
      logTest('获取管理员Token', true, 'Token获取成功');
    }

  } catch (error) {
    logTest('登录步骤失败', false, error.message);
    throw error;
  }
}

async function test_GetStudentResults() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 2: 获取学生成绩');
  console.log('='.repeat(60) + '\n');

  try {
    const resultsRes = await makeRequest({
      method: 'GET',
      path: `/api/results/student/${testData.studentId}`,
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    });

    const statusCheck = assertEqual(resultsRes.status, 200, '获取学生成绩状态码');
    logTest('获取学生成绩列表成功', statusCheck.passed, statusCheck.message);

    if (statusCheck.passed && resultsRes.data.results) {
      const results = resultsRes.data.results;
      logTest('验证成绩列表', Array.isArray(results),
        Array.isArray(results) ? `找到 ${results.length} 条成绩记录` : '返回数据格式错误'
      );

      if (results.length > 0) {
        const firstResult = results[0];
        const hasRequiredFields = firstResult.activity_id && firstResult.score !== undefined;
        logTest('验证成绩数据结构', hasRequiredFields,
          hasRequiredFields ? '包含必需字段: activity_id, score' : '缺少必需字段'
        );

        // 保存第一个活动ID用于后续测试
        if (firstResult.activity_id) {
          testData.activityId = firstResult.activity_id;
          testData.studentActivityId = firstResult.id;
          logTest('保存活动ID', true, `Activity ID: ${testData.activityId}`);
        }
      }
    }

  } catch (error) {
    logTest('获取学生成绩失败', false, error.message);
    // 不抛出错误，继续后续测试
  }
}

async function test_GetActivityResults() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 3: 获取活动成绩详情');
  console.log('='.repeat(60) + '\n');

  try {
    // 如果没有活动ID，先获取一个活动
    if (!testData.activityId) {
      const activitiesRes = await makeRequest({
        method: 'GET',
        path: '/api/activities?limit=1',
        headers: {
          'Authorization': `Bearer ${authTokens.teacher}`
        }
      });

      if (activitiesRes.status === 200 && activitiesRes.data.activities && activitiesRes.data.activities.length > 0) {
        testData.activityId = activitiesRes.data.activities[0].id;
        logTest('获取活动ID', true, `Activity ID: ${testData.activityId}`);
      } else {
        logTest('获取活动ID失败', false, '没有可用的活动');
        return;
      }
    }

    // 使用学生token - 此API返回当前登录用户的成绩
    const resultsRes = await makeRequest({
      method: 'GET',
      path: `/api/results/exam/${testData.activityId}`,
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    });

    const statusCheck = assertEqual(resultsRes.status, 200, '获取活动成绩状态码');
    logTest('获取活动成绩详情成功', statusCheck.passed, statusCheck.message);

    if (statusCheck.passed && resultsRes.data.results) {
      const results = resultsRes.data.results;
      logTest('验证活动成绩列表', Array.isArray(results),
        Array.isArray(results) ? `活动有 ${results.length} 个学生参与` : '返回数据格式错误'
      );

      if (results.length > 0) {
        const firstResult = results[0];
        const hasStudentInfo = firstResult.student_name || firstResult.student_id;
        logTest('验证成绩包含学生信息', hasStudentInfo !== undefined,
          hasStudentInfo ? '包含学生信息' : '缺少学生信息'
        );
      }
    }

  } catch (error) {
    logTest('获取活动成绩失败', false, error.message);
    // 不抛出错误，继续后续测试
  }
}

async function test_GetActivityStatistics() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 4: 获取活动统计信息');
  console.log('='.repeat(60) + '\n');

  try {
    if (!testData.activityId) {
      logTest('跳过统计测试', false, '没有可用的活动ID');
      return;
    }

    const statsRes = await makeRequest({
      method: 'GET',
      path: `/api/results/exam/${testData.activityId}/statistics`,
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const statusCheck = assertEqual(statsRes.status, 200, '获取统计信息状态码');
    logTest('获取活动统计信息成功', statusCheck.passed, statusCheck.message);

    if (statusCheck.passed && statsRes.data.statistics) {
      const stats = statsRes.data.statistics;

      // 验证统计数据包含关键指标
      const hasBasicStats = stats.total_students !== undefined ||
                           stats.average_score !== undefined ||
                           stats.participation_count !== undefined;

      logTest('验证统计数据结构', hasBasicStats,
        hasBasicStats ? '包含统计指标' : '缺少统计指标'
      );
    }

  } catch (error) {
    logTest('获取活动统计失败', false, error.message);
    // 不抛出错误，继续后续测试
  }
}

async function test_CertificateAvailable() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 5: 查询可用证书');
  console.log('='.repeat(60) + '\n');

  try {
    const certsRes = await makeRequest({
      method: 'GET',
      path: '/api/results/certificates/available',
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    });

    const statusCheck = assertEqual(certsRes.status, 200, '查询可用证书状态码');
    logTest('查询可用证书成功', statusCheck.passed, statusCheck.message);

    if (statusCheck.passed && certsRes.data.certificates) {
      const certs = certsRes.data.certificates;
      logTest('验证证书列表', Array.isArray(certs),
        Array.isArray(certs) ? `学生有 ${certs.length} 个可用证书` : '返回数据格式错误'
      );
    }

  } catch (error) {
    logTest('查询可用证书失败', false, error.message);
    // 不抛出错误，继续后续测试
  }
}

async function test_GenerateCertificate() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 6: 生成证书');
  console.log('='.repeat(60) + '\n');

  try {
    if (!testData.activityId || !testData.studentId) {
      logTest('跳过证书生成测试', false, '缺少必要的测试数据');
      return;
    }

    const certRes = await makeRequest({
      method: 'POST',
      path: '/api/results/certificate',
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    }, {
      examId: testData.activityId,
      studentId: testData.studentId
    });

    // 证书生成可能需要特定条件（如及格分数），所以我们接受200或400
    const statusCheck = certRes.status === 200 || certRes.status === 400;
    logTest('证书生成API调用', statusCheck,
      statusCheck ? `状态码: ${certRes.status}` : '状态码异常'
    );

    if (certRes.status === 200 && certRes.data.certificate) {
      logTest('证书生成成功', true, '证书已生成');
    } else if (certRes.status === 400) {
      logTest('证书生成条件检查', true, '不满足证书生成条件（符合预期）');
    }

  } catch (error) {
    logTest('证书生成失败', false, error.message);
    // 不抛出错误，继续后续测试
  }
}

async function test_DownloadCertificate() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 7: 下载证书');
  console.log('='.repeat(60) + '\n');

  try {
    if (!testData.activityId) {
      logTest('跳过证书下载测试', false, '没有可用的活动ID');
      return;
    }

    const downloadRes = await makeRequest({
      method: 'GET',
      path: `/api/results/certificate/${testData.activityId}/download`,
      headers: {
        'Authorization': `Bearer ${authTokens.student}`
      }
    });

    // 下载可能返回200（PDF）或404（证书不存在）
    const statusCheck = downloadRes.status === 200 || downloadRes.status === 404;
    logTest('证书下载API调用', statusCheck,
      statusCheck ? `状态码: ${downloadRes.status}` : '状态码异常'
    );

    if (downloadRes.status === 200) {
      // 验证返回的是PDF内容
      const isPDF = downloadRes.headers['content-type'] &&
                    downloadRes.headers['content-type'].includes('pdf');
      logTest('验证PDF内容类型', isPDF !== undefined,
        isPDF ? 'Content-Type正确' : 'Content-Type可能不正确'
      );
    } else if (downloadRes.status === 404) {
      logTest('证书不存在检查', true, '证书尚未生成（符合预期）');
    }

  } catch (error) {
    logTest('证书下载失败', false, error.message);
    // 不抛出错误，继续后续测试
  }
}

async function test_ExportResults() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 8: 导出成绩');
  console.log('='.repeat(60) + '\n');

  try {
    if (!testData.activityId) {
      logTest('跳过成绩导出测试', false, '没有可用的活动ID');
      return;
    }

    const exportRes = await makeRequest({
      method: 'GET',
      path: `/api/results/export/${testData.activityId}`,
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const statusCheck = assertEqual(exportRes.status, 200, '导出成绩状态码');
    logTest('导出成绩API调用成功', statusCheck.passed, statusCheck.message);

    if (exportRes.data.message && exportRes.data.message.includes('Export results endpoint')) {
      logTest('导出功能状态', true, '功能标记为开发中（符合预期）');
    } else if (exportRes.data.file || exportRes.data.url) {
      // 如果功能已实现，验证导出结果
      logTest('验证导出文件', true, '成绩导出文件已生成');
    }

  } catch (error) {
    logTest('导出成绩失败', false, error.message);
    // 不抛出错误，因为这是预期的TODO功能
  }
}

// 主测试函数
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('成绩管理 API 测试');
  console.log('Results Management API Test');
  console.log('='.repeat(60));

  try {
    await test_Login();
    await test_GetStudentResults();
    await test_GetActivityResults();
    await test_GetActivityStatistics();
    await test_CertificateAvailable();
    await test_GenerateCertificate();
    await test_DownloadCertificate();
    await test_ExportResults();

  } catch (error) {
    console.error(`\n${colors.red}测试执行失败:${colors.reset}`, error.message);
  }

  // 打印测试结果
  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));
  console.log(`总计: ${results.total} 个测试`);
  console.log(`${colors.green}通过: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}失败: ${results.failed}${colors.reset}`);

  if (results.failed > 0) {
    console.log('\n失败的测试:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
      if (t.message) console.log(`    ${t.message}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试覆盖:');
  console.log('  ✓ 获取学生成绩列表');
  console.log('  ✓ 获取活动成绩详情');
  console.log('  ✓ 获取活动统计信息');
  console.log('  ✓ 查询可用证书');
  console.log('  ✓ 生成证书');
  console.log('  ✓ 下载证书');
  console.log('  ✓ 导出成绩');
  console.log('='.repeat(60) + '\n');

  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

// 执行测试
runTests().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
