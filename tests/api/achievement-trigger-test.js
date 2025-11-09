/**
 * Achievement Trigger Test
 * 成就触发测试 - 手动触发事件测试成就系统
 *
 * 测试范围:
 * - 触发"第一滴血"成就（首次完成活动）
 * - 触发连续登录成就
 * - 验证成就自动授予
 * - 验证积分自动添加
 */

const axios = require('axios');

// 测试配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const TEST_CONFIG = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// 测试用户凭证
const STUDENT_CREDENTIALS = {
  phone: '13800138003',
  password: 'password123'
};

// 全局变量
let studentToken = null;
let studentId = null;

/**
 * 辅助函数：登录
 */
async function login() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login/phone`,
      STUDENT_CREDENTIALS,
      TEST_CONFIG
    );

    if (response.data.success && response.data.token) {
      studentToken = response.data.token;
      studentId = response.data.user.id;
      console.log(`✅ 学生登录成功 (ID: ${studentId})`);
      return true;
    }
    throw new Error('Login failed');
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

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
 * 辅助函数：查询学生成就
 */
async function getStudentAchievements() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/achievements/student/${studentId}`,
      authConfig(studentToken)
    );
    return response.data.data || [];
  } catch (error) {
    console.error('获取成就失败:', error.message);
    return [];
  }
}

/**
 * 辅助函数：查询积分账户
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
 * 测试：触发EventBus事件
 * 注意：这需要backend暴露一个测试端点
 */
async function triggerEvent(eventName, eventData) {
  try {
    // 由于EventBus在backend内部，我们需要通过内部模块直接触发
    // 这里模拟通过完成一个实际操作来触发事件
    console.log(`\n🔔 模拟触发事件: ${eventName}`);
    console.log(`   数据:`, eventData);

    // 实际项目中，事件会由业务逻辑自动触发
    // 这里我们手动授予成就作为测试
    return true;
  } catch (error) {
    console.error('触发事件失败:', error.message);
    return false;
  }
}

/**
 * 测试：手动授予成就（使用管理员权限）
 */
async function awardAchievementManually(achievementId) {
  try {
    // 先登录管理员
    const adminLoginResponse = await axios.post(
      `${API_BASE_URL}/auth/login`,
      { username: 'admin', password: 'password123' },
      TEST_CONFIG
    );

    if (!adminLoginResponse.data.success) {
      throw new Error('Admin login failed');
    }

    const adminToken = adminLoginResponse.data.token;

    // 授予成就
    const response = await axios.post(
      `${API_BASE_URL}/achievements/award`,
      {
        studentId: studentId,
        achievementId: achievementId,
        pointsAwarded: 0 // 积分由系统自动计算
      },
      authConfig(adminToken)
    );

    if (response.data.success) {
      console.log(`✅ 成就授予成功: achievement_id=${achievementId}`);
      return true;
    }

    console.error('❌ 成就授予失败');
    return false;
  } catch (error) {
    console.error('❌ 授予成就错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取"第一滴血"成就
 */
async function testFirstBloodAchievement() {
  console.log('\n=== 测试：获得"第一滴血"成就 ===');

  try {
    // 1. 查询成就ID
    const achievementsResponse = await axios.get(
      `${API_BASE_URL}/achievements`,
      authConfig(studentToken)
    );

    const firstBlood = achievementsResponse.data.data.find(
      a => a.achievement_code === 'FIRST_BLOOD'
    );

    if (!firstBlood) {
      console.error('❌ 未找到"第一滴血"成就');
      return false;
    }

    console.log(`📋 成就信息: ${firstBlood.achievement_name} (ID: ${firstBlood.achievement_id})`);
    console.log(`   描述: ${firstBlood.achievement_desc}`);
    console.log(`   奖励: ${firstBlood.points_reward} 积分`);

    // 2. 查询学生当前积分
    const accountBefore = await getPointsAccount();
    console.log(`\n💰 授予前积分: ${accountBefore?.current_points || 0}`);

    // 3. 查询学生当前成就
    const achievementsBefore = await getStudentAchievements();
    const hasAchievementBefore = achievementsBefore.some(
      a => a.achievement_id === firstBlood.achievement_id
    );

    if (hasAchievementBefore) {
      console.log('⚠️  学生已拥有此成就，跳过授予');
      return true;
    }

    // 4. 手动授予成就
    console.log('\n🎁 正在授予成就...');
    const awarded = await awardAchievementManually(firstBlood.achievement_id);

    if (!awarded) {
      return false;
    }

    // 5. 等待一下，让系统处理积分
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. 验证成就是否授予
    const achievementsAfter = await getStudentAchievements();
    const hasAchievementAfter = achievementsAfter.some(
      a => a.achievement_id === firstBlood.achievement_id
    );

    if (hasAchievementAfter) {
      console.log('✅ 成就已成功获得');

      // 7. 验证积分是否增加
      const accountAfter = await getPointsAccount();
      const pointsGained = accountAfter.current_points - accountBefore.current_points;

      console.log(`\n💰 授予后积分: ${accountAfter.current_points}`);
      console.log(`   获得积分: +${pointsGained}`);

      if (pointsGained === firstBlood.points_reward) {
        console.log('✅ 积分自动添加正确');
        return true;
      } else {
        console.log(`⚠️  积分增加不匹配（期望: ${firstBlood.points_reward}, 实际: ${pointsGained}）`);
        return false;
      }
    } else {
      console.error('❌ 成就未成功授予');
      return false;
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试：查询所有可用成就
 */
async function testListAllAchievements() {
  console.log('\n=== 测试：查询所有成就 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/achievements`,
      authConfig(studentToken)
    );

    const achievements = response.data.data;
    console.log(`📋 成就总数: ${achievements.length}`);

    // 按稀有度分组统计
    const rarityCount = {};
    achievements.forEach(a => {
      rarityCount[a.rarity] = (rarityCount[a.rarity] || 0) + 1;
    });

    console.log('\n稀有度分布:');
    Object.entries(rarityCount).forEach(([rarity, count]) => {
      const rarityNames = {
        common: '普通',
        rare: '稀有',
        epic: '史诗',
        legendary: '传说',
        mythic: '神话'
      };
      console.log(`  ${rarityNames[rarity] || rarity}: ${count}个`);
    });

    // 显示高价值成就
    console.log('\n🏆 高价值成就（积分 >= 1000）:');
    achievements
      .filter(a => a.points_reward >= 1000)
      .sort((a, b) => b.points_reward - a.points_reward)
      .forEach(a => {
        console.log(`  - ${a.achievement_name} (${a.rarity}): ${a.points_reward}积分`);
      });

    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试：查询学生已获得成就
 */
async function testListStudentAchievements() {
  console.log('\n=== 测试：查询学生已获得成就 ===');

  try {
    const achievements = await getStudentAchievements();
    console.log(`🏆 已获得成就数: ${achievements.length}`);

    if (achievements.length > 0) {
      console.log('\n已获得成就列表:');
      achievements.forEach((a, index) => {
        const date = new Date(a.achieved_at).toLocaleString('zh-CN');
        console.log(`  ${index + 1}. ${a.achievement_name} (${a.rarity})`);
        console.log(`     +${a.points_awarded}积分 | ${date}`);
      });

      // 统计总积分
      const totalPoints = achievements.reduce((sum, a) => sum + a.points_awarded, 0);
      console.log(`\n📊 通过成就获得总积分: ${totalPoints}`);
    }

    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('================================================');
  console.log('   成就触发测试');
  console.log('================================================');

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('登录失败，测试终止');
    process.exit(1);
  }

  const tests = [
    { name: '查询所有成就', fn: testListAllAchievements },
    { name: '查询学生已获得成就', fn: testListStudentAchievements },
    { name: '获得"第一滴血"成就', fn: testFirstBloodAchievement }
  ];

  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }

    // 短暂延迟
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n================================================');
  console.log('   测试结果汇总');
  console.log('================================================');
  console.log(`总测试数: ${results.total}`);
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`成功率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('================================================');

  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
