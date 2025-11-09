/**
 * Achievement System API Tests
 * 成就系统API测试
 *
 * 测试范围:
 * - 成就列表查询
 * - 学生成就记录
 * - 成就进度跟踪
 * - 成就授予
 * - 积分账户管理
 * - 积分交易记录
 * - 排行榜功能
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
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

const TEACHER_CREDENTIALS = {
  username: 'teacher01',
  password: 'password123'
};

const STUDENT_CREDENTIALS = {
  phone: '13800138003',
  password: 'password123'
};

// 全局变量
let adminToken = null;
let teacherToken = null;
let studentToken = null;
let studentId = null;

/**
 * 辅助函数：登录并获取token
 */
async function login(credentials, loginType = 'username') {
  try {
    const endpoint = loginType === 'phone'
      ? `${API_BASE_URL}/auth/login/phone`
      : `${API_BASE_URL}/auth/login`;

    const response = await axios.post(endpoint, credentials, TEST_CONFIG);

    if (response.data.success && response.data.token) {
      return {
        token: response.data.token,
        user: response.data.user
      };
    }
    throw new Error('Login failed: No token received');
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
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
 * 测试：用户登录
 */
async function testLogin() {
  console.log('\n=== 测试用户登录 ===');

  try {
    // 管理员登录
    const adminResult = await login(ADMIN_CREDENTIALS);
    adminToken = adminResult.token;
    console.log('✅ 管理员登录成功');

    // 教师登录
    const teacherResult = await login(TEACHER_CREDENTIALS);
    teacherToken = teacherResult.token;
    console.log('✅ 教师登录成功');

    // 学生登录
    const studentResult = await login(STUDENT_CREDENTIALS, 'phone');
    studentToken = studentResult.token;
    studentId = studentResult.user.id;
    console.log(`✅ 学生登录成功 (ID: ${studentId})`);

    return true;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return false;
  }
}

/**
 * 测试：获取成就列表
 */
async function testGetAchievements() {
  console.log('\n=== 测试获取成就列表 ===');

  try {
    // 获取所有成就
    const response = await axios.get(
      `${API_BASE_URL}/achievements`,
      authConfig(studentToken)
    );

    console.log(`成就总数: ${response.data.data?.length || 0}`);

    if (response.data.success) {
      console.log('✅ 获取成就列表成功');

      // 按类别过滤
      const categoryResponse = await axios.get(
        `${API_BASE_URL}/achievements?category=exam_certification`,
        authConfig(studentToken)
      );
      console.log(`考试认证类成就数: ${categoryResponse.data.data?.length || 0}`);

      // 按稀有度过滤
      const rarityResponse = await axios.get(
        `${API_BASE_URL}/achievements?rarity=legendary`,
        authConfig(studentToken)
      );
      console.log(`传说级成就数: ${rarityResponse.data.data?.length || 0}`);

      return true;
    }

    console.error('❌ 获取成就列表失败');
    return false;
  } catch (error) {
    console.error('❌ 获取成就列表错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取学生成就记录
 */
async function testGetStudentAchievements() {
  console.log('\n=== 测试获取学生成就记录 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/achievements/student/${studentId}`,
      authConfig(studentToken)
    );

    if (response.data.success) {
      console.log(`学生已获得成就数: ${response.data.data?.length || 0}`);
      console.log('✅ 获取学生成就记录成功');
      return true;
    }

    console.error('❌ 获取学生成就记录失败');
    return false;
  } catch (error) {
    console.error('❌ 获取学生成就记录错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取成就进度
 */
async function testGetAchievementProgress() {
  console.log('\n=== 测试获取成就进度 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/achievements/student/${studentId}/progress`,
      authConfig(studentToken)
    );

    if (response.data.success) {
      console.log(`进行中的成就数: ${response.data.data?.length || 0}`);

      if (response.data.data && response.data.data.length > 0) {
        const firstProgress = response.data.data[0];
        console.log(`示例进度: ${firstProgress.achievement_name} - ${firstProgress.progress_percentage}%`);
      }

      console.log('✅ 获取成就进度成功');
      return true;
    }

    console.error('❌ 获取成就进度失败');
    return false;
  } catch (error) {
    console.error('❌ 获取成就进度错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取积分账户
 */
async function testGetPointsAccount() {
  console.log('\n=== 测试获取积分账户 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/points/account/${studentId}`,
      authConfig(studentToken)
    );

    if (response.data.success) {
      const account = response.data.data;
      console.log(`当前积分: ${account.current_points}`);
      console.log(`总积分: ${account.total_points}`);
      console.log(`已消费: ${account.spent_points}`);
      console.log(`冻结中: ${account.frozen_points}`);
      console.log('✅ 获取积分账户成功');
      return true;
    }

    console.error('❌ 获取积分账户失败');
    return false;
  } catch (error) {
    console.error('❌ 获取积分账户错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取积分交易记录
 */
async function testGetPointsTransactions() {
  console.log('\n=== 测试获取积分交易记录 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/points/transactions/${studentId}?limit=10`,
      authConfig(studentToken)
    );

    if (response.data.success) {
      console.log(`交易记录数: ${response.data.data?.length || 0}`);

      if (response.data.data && response.data.data.length > 0) {
        const firstTransaction = response.data.data[0];
        console.log(`最近交易: ${firstTransaction.transaction_type} ${firstTransaction.points_change > 0 ? '+' : ''}${firstTransaction.points_change}`);
      }

      console.log('✅ 获取积分交易记录成功');
      return true;
    }

    console.error('❌ 获取积分交易记录失败');
    return false;
  } catch (error) {
    console.error('❌ 获取积分交易记录错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：添加积分（教师权限）
 */
async function testAddPoints() {
  console.log('\n=== 测试添加积分（教师权限） ===');

  try {
    const response = await axios.post(
      `${API_BASE_URL}/points/add`,
      {
        studentId: studentId,
        points: 50,
        transactionType: 'teacher_reward',
        description: 'API测试 - 教师奖励积分'
      },
      authConfig(teacherToken)
    );

    if (response.data.success) {
      console.log(`添加积分: +50`);
      console.log(`交易前余额: ${response.data.data.balance_before}`);
      console.log(`交易后余额: ${response.data.data.balance_after}`);
      console.log('✅ 添加积分成功');
      return true;
    }

    console.error('❌ 添加积分失败');
    return false;
  } catch (error) {
    console.error('❌ 添加积分错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取排行榜
 */
async function testGetLeaderboard() {
  console.log('\n=== 测试获取排行榜 ===');

  try {
    // 获取总排行榜
    const totalResponse = await axios.get(
      `${API_BASE_URL}/points/leaderboard?type=total&limit=10`,
      authConfig(studentToken)
    );

    if (totalResponse.data.success) {
      console.log(`总排行榜人数: ${totalResponse.data.data?.length || 0}`);
      console.log('✅ 获取总排行榜成功');
    }

    // 获取周排行榜
    const weeklyResponse = await axios.get(
      `${API_BASE_URL}/points/leaderboard?type=weekly&limit=10`,
      authConfig(studentToken)
    );

    if (weeklyResponse.data.success) {
      console.log(`周排行榜人数: ${weeklyResponse.data.data?.length || 0}`);
      console.log('✅ 获取周排行榜成功');
    }

    return true;
  } catch (error) {
    console.error('❌ 获取排行榜错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：权限控制
 */
async function testPermissions() {
  console.log('\n=== 测试权限控制 ===');

  let allPassed = true;

  try {
    // 测试：学生不能添加积分
    try {
      await axios.post(
        `${API_BASE_URL}/points/add`,
        {
          studentId: studentId,
          points: 100,
          transactionType: 'manual'
        },
        authConfig(studentToken)
      );
      console.error('❌ 学生不应该能添加积分');
      allPassed = false;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ 学生无法添加积分（权限正确）');
      } else {
        throw error;
      }
    }

    // 测试：学生不能查看其他学生的积分
    try {
      await axios.get(
        `${API_BASE_URL}/points/account/999999`,
        authConfig(studentToken)
      );
      console.error('❌ 学生不应该能查看其他学生积分');
      allPassed = false;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ 学生无法查看其他学生积分（权限正确）');
      } else {
        // 404也可以接受（学生不存在）
        console.log('✅ 学生查看其他学生积分被拦截');
      }
    }

    return allPassed;
  } catch (error) {
    console.error('❌ 权限控制测试错误:', error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('================================================');
  console.log('   成就系统 API 测试');
  console.log('================================================');

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  const tests = [
    { name: '用户登录', fn: testLogin },
    { name: '获取成就列表', fn: testGetAchievements },
    { name: '获取学生成就', fn: testGetStudentAchievements },
    { name: '获取成就进度', fn: testGetAchievementProgress },
    { name: '获取积分账户', fn: testGetPointsAccount },
    { name: '获取交易记录', fn: testGetPointsTransactions },
    { name: '添加积分', fn: testAddPoints },
    { name: '获取排行榜', fn: testGetLeaderboard },
    { name: '权限控制', fn: testPermissions }
  ];

  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }

    // 短暂延迟，避免请求过快
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

  // 退出码：如果有失败则返回1
  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
