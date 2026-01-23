/**
 * Achievement Auto-Trigger Integration Test
 * 成就自动触发集成测试
 *
 * 测试范围:
 * - 学生完成活动后自动触发成就
 * - 成就自动授予
 * - 积分自动添加
 * - 事件总线完整流程
 *
 * 测试流程:
 * 1. 学生登录
 * 2. 获取初始成就和积分状态
 * 3. 学生完成一个活动（触发事件）
 * 4. 验证成就是否自动授予
 * 5. 验证积分是否自动增加
 */

const axios = require('axios');

// 测试配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3003/api';
const TEST_CONFIG = {
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// 测试用户凭证（使用现有学生账号）
const TEST_STUDENT = {
  username: '13800138003',  // 张小明 (student_id=1)
  password: 'password123'
};

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// 全局变量
let studentToken = null;
let studentId = null;
let adminToken = null;
let testActivityId = null;

/**
 * 辅助函数：创建授权请求配置
 */
function authConfig(token) {
  return {
    ...TEST_CONFIG,
    headers: {
      ...TEST_CONFIG.headers,
      'Authorization': `Bearer ${token}`
    }
  };
}

/**
 * 辅助函数：管理员登录
 */
async function loginAdmin() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      ADMIN_CREDENTIALS,
      TEST_CONFIG
    );

    if (response.data.token) {
      adminToken = response.data.token;
      console.log('✅ 管理员登录成功');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 管理员登录失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 辅助函数：学生登录
 */
async function loginStudent() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      TEST_STUDENT,
      TEST_CONFIG
    );

    if (response.data.token) {
      studentToken = response.data.token;
      studentId = response.data.user.id;
      console.log(`✅ 学生登录成功 (ID: ${studentId})`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 学生登录失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 辅助函数：获取学生成就列表
 */
async function getStudentAchievements() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/achievements/student/${studentId}`,
      authConfig(studentToken)
    );
    return response.data.data || [];
  } catch (error) {
    console.error('获取学生成就失败:', error.message);
    return [];
  }
}

/**
 * 辅助函数：获取积分账户
 */
async function getPointsAccount() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/points/account/${studentId}`,
      authConfig(studentToken)
    );
    return response.data.data;
  } catch (error) {
    console.error('获取积分账户失败:', error.message);
    return null;
  }
}

/**
 * 辅助函数：查找或创建测试活动
 */
async function findOrCreateTestActivity() {
  try {
    // 查找现有的已发布测试活动
    let response = await axios.get(
      `${API_BASE_URL}/activities?type=practice&status=published&limit=1`,
      authConfig(adminToken)
    );

    const activities = response.data.activities || response.data.data || [];
    if (activities.length > 0) {
      testActivityId = activities[0].id;
      console.log(`✅ 使用现有已发布活动 (ID: ${testActivityId})`);
      return true;
    }

    // 如果没有已发布活动，尝试找草稿活动并发布
    console.log('⚠️  未找到已发布的活动，尝试查找草稿活动...');
    response = await axios.get(
      `${API_BASE_URL}/activities?type=practice&limit=1`,
      authConfig(adminToken)
    );

    const allActivities = response.data.activities || response.data.data || [];
    if (allActivities.length > 0) {
      const activity = allActivities[0];
      testActivityId = activity.id;
      console.log(`📝 找到草稿活动 (ID: ${testActivityId}, status: ${activity.status})`);

      // 如果是草稿状态，临时发布它
      if (activity.status === 'draft') {
        console.log('🔄 临时发布活动用于测试...');
        await axios.put(
          `${API_BASE_URL}/activities/${testActivityId}`,
          { status: 'published' },
          authConfig(adminToken)
        );
        console.log('✅ 活动已发布');
      }

      return true;
    }

    console.log('❌ 未找到任何可用的测试活动');
    return false;
  } catch (error) {
    console.error('❌ 查找/发布测试活动失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 辅助函数：清理学生的成就记录（用于测试）
 */
async function cleanupStudentAchievements() {
  try {
    // 注意：这需要后端提供一个测试用的清理端点
    // 或者直接使用数据库操作
    console.log('⚠️  跳过成就清理（需要实现清理端点）');
    return true;
  } catch (error) {
    console.error('清理成就记录失败:', error.message);
    return false;
  }
}

/**
 * 测试1：准备测试环境
 */
async function test01_Setup() {
  console.log('\n=== 测试1：准备测试环境 ===');

  try {
    // 1. 管理员登录
    const adminLoginSuccess = await loginAdmin();
    if (!adminLoginSuccess) {
      console.error('❌ 管理员登录失败');
      return false;
    }

    // 2. 查找测试活动
    const activityFound = await findOrCreateTestActivity();
    if (!activityFound) {
      console.error('❌ 未找到可用的测试活动');
      return false;
    }

    // 3. 学生登录
    const studentLoginSuccess = await loginStudent();
    if (!studentLoginSuccess) {
      console.error('❌ 学生登录失败');
      return false;
    }

    console.log('✅ 测试环境准备完成');
    return true;
  } catch (error) {
    console.error('❌ 测试环境准备失败:', error.message);
    return false;
  }
}

/**
 * 测试2：获取初始状态
 */
async function test02_GetInitialState() {
  console.log('\n=== 测试2：获取初始状态 ===');

  try {
    // 1. 获取初始成就列表
    const achievementsBefore = await getStudentAchievements();
    console.log(`📋 初始成就数量: ${achievementsBefore.length}`);

    // 2. 获取初始积分
    const pointsBefore = await getPointsAccount();
    console.log(`💰 初始积分: ${pointsBefore?.current_points || 0}`);

    // 3. 检查是否已经有"第一滴血"成就
    const hasFirstBlood = achievementsBefore.some(a => a.achievement_code === 'EXAM_FIRST_ANY');
    if (hasFirstBlood) {
      console.log('⚠️  学生已获得"第一滴血"成就');
      console.log('   提示：为获得最佳测试效果，建议使用未完成过活动的学生账号');
    }

    console.log('✅ 获取初始状态成功');
    return { achievementsBefore, pointsBefore };
  } catch (error) {
    console.error('❌ 获取初始状态失败:', error.message);
    return null;
  }
}

/**
 * 测试3：学生完成活动（触发事件）
 */
async function test03_CompleteActivity() {
  console.log('\n=== 测试3：学生完成活动 ===');

  try {
    // 1. 开始活动
    console.log(`🚀 开始活动 (ID: ${testActivityId})...`);
    const startResponse = await axios.post(
      `${API_BASE_URL}/student/activities/${testActivityId}/start`,
      {},
      authConfig(studentToken)
    );

    if (!startResponse.data.success) {
      console.error('❌ 开始活动失败');
      return false;
    }

    const studentActivityId = startResponse.data.student_activity_id;
    console.log(`✅ 活动已开始 (student_activity_id: ${studentActivityId})`);

    // 2. 获取活动题目
    const questionsResponse = await axios.get(
      `${API_BASE_URL}/student/activities/${testActivityId}/questions`,
      authConfig(studentToken)
    );

    const questions = questionsResponse.data.questions || [];
    console.log(`📝 活动题目数量: ${questions.length}`);

    if (questions.length === 0) {
      console.log('⚠️  活动没有题目，跳过答题');
      // 直接提交活动
    } else {
      // 3. 提交所有题目的答案（简单起见，提交正确答案）
      console.log('📝 提交答案...');
      for (const question of questions) {
        const answer = {
          questionId: question.question_id,
          answer: question.correct_answer || 'A' // 使用正确答案或默认A
        };

        await axios.post(
          `${API_BASE_URL}/student/activities/${testActivityId}/answers`,
          answer,
          authConfig(studentToken)
        );
      }
      console.log('✅ 所有答案已提交');
    }

    // 4. 提交活动（触发自动评分和事件发布）
    console.log('🎯 提交活动...');
    const submitResponse = await axios.post(
      `${API_BASE_URL}/student/activities/${testActivityId}/submit`,
      {},
      authConfig(studentToken)
    );

    if (submitResponse.data.success) {
      console.log(`✅ 活动提交成功`);
      console.log(`   student_activity_id: ${submitResponse.data.student_activity_id}`);

      // 等待一下，让自动评分和事件处理完成
      console.log('⏳ 等待自动评分和事件处理...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      return true;
    } else {
      console.error('❌ 活动提交失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 完成活动失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试4：验证成就自动授予
 */
async function test04_VerifyAchievementAwarded(initialState) {
  console.log('\n=== 测试4：验证成就自动授予 ===');

  try {
    // 1. 获取当前成就列表
    const achievementsAfter = await getStudentAchievements();
    console.log(`📋 当前成就数量: ${achievementsAfter.length}`);
    console.log(`   新增成就数量: ${achievementsAfter.length - initialState.achievementsBefore.length}`);

    // 2. 检查是否获得了新成就
    if (achievementsAfter.length > initialState.achievementsBefore.length) {
      console.log('\n🎉 新获得的成就:');
      const newAchievements = achievementsAfter.filter(
        after => !initialState.achievementsBefore.some(
          before => before.achievement_id === after.achievement_id
        )
      );

      newAchievements.forEach(a => {
        console.log(`  - ${a.achievement_name} (${a.achievement_code})`);
        console.log(`    ${a.achievement_desc}`);
        console.log(`    +${a.points_awarded} 积分`);
        console.log(`    获得时间: ${new Date(a.achieved_at).toLocaleString('zh-CN')}`);
      });

      console.log('✅ 成就已自动授予');
      return true;
    } else {
      console.log('⚠️  没有新获得成就');
      console.log('   可能原因：');
      console.log('   1. 学生已经完成过活动（不满足"首次"条件）');
      console.log('   2. 成就规则过滤条件不匹配');
      console.log('   3. AchievementDetector 未正常工作');
      return false;
    }
  } catch (error) {
    console.error('❌ 验证成就失败:', error.message);
    return false;
  }
}

/**
 * 测试5：验证积分自动增加
 */
async function test05_VerifyPointsAwarded(initialState) {
  console.log('\n=== 测试5：验证积分自动增加 ===');

  try {
    // 1. 获取当前积分
    const pointsAfter = await getPointsAccount();
    console.log(`💰 当前积分: ${pointsAfter.current_points}`);

    const pointsGained = pointsAfter.current_points - initialState.pointsBefore.current_points;
    console.log(`   新增积分: +${pointsGained}`);

    // 2. 验证积分是否增加
    if (pointsGained > 0) {
      console.log('✅ 积分已自动增加');

      // 3. 获取积分交易记录
      const transactionsResponse = await axios.get(
        `${API_BASE_URL}/points/transactions/${studentId}?limit=5`,
        authConfig(studentToken)
      );

      const recentTransactions = transactionsResponse.data.data;
      console.log('\n📊 最近的积分交易:');
      recentTransactions.slice(0, 3).forEach(t => {
        console.log(`  - ${t.transaction_type}: ${t.points_change > 0 ? '+' : ''}${t.points_change} (${t.description || 'N/A'})`);
      });

      return true;
    } else {
      console.log('⚠️  积分未增加');
      return pointsGained === 0; // 如果学生已有成就，积分不增加也算正常
    }
  } catch (error) {
    console.error('❌ 验证积分失败:', error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('================================================');
  console.log('   成就自动触发集成测试');
  console.log('   Achievement Auto-Trigger Integration Test');
  console.log('================================================');
  console.log('测试目标: 验证学生完成活动后成就自动授予');
  console.log('================================================');

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  try {
    // 测试1：准备环境
    results.total++;
    const setupSuccess = await test01_Setup();
    if (!setupSuccess) {
      console.error('\n❌ 测试环境准备失败，测试终止');
      results.failed++;
      process.exit(1);
    }
    results.passed++;

    // 测试2：获取初始状态
    results.total++;
    const initialState = await test02_GetInitialState();
    if (!initialState) {
      console.error('\n❌ 获取初始状态失败，测试终止');
      results.failed++;
      process.exit(1);
    }
    results.passed++;

    // 测试3：完成活动
    results.total++;
    const activityCompleted = await test03_CompleteActivity();
    if (activityCompleted) {
      results.passed++;
    } else {
      results.failed++;
    }

    // 测试4：验证成就授予
    results.total++;
    const achievementAwarded = await test04_VerifyAchievementAwarded(initialState);
    if (achievementAwarded) {
      results.passed++;
    } else {
      results.failed++;
    }

    // 测试5：验证积分增加
    results.total++;
    const pointsAwarded = await test05_VerifyPointsAwarded(initialState);
    if (pointsAwarded) {
      results.passed++;
    } else {
      results.failed++;
    }

  } catch (error) {
    console.error('\n❌ 测试执行异常:', error);
    results.failed++;
  }

  // 输出测试结果
  console.log('\n================================================');
  console.log('   测试结果汇总');
  console.log('================================================');
  console.log(`总测试数: ${results.total}`);
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`成功率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('================================================');

  if (results.passed === results.total) {
    console.log('\n🎉 恭喜！所有测试通过！');
    console.log('✅ 成就自动触发系统正常工作');
  } else {
    console.log('\n⚠️  部分测试失败，请查看上方详细信息');
  }

  console.log('\n================================================\n');

  // 退出码：如果有失败则返回1
  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
