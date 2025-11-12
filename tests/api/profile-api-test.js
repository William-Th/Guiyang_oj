/**
 * Profile API Test - Updated for ID Card Field Removal
 * 测试用户资料API（验证id_card字段已删除）
 *
 * Test Coverage:
 * - TC1: Teacher profile (with subjects, school, district)
 * - TC2: Admin profile (with management level, district/school)
 * - TC3: Student profile (with grade, class, school)
 * - TC4: Verify id_card field is NOT present in responses
 * - TC5: Verify required fields are present (phone, email, realName)
 * - TC6: Authorization (reject requests without token)
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// Test accounts
const TEACHER_ACCOUNT = {
  username: 'teacher_yy_ps_math',
  password: 'password123'
};

const ADMIN_ACCOUNT = {
  username: 'baiyun_admin',
  password: 'password123'
};

const STUDENT_ACCOUNT = {
  username: '13800138003',
  password: 'password123'
};

// Helper function for logging
function log(message, style = '') {
  const styles = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    gray: '\x1b[90m',
    bold: '\x1b[1m',
    reset: '\x1b[0m'
  };

  const color = styles[style] || styles.reset;
  console.log(`${color}${message}${styles.reset}`);
}

// Test runner
async function test(description, testFn) {
  try {
    await testFn();
    log(`✓ ${description}`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${description}`, 'red');
    log(`  Error: ${error.message}`, 'red');
    if (error.response) {
      log(`  Response: ${JSON.stringify(error.response.data)}`, 'yellow');
    }
    return false;
  }
}

// Login helper
async function login(username, password) {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    username,
    password
  });
  return response.data.token;
}

// Validate common fields (should exist)
function validateCommonFields(user) {
  const requiredFields = ['id', 'username', 'role', 'realName'];
  const optionalFields = ['phone', 'email'];

  for (const field of requiredFields) {
    if (!user[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Check that id_card/idCard is NOT present (this is the key test!)
  if ('idCard' in user || 'id_card' in user) {
    throw new Error('FAILED: idCard field should NOT be present in response (field removed)');
  }

  log(`  ✓ id_card field correctly removed`, 'gray');
  log(`  ✓ Required fields present: ${requiredFields.join(', ')}`, 'gray');
}

// Main test suite
async function runTests() {
  log('='.repeat(80), 'cyan');
  log('Profile API Test Suite - ID Card Field Removal Verification', 'cyan');
  log('='.repeat(80), 'cyan');
  log('');

  let passed = 0;
  let failed = 0;

  // ============================================================================
  // Test Group 1: Teacher Profile
  // ============================================================================
  log('Test Group 1: Teacher Profile', 'blue');
  log('-'.repeat(80), 'blue');

  const teacherToken = await login(TEACHER_ACCOUNT.username, TEACHER_ACCOUNT.password);

  if (await test('TC1.1: Should get teacher profile with complete information', async () => {
    const response = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const { user } = response.data;

    // Validate common fields (including id_card removal check)
    validateCommonFields(user);

    // Verify teacher-specific fields
    if (user.role === 'teacher') {
      if (!user.teacherNo) throw new Error('Missing teacherNo');
      if (!user.subjects || !Array.isArray(user.subjects)) {
        throw new Error('Missing or invalid subjects');
      }
      if (!user.school) throw new Error('Missing school name');

      log(`  Teacher Info:`, 'gray');
      log(`    - Teacher No: ${user.teacherNo}`, 'gray');
      log(`    - Subjects: ${user.subjects.join(', ')}`, 'gray');
      log(`    - Title: ${user.title || 'N/A'}`, 'gray');
      log(`    - School: ${user.school}`, 'gray');
      log(`    - District: ${user.district || 'N/A'}`, 'gray');
      log(`    - Phone: ${user.phone || 'N/A'}`, 'gray');
      log(`    - Email: ${user.email || 'N/A'}`, 'gray');
    } else {
      throw new Error(`Expected role 'teacher' but got '${user.role}'`);
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC1.2: Teacher profile should NOT contain idCard field', async () => {
    const response = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const { user } = response.data;

    if ('idCard' in user || 'id_card' in user) {
      throw new Error('CRITICAL: idCard field found in response - field removal failed!');
    }

    log(`  ✓ Confirmed: No idCard field in teacher profile`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  log('');

  // ============================================================================
  // Test Group 2: Admin Profile
  // ============================================================================
  log('Test Group 2: Admin Profile', 'blue');
  log('-'.repeat(80), 'blue');

  const adminToken = await login(ADMIN_ACCOUNT.username, ADMIN_ACCOUNT.password);

  if (await test('TC2.1: Should get admin profile with district/school info', async () => {
    const response = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const { user } = response.data;

    // Validate common fields (including id_card removal check)
    validateCommonFields(user);

    // Verify admin-specific fields
    if (user.role.includes('admin')) {
      log(`  Admin Info:`, 'gray');
      log(`    - Role: ${user.role}`, 'gray');
      log(`    - Management Level: ${user.managementLevel || 'N/A'}`, 'gray');
      log(`    - District: ${user.district || 'System-wide'}`, 'gray');
      log(`    - School: ${user.school || 'N/A'}`, 'gray');
      log(`    - Phone: ${user.phone || 'N/A'}`, 'gray');
      log(`    - Email: ${user.email || 'N/A'}`, 'gray');
    } else {
      throw new Error(`Expected admin role but got '${user.role}'`);
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC2.2: Admin profile should NOT contain idCard field', async () => {
    const response = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const { user } = response.data;

    if ('idCard' in user || 'id_card' in user) {
      throw new Error('CRITICAL: idCard field found in response - field removal failed!');
    }

    log(`  ✓ Confirmed: No idCard field in admin profile`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  log('');

  // ============================================================================
  // Test Group 3: Student Profile
  // ============================================================================
  log('Test Group 3: Student Profile', 'blue');
  log('-'.repeat(80), 'blue');

  const studentToken = await login(STUDENT_ACCOUNT.username, STUDENT_ACCOUNT.password);

  if (await test('TC3.1: Should get student profile with grade and class', async () => {
    const response = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    const { user } = response.data;

    // Validate common fields (including id_card removal check)
    validateCommonFields(user);

    // Verify student-specific fields (some may be optional)
    if (user.role === 'student') {
      log(`  Student Info:`, 'gray');
      log(`    - Student No: ${user.studentNo || 'N/A'}`, 'gray');
      log(`    - Grade: ${user.grade || 'N/A'}`, 'gray');
      log(`    - Class: ${user.class || 'N/A'}`, 'gray');
      log(`    - School: ${user.school || 'N/A'}`, 'gray');
      log(`    - Phone: ${user.phone || 'N/A'}`, 'gray');
      log(`    - Email: ${user.email || 'N/A'}`, 'gray');
    } else {
      throw new Error(`Expected role 'student' but got '${user.role}'`);
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC3.2: Student profile should NOT contain idCard field', async () => {
    const response = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    const { user } = response.data;

    if ('idCard' in user || 'id_card' in user) {
      throw new Error('CRITICAL: idCard field found in response - field removal failed!');
    }

    log(`  ✓ Confirmed: No idCard field in student profile`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  log('');

  // ============================================================================
  // Test Group 4: Field Validation
  // ============================================================================
  log('Test Group 4: Response Field Validation', 'blue');
  log('-'.repeat(80), 'blue');

  if (await test('TC4.1: All profiles should contain phone and email fields', async () => {
    // Check teacher
    const teacherRes = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    // Check admin
    const adminRes = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Check student
    const studentRes = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    const profiles = [
      { role: 'teacher', user: teacherRes.data.user },
      { role: 'admin', user: adminRes.data.user },
      { role: 'student', user: studentRes.data.user }
    ];

    for (const { role, user } of profiles) {
      // Note: phone and email are optional in database but should be in response
      if (!('phone' in user)) {
        throw new Error(`${role} profile missing 'phone' field`);
      }
      if (!('email' in user)) {
        throw new Error(`${role} profile missing 'email' field`);
      }
      log(`  ✓ ${role}: phone and email fields present`, 'gray');
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC4.2: No profile should contain id_card or idCard fields', async () => {
    const teacherRes = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const adminRes = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const studentRes = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    const profiles = [
      { role: 'teacher', user: teacherRes.data.user },
      { role: 'admin', user: adminRes.data.user },
      { role: 'student', user: studentRes.data.user }
    ];

    for (const { role, user } of profiles) {
      if ('idCard' in user || 'id_card' in user) {
        throw new Error(`CRITICAL: ${role} profile contains idCard field!`);
      }
      log(`  ✓ ${role}: No idCard field (✓ field removed successfully)`, 'gray');
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  log('');

  // ============================================================================
  // Test Group 5: Authorization
  // ============================================================================
  log('Test Group 5: Authorization', 'blue');
  log('-'.repeat(80), 'blue');

  if (await test('TC5.1: Should reject request without token', async () => {
    try {
      await axios.get(`${API_BASE_URL}/users/profile`);
      throw new Error('Should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        log(`  ✓ Correctly rejected with 401 Unauthorized`, 'gray');
        return;
      }
      throw error;
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC5.2: Should reject request with invalid token', async () => {
    try {
      await axios.get(`${API_BASE_URL}/users/profile`, {
        headers: { Authorization: 'Bearer invalid_token_12345' }
      });
      throw new Error('Should have been rejected');
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        log(`  ✓ Correctly rejected with ${error.response.status}`, 'gray');
        return;
      }
      throw error;
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  log('');

  // ============================================================================
  // Summary
  // ============================================================================
  log('='.repeat(80), 'cyan');
  log('Test Summary', 'cyan');
  log('='.repeat(80), 'cyan');
  log(`Total Tests: ${passed + failed}`, '');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log('');

  if (failed === 0) {
    log('✓ All tests passed!', 'green');
    log('✓ ID card field removal verified successfully across all user roles', 'green');
    process.exit(0);
  } else {
    log('✗ Some tests failed', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log('Fatal error:', 'red');
  log(error.message, 'red');
  log(error.stack, 'gray');
  process.exit(1);
});
