/**
 * Achievement Template System API Tests
 * 成就模板系统API测试
 *
 * 测试范围:
 * - 模板列表获取
 * - 快速配置列表获取
 * - 从模板创建成就
 * - 使用快速配置创建成就
 * - 批量导入成就
 * - 成就规则测试
 * - 管理后台分页查询
 * - 成就统计信息
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

const STUDENT_CREDENTIALS = {
  phone: '13800138003',
  password: 'password123'
};

// 全局变量
let adminToken = null;
let studentToken = null;
let studentId = null;
let testAchievementId = null;

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
 * 测试：获取模板列表
 */
async function testGetTemplates() {
  console.log('\n=== 测试获取模板列表 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/achievements/templates`,
      authConfig(adminToken)
    );

    if (response.data.success) {
      const templates = response.data.data;
      console.log(`✅ 获取到 ${templates.length} 个模板`);

      // 验证模板内容
      const expectedTemplates = [
        'countAchievement',
        'thresholdAchievement',
        'firstTimeAchievement',
        'consecutiveAchievement',
        'timeWindowAchievement',
        'andConditionAchievement'
      ];

      const templateNames = templates.map(t => t.name);
      const hasAllTemplates = expectedTemplates.every(name =>
        templateNames.includes(name)
      );

      if (hasAllTemplates) {
        console.log('✅ 所有预期模板都存在');
        templates.forEach(t => console.log(`   - ${t.name}`));
        return true;
      } else {
        console.error('❌ 缺少某些模板');
        return false;
      }
    }

    console.error('❌ 获取模板列表失败');
    return false;
  } catch (error) {
    console.error('❌ 获取模板列表错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取快速配置列表
 */
async function testGetQuickConfigs() {
  console.log('\n=== 测试获取快速配置列表 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/achievements/quick-configs`,
      authConfig(adminToken)
    );

    if (response.data.success) {
      const configs = response.data.data;
      console.log(`✅ 获取到 ${configs.length} 个快速配置`);

      // 验证快速配置
      const expectedConfigs = [
        'firstTimePass',
        'learningDuration',
        'consecutiveLogin',
        'consecutivePass',
        'perfectScore',
        'highScore'
      ];

      const configNames = configs.map(c => c.name);
      const hasAllConfigs = expectedConfigs.every(name =>
        configNames.includes(name)
      );

      if (hasAllConfigs) {
        console.log('✅ 所有预期快速配置都存在');
        configs.forEach(c => console.log(`   - ${c.name}`));
        return true;
      } else {
        console.error('❌ 缺少某些快速配置');
        return false;
      }
    }

    console.error('❌ 获取快速配置列表失败');
    return false;
  } catch (error) {
    console.error('❌ 获取快速配置列表错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：从模板创建成就
 */
async function testCreateFromTemplate() {
  console.log('\n=== 测试从模板创建成就 ===');

  try {
    const templateParams = {
      achievementName: `API测试-计数型成就-${Date.now()}`,
      achievementDesc: '通过10次测评认证',
      category: 'exam_certification',
      subcategory: '基础认证',
      rarity: 'common',
      pointsReward: 100,
      eventName: 'student.activity.completed',
      targetCount: 10,
      filterConditions: { status: 'passed' }
    };

    const response = await axios.post(
      `${API_BASE_URL}/achievements/template/countAchievement`,
      templateParams,
      authConfig(adminToken)
    );

    if (response.data.success) {
      const achievement = response.data.data;
      testAchievementId = achievement.achievement_id;

      console.log('✅ 从模板创建成就成功');
      console.log(`   ID: ${achievement.achievement_id}`);
      console.log(`   代码: ${achievement.achievement_code}`);
      console.log(`   名称: ${achievement.achievement_name}`);
      console.log(`   积分: ${achievement.points_reward}`);

      // 验证触发条件
      if (achievement.trigger_condition) {
        const condition = typeof achievement.trigger_condition === 'string'
          ? JSON.parse(achievement.trigger_condition)
          : achievement.trigger_condition;

        if (condition.condition_type === 'count' &&
            condition.target_count === 10 &&
            condition.event_name === 'student.activity.completed') {
          console.log('✅ 触发条件验证正确');
          return true;
        } else {
          console.error('❌ 触发条件验证失败');
          return false;
        }
      }

      return true;
    }

    console.error('❌ 从模板创建成就失败');
    return false;
  } catch (error) {
    console.error('❌ 从模板创建成就错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：使用快速配置创建成就
 */
async function testCreateFromQuickConfig() {
  console.log('\n=== 测试使用快速配置创建成就 ===');

  try {
    // 测试：连续登录30天
    const response = await axios.post(
      `${API_BASE_URL}/achievements/quick/consecutiveLogin`,
      { days: 30 },
      authConfig(adminToken)
    );

    if (response.data.success) {
      const achievement = response.data.data;

      console.log('✅ 使用快速配置创建成就成功');
      console.log(`   ID: ${achievement.achievement_id}`);
      console.log(`   名称: ${achievement.achievement_name}`);
      console.log(`   稀有度: ${achievement.rarity}`);

      // 验证连续登录配置
      const condition = typeof achievement.trigger_condition === 'string'
        ? JSON.parse(achievement.trigger_condition)
        : achievement.trigger_condition;

      if (condition.condition_type === 'consecutive' &&
          condition.consecutive_days === 30) {
        console.log('✅ 快速配置参数验证正确');
        return true;
      } else {
        console.error('❌ 快速配置参数验证失败');
        return false;
      }
    }

    console.error('❌ 使用快速配置创建成就失败');
    return false;
  } catch (error) {
    console.error('❌ 使用快速配置创建成就错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：批量导入成就
 */
async function testBulkImport() {
  console.log('\n=== 测试批量导入成就 ===');

  try {
    const achievements = [
      {
        achievement_name: `批量导入测试1-${Date.now()}`,
        achievement_desc: '批量导入测试成就1',
        category: 'learning_growth',
        subcategory: '学习里程碑',
        rarity: 'common',
        points_reward: 50,
        trigger_condition: {
          trigger_mode: 'real_time',
          condition_type: 'count',
          event_name: 'student.login',
          target_count: 1
        }
      },
      {
        achievement_name: `批量导入测试2-${Date.now()}`,
        achievement_desc: '批量导入测试成就2',
        category: 'social_collaboration',
        subcategory: '社交互动',
        rarity: 'rare',
        points_reward: 100,
        trigger_condition: {
          trigger_mode: 'real_time',
          condition_type: 'count',
          event_name: 'student.comment',
          target_count: 5
        }
      }
    ];

    const response = await axios.post(
      `${API_BASE_URL}/achievements/bulk`,
      { achievements },
      authConfig(adminToken)
    );

    if (response.data.success) {
      const results = response.data.data;
      console.log(`✅ 批量导入完成`);
      console.log(`   成功: ${results.success.length} 个`);
      console.log(`   失败: ${results.failed.length} 个`);

      if (results.success.length === 2) {
        console.log('✅ 所有成就导入成功');
        return true;
      } else {
        console.error('❌ 部分成就导入失败');
        results.failed.forEach(f => {
          console.error(`   失败原因: ${f.error}`);
        });
        return false;
      }
    }

    console.error('❌ 批量导入失败');
    return false;
  } catch (error) {
    console.error('❌ 批量导入错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：测试成就规则
 */
async function testAchievementRule() {
  console.log('\n=== 测试成就规则测试功能 ===');

  try {
    if (!testAchievementId) {
      console.log('⚠️ 跳过规则测试（无测试成就ID）');
      return true;
    }

    const response = await axios.post(
      `${API_BASE_URL}/achievements/${testAchievementId}/test`,
      { studentId: studentId },
      authConfig(adminToken)
    );

    if (response.data.success !== undefined) {
      console.log(`✅ 成就规则测试功能正常`);
      console.log(`   规则有效性: ${response.data.data.valid ? '有效' : '无效'}`);

      if (response.data.data.message) {
        console.log(`   测试结果: ${response.data.data.message}`);
      }

      return true;
    }

    console.error('❌ 成就规则测试失败');
    return false;
  } catch (error) {
    console.error('❌ 成就规则测试错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取成就统计信息
 */
async function testGetAchievementStats() {
  console.log('\n=== 测试获取成就统计信息 ===');

  try {
    if (!testAchievementId) {
      console.log('⚠️ 跳过统计测试（无测试成就ID）');
      return true;
    }

    const response = await axios.get(
      `${API_BASE_URL}/achievements/${testAchievementId}/stats`,
      authConfig(adminToken)
    );

    if (response.data.success) {
      const stats = response.data.data;
      console.log(`✅ 获取成就统计成功`);
      console.log(`   获得人数: ${stats.total_students || 0}`);
      console.log(`   获得次数: ${stats.total_times || 0}`);

      return true;
    }

    console.error('❌ 获取成就统计失败');
    return false;
  } catch (error) {
    console.error('❌ 获取成就统计错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：管理后台分页查询
 */
async function testAdminPagination() {
  console.log('\n=== 测试管理后台分页查询 ===');

  try {
    // 测试基础分页
    const response = await axios.get(
      `${API_BASE_URL}/achievements/admin/list?page=1&limit=10`,
      authConfig(adminToken)
    );

    if (response.data.success) {
      const { data, pagination } = response.data;

      console.log(`✅ 分页查询成功`);
      console.log(`   当前页: ${pagination.page}`);
      console.log(`   每页数量: ${pagination.limit}`);
      console.log(`   总记录数: ${pagination.total}`);
      console.log(`   总页数: ${pagination.totalPages}`);
      console.log(`   返回记录数: ${data.length}`);

      // 测试过滤条件
      const filterResponse = await axios.get(
        `${API_BASE_URL}/achievements/admin/list?category=exam_certification&rarity=common&page=1&limit=5`,
        authConfig(adminToken)
      );

      if (filterResponse.data.success) {
        console.log(`✅ 过滤查询成功`);
        console.log(`   过滤结果数: ${filterResponse.data.data.length}`);

        // 验证过滤结果
        const allMatch = filterResponse.data.data.every(a =>
          a.category === 'exam_certification' && a.rarity === 'common'
        );

        if (allMatch || filterResponse.data.data.length === 0) {
          console.log(`✅ 过滤条件验证正确`);
          return true;
        } else {
          console.error('❌ 过滤条件验证失败');
          return false;
        }
      }

      return true;
    }

    console.error('❌ 分页查询失败');
    return false;
  } catch (error) {
    console.error('❌ 分页查询错误:', error.response?.data || error.message);
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
    // 测试：学生不能创建成就
    try {
      await axios.post(
        `${API_BASE_URL}/achievements`,
        {
          achievement_name: '非法创建测试',
          achievement_desc: '学生不应该能创建',
          category: 'learning_growth',
          rarity: 'common',
          points_reward: 10
        },
        authConfig(studentToken)
      );
      console.error('❌ 学生不应该能创建成就');
      allPassed = false;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ 学生无法创建成就（权限正确）');
      } else {
        throw error;
      }
    }

    // 测试：学生不能使用快速配置
    try {
      await axios.post(
        `${API_BASE_URL}/achievements/quick/consecutiveLogin`,
        { days: 7 },
        authConfig(studentToken)
      );
      console.error('❌ 学生不应该能使用快速配置');
      allPassed = false;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ 学生无法使用快速配置（权限正确）');
      } else {
        throw error;
      }
    }

    // 测试：学生不能访问管理后台列表
    try {
      await axios.get(
        `${API_BASE_URL}/achievements/admin/list`,
        authConfig(studentToken)
      );
      console.error('❌ 学生不应该能访问管理后台列表');
      allPassed = false;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ 学生无法访问管理后台列表（权限正确）');
      } else {
        throw error;
      }
    }

    return allPassed;
  } catch (error) {
    console.error('❌ 权限控制测试错误:', error.message);
    return false;
  }
}

/**
 * 测试：创建成就的完整CRUD
 */
async function testAchievementCRUD() {
  console.log('\n=== 测试成就完整CRUD ===');

  try {
    // 1. Create
    const createResponse = await axios.post(
      `${API_BASE_URL}/achievements`,
      {
        achievement_name: `CRUD测试成就-${Date.now()}`,
        achievement_desc: '用于测试CRUD操作的成就',
        category: 'learning_growth',
        subcategory: '测试类别',
        rarity: 'common',
        points_reward: 50,
        trigger_condition: {
          trigger_mode: 'real_time',
          condition_type: 'count',
          event_name: 'test.event',
          target_count: 1
        }
      },
      authConfig(adminToken)
    );

    if (!createResponse.data.success) {
      console.error('❌ 创建成就失败');
      return false;
    }

    const createdId = createResponse.data.data.achievement_id;
    console.log(`✅ 创建成就成功 (ID: ${createdId})`);

    // 2. Read
    const readResponse = await axios.get(
      `${API_BASE_URL}/achievements/${createdId}`,
      authConfig(adminToken)
    );

    if (!readResponse.data.success) {
      console.error('❌ 读取成就失败');
      return false;
    }
    console.log(`✅ 读取成就成功`);

    // 3. Update
    const updateResponse = await axios.put(
      `${API_BASE_URL}/achievements/${createdId}`,
      {
        achievement_desc: '更新后的描述',
        points_reward: 100
      },
      authConfig(adminToken)
    );

    if (!updateResponse.data.success) {
      console.error('❌ 更新成就失败');
      return false;
    }
    console.log(`✅ 更新成就成功`);

    // 验证更新
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/achievements/${createdId}`,
      authConfig(adminToken)
    );

    if (verifyResponse.data.data.points_reward === 100) {
      console.log(`✅ 更新验证成功`);
    } else {
      console.error('❌ 更新验证失败');
      return false;
    }

    // 4. Delete (soft delete)
    const deleteResponse = await axios.delete(
      `${API_BASE_URL}/achievements/${createdId}`,
      authConfig(adminToken)
    );

    if (!deleteResponse.data.success) {
      console.error('❌ 删除成就失败');
      return false;
    }
    console.log(`✅ 删除成就成功`);

    // 5. Hard Delete (cleanup)
    const hardDeleteResponse = await axios.delete(
      `${API_BASE_URL}/achievements/${createdId}?hard=true`,
      authConfig(adminToken)
    );

    if (hardDeleteResponse.data.success) {
      console.log(`✅ 硬删除成就成功（清理测试数据）`);
    }

    return true;
  } catch (error) {
    console.error('❌ CRUD测试错误:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('================================================');
  console.log('   成就模板系统 API 测试');
  console.log('================================================');

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  const tests = [
    { name: '用户登录', fn: testLogin },
    { name: '获取模板列表', fn: testGetTemplates },
    { name: '获取快速配置列表', fn: testGetQuickConfigs },
    { name: '从模板创建成就', fn: testCreateFromTemplate },
    { name: '使用快速配置创建成就', fn: testCreateFromQuickConfig },
    { name: '批量导入成就', fn: testBulkImport },
    { name: '测试成就规则', fn: testAchievementRule },
    { name: '获取成就统计', fn: testGetAchievementStats },
    { name: '管理后台分页查询', fn: testAdminPagination },
    { name: '成就CRUD完整测试', fn: testAchievementCRUD },
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
