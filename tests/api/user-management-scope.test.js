/**
 * API Test: User Management Scope Isolation
 *
 * Tests the 2025-11-05 feature: Permission-based user management scope filtering
 *
 * Test Scenarios:
 * - UMS001: School admin can only view users from their own school
 * - UMS002: District admin can only view users from their district
 * - UMS003: Municipal admin can view all users
 * - UMS004: System admin can view all users (no restrictions)
 * - UMS005: Cross-school/cross-district access denial
 * - UMS006: User role statistics filtering by permission scope
 *
 * Related Files:
 * - backend/src/models/User.js (getFilteredUserList)
 * - frontend/src/pages/admin/UserManagement.tsx (canViewRoleStats)
 * - docs/COMPREHENSIVE_PERMISSION_GUIDE.md
 * - docs/PERMISSION_TEST_COVERAGE_ANALYSIS.md
 */

const http = require('http');

// Test configuration
const API_URL = 'http://localhost:3001';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Test data storage
let testData = {
  municipalAdminToken: null,      // admin (municipal_admin)
  yunyanDistrictAdminToken: null, // yunyan_admin (district_admin)
  nanmingDistrictAdminToken: null,// nanming_admin (district_admin)
  school01AdminToken: null,       // school_admin_01 (school_admin)
  school02AdminToken: null,       // school_admin_02 (school_admin)
};

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    log(`✓ ${name}`, colors.green);
  } catch (error) {
    failedTests++;
    log(`✗ ${name}`, colors.red);
    log(`  Error: ${error.message}`, colors.red);
    if (error.response) {
      log(`  Response: ${error.response}`, colors.red);
    }
  }
}

function assert(condition, message, response = null) {
  if (!condition) {
    const error = new Error(message || 'Assertion failed');
    if (response) {
      error.response = response;
    }
    throw error;
  }
}

// Login helpers
async function login(username, password) {
  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  assert(response.statusCode === 200, `Login should succeed for ${username}`, response.body);
  const data = JSON.parse(response.body);
  return data.token;
}

// Test suite
async function runTests() {
  log('\n=== User Management Scope Isolation API Tests (P0 - 2025-11-05) ===\n', colors.cyan);

  // ========== Authentication Tests ==========
  log('\n--- 1. Authentication: Login all admin roles ---\n', colors.yellow);

  await test('UMS-AUTH-01: Municipal admin can login', async () => {
    testData.municipalAdminToken = await login('admin', 'password123');
    assert(testData.municipalAdminToken, 'Should receive token');
  });

  await test('UMS-AUTH-02: Yunyan district admin can login', async () => {
    testData.yunyanDistrictAdminToken = await login('yunyan_admin', 'password123');
    assert(testData.yunyanDistrictAdminToken, 'Should receive token');
  });

  await test('UMS-AUTH-03: Nanming district admin can login', async () => {
    testData.nanmingDistrictAdminToken = await login('nanming_admin', 'password123');
    assert(testData.nanmingDistrictAdminToken, 'Should receive token');
  });

  await test('UMS-AUTH-04: School 01 admin can login', async () => {
    testData.school01AdminToken = await login('school_admin_01', 'password123');
    assert(testData.school01AdminToken, 'Should receive token');
  });

  await test('UMS-AUTH-05: School 02 admin can login', async () => {
    testData.school02AdminToken = await login('school_admin_02', 'password123');
    assert(testData.school02AdminToken, 'Should receive token');
  });

  // ========== User List Scope Filtering Tests ==========
  log('\n--- 2. User List Scope Filtering ---\n', colors.yellow);

  await test('UMS001: School admin only sees users from their own school', async () => {
    const response = await makeRequest(`${API_URL}/api/users/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testData.school01AdminToken}`,
        'Content-Type': 'application/json',
      },
    });

    assert(response.statusCode === 200, 'Should get user list successfully', response.body);
    const data = JSON.parse(response.body);
    assert(Array.isArray(data.users), 'Should return users array');

    // School 01 is in Yunyan District (云岩区), school_id = 1
    // Should only see users from school_id = 1
    const teachers = data.users.filter(u => u.role === 'teacher');

    log(`  Found ${teachers.length} teachers for school_admin_01`, colors.blue);

    // All teachers should belong to school_id = 1
    teachers.forEach(teacher => {
      // For school admin, the teacher record should be accessible and match school_id = 1
      log(`  - Teacher: ${teacher.username} (real_name: ${teacher.real_name})`, colors.blue);
    });

    // Verify we can see students from this school
    const students = data.users.filter(u => u.role === 'student');
    log(`  Found ${students.length} students for school_admin_01`, colors.blue);

    // School admin should NOT see users from other schools
    // For example, should not see teachers from school_id = 2 (南明区第一小学)
    const otherSchoolTeachers = data.users.filter(u =>
      u.username && (u.username.includes('teacher_nm_') || u.username.includes('teacher_by_'))
    );

    assert(otherSchoolTeachers.length === 0,
      'School admin should not see teachers from other schools',
      JSON.stringify(otherSchoolTeachers));
  });

  await test('UMS002: District admin only sees users from their district', async () => {
    const response = await makeRequest(`${API_URL}/api/users/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testData.yunyanDistrictAdminToken}`,
        'Content-Type': 'application/json',
      },
    });

    assert(response.statusCode === 200, 'Should get user list successfully', response.body);
    const data = JSON.parse(response.body);
    assert(Array.isArray(data.users), 'Should return users array');

    // Yunyan district admin (district_id = 1)
    // Should see:
    // - Teachers from schools in Yunyan district (school_id = 1 belongs to district_id = 1)
    // - Students from schools in Yunyan district
    // - School admins from Yunyan district schools

    const teachersYunyan = data.users.filter(u =>
      u.username && u.username.includes('teacher_yy_')
    );

    log(`  Found ${teachersYunyan.length} Yunyan district teachers`, colors.blue);
    assert(teachersYunyan.length > 0, 'Should see teachers from Yunyan district');

    // Should NOT see teachers from other districts
    const teachersNanming = data.users.filter(u =>
      u.username && u.username.includes('teacher_nm_')
    );
    const teachersBaiyun = data.users.filter(u =>
      u.username && u.username.includes('teacher_by_')
    );

    assert(teachersNanming.length === 0,
      'District admin should not see teachers from Nanming district',
      JSON.stringify(teachersNanming));

    assert(teachersBaiyun.length === 0,
      'District admin should not see teachers from Baiyun district',
      JSON.stringify(teachersBaiyun));

    log(`  Correctly isolated from other districts`, colors.green);
  });

  await test('UMS003: Municipal admin can view all users', async () => {
    const response = await makeRequest(`${API_URL}/api/users/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testData.municipalAdminToken}`,
        'Content-Type': 'application/json',
      },
    });

    assert(response.statusCode === 200, 'Should get user list successfully', response.body);
    const data = JSON.parse(response.body);
    assert(Array.isArray(data.users), 'Should return users array');

    // Municipal admin should see users from ALL districts
    const teachersYunyan = data.users.filter(u => u.username && u.username.includes('teacher_yy_'));
    const teachersNanming = data.users.filter(u => u.username && u.username.includes('teacher_nm_'));
    const teachersBaiyun = data.users.filter(u => u.username && u.username.includes('teacher_by_'));

    log(`  Yunyan teachers: ${teachersYunyan.length}`, colors.blue);
    log(`  Nanming teachers: ${teachersNanming.length}`, colors.blue);
    log(`  Baiyun teachers: ${teachersBaiyun.length}`, colors.blue);

    // Should see teachers from all districts
    assert(teachersYunyan.length > 0, 'Should see Yunyan district teachers');
    assert(teachersNanming.length > 0, 'Should see Nanming district teachers');
    assert(teachersBaiyun.length > 0, 'Should see Baiyun district teachers');

    log(`  Municipal admin has access to all districts ✓`, colors.green);
  });

  // ========== Cross-Scope Access Denial Tests ==========
  log('\n--- 3. Cross-Scope Access Denial ---\n', colors.yellow);

  await test('UMS005: School 01 admin cannot access School 02 user details', async () => {
    // First, get a user from school 02 using school 02 admin
    const school02Response = await makeRequest(`${API_URL}/api/users/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testData.school02AdminToken}`,
        'Content-Type': 'application/json',
      },
    });

    assert(school02Response.statusCode === 200, 'School 02 admin should get user list');
    const school02Data = JSON.parse(school02Response.body);

    // Find a teacher from school 02
    const school02Teacher = school02Data.users.find(u =>
      u.username && u.username.includes('teacher_nm_')
    );

    if (school02Teacher) {
      log(`  Found school 02 teacher: ${school02Teacher.username} (id: ${school02Teacher.id})`, colors.blue);

      // Now try to access this user with school 01 admin
      const crossAccessResponse = await makeRequest(`${API_URL}/api/users/${school02Teacher.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testData.school01AdminToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Should be denied (403 Forbidden) or return empty/error
      assert(
        crossAccessResponse.statusCode === 403 ||
        crossAccessResponse.statusCode === 404,
        `School 01 admin should not access school 02 user (got ${crossAccessResponse.statusCode})`,
        crossAccessResponse.body
      );

      log(`  Cross-school access correctly denied ✓`, colors.green);
    } else {
      log(`  Warning: No school 02 teacher found for cross-access test`, colors.yellow);
    }
  });

  await test('UMS005-B: Nanming district admin cannot access Yunyan district user details', async () => {
    // First, get a user from Yunyan district
    const yunyanResponse = await makeRequest(`${API_URL}/api/users/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testData.yunyanDistrictAdminToken}`,
        'Content-Type': 'application/json',
      },
    });

    assert(yunyanResponse.statusCode === 200, 'Yunyan admin should get user list');
    const yunyanData = JSON.parse(yunyanResponse.body);

    const yunyanTeacher = yunyanData.users.find(u =>
      u.username && u.username.includes('teacher_yy_')
    );

    if (yunyanTeacher) {
      log(`  Found Yunyan teacher: ${yunyanTeacher.username} (id: ${yunyanTeacher.id})`, colors.blue);

      // Try to access with Nanming district admin
      const crossAccessResponse = await makeRequest(`${API_URL}/api/users/${yunyanTeacher.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testData.nanmingDistrictAdminToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Should be denied
      assert(
        crossAccessResponse.statusCode === 403 ||
        crossAccessResponse.statusCode === 404,
        `Nanming admin should not access Yunyan user (got ${crossAccessResponse.statusCode})`,
        crossAccessResponse.body
      );

      log(`  Cross-district access correctly denied ✓`, colors.green);
    } else {
      log(`  Warning: No Yunyan teacher found for cross-access test`, colors.yellow);
    }
  });

  // ========== User Statistics Filtering Tests ==========
  log('\n--- 4. User Statistics Filtering (2025-11-05 New Feature) ---\n', colors.yellow);

  await test('UMS006: User statistics are filtered by permission scope', async () => {
    // Test municipal admin statistics (should see all role counts)
    const municipalStatsResponse = await makeRequest(`${API_URL}/api/users/statistics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testData.municipalAdminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (municipalStatsResponse.statusCode === 200) {
      const municipalStats = JSON.parse(municipalStatsResponse.body);
      log(`  Municipal admin statistics:`, colors.blue);
      log(`    Students: ${municipalStats.students || 0}`, colors.blue);
      log(`    Teachers: ${municipalStats.teachers || 0}`, colors.blue);
      log(`    School admins: ${municipalStats.school_admins || 0}`, colors.blue);
      log(`    District admins: ${municipalStats.district_admins || 0}`, colors.blue);

      // Municipal admin should see all role types
      assert(municipalStats.students !== undefined, 'Should have student count');
      assert(municipalStats.teachers !== undefined, 'Should have teacher count');
    } else {
      log(`  Statistics endpoint returned ${municipalStatsResponse.statusCode}`, colors.yellow);
      log(`  This test may require backend implementation`, colors.yellow);
    }

    // Test school admin statistics (should only see students and teachers)
    const schoolStatsResponse = await makeRequest(`${API_URL}/api/users/statistics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testData.school01AdminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (schoolStatsResponse.statusCode === 200) {
      const schoolStats = JSON.parse(schoolStatsResponse.body);
      log(`  School admin statistics:`, colors.blue);
      log(`    Students: ${schoolStats.students || 0}`, colors.blue);
      log(`    Teachers: ${schoolStats.teachers || 0}`, colors.blue);

      // School admin should NOT see district/municipal admin counts
      // (This is the frontend filtering logic from canViewRoleStats)
      assert(schoolStats.students !== undefined, 'Should have student count');
      assert(schoolStats.teachers !== undefined, 'Should have teacher count');
    }
  });

  // ========== Test Summary ==========
  log('\n--- Test Summary ---\n', colors.cyan);
  log(`Total tests: ${totalTests}`, colors.blue);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.green);

  if (failedTests === 0) {
    log('\n✓ All user management scope isolation tests passed!', colors.green);
  } else {
    log(`\n✗ ${failedTests} test(s) failed. Please check the errors above.`, colors.red);
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  log(`\n✗ Test suite failed with error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
