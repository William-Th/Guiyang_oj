/**
 * Statistics API Test
 *
 * Tests the statistics APIs for student, teacher, and admin analytics
 */

const axios = require('axios');

// Disable proxy for localhost
const axiosInstance = axios.create({
  proxy: false
});

const BASE_URL = 'http://localhost:3001';

// Test credentials
const CREDENTIALS = {
  student: { username: '13800138003', password: 'password123' },
  teacher: { username: 'teacher01', password: 'password123' },
  admin: { username: 'admin', password: 'password123' }
};

let tokens = {};

/**
 * Login and get authentication token
 */
async function login(role) {
  try {
    const response = await axiosInstance.post(`${BASE_URL}/api/auth/login`, CREDENTIALS[role]);

    if (response.data.token) {
      console.log(`✓ ${role} login successful`);
      return response.data.token;
    } else {
      throw new Error(`Login failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error(`✗ ${role} login failed:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Test student overview statistics
 */
async function testStudentOverview() {
  console.log('\n--- Testing Student Overview API ---');

  try {
    const response = await axiosInstance.get(`${BASE_URL}/api/statistics/student/overview`, {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });

    if (response.data.success) {
      const data = response.data.data;
      console.log(`✓ Student overview retrieved successfully`);
      console.log(`  - Total Activities: ${data.total_activities}`);
      console.log(`  - Total Questions: ${data.total_questions}`);
      console.log(`  - Overall Accuracy: ${data.overall_accuracy}%`);
      console.log(`  - Average Score: ${data.avg_score}`);
      return true;
    } else {
      console.error(`✗ Student overview failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Student overview error:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Test student ability statistics
 */
async function testStudentAbilities() {
  console.log('\n--- Testing Student Abilities API ---');

  try {
    const response = await axiosInstance.get(`${BASE_URL}/api/statistics/student/abilities`, {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });

    if (response.data.success) {
      const abilities = response.data.data;
      console.log(`✓ Student abilities retrieved: ${abilities.length} records`);

      if (abilities.length > 0) {
        console.log(`  Sample: ${abilities[0].ability} (${abilities[0].subject}) - ${abilities[0].accuracy_rate}%`);

        // Test filtering by subject
        const mathResponse = await axiosInstance.get(`${BASE_URL}/api/statistics/student/abilities?subject=数学`, {
          headers: { Authorization: `Bearer ${tokens.student}` }
        });

        if (mathResponse.data.success) {
          console.log(`  ✓ Math filter works: ${mathResponse.data.data.length} math abilities`);
        }
      }
      return true;
    } else {
      console.error(`✗ Student abilities failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Student abilities error:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Test student knowledge point statistics
 */
async function testStudentKnowledgePoints() {
  console.log('\n--- Testing Student Knowledge Points API ---');

  try {
    const response = await axiosInstance.get(`${BASE_URL}/api/statistics/student/knowledge-points`, {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });

    if (response.data.success) {
      const points = response.data.data;
      console.log(`✓ Student knowledge points retrieved: ${points.length} records`);

      if (points.length > 0) {
        console.log(`  Sample: ${points[0].knowledge_point} (${points[0].subject}) - ${points[0].accuracy_rate}%`);
      }
      return true;
    } else {
      console.error(`✗ Student knowledge points failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Student knowledge points error:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Test school-level ability statistics (teacher view)
 */
async function testSchoolAbilities() {
  console.log('\n--- Testing School Abilities API (Teacher) ---');

  try {
    const response = await axiosInstance.get(`${BASE_URL}/api/statistics/teacher/school-abilities`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` }
    });

    if (response.data.success) {
      const abilities = response.data.data;
      console.log(`✓ School abilities retrieved: ${abilities.length} records`);

      if (abilities.length > 0) {
        console.log(`  Sample: ${abilities[0].ability} (${abilities[0].subject})`);
        console.log(`    - Total Students: ${abilities[0].total_students}`);
        console.log(`    - Avg Accuracy: ${abilities[0].avg_accuracy_rate}%`);
      }
      return true;
    } else {
      console.error(`✗ School abilities failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ School abilities error:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Test district-level ability statistics (admin view)
 */
async function testDistrictAbilities() {
  console.log('\n--- Testing District Abilities API (Admin) ---');

  try {
    const response = await axiosInstance.get(`${BASE_URL}/api/statistics/teacher/district-abilities`, {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });

    if (response.data.success) {
      const abilities = response.data.data;
      console.log(`✓ District abilities retrieved: ${abilities.length} records`);

      if (abilities.length > 0) {
        console.log(`  Sample: ${abilities[0].ability} (${abilities[0].subject})`);
        console.log(`    - Total Schools: ${abilities[0].total_schools}`);
        console.log(`    - Total Students: ${abilities[0].total_students}`);
        console.log(`    - Avg Accuracy: ${abilities[0].avg_accuracy_rate}%`);
      }
      return true;
    } else {
      console.error(`✗ District abilities failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ District abilities error:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('STATISTICS API TEST SUITE');
  console.log('='.repeat(60));

  try {
    // Login all roles
    console.log('\n--- Authentication ---');
    tokens.student = await login('student');
    tokens.teacher = await login('teacher');
    tokens.admin = await login('admin');

    // Run tests
    const results = [];

    results.push(await testStudentOverview());
    results.push(await testStudentAbilities());
    results.push(await testStudentKnowledgePoints());
    results.push(await testSchoolAbilities());
    results.push(await testDistrictAbilities());

    // Summary
    console.log('\n' + '='.repeat(60));
    const passed = results.filter(r => r).length;
    const total = results.length;
    console.log(`TEST SUMMARY: ${passed}/${total} tests passed`);
    console.log('='.repeat(60));

    if (passed === total) {
      console.log('✓ All tests passed!');
      process.exit(0);
    } else {
      console.log('✗ Some tests failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n✗ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
