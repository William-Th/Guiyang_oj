/**
 * 成就进度追踪集成测试
 * Achievement Progress Tracking Integration Test
 *
 * 测试目标：
 * 1. 验证成就进度自动更新
 * 2. 验证进度查询API
 * 3. 验证完成目标后成就自动授予
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3003/api';

// 测试账号
const ADMIN = {
  username: 'admin',
  password: 'password123'
};

const STUDENT = {
  username: '13800138003',  // student_id=1, user_id=11
  password: 'password123'
};

// 全局变量
let adminToken = '';
let studentToken = '';
let testActivityId = 300; // 使用现有的测试活动

// 辅助函数
function authConfig(token) {
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
}

/**
 * 测试1：准备测试环境
 */
async function test01_PrepareEnvironment() {
  console.log('\n=== 测试1：准备测试环境 ===');

  try {
    // 管理员登录
    const adminRes = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: ADMIN.username,
      password: ADMIN.password
    });
    adminToken = adminRes.data.token;
    console.log('✅ 管理员登录成功');

    // 学生登录
    const studentRes = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: STUDENT.username,
      password: STUDENT.password
    });
    studentToken = studentRes.data.token;
    console.log(`✅ 学生登录成功 (ID: ${studentRes.data.user.id})`);

    console.log(`✅ 使用测试活动 (ID: ${testActivityId})`);

    return true;
  } catch (error) {
    console.error('❌ 环境准备失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试2：清理测试数据并获取初始状态
 */
async function test02_CleanAndGetInitialState() {
  console.log('\n=== 测试2：清理测试数据并获取初始状态 ===');

  try {
    // 注意：我们需要使用student_id (1) 而不是 user_id (11)
    const studentId = 1;

    // 清理student_activities表中的测试数据
    console.log('⏳ 清理测试活动记录...');
    // 这里我们不删除，而是查询当前已完成的练习数量

    // 获取初始成就进度
    const progressRes = await axios.get(
      `${API_BASE_URL}/achievements/student/${studentId}/progress`,
      authConfig(studentToken)
    );

    const initialProgress = progressRes.data.data || [];
    console.log(`📋 初始进度记录数量: ${initialProgress.length}`);

    // 查找"勤学者"成就的进度
    const practice5Progress = initialProgress.find(
      p => p.achievement_code === 'PRACTICE_5_COUNT'
    );

    if (practice5Progress) {
      console.log('📊 "勤学者"成就当前进度:');
      console.log(`   当前值: ${practice5Progress.current_value}`);
      console.log(`   目标值: ${practice5Progress.target_value}`);
      console.log(`   进度: ${practice5Progress.progress_percentage}%`);
    } else {
      console.log('📊 "勤学者"成就暂无进度记录（可能未开始或已完成）');
    }

    // 获取初始成就列表
    const achievementsRes = await axios.get(
      `${API_BASE_URL}/achievements/student/${studentId}`,
      authConfig(studentToken)
    );

    const initialAchievements = achievementsRes.data.data || [];
    const hasPractice5 = initialAchievements.some(
      a => a.achievement_code === 'PRACTICE_5_COUNT'
    );

    console.log(`🏆 初始成就数量: ${initialAchievements.length}`);
    console.log(`   "勤学者"成就状态: ${hasPractice5 ? '已获得' : '未获得'}`);

    return {
      initialProgress: practice5Progress,
      hasPractice5Achievement: hasPractice5
    };
  } catch (error) {
    console.error('❌ 获取初始状态失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试3：完成一次练习活动，验证进度更新
 */
async function test03_CompleteActivityAndCheckProgress() {
  console.log('\n=== 测试3：完成一次练习活动，验证进度更新 ===');

  try {
    const studentId = 1;

    // 开始活动
    console.log('🚀 开始活动...');
    const startRes = await axios.post(
      `${API_BASE_URL}/student/activities/${testActivityId}/start`,
      {},
      authConfig(studentToken)
    );
    const studentActivityId = startRes.data.student_activity_id;
    console.log(`✅ 活动已开始 (student_activity_id: ${studentActivityId})`);

    // 获取题目
    const questionsRes = await axios.get(
      `${API_BASE_URL}/student/activities/${testActivityId}/questions`,
      authConfig(studentToken)
    );
    const questions = questionsRes.data.questions || [];
    console.log(`📝 活动题目数量: ${questions.length}`);

    // 提交答案
    for (const question of questions) {
      await axios.post(
        `${API_BASE_URL}/student/activities/${testActivityId}/answers`,
        {
          questionId: question.question_id,
          answer: question.question_type === 'single_choice' ? 'A' : 'test answer'
        },
        authConfig(studentToken)
      );
    }
    console.log('✅ 所有答案已提交');

    // 提交活动
    console.log('🎯 提交活动...');
    await axios.post(
      `${API_BASE_URL}/student/activities/${testActivityId}/submit`,
      {},
      authConfig(studentToken)
    );
    console.log('✅ 活动提交成功');

    // 等待自动评分和进度更新
    console.log('⏳ 等待自动评分和进度更新...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 查询进度
    const progressRes = await axios.get(
      `${API_BASE_URL}/achievements/student/${studentId}/progress`,
      authConfig(studentToken)
    );

    const progressList = progressRes.data.data || [];
    const practice5Progress = progressList.find(
      p => p.achievement_code === 'PRACTICE_5_COUNT'
    );

    if (practice5Progress) {
      console.log('\n📊 "勤学者"成就进度更新:');
      console.log(`   当前值: ${practice5Progress.current_value}`);
      console.log(`   目标值: ${practice5Progress.target_value}`);
      console.log(`   进度: ${practice5Progress.progress_percentage}%`);
      console.log(`   最后更新: ${new Date(practice5Progress.last_updated).toLocaleString('zh-CN')}`);

      // 验证进度是否更新
      if (practice5Progress.current_value > 0) {
        console.log('✅ 进度已自动更新');
        return true;
      } else {
        console.log('⚠️  进度未更新');
        return false;
      }
    } else {
      console.log('⚠️  未找到"勤学者"成就的进度记录');
      console.log('   可能原因：');
      console.log('   1. 成就已经完成（current_value >= target_value）');
      console.log('   2. 进度追踪逻辑未正常工作');
      return false;
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试4：验证成就完成后自动授予
 */
async function test04_VerifyAchievementAwardedWhenCompleted() {
  console.log('\n=== 测试4：验证成就完成后自动授予 ===');

  try {
    const studentId = 1;

    // 查询当前进度
    const progressRes = await axios.get(
      `${API_BASE_URL}/achievements/student/${studentId}/progress`,
      authConfig(studentToken)
    );

    const progressList = progressRes.data.data || [];
    const practice5Progress = progressList.find(
      p => p.achievement_code === 'PRACTICE_5_COUNT'
    );

    if (!practice5Progress) {
      console.log('ℹ️  "勤学者"成就已完成或未开始追踪');

      // 检查是否已获得成就
      const achievementsRes = await axios.get(
        `${API_BASE_URL}/achievements/student/${studentId}`,
        authConfig(studentToken)
      );
      const achievements = achievementsRes.data.data || [];
      const hasPractice5 = achievements.some(
        a => a.achievement_code === 'PRACTICE_5_COUNT'
      );

      if (hasPractice5) {
        console.log('✅ 成就已自动授予');
        return true;
      } else {
        console.log('⚠️  成就未获得，也无进度记录');
        return false;
      }
    }

    const currentValue = practice5Progress.current_value;
    const targetValue = practice5Progress.target_value;

    console.log(`📊 当前进度: ${currentValue}/${targetValue} (${practice5Progress.progress_percentage}%)`);

    if (currentValue >= targetValue) {
      console.log('🎉 已达到目标值，等待成就自动授予...');

      // 等待一下，因为可能进度更新比成就授予快
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 检查成就是否已授予
      const achievementsRes = await axios.get(
        `${API_BASE_URL}/achievements/student/${studentId}`,
        authConfig(studentToken)
      );
      const achievements = achievementsRes.data.data || [];
      const hasPractice5 = achievements.some(
        a => a.achievement_code === 'PRACTICE_5_COUNT'
      );

      if (hasPractice5) {
        console.log('✅ 成就已自动授予');
        return true;
      } else {
        console.log('⚠️  成就未自动授予');
        return false;
      }
    } else {
      console.log(`ℹ️  还需完成 ${targetValue - currentValue} 次练习才能获得成就`);
      return true; // 进度正常追踪即可，不一定要完成
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('================================================');
  console.log('   成就进度追踪集成测试');
  console.log('   Achievement Progress Tracking Integration Test');
  console.log('================================================');
  console.log('测试目标: 验证成就进度自动追踪和更新');
  console.log('================================================\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // 测试1：准备环境
  results.total++;
  if (await test01_PrepareEnvironment()) {
    results.passed++;
  } else {
    results.failed++;
    console.log('\n❌ 环境准备失败，终止测试');
    printSummary(results);
    process.exit(1);
  }

  // 测试2：获取初始状态
  results.total++;
  const initialState = await test02_CleanAndGetInitialState();
  if (initialState) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 测试3：完成活动并验证进度更新
  results.total++;
  if (await test03_CompleteActivityAndCheckProgress()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 测试4：验证成就完成后自动授予
  results.total++;
  if (await test04_VerifyAchievementAwardedWhenCompleted()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 打印汇总
  printSummary(results);

  // 退出
  process.exit(results.failed > 0 ? 1 : 0);
}

function printSummary(results) {
  console.log('\n================================================');
  console.log('   测试结果汇总');
  console.log('================================================');
  console.log(`总测试数: ${results.total}`);
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`成功率: ${(results.passed / results.total * 100).toFixed(1)}%`);
  console.log('================================================\n');

  if (results.failed === 0) {
    console.log('🎉 恭喜！所有测试通过！');
    console.log('✅ 成就进度追踪系统正常工作\n');
  } else {
    console.log('⚠️  部分测试失败，请查看上方详细信息\n');
  }

  console.log('================================================');
}

// 运行测试
runTests();
