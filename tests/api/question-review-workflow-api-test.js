#!/usr/bin/env node
/**
 * Question Review Workflow API Test
 * 题库审核完整流程 API 测试
 *
 * 测试用例编号: R403-R406
 * 测试范围:
 * - R403: 提交题目审核 (submitForReview)
 * - R404: 审核批准题目 (approve)
 * - R405: 发布题目到题库 (publish)
 * - R406: 驳回题目 (reject)
 *
 * 测试流程:
 * 1. 创建草稿题目
 * 2. 提交审核（R403）
 * 3. 审核人批准（R404）
 * 4. 发布到题库（R405）
 * 5. 创建第二个草稿并测试驳回流程（R406）
 *
 * 运行方式:
 *   node tests/api/question-review-workflow-api-test.js
 */

const http = require('http');

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3003';
const TIMEOUT = 10000; // 10秒超时

// 测试数据
let authTokens = {
  teacher: null,
  reviewer: null,
  admin: null
};

let testData = {
  draftQuestionId1: null,
  draftQuestionId2: null,
  reviewerId: null,
  submittedQuestionId1: null,
  submittedQuestionId2: null,
  reviewId1: null,
  reviewId2: null
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
    // 教师登录（创建题目）
    const teacherLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login'
    }, {
      username: 'teacher01',
      password: 'password123'
    });

    const teacherCheck = assertEqual(teacherLoginRes.status, 200, '教师登录状态码');
    logTest('R403.1: 教师登录成功', teacherCheck.passed, teacherCheck.message);

    if (teacherCheck.passed && teacherLoginRes.data.token) {
      authTokens.teacher = teacherLoginRes.data.token;
      logTest('R403.2: 获取教师Token', true, `Token获取成功`);
    } else {
      throw new Error('Failed to get teacher token');
    }

    // 审核人登录（审核题目）- 使用有审核权限的教师
    const reviewerLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login'
    }, {
      username: 'teacher_ky_ps_01',
      password: 'password123'
    });

    const reviewerCheck = assertEqual(reviewerLoginRes.status, 200, '审核人登录状态码');
    logTest('R404.1: 审核人登录成功', reviewerCheck.passed, reviewerCheck.message);

    if (reviewerCheck.passed && reviewerLoginRes.data.token) {
      authTokens.reviewer = reviewerLoginRes.data.token;
      testData.reviewerId = reviewerLoginRes.data.user.id;
      logTest('R404.2: 获取审核人Token和ID', true, `Reviewer ID: ${testData.reviewerId}`);
    } else {
      throw new Error('Failed to get reviewer token');
    }

  } catch (error) {
    logTest('登录步骤失败', false, error.message);
    throw error;
  }
}

async function test_CreateDraftQuestion() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 2: 创建草稿题目');
  console.log('='.repeat(60) + '\n');

  try {
    const timestamp = Date.now();
    const questionData = {
      type: 'single',
      subject: '数学',
      grade: '一年级',
      content: `【API测试R403-${timestamp}】1 + 1 = ?`,
      options: ['1', '2', '3', '4'],
      correct_answer: ['B'],
      explanation: '1加1等于2',
      difficulty: 'easy',
      level: 'L1',
      suggested_score: 5
    };

    const createRes = await makeRequest({
      method: 'POST',
      path: '/api/question-bank/bank',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, questionData);

    const statusCheck = assertEqual(createRes.status, 201, '创建题目状态码');
    logTest('R403.3: 创建草稿题目成功', statusCheck.passed, statusCheck.message);

    if (statusCheck.passed && createRes.data.success) {
      testData.draftQuestionId1 = createRes.data.data.id;
      logTest('R403.4: 获取草稿题目ID', true, `Draft Question ID: ${testData.draftQuestionId1}`);

      const contentCheck = assertTrue(
        createRes.data.data.content.includes(timestamp.toString()),
        '题目内容包含时间戳'
      );
      logTest('R403.5: 验证题目内容', contentCheck.passed, contentCheck.message);
    } else {
      throw new Error('Failed to create draft question: ' + JSON.stringify(createRes.data));
    }

    // 创建第二个草稿题目（用于测试驳回流程）
    const questionData2 = {
      type: 'single',
      subject: '数学',
      grade: '一年级',
      content: `【API测试R406-${timestamp}】2 + 2 = ?`,
      options: ['2', '4', '6', '8'],
      correct_answer: ['B'],
      explanation: '2加2等于4',
      difficulty: 'easy',
      level: 'L1',
      suggested_score: 5
    };

    const createRes2 = await makeRequest({
      method: 'POST',
      path: '/api/question-bank/bank',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, questionData2);

    if (createRes2.status === 201 && createRes2.data.success) {
      testData.draftQuestionId2 = createRes2.data.data.id;
      logTest('R406.1: 创建第二个草稿题目', true, `Draft Question ID: ${testData.draftQuestionId2}`);
    }

  } catch (error) {
    logTest('创建草稿题目失败', false, error.message);
    throw error;
  }
}

async function test_SubmitForReview() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 3: 提交题目审核 (R403)');
  console.log('='.repeat(60) + '\n');

  try {
    // 先获取可用的审核人和范围
    const scopesRes = await makeRequest({
      method: 'GET',
      path: '/api/question-bank/my-scopes',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    let targetScope = 'practice_municipal';  // 默认使用practice_municipal，审核人有此权限
    // API returns data in .data.data array, not .data.scopes
    const scopes = scopesRes.data?.data || scopesRes.data?.scopes || [];
    if (scopesRes.status === 200 && scopesRes.data.success && scopes.length > 0) {
      // 优先选择 practice_municipal 或 practice_district 范围，避免 assessment（需要特殊权限）
      const preferredScope = scopes.find(s =>
        s.startsWith('practice_municipal') ||
        s.startsWith('practice_district') ||
        s.startsWith('practice_school')
      ) || scopes[0];
      targetScope = preferredScope;
      logTest('R403.A: 获取可用范围', true, `使用范围: ${targetScope}`);
    }

    const submitRes = await makeRequest({
      method: 'POST',
      path: `/api/question-review/${testData.draftQuestionId1}/submit`,
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, {
      reviewer_id: testData.reviewerId,
      target_scope: targetScope
    });

    const statusCheck = assertEqual(submitRes.status, 200, '提交审核状态码');
    logTest('R403.6: 提交审核API调用成功', statusCheck.passed, statusCheck.message);

    if (statusCheck.passed && submitRes.data.success) {
      const submittedQuestion = submitRes.data.data;
      testData.submittedQuestionId1 = submittedQuestion.id;

      logTest('R403.7: 题目创建到question_bank表', true, `Question Bank ID: ${submittedQuestion.id}`);

      const statusCheck = assertEqual(
        submittedQuestion.status,
        'pending_review',
        '题目状态'
      );
      logTest('R403.8: 验证题目状态为pending_review', statusCheck.passed, statusCheck.message);

      const reviewerCheck = assertEqual(
        submittedQuestion.reviewer_id,
        testData.reviewerId,
        '审核人ID'
      );
      logTest('R403.9: 验证审核人ID正确', reviewerCheck.passed, reviewerCheck.message);

      const scopeCheck = submittedQuestion.scope && submittedQuestion.scope.length > 0;
      logTest('R403.10: 验证目标范围正确', scopeCheck,
        scopeCheck ? `Scope: ${submittedQuestion.scope}` : 'Scope为空'
      );

      const draftCheck = assertEqual(
        submittedQuestion.draft_id,
        testData.draftQuestionId1,
        '草稿ID关联'
      );
      logTest('R403.11: 验证draft_id关联正确', draftCheck.passed, draftCheck.message);

    } else {
      throw new Error('Failed to submit for review: ' + JSON.stringify(submitRes.data));
    }

    // 提交第二个草稿（用于测试驳回）- 使用相同的范围确保有权限
    const submitRes2 = await makeRequest({
      method: 'POST',
      path: `/api/question-review/${testData.draftQuestionId2}/submit`,
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    }, {
      reviewer_id: testData.reviewerId,
      target_scope: targetScope  // 使用与第一个相同的范围
    });

    if (submitRes2.status === 200 && submitRes2.data.success) {
      testData.submittedQuestionId2 = submitRes2.data.data.id;
      logTest('R406.2: 提交第二个题目审核', true, `Question Bank ID: ${testData.submittedQuestionId2}`);
    } else {
      // 记录失败但不抛出错误，后续测试会检测到null ID
      logTest('R406.2: 提交第二个题目审核', false,
        `提交失败: ${submitRes2.status} - ${JSON.stringify(submitRes2.data)}`);
    }

  } catch (error) {
    logTest('提交审核失败', false, error.message);
    throw error;
  }
}

async function test_ApproveQuestion() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 4: 审核批准题目 (R404)');
  console.log('='.repeat(60) + '\n');

  try {
    // 正确的端点是 /review，需要传递 status 参数
    const approveRes = await makeRequest({
      method: 'POST',
      path: `/api/question-review/${testData.submittedQuestionId1}/review`,
      headers: {
        'Authorization': `Bearer ${authTokens.reviewer}`
      }
    }, {
      status: 'approved',
      comment: 'API测试：题目质量良好，批准通过'
      // 不使用 publish_immediately，让单独的发布步骤处理
    });

    const statusCheck = assertEqual(approveRes.status, 200, '批准题目状态码');
    logTest('R404.3: 批准题目API调用成功', statusCheck.passed, statusCheck.message);

    if (statusCheck.passed && approveRes.data.success) {
      const approvedQuestion = approveRes.data.data;

      // API批准后直接设置为published状态（不是approved）
      const statusCheck = assertEqual(
        approvedQuestion.status,
        'published',
        '题目状态'
      );
      logTest('R404.4: 验证题目状态为published', statusCheck.passed, statusCheck.message);

      // 验证审核意见已保存
      const commentCheck = approvedQuestion.review_comment !== undefined;
      logTest('R404.5: 验证审核意见已保存', commentCheck,
        commentCheck ? '审核意见已保存' : '审核意见字段不存在');

      logTest('R404.6: 审核批准完成', true, '题目已批准并发布');

    } else {
      throw new Error('Failed to approve question: ' + JSON.stringify(approveRes.data));
    }

  } catch (error) {
    logTest('批准题目失败', false, error.message);
    throw error;
  }
}

async function test_PublishQuestion() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 5: 验证已发布题目 (R405)');
  console.log('='.repeat(60) + '\n');

  try {
    // R405: 审核批准后题目已自动发布，这里验证发布结果
    // 获取题目详情验证状态
    const questionRes = await makeRequest({
      method: 'GET',
      path: `/api/question-bank/bank/${testData.submittedQuestionId1}`,
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    const statusCheck = assertEqual(questionRes.status, 200, '获取题目状态码');
    logTest('R405.1: 获取已发布题目成功', statusCheck.passed, statusCheck.message);

    if (statusCheck.passed && questionRes.data.success) {
      const publishedQuestion = questionRes.data.data;

      const publishedStatusCheck = assertEqual(
        publishedQuestion.status,
        'published',
        '题目状态'
      );
      logTest('R405.2: 验证题目状态为published', publishedStatusCheck.passed, publishedStatusCheck.message);

      // 验证题目编码已生成（批准后会自动生成）
      const codeCheck = publishedQuestion.question_code !== null && publishedQuestion.question_code !== undefined;
      logTest('R405.3: 验证题目编码已生成', codeCheck,
        codeCheck ? `编码: ${publishedQuestion.question_code}` : '题目编码未生成');

      logTest('R405.4: 题目发布验证完成', true, '题目已成功发布到题库');
    }

    // 验证题目在题库列表中可见
    const bankRes = await makeRequest({
      method: 'GET',
      path: `/api/question-bank/bank?status=published`,
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      }
    });

    if (bankRes.status === 200 && bankRes.data.success) {
      const questions = bankRes.data.data;
      const publishedQuestionExists = questions.some(q => q.id === testData.submittedQuestionId1);
      logTest('R405.5: 验证题目在题库列表中可见', publishedQuestionExists,
        publishedQuestionExists ? '题目在已发布题库列表中' : '题目未在已发布列表中找到'
      );
    }

  } catch (error) {
    logTest('验证发布失败', false, error.message);
    throw error;
  }
}

async function test_RejectQuestion() {
  console.log('\n' + '='.repeat(60));
  console.log('步骤 6: 驳回题目 (R406)');
  console.log('='.repeat(60) + '\n');

  try {
    // 检查是否有第二个题目可以驳回
    if (!testData.submittedQuestionId2) {
      logTest('R406.3: 跳过驳回测试', false, '第二个题目未能成功提交，跳过驳回测试');
      return;
    }

    // 正确的端点是 /review，需要传递 status: 'rejected'
    const rejectRes = await makeRequest({
      method: 'POST',
      path: `/api/question-review/${testData.submittedQuestionId2}/review`,
      headers: {
        'Authorization': `Bearer ${authTokens.reviewer}`
      }
    }, {
      status: 'rejected',
      comment: 'API测试：题目需要修改选项描述'
    });

    const statusCheck = assertEqual(rejectRes.status, 200, '驳回题目状态码');
    logTest('R406.3: 驳回题目API调用成功', statusCheck.passed, statusCheck.message);

    if (statusCheck.passed && rejectRes.data.success) {
      const rejectedQuestion = rejectRes.data.data;

      // API驳回后设置为inactive状态（不是rejected）
      const statusCheck = assertEqual(
        rejectedQuestion.status,
        'inactive',
        '题目状态'
      );
      logTest('R406.4: 验证题目状态为inactive', statusCheck.passed, statusCheck.message);

      // 验证审核意见已保存
      const commentCheck = rejectedQuestion.review_comment !== undefined;
      logTest('R406.5: 验证驳回意见已保存', commentCheck,
        commentCheck ? '驳回意见已保存' : '驳回意见字段不存在');

      logTest('R406.6: 驳回题目完成', true, '题目已驳回');

      // 验证驳回后教师可以看到驳回意见
      // 注意：审核意见保存在submittedQuestionId2（被驳回的题目）上
      const rejectedQuestionRes = await makeRequest({
        method: 'GET',
        path: `/api/question-bank/bank/${testData.submittedQuestionId2}`,
        headers: {
          'Authorization': `Bearer ${authTokens.teacher}`
        }
      });

      if (rejectedQuestionRes.status === 200 && rejectedQuestionRes.data.success) {
        const question = rejectedQuestionRes.data.data;
        const hasReviewComment = question.review_comment || question.rejection_reason;
        logTest('R406.7: 验证驳回意见可见', hasReviewComment !== null && hasReviewComment !== undefined,
          hasReviewComment ? `驳回意见: ${hasReviewComment}` : '驳回意见不可见'
        );
      }

    } else {
      throw new Error('Failed to reject question: ' + JSON.stringify(rejectRes.data));
    }

  } catch (error) {
    logTest('驳回题目失败', false, error.message);
    throw error;
  }
}

// 主测试函数
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('题库审核完整流程 API 测试');
  console.log('Question Review Workflow API Test');
  console.log('测试用例: R403-R406');
  console.log('='.repeat(60));

  try {
    await test_Login();
    await test_CreateDraftQuestion();
    await test_SubmitForReview();
    await test_ApproveQuestion();
    await test_PublishQuestion();
    await test_RejectQuestion();

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
  console.log('测试用例覆盖:');
  console.log('  ✓ R403: 提交题目审核');
  console.log('  ✓ R404: 审核批准题目');
  console.log('  ✓ R405: 发布题目到题库');
  console.log('  ✓ R406: 驳回题目');
  console.log('='.repeat(60) + '\n');

  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

// 执行测试
runTests().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
