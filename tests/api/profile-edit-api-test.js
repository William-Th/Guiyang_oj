/**
 * Profile Edit API Test - Student and Teacher Profile Editing
 * 测试用户资料编辑API（学生和教师）
 *
 * Test Coverage:
 * - TC1: Get schools list (authenticated users)
 * - TC2: Student profile editing (realName, phone, email, school, grade, class, guardian)
 * - TC3: Teacher profile editing (realName, phone, email, school, subjects, title)
 * - TC4: Authorization (reject requests without token or wrong role)
 * - TC5: Validation (reject invalid input data)
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// Test accounts
const TEACHER_ACCOUNT = {
  username: 'teacher_yy_ps_math',
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

// Main test suite
async function runTests() {
  log('='.repeat(80), 'cyan');
  log('Profile Edit API Test Suite - Student and Teacher Profile Editing', 'cyan');
  log('='.repeat(80), 'cyan');
  log('');

  let passed = 0;
  let failed = 0;

  // Login first
  const teacherToken = await login(TEACHER_ACCOUNT.username, TEACHER_ACCOUNT.password);
  const studentToken = await login(STUDENT_ACCOUNT.username, STUDENT_ACCOUNT.password);

  // ============================================================================
  // Test Group 1: Schools List
  // ============================================================================
  log('Test Group 1: Schools List API', 'blue');
  log('-'.repeat(80), 'blue');

  if (await test('TC1.1: Should get list of all schools (authenticated)', async () => {
    const response = await axios.get(`${API_BASE_URL}/users/schools`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    const { schools } = response.data;

    if (!Array.isArray(schools)) {
      throw new Error('Schools should be an array');
    }

    if (schools.length === 0) {
      throw new Error('Schools list should not be empty');
    }

    // Check school structure
    const firstSchool = schools[0];
    const requiredFields = ['id', 'name', 'district'];
    for (const field of requiredFields) {
      if (!(field in firstSchool)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    log(`  ✓ Found ${schools.length} schools`, 'gray');
    log(`  ✓ Sample: ${firstSchool.name} (${firstSchool.district})`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC1.2: Should reject request without token', async () => {
    try {
      await axios.get(`${API_BASE_URL}/users/schools`);
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

  log('');

  // ============================================================================
  // Test Group 2: Student Profile Editing
  // ============================================================================
  log('Test Group 2: Student Profile Editing', 'blue');
  log('-'.repeat(80), 'blue');

  // Store original student data for restoration
  let originalStudentProfile;
  if (await test('TC2.0: Get original student profile', async () => {
    const response = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    originalStudentProfile = response.data.user;
    log(`  ✓ Original profile saved for restoration`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC2.1: Should update student basic info (realName, phone, email)', async () => {
    const updateData = {
      realName: '张小明测试',
      phone: '13800138888',
      email: 'test@example.com'
    };

    const response = await axios.put(
      `${API_BASE_URL}/users/profile/student`,
      updateData,
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );

    if (response.data.message !== '学生信息更新成功') {
      throw new Error('Update should return success message');
    }

    const { user } = response.data;

    if (user.realName !== updateData.realName) {
      throw new Error(`realName not updated: expected ${updateData.realName}, got ${user.realName}`);
    }
    if (user.phone !== updateData.phone) {
      throw new Error(`phone not updated: expected ${updateData.phone}, got ${user.phone}`);
    }
    if (user.email !== updateData.email) {
      throw new Error(`email not updated: expected ${updateData.email}, got ${user.email}`);
    }

    log(`  ✓ Updated: realName, phone, email`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC2.2: Should update student school info (schoolId, grade, class)', async () => {
    const updateData = {
      schoolId: 2,  // Assuming school with ID 2 exists
      grade: '三年级',
      class: '2班'
    };

    const response = await axios.put(
      `${API_BASE_URL}/users/profile/student`,
      updateData,
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );

    if (response.data.message !== '学生信息更新成功') {
      throw new Error('Update should return success message');
    }

    const { user } = response.data;

    if (user.grade !== updateData.grade) {
      throw new Error(`grade not updated: expected ${updateData.grade}, got ${user.grade}`);
    }
    if (user.class !== updateData.class) {
      throw new Error(`class not updated: expected ${updateData.class}, got ${user.class}`);
    }
    if (user.school) {
      log(`  ✓ School updated: ${user.school}`, 'gray');
    }
    log(`  ✓ Updated: grade, class, school`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC2.3: Should update guardian info', async () => {
    const updateData = {
      guardianName: '张父测试',
      guardianPhone: '13900139999'
    };

    const response = await axios.put(
      `${API_BASE_URL}/users/profile/student`,
      updateData,
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );

    if (response.data.message !== '学生信息更新成功') {
      throw new Error('Update should return success message');
    }

    const { user } = response.data;

    if (user.guardianName !== updateData.guardianName) {
      throw new Error(`guardianName not updated: expected ${updateData.guardianName}, got ${user.guardianName}`);
    }
    if (user.guardianPhone !== updateData.guardianPhone) {
      throw new Error(`guardianPhone not updated: expected ${updateData.guardianPhone}, got ${user.guardianPhone}`);
    }

    log(`  ✓ Updated: guardianName, guardianPhone`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC2.4: Should reject invalid phone number', async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/users/profile/student`,
        { phone: '1234567890' },  // Invalid phone
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );
      throw new Error('Should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log(`  ✓ Correctly rejected invalid phone`, 'gray');
        return;
      }
      throw error;
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC2.5: Should reject invalid email', async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/users/profile/student`,
        { email: 'invalid-email' },  // Invalid email
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );
      throw new Error('Should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log(`  ✓ Correctly rejected invalid email`, 'gray');
        return;
      }
      throw error;
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC2.6: Should reject teacher using student endpoint', async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/users/profile/student`,
        { realName: 'Test' },
        { headers: { Authorization: `Bearer ${teacherToken}` } }  // Teacher token
      );
      throw new Error('Should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        log(`  ✓ Correctly rejected teacher access`, 'gray');
        return;
      }
      throw error;
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  // Restore original student profile
  if (originalStudentProfile && await test('TC2.7: Restore original student profile', async () => {
    const restoreData = {
      realName: originalStudentProfile.realName,
      phone: originalStudentProfile.phone,
      email: originalStudentProfile.email,
      schoolId: originalStudentProfile.schoolId,
      grade: originalStudentProfile.grade,
      class: originalStudentProfile.class,
      guardianName: originalStudentProfile.guardianName,
      guardianPhone: originalStudentProfile.guardianPhone
    };

    await axios.put(
      `${API_BASE_URL}/users/profile/student`,
      restoreData,
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );

    log(`  ✓ Original profile restored`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  log('');

  // ============================================================================
  // Test Group 3: Teacher Profile Editing
  // ============================================================================
  log('Test Group 3: Teacher Profile Editing', 'blue');
  log('-'.repeat(80), 'blue');

  // Store original teacher data for restoration
  let originalTeacherProfile;
  if (await test('TC3.0: Get original teacher profile', async () => {
    const response = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    originalTeacherProfile = response.data.user;
    log(`  ✓ Original profile saved for restoration`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC3.1: Should update teacher basic info (realName, phone, email)', async () => {
    const updateData = {
      realName: '李老师测试',
      phone: '13900139000',
      email: 'teacher@example.com'
    };

    const response = await axios.put(
      `${API_BASE_URL}/users/profile/teacher`,
      updateData,
      { headers: { Authorization: `Bearer ${teacherToken}` } }
    );

    if (response.data.message !== '教师信息更新成功') {
      throw new Error('Update should return success message');
    }

    const { user } = response.data;

    if (user.realName !== updateData.realName) {
      throw new Error(`realName not updated: expected ${updateData.realName}, got ${user.realName}`);
    }
    if (user.phone !== updateData.phone) {
      throw new Error(`phone not updated: expected ${updateData.phone}, got ${user.phone}`);
    }
    if (user.email !== updateData.email) {
      throw new Error(`email not updated: expected ${updateData.email}, got ${user.email}`);
    }

    log(`  ✓ Updated: realName, phone, email`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC3.2: Should update teacher school and subjects', async () => {
    const updateData = {
      schoolId: 1,  // Assuming school with ID 1 exists
      subjects: ['数学', '物理'],
      title: '高级教师'
    };

    const response = await axios.put(
      `${API_BASE_URL}/users/profile/teacher`,
      updateData,
      { headers: { Authorization: `Bearer ${teacherToken}` } }
    );

    if (response.data.message !== '教师信息更新成功') {
      throw new Error('Update should return success message');
    }

    const { user } = response.data;

    if (!Array.isArray(user.subjects) || user.subjects.length !== 2) {
      throw new Error(`subjects not updated correctly: expected array of 2, got ${JSON.stringify(user.subjects)}`);
    }
    if (user.title !== updateData.title) {
      throw new Error(`title not updated: expected ${updateData.title}, got ${user.title}`);
    }
    if (user.school) {
      log(`  ✓ School updated: ${user.school}`, 'gray');
    }
    log(`  ✓ Updated: subjects, title, school`, 'gray');
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC3.3: Should reject invalid subjects (not array)', async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/users/profile/teacher`,
        { subjects: 'Math' },  // Should be array
        { headers: { Authorization: `Bearer ${teacherToken}` } }
      );
      throw new Error('Should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log(`  ✓ Correctly rejected invalid subjects format`, 'gray');
        return;
      }
      throw error;
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  if (await test('TC3.4: Should reject student using teacher endpoint', async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/users/profile/teacher`,
        { realName: 'Test' },
        { headers: { Authorization: `Bearer ${studentToken}` } }  // Student token
      );
      throw new Error('Should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        log(`  ✓ Correctly rejected student access`, 'gray');
        return;
      }
      throw error;
    }
  })) {
    passed++;
  } else {
    failed++;
  }

  // Restore original teacher profile
  if (originalTeacherProfile && await test('TC3.5: Restore original teacher profile', async () => {
    const restoreData = {
      realName: originalTeacherProfile.realName,
      phone: originalTeacherProfile.phone,
      email: originalTeacherProfile.email,
      schoolId: originalTeacherProfile.schoolId,
      subjects: originalTeacherProfile.subjects,
      title: originalTeacherProfile.title
    };

    await axios.put(
      `${API_BASE_URL}/users/profile/teacher`,
      restoreData,
      { headers: { Authorization: `Bearer ${teacherToken}` } }
    );

    log(`  ✓ Original profile restored`, 'gray');
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
    log('✓ Profile editing verified successfully for students and teachers', 'green');
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
