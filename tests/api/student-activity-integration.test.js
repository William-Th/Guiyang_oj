/**
 * Student Activity Integration Test
 * 学生答题流程集成测试
 *
 * 测试完整的学生答题工作流程：
 * 1. 学生登录
 * 2. 获取练习列表
 * 3. 开始练习
 * 4. 获取题目
 * 5. 提交答案
 * 6. 提交活动
 * 7. 查看结果
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

// Test configuration
const TEST_CONFIG = {
  student: {
    username: '520102200801011234',
    password: 'password123'
  },
  teacher: {
    username: 'teacher01',
    password: 'password123'
  }
};

let authToken = null;
let testActivityId = null;
let studentActivityId = null;

/**
 * Helper function to make API requests with auth token
 */
async function apiRequest(method, endpoint, data = null, token = authToken) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ API Request Failed: ${method} ${endpoint}`);
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Test: Student login
 */
async function testStudentLogin() {
  console.log('\n📝 Test 1: Student Login');

  const response = await apiRequest('POST', '/auth/login', {
    username: TEST_CONFIG.student.username,
    password: TEST_CONFIG.student.password
  }, null);

  if (!response.success || !response.token) {
    throw new Error('Login failed: no token received');
  }

  authToken = response.token;
  console.log('✅ Student login successful');
  console.log(`   Token: ${authToken.substring(0, 20)}...`);
}

/**
 * Test: Get available practices
 */
async function testGetPractices() {
  console.log('\n📝 Test 2: Get Available Practices');

  const response = await apiRequest('GET', '/student/activities/practice');

  if (!response.success || !response.activities) {
    throw new Error('Failed to get practices');
  }

  console.log(`✅ Found ${response.activities.length} available practices`);

  // Find a suitable test activity
  const testActivity = response.activities.find(a =>
    a.status === 'published' && a.type === 'practice'
  );

  if (!testActivity) {
    console.log('⚠️  No suitable practice activity found for testing');
    console.log('   Please create a published practice activity first');
    return false;
  }

  testActivityId = testActivity.id;
  console.log(`   Selected activity: ${testActivity.title} (ID: ${testActivityId})`);
  return true;
}

/**
 * Test: Start activity
 */
async function testStartActivity() {
  console.log('\n📝 Test 3: Start Activity');

  const response = await apiRequest('POST', `/activities/${testActivityId}/start`);

  if (!response.success || !response.studentActivityId) {
    throw new Error('Failed to start activity');
  }

  studentActivityId = response.studentActivityId;
  console.log('✅ Activity started successfully');
  console.log(`   Student Activity ID: ${studentActivityId}`);
  console.log(`   Start Time: ${response.startTime}`);
  console.log(`   Deadline: ${response.timeLimitDeadline || 'N/A'}`);
}

/**
 * Test: Get activity questions
 */
async function testGetQuestions() {
  console.log('\n📝 Test 4: Get Activity Questions');

  const response = await apiRequest('GET', `/activities/${testActivityId}/questions`);

  if (!response.success || !response.activity || !response.activity.questions) {
    throw new Error('Failed to get questions');
  }

  const questions = response.activity.questions;
  console.log(`✅ Retrieved ${questions.length} questions`);

  // Display question types
  const questionTypes = {};
  questions.forEach(q => {
    questionTypes[q.type] = (questionTypes[q.type] || 0) + 1;
  });

  console.log('   Question types:');
  Object.entries(questionTypes).forEach(([type, count]) => {
    console.log(`     - ${type}: ${count}`);
  });

  return questions;
}

/**
 * Test: Submit answers for questions
 */
async function testSubmitAnswers(questions) {
  console.log('\n📝 Test 5: Submit Answers');

  let successCount = 0;
  let failCount = 0;

  for (const question of questions) {
    try {
      // Generate appropriate answer based on question type
      let answer;

      switch (question.type) {
        case 'single':
        case 'true_false':
          answer = 'A'; // Default single choice
          break;
        case 'multiple':
          answer = ['A', 'B']; // Default multiple choice
          break;
        case 'fill_blank':
        case 'blank':
          answer = 'test answer'; // Default fill-in answer
          break;
        case 'short_answer':
        case 'essay':
          answer = 'This is a test answer for subjective question.';
          break;
        case 'coding':
        case 'programming':
          answer = 'console.log("Hello, World!");';
          break;
        default:
          answer = 'test';
      }

      const response = await apiRequest('POST', `/student/activities/${testActivityId}/answers`, {
        questionId: question.id,
        answer: answer
      });

      if (response.success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      console.error(`   ❌ Failed to submit answer for question ${question.id}`);
      failCount++;
    }
  }

  console.log(`✅ Answer submission completed:`);
  console.log(`   Success: ${successCount}/${questions.length}`);
  console.log(`   Failed: ${failCount}/${questions.length}`);

  if (failCount > 0) {
    console.warn(`   ⚠️  Some answers failed to submit`);
  }
}

/**
 * Test: Submit activity
 */
async function testSubmitActivity() {
  console.log('\n📝 Test 6: Submit Activity');

  const response = await apiRequest('POST', `/student/activities/${testActivityId}/submit`);

  if (!response.success) {
    throw new Error('Failed to submit activity');
  }

  console.log('✅ Activity submitted successfully');
  console.log(`   Total Score: ${response.totalScore || 'Pending'}`);
  console.log(`   Auto-graded Questions: ${response.autoGradedAnswers || 0}`);
  console.log(`   Duration: ${response.durationFormatted || 'N/A'}`);
}

/**
 * Test: Get activity result
 */
async function testGetResult() {
  console.log('\n📝 Test 7: Get Activity Result');

  const response = await apiRequest('GET', `/student/activities/${testActivityId}/result`);

  if (!response.success || !response.result) {
    throw new Error('Failed to get result');
  }

  const result = response.result;
  console.log('✅ Activity result retrieved');
  console.log(`   Status: ${result.status}`);
  console.log(`   Score: ${result.score || 'Pending'}/${result.activity.total_score}`);
  console.log(`   Grading Status: ${result.grading_status || 'pending'}`);
  console.log(`   Answered: ${result.answeredCount || 0}/${result.totalQuestions || 0}`);
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Student Activity Integration Tests');
  console.log('=' .repeat(60));

  try {
    // Test 1: Student login
    await testStudentLogin();

    // Test 2: Get practices
    const hasActivity = await testGetPractices();
    if (!hasActivity) {
      console.log('\n⚠️  Skipping remaining tests - no suitable activity found');
      return;
    }

    // Test 3: Start activity
    await testStartActivity();

    // Test 4: Get questions
    const questions = await testGetQuestions();

    // Test 5: Submit answers
    await testSubmitAnswers(questions);

    // Test 6: Submit activity
    await testSubmitActivity();

    // Test 7: Get result
    await testGetResult();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All integration tests passed successfully!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.error('❌ Integration tests failed');
    console.error('Error:', error.message);
    console.log('=' .repeat(60));
    process.exit(1);
  }
}

// Run tests
runTests();
