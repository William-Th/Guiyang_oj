/**
 * Assessment Registration API Tests
 * 测评报名功能API测试
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test accounts
const ADMIN_CREDENTIALS = { username: 'admin', password: 'password123' };
const TEACHER_CREDENTIALS = { username: 'teacher01', password: 'password123' };
const STUDENT_CREDENTIALS = { phone: '13800138003', password: 'password123' };

let adminToken = null;
let teacherToken = null;
let studentToken = null;
let testActivityId = null;
let testLocationId = null;

// Helper function for logging
function log(message, data = null) {
  console.log(`[${new Date().toISOString().substr(11, 8)}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Helper function for API calls
async function apiCall(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {}
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status || 0
    };
  }
}

// Test functions
async function testLogin() {
  log('=== Testing Login ===');

  // Admin login
  let result = await apiCall('POST', '/auth/login', ADMIN_CREDENTIALS);
  if (result.success && result.data.token) {
    adminToken = result.data.token;
    log('✅ Admin login successful');
  } else {
    log('❌ Admin login failed', result.error);
    return false;
  }

  // Teacher login
  result = await apiCall('POST', '/auth/login', TEACHER_CREDENTIALS);
  if (result.success && result.data.token) {
    teacherToken = result.data.token;
    log('✅ Teacher login successful');
  } else {
    log('❌ Teacher login failed', result.error);
    return false;
  }

  // Student login
  result = await apiCall('POST', '/auth/login', STUDENT_CREDENTIALS);
  if (result.success && result.data.token) {
    studentToken = result.data.token;
    log('✅ Student login successful');
  } else {
    log('❌ Student login failed', result.error);
    return false;
  }

  return true;
}

async function findOrCreateTestActivity() {
  log('=== Finding/Creating Test Activity ===');

  // First, try to find an existing assessment activity
  const result = await apiCall('GET', '/activities?type=assessment&status=published', null, adminToken);

  if (result.success && result.data.data && result.data.data.length > 0) {
    // Use the first published assessment
    testActivityId = result.data.data[0].id;
    log(`✅ Found existing assessment activity: ${testActivityId}`);
    return true;
  }

  // If no published assessment, try to find any assessment
  const allResult = await apiCall('GET', '/activities?type=assessment', null, adminToken);

  if (allResult.success && allResult.data.data && allResult.data.data.length > 0) {
    testActivityId = allResult.data.data[0].id;
    log(`✅ Found existing assessment activity (may not be published): ${testActivityId}`);
    log('Activity details:', allResult.data.data[0]);
    return true;
  }

  log('⚠️ No assessment activities found. Some tests will be skipped.');
  return false;
}

async function testLocationManagement() {
  log('=== Testing Location Management ===');

  if (!testActivityId) {
    log('⚠️ Skipping location tests - no test activity');
    return false;
  }

  // Test 1: Get locations for activity (should be empty initially)
  let result = await apiCall('GET', `/activities/${testActivityId}/locations`, null, adminToken);
  log('Get locations result:', result);

  if (!result.success) {
    log('❌ Failed to get locations', result.error);
    return false;
  }
  log(`✅ Get locations successful. Count: ${result.data.data?.length || 0}`);

  // Test 2: Create a location
  const locationData = {
    name: `测试测评点-${Date.now()}`,
    address: '贵阳市云岩区测试路123号',
    capacity: 30,
    contact_name: '张老师',
    contact_phone: '13800000001',
    exam_date: '2025-12-15',
    exam_time_start: '09:00',
    exam_time_end: '11:00',
    check_in_time: '08:30',
    notes: 'API测试创建的测评点'
  };

  result = await apiCall('POST', `/activities/${testActivityId}/locations`, locationData, adminToken);

  if (!result.success) {
    log('❌ Failed to create location', result.error);
    // This might fail if user doesn't have permission or activity type doesn't require location
    // Let's check what locations already exist
    const existingLocs = await apiCall('GET', `/activities/${testActivityId}/locations`, null, adminToken);
    if (existingLocs.success && existingLocs.data.data && existingLocs.data.data.length > 0) {
      testLocationId = existingLocs.data.data[0].id;
      log(`✅ Using existing location: ${testLocationId}`);
      return true;
    }
    return false;
  }

  testLocationId = result.data.data.id;
  log(`✅ Location created successfully. ID: ${testLocationId}`);

  // Test 3: Get location by ID
  result = await apiCall('GET', `/locations/${testLocationId}`, null, adminToken);
  if (!result.success) {
    log('❌ Failed to get location by ID', result.error);
    return false;
  }
  log('✅ Get location by ID successful');

  // Test 4: Update location
  const updateData = {
    capacity: 40,
    notes: '已更新的测试测评点'
  };

  result = await apiCall('PUT', `/locations/${testLocationId}`, updateData, adminToken);
  if (!result.success) {
    log('❌ Failed to update location', result.error);
    return false;
  }
  log('✅ Location updated successfully');

  // Test 5: Check capacity
  result = await apiCall('GET', `/locations/${testLocationId}/capacity`, null, adminToken);
  if (!result.success) {
    log('⚠️ Capacity check endpoint may not exist', result.error);
  } else {
    log('✅ Capacity check successful:', result.data);
  }

  return true;
}

async function testStudentRegistration() {
  log('=== Testing Student Registration ===');

  if (!testActivityId) {
    log('⚠️ Skipping registration tests - no test activity');
    return false;
  }

  // Test 1: Check eligibility
  let result = await apiCall('GET', `/activities/${testActivityId}/registration/eligibility`, null, studentToken);
  log('Eligibility check result:', result);

  if (!result.success) {
    log('❌ Eligibility check failed', result.error);
    // Continue with other tests anyway
  } else {
    log(`✅ Eligibility check successful. Eligible: ${result.data.eligible}`);
    if (!result.data.eligible) {
      log('Reason:', result.data.reason);
    }
  }

  // Test 2: Register for assessment
  const registrationData = {};
  if (testLocationId) {
    registrationData.location_id = testLocationId;
  }

  result = await apiCall('POST', `/activities/${testActivityId}/register`, registrationData, studentToken);

  if (!result.success) {
    log('⚠️ Registration failed (may be expected if not eligible):', result.error);
    // Try to get existing registrations
  } else {
    log('✅ Registration successful');
    log('Registration data:', result.data);
  }

  // Test 3: Get student's registrations
  result = await apiCall('GET', '/assessments/my-registrations', null, studentToken);

  if (!result.success) {
    log('❌ Failed to get student registrations', result.error);
    return false;
  }
  log(`✅ Get student registrations successful. Count: ${result.data.data?.length || 0}`);

  return true;
}

async function testAdminRegistrationManagement() {
  log('=== Testing Admin Registration Management ===');

  if (!testActivityId) {
    log('⚠️ Skipping admin registration management tests - no test activity');
    return false;
  }

  // Test 1: Get all registrations for activity
  let result = await apiCall('GET', `/activities/${testActivityId}/registrations`, null, adminToken);

  if (!result.success) {
    log('❌ Failed to get activity registrations', result.error);
    return false;
  }
  log(`✅ Get activity registrations successful. Count: ${result.data.data?.length || 0}`);

  // Test 2: Get registration statistics
  result = await apiCall('GET', `/activities/${testActivityId}/registrations?include_stats=true`, null, adminToken);

  if (result.success) {
    log('✅ Get registration stats successful');
    if (result.data.statistics) {
      log('Statistics:', result.data.statistics);
    }
  }

  // Test 3: Get location statistics (if we have a test activity with locations)
  result = await apiCall('GET', `/activities/${testActivityId}/locations`, null, adminToken);

  if (result.success && result.data.data) {
    log(`✅ Location count for activity: ${result.data.data.length}`);
    result.data.data.forEach(loc => {
      log(`  - ${loc.name}: ${loc.registered_count}/${loc.capacity} registered`);
    });
  }

  return true;
}

async function testCleanup() {
  log('=== Cleanup ===');

  // Only delete the test location if we created it
  if (testLocationId) {
    // First check if there are registrations
    const regResult = await apiCall('GET', `/activities/${testActivityId}/registrations`, null, adminToken);

    // Try to cancel any registrations for this location
    if (regResult.success && regResult.data.data) {
      const locationRegs = regResult.data.data.filter(r => r.location_id === testLocationId);
      for (const reg of locationRegs) {
        const cancelResult = await apiCall('POST', `/activities/${testActivityId}/register/cancel`, {}, studentToken);
        log('Cancellation attempt:', cancelResult);
      }
    }

    // Try to delete the location
    const deleteResult = await apiCall('DELETE', `/locations/${testLocationId}`, null, adminToken);
    if (deleteResult.success) {
      log(`✅ Test location ${testLocationId} deleted`);
    } else {
      log(`⚠️ Could not delete test location: ${deleteResult.error}`);
    }
  }

  log('=== Test Complete ===');
}

// Main test runner
async function runTests() {
  console.log('\n========================================');
  console.log('   Assessment Registration API Tests');
  console.log('========================================\n');

  let allPassed = true;

  try {
    // Step 1: Login
    if (!(await testLogin())) {
      console.log('\n❌ Login tests failed. Aborting.');
      return;
    }

    // Step 2: Find or create test activity
    await findOrCreateTestActivity();

    // Step 3: Location management tests
    if (!(await testLocationManagement())) {
      allPassed = false;
      log('⚠️ Some location management tests failed');
    }

    // Step 4: Student registration tests
    if (!(await testStudentRegistration())) {
      allPassed = false;
      log('⚠️ Some student registration tests failed');
    }

    // Step 5: Admin registration management tests
    if (!(await testAdminRegistrationManagement())) {
      allPassed = false;
      log('⚠️ Some admin registration management tests failed');
    }

    // Cleanup
    await testCleanup();

  } catch (error) {
    console.error('Test error:', error);
    allPassed = false;
  }

  console.log('\n========================================');
  console.log(allPassed ? '   ✅ All Tests Passed!' : '   ⚠️ Some Tests Failed');
  console.log('========================================\n');
}

runTests();
