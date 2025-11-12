/**
 * Daily Tasks API Test
 * 日常任务系统API测试
 *
 * 测试范围:
 * - 获取所有日常任务
 * - 获取单个任务详情
 * - 创建任务（管理员）
 * - 更新任务（管理员）
 * - 删除任务（管理员）
 * - 获取学生任务进度
 * - 更新任务进度
 * - 获取学生当前周期任务
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
let createdTaskId = null;

/**
 * 辅助函数：登录管理员
 */
async function loginAdmin() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      ADMIN_CREDENTIALS,
      TEST_CONFIG
    );

    if (response.data.success && response.data.token) {
      adminToken = response.data.token;
      console.log('✅ 管理员登录成功');
      return true;
    }
    throw new Error('Admin login failed');
  } catch (error) {
    console.error('❌ 管理员登录失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 辅助函数：登录学生
 */
async function loginStudent() {
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
    throw new Error('Student login failed');
  } catch (error) {
    console.error('❌ 学生登录失败:', error.response?.data || error.message);
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
 * 测试：获取所有日常任务
 */
async function testGetAllDailyTasks() {
  console.log('\n=== 测试：获取所有日常任务 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/daily-tasks`,
      authConfig(studentToken)
    );

    if (!response.data.success) {
      console.error('❌ 请求失败');
      return false;
    }

    const tasks = response.data.data;
    console.log(`📋 任务总数: ${tasks.length}`);

    // 验证数据结构
    if (tasks.length > 0) {
      const task = tasks[0];
      const requiredFields = [
        'task_id', 'task_code', 'task_name', 'category',
        'task_type', 'points_reward', 'target_value', 'progress_type'
      ];

      const missingFields = requiredFields.filter(field => !(field in task));
      if (missingFields.length > 0) {
        console.error('❌ 缺少字段:', missingFields);
        return false;
      }

      console.log('✅ 数据结构验证通过');
    }

    // 按类别分组统计
    const byCategory = tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {});

    console.log('\n按周期分布:');
    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count}个`);
    });

    console.log('✅ 获取所有任务成功');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：按类别筛选任务
 */
async function testGetTasksByCategory() {
  console.log('\n=== 测试：按类别筛选任务 ===');

  try {
    const categories = ['daily', 'weekly', 'monthly'];

    for (const category of categories) {
      const response = await axios.get(
        `${API_BASE_URL}/daily-tasks?category=${category}`,
        authConfig(studentToken)
      );

      if (!response.data.success) {
        console.error(`❌ 获取${category}任务失败`);
        return false;
      }

      const tasks = response.data.data;

      // 验证所有任务都是指定类别
      const invalidTasks = tasks.filter(t => t.category !== category);
      if (invalidTasks.length > 0) {
        console.error(`❌ ${category}类别筛选错误，包含其他类别任务`);
        return false;
      }

      console.log(`✅ ${category}: ${tasks.length}个任务`);
    }

    console.log('✅ 类别筛选功能正常');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取单个任务详情
 */
async function testGetTaskById() {
  console.log('\n=== 测试：获取单个任务详情 ===');

  try {
    // 先获取所有任务，取第一个
    const listResponse = await axios.get(
      `${API_BASE_URL}/daily-tasks`,
      authConfig(studentToken)
    );

    const tasks = listResponse.data.data;
    if (tasks.length === 0) {
      console.error('❌ 没有可用的任务');
      return false;
    }

    const taskId = tasks[0].task_id;

    // 获取单个任务详情
    const response = await axios.get(
      `${API_BASE_URL}/daily-tasks/${taskId}`,
      authConfig(studentToken)
    );

    if (!response.data.success) {
      console.error('❌ 获取任务详情失败');
      return false;
    }

    const task = response.data.data;
    console.log(`📋 任务: ${task.task_name}`);
    console.log(`   类别: ${task.category}`);
    console.log(`   类型: ${task.task_type}`);
    console.log(`   奖励: ${task.points_reward}积分`);
    console.log(`   目标: ${task.target_value}`);

    console.log('✅ 获取任务详情成功');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：创建新任务（管理员权限）
 */
async function testCreateTask() {
  console.log('\n=== 测试：创建新任务 ===');

  try {
    const timestamp = Date.now();
    const newTask = {
      taskCode: `TEST_TASK_${timestamp}`,
      taskName: '测试任务',
      taskDesc: '这是一个测试任务',
      taskIcon: '🧪',
      category: 'daily',
      taskType: 'practice',
      pointsReward: 50,
      bonusPoints: 25,
      targetValue: 10,
      progressType: 'count',
      resetPeriod: 'daily',
      resetTime: '00:00:00',
      triggerCondition: {
        event_name: 'student.test',
        condition_type: 'count',
        threshold: 10
      },
      isActive: true,
      displayOrder: 100
    };

    const response = await axios.post(
      `${API_BASE_URL}/daily-tasks`,
      newTask,
      authConfig(adminToken)
    );

    if (!response.data.success) {
      console.error('❌ 创建任务失败');
      return false;
    }

    const createdTask = response.data.data;
    createdTaskId = createdTask.task_id;

    console.log(`✅ 任务创建成功 (ID: ${createdTaskId})`);
    console.log(`   任务代码: ${createdTask.task_code}`);
    console.log(`   任务名称: ${createdTask.task_name}`);

    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：学生无权创建任务
 */
async function testStudentCannotCreateTask() {
  console.log('\n=== 测试：学生无权创建任务 ===');

  try {
    const newTask = {
      taskCode: 'UNAUTHORIZED_TASK',
      taskName: '未授权任务',
      category: 'daily',
      taskType: 'practice',
      pointsReward: 10,
      targetValue: 1,
      progressType: 'count',
      resetPeriod: 'daily',
      triggerCondition: { event_name: 'test' }
    };

    const response = await axios.post(
      `${API_BASE_URL}/daily-tasks`,
      newTask,
      authConfig(studentToken)
    );

    // 应该失败
    console.error('❌ 学生不应该能创建任务');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log('✅ 权限验证正常（学生无法创建任务）');
      return true;
    }
    console.error('❌ 错误类型不正确:', error.response?.status);
    return false;
  }
}

/**
 * 测试：更新任务（管理员权限）
 */
async function testUpdateTask() {
  console.log('\n=== 测试：更新任务 ===');

  if (!createdTaskId) {
    console.error('❌ 没有可更新的任务');
    return false;
  }

  try {
    const updates = {
      taskName: '已更新的测试任务',
      pointsReward: 100,
      bonusPoints: 50
    };

    const response = await axios.put(
      `${API_BASE_URL}/daily-tasks/${createdTaskId}`,
      updates,
      authConfig(adminToken)
    );

    if (!response.data.success) {
      console.error('❌ 更新任务失败');
      return false;
    }

    const updatedTask = response.data.data;

    if (updatedTask.task_name !== updates.taskName) {
      console.error('❌ 任务名称未更新');
      return false;
    }

    if (updatedTask.points_reward !== updates.pointsReward) {
      console.error('❌ 积分奖励未更新');
      return false;
    }

    console.log(`✅ 任务更新成功`);
    console.log(`   新名称: ${updatedTask.task_name}`);
    console.log(`   新奖励: ${updatedTask.points_reward}积分`);

    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取学生当前任务及进度
 */
async function testGetStudentCurrentTasks() {
  console.log('\n=== 测试：获取学生当前任务 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/daily-tasks/student/${studentId}/current`,
      authConfig(studentToken)
    );

    if (!response.data.success) {
      console.error('❌ 获取当前任务失败');
      return false;
    }

    const tasks = response.data.data;
    console.log(`📋 学生当前任务数: ${tasks.length}`);

    // 验证每个任务都有进度信息
    if (tasks.length > 0) {
      const task = tasks[0];
      if (!task.progress) {
        console.error('❌ 缺少进度信息');
        return false;
      }

      console.log('\n示例任务:');
      console.log(`  任务: ${task.task_name}`);
      console.log(`  当前进度: ${task.progress.current_value}/${task.target_value}`);
      console.log(`  完成率: ${task.progress.completion_rate}%`);
      console.log(`  已完成: ${task.progress.is_completed ? '是' : '否'}`);
    }

    console.log('✅ 获取当前任务成功');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：更新任务进度
 */
async function testUpdateTaskProgress() {
  console.log('\n=== 测试：更新任务进度 ===');

  try {
    // 获取一个每日任务
    const response = await axios.get(
      `${API_BASE_URL}/daily-tasks?category=daily`,
      authConfig(studentToken)
    );

    const tasks = response.data.data;
    if (tasks.length === 0) {
      console.error('❌ 没有可用的每日任务');
      return false;
    }

    const task = tasks[0];
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 1);

    // 更新进度
    const progressUpdate = {
      studentId: studentId,
      incrementValue: 1,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0]
    };

    const updateResponse = await axios.post(
      `${API_BASE_URL}/daily-tasks/${task.task_id}/progress`,
      progressUpdate,
      authConfig(studentToken)
    );

    if (!updateResponse.data.success) {
      console.error('❌ 更新进度失败');
      return false;
    }

    const progress = updateResponse.data.data;
    console.log(`✅ 进度更新成功`);
    console.log(`   任务: ${task.task_name}`);
    console.log(`   当前值: ${progress.current_value}`);
    console.log(`   目标值: ${progress.target_value}`);
    console.log(`   完成率: ${progress.completion_rate}%`);

    if (progress.is_completed) {
      console.log(`   🎉 任务已完成！获得 ${progress.points_awarded} 积分`);
    }

    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：获取学生任务进度
 */
async function testGetStudentProgress() {
  console.log('\n=== 测试：获取学生任务进度 ===');

  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const response = await axios.get(
      `${API_BASE_URL}/daily-tasks/student/${studentId}/progress?category=daily&periodStart=${periodStart.toISOString().split('T')[0]}`,
      authConfig(studentToken)
    );

    if (!response.data.success) {
      console.error('❌ 获取进度失败');
      return false;
    }

    const progress = response.data.data;
    console.log(`📊 进度记录数: ${progress.length}`);

    if (progress.length > 0) {
      console.log('\n进度详情:');
      progress.slice(0, 3).forEach((p, index) => {
        console.log(`  ${index + 1}. ${p.task_name}`);
        console.log(`     进度: ${p.current_value}/${p.target_value} (${p.completion_rate}%)`);
        console.log(`     状态: ${p.is_completed ? '已完成' : '进行中'}`);
      });
    }

    console.log('✅ 获取学生进度成功');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试：删除任务（管理员权限）
 */
async function testDeleteTask() {
  console.log('\n=== 测试：删除任务 ===');

  if (!createdTaskId) {
    console.error('❌ 没有可删除的任务');
    return false;
  }

  try {
    const response = await axios.delete(
      `${API_BASE_URL}/daily-tasks/${createdTaskId}`,
      authConfig(adminToken)
    );

    if (!response.data.success) {
      console.error('❌ 删除任务失败');
      return false;
    }

    console.log(`✅ 任务删除成功 (ID: ${createdTaskId})`);

    // 验证任务已删除
    try {
      await axios.get(
        `${API_BASE_URL}/daily-tasks/${createdTaskId}`,
        authConfig(adminToken)
      );
      console.error('❌ 任务仍然存在');
      return false;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ 确认任务已删除');
        return true;
      }
      throw error;
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
  console.log('   日常任务系统 API 测试');
  console.log('================================================');

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // 登录
  const adminLoginSuccess = await loginAdmin();
  const studentLoginSuccess = await loginStudent();

  if (!adminLoginSuccess || !studentLoginSuccess) {
    console.error('登录失败，测试终止');
    process.exit(1);
  }

  const tests = [
    { name: '获取所有日常任务', fn: testGetAllDailyTasks },
    { name: '按类别筛选任务', fn: testGetTasksByCategory },
    { name: '获取单个任务详情', fn: testGetTaskById },
    { name: '创建新任务（管理员）', fn: testCreateTask },
    { name: '学生无权创建任务', fn: testStudentCannotCreateTask },
    { name: '更新任务（管理员）', fn: testUpdateTask },
    { name: '获取学生当前任务', fn: testGetStudentCurrentTasks },
    { name: '更新任务进度', fn: testUpdateTaskProgress },
    { name: '获取学生任务进度', fn: testGetStudentProgress },
    { name: '删除任务（管理员）', fn: testDeleteTask }
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
