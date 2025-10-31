/**
 * Time Limit Feature - API Tests
 *
 * Test Coverage:
 * - PTL-API-001: Create unlimited practice activity
 * - PTL-API-002: Create scheduled practice activity
 * - PTL-API-003: Create timed practice activity
 * - PTL-API-004: Retrieve activity with time limit data
 * - PTL-API-005: Update time limit type
 * - PTL-API-006: Validate time limit constraints
 */

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';

let authToken = '';
let teacherId = null;
let createdActivityIds = [];

// Test data
const testData = {
  unlimited: {
    title: `API-Test-Unlimited-${Date.now()}`,
    description: 'API测试 - 无限制类型',
    subject: '数学',
    grade: '三年级',
    abilityLevel: 'L2',
    timeLimitType: 'unlimited',
    totalScore: 50,
    passScore: 30,
  },
  scheduled: {
    title: `API-Test-Scheduled-${Date.now()}`,
    description: 'API测试 - 定时制类型',
    subject: '英语',
    grade: '四年级',
    abilityLevel: 'L3',
    timeLimitType: 'scheduled',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    // Note: scheduled type should NOT have duration - it uses start/end time window
    totalScore: 100,
    passScore: 60,
  },
  timed: {
    title: `API-Test-Timed-${Date.now()}`,
    description: 'API测试 - 计时制类型',
    subject: '语文',
    grade: '五年级',
    abilityLevel: 'L4',
    timeLimitType: 'timed',
    duration: 45,
    totalScore: 80,
    passScore: 48,
  },
};

/**
 * Helper: Login as teacher
 */
async function loginAsTeacher() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'teacher01',
      password: 'password123',
    });

    if (response.data && response.data.token) {
      authToken = response.data.token;
      teacherId = response.data.user.id;
      console.log('✓ Logged in as teacher01');
      return true;
    }
    return false;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Helper: Create practice activity
 */
async function createPracticeActivity(data) {
  try {
    const response = await axios.post(
      `${API_BASE}/activities/practice`,
      data,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data && response.data.activity) {
      createdActivityIds.push(response.data.activity.id);
      return response.data.activity;
    }
    return null;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

/**
 * Helper: Get activity by ID
 */
async function getActivity(activityId) {
  try {
    const response = await axios.get(
      `${API_BASE}/activities/${activityId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    return response.data.activity;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

/**
 * Helper: Update activity
 */
async function updateActivity(activityId, data) {
  try {
    const response = await axios.put(
      `${API_BASE}/activities/${activityId}`,
      data,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    return response.data.activity;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

/**
 * Helper: Delete activity (cleanup)
 */
async function deleteActivity(activityId) {
  try {
    await axios.delete(
      `${API_BASE}/activities/${activityId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log(`  Cleaned up activity ${activityId}`);
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Test Suite
 */
async function runTests() {
  console.log('\n=== Time Limit Feature - API Tests ===\n');

  // Login
  console.log('Setup: Logging in...');
  const loginSuccess = await loginAsTeacher();
  if (!loginSuccess) {
    console.error('✗ Test suite aborted: Login failed');
    process.exit(1);
  }

  let passedTests = 0;
  let failedTests = 0;

  // PTL-API-001: Create unlimited practice activity
  try {
    console.log('\n[PTL-API-001] Create unlimited practice activity');
    const activity = await createPracticeActivity(testData.unlimited);

    // Verify response
    if (activity.time_limit_type !== 'unlimited') {
      throw new Error(`Expected time_limit_type 'unlimited', got '${activity.time_limit_type}'`);
    }
    if (activity.start_time !== null && activity.start_time !== undefined) {
      throw new Error(`Expected start_time null/undefined, got '${activity.start_time}'`);
    }
    if (activity.end_time !== null && activity.end_time !== undefined) {
      throw new Error(`Expected end_time null/undefined, got '${activity.end_time}'`);
    }
    if (activity.duration !== null && activity.duration !== undefined) {
      throw new Error(`Expected duration null/undefined, got '${activity.duration}'`);
    }

    console.log('  ✓ Activity created with unlimited type');
    console.log(`  ✓ Activity ID: ${activity.id}`);
    console.log(`  ✓ Time limit type: ${activity.time_limit_type}`);
    passedTests++;
  } catch (error) {
    console.error(`  ✗ Test failed: ${error.message}`);
    failedTests++;
  }

  // PTL-API-002: Create scheduled practice activity
  try {
    console.log('\n[PTL-API-002] Create scheduled practice activity');
    console.log(`  Test data: start=${testData.scheduled.startTime}, end=${testData.scheduled.endTime}`);
    const activity = await createPracticeActivity(testData.scheduled);

    // Verify response
    if (activity.time_limit_type !== 'scheduled') {
      throw new Error(`Expected time_limit_type 'scheduled', got '${activity.time_limit_type}'`);
    }
    if (!activity.start_time) {
      throw new Error('Expected start_time to be set');
    }
    if (!activity.end_time) {
      throw new Error('Expected end_time to be set');
    }
    // Scheduled type should NOT have duration
    if (activity.duration !== null && activity.duration !== undefined) {
      throw new Error(`Expected duration null/undefined for scheduled type, got ${activity.duration}`);
    }

    console.log('  ✓ Activity created with scheduled type');
    console.log(`  ✓ Activity ID: ${activity.id}`);
    console.log(`  ✓ Time limit type: ${activity.time_limit_type}`);
    console.log(`  ✓ Start time: ${activity.start_time}`);
    console.log(`  ✓ End time: ${activity.end_time}`);
    passedTests++;
  } catch (error) {
    console.error(`  ✗ Test failed: ${error.message}`);
    console.error(`  Details:`, error.response?.data || error);
    failedTests++;
  }

  // PTL-API-003: Create timed practice activity
  try {
    console.log('\n[PTL-API-003] Create timed practice activity');
    const activity = await createPracticeActivity(testData.timed);

    // Verify response
    if (activity.time_limit_type !== 'timed') {
      throw new Error(`Expected time_limit_type 'timed', got '${activity.time_limit_type}'`);
    }
    if (activity.start_time !== null && activity.start_time !== undefined) {
      throw new Error(`Expected start_time null/undefined, got '${activity.start_time}'`);
    }
    if (activity.end_time !== null && activity.end_time !== undefined) {
      throw new Error(`Expected end_time null/undefined, got '${activity.end_time}'`);
    }
    if (activity.duration !== 45) {
      throw new Error(`Expected duration 45, got ${activity.duration}`);
    }

    console.log('  ✓ Activity created with timed type');
    console.log(`  ✓ Activity ID: ${activity.id}`);
    console.log(`  ✓ Time limit type: ${activity.time_limit_type}`);
    console.log(`  ✓ Duration: ${activity.duration} minutes`);
    passedTests++;
  } catch (error) {
    console.error(`  ✗ Test failed: ${error.message}`);
    failedTests++;
  }

  // PTL-API-004: Retrieve activity with time limit data
  try {
    console.log('\n[PTL-API-004] Retrieve activity with time limit data');

    // Get the unlimited activity (index 0)
    const unlimitedActivity = await getActivity(createdActivityIds[0]);

    // Verify unlimited type
    if (unlimitedActivity.time_limit_type !== 'unlimited') {
      throw new Error(`Expected unlimited type, got ${unlimitedActivity.time_limit_type}`);
    }
    if (unlimitedActivity.start_time || unlimitedActivity.end_time || unlimitedActivity.duration) {
      throw new Error('Unlimited activity should have no time limit fields');
    }

    // Get the scheduled activity (index 1) - if it was created successfully
    if (createdActivityIds.length > 1) {
      const scheduledActivity = await getActivity(createdActivityIds[1]);

      // Verify scheduled type
      if (scheduledActivity.time_limit_type !== 'scheduled') {
        throw new Error(`Expected scheduled type, got ${scheduledActivity.time_limit_type}`);
      }
      if (!scheduledActivity.start_time || !scheduledActivity.end_time) {
        throw new Error('Scheduled activity missing start/end time');
      }
      if (scheduledActivity.duration) {
        throw new Error('Scheduled activity should not have duration');
      }
    }

    // Get the timed activity (index 2)
    const timedActivity = await getActivity(createdActivityIds[2] || createdActivityIds[1]);

    // Verify timed type
    if (timedActivity.time_limit_type !== 'timed') {
      throw new Error(`Expected timed type, got ${timedActivity.time_limit_type}`);
    }
    if (!timedActivity.duration) {
      throw new Error('Timed activity missing duration');
    }
    if (timedActivity.start_time || timedActivity.end_time) {
      throw new Error('Timed activity should not have start/end time');
    }

    console.log('  ✓ Retrieved activities successfully');
    console.log(`  ✓ Unlimited type: no time restrictions`);
    if (createdActivityIds.length > 2) {
      console.log(`  ✓ Scheduled type: has start/end time, no duration`);
    }
    console.log(`  ✓ Timed type: has duration, no start/end time`);
    passedTests++;
  } catch (error) {
    console.error(`  ✗ Test failed: ${error.message}`);
    failedTests++;
  }

  // PTL-API-005: Update time limit type
  try {
    console.log('\n[PTL-API-005] Update time limit type');

    // Update unlimited activity to timed
    const activityId = createdActivityIds[0]; // Unlimited activity
    const updatedActivity = await updateActivity(activityId, {
      timeLimitType: 'timed',
      duration: 30,
    });

    // Verify update
    if (updatedActivity.time_limit_type !== 'timed') {
      throw new Error(`Expected time_limit_type 'timed', got '${updatedActivity.time_limit_type}'`);
    }
    if (updatedActivity.duration !== 30) {
      throw new Error(`Expected duration 30, got ${updatedActivity.duration}`);
    }

    console.log('  ✓ Updated time limit type from unlimited to timed');
    console.log(`  ✓ New time limit type: ${updatedActivity.time_limit_type}`);
    console.log(`  ✓ New duration: ${updatedActivity.duration} minutes`);
    passedTests++;
  } catch (error) {
    console.error(`  ✗ Test failed: ${error.message}`);
    failedTests++;
  }

  // PTL-API-006: Validate time limit constraints
  try {
    console.log('\n[PTL-API-006] Validate time limit constraints');

    let validationPassed = true;

    // Test 1: Scheduled without start/end time should fail
    try {
      await createPracticeActivity({
        ...testData.scheduled,
        title: `Invalid-Scheduled-${Date.now()}`,
        startTime: undefined,
        endTime: undefined,
      });
      console.error('  ✗ Should reject scheduled activity without time range');
      validationPassed = false;
    } catch (error) {
      console.log('  ✓ Correctly rejected scheduled activity without time range');
    }

    // Test 2: Timed without duration should fail
    try {
      await createPracticeActivity({
        ...testData.timed,
        title: `Invalid-Timed-${Date.now()}`,
        duration: undefined,
      });
      console.error('  ✗ Should reject timed activity without duration');
      validationPassed = false;
    } catch (error) {
      console.log('  ✓ Correctly rejected timed activity without duration');
    }

    // Test 3: Invalid time limit type should fail
    try {
      await createPracticeActivity({
        ...testData.unlimited,
        title: `Invalid-Type-${Date.now()}`,
        timeLimitType: 'invalid_type',
      });
      console.error('  ✗ Should reject invalid time limit type');
      validationPassed = false;
    } catch (error) {
      console.log('  ✓ Correctly rejected invalid time limit type');
    }

    if (validationPassed) {
      passedTests++;
    } else {
      failedTests++;
    }
  } catch (error) {
    console.error(`  ✗ Test failed: ${error.message}`);
    failedTests++;
  }

  // Cleanup
  console.log('\n=== Cleanup ===');
  for (const activityId of createdActivityIds) {
    await deleteActivity(activityId);
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${passedTests + failedTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('\n✓ All API tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n✗ Test suite error:', error);
  process.exit(1);
});
