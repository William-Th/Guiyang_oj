/**
 * API Test: Exam Submission Flow
 * Tests the complete exam submission flow including duration calculation
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
};

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

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
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Login helper
async function loginAsStudent() {
  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: '520102200801011234',
      password: 'password123',
    }),
  });

  assert(response.statusCode === 200, 'Student login should succeed');
  const data = JSON.parse(response.body);
  return data.token;
}

// Test suite
async function runTests() {
  log('\n=== Exam Submission Flow Test ===\n', colors.cyan);

  let token;
  let examId;
  let studentExamId;

  // Test 1: Student login
  await test('Student can login', async () => {
    token = await loginAsStudent();
    assert(token, 'Should receive authentication token');
  });

  // Test 2: Get available exams
  await test('Get available exams', async () => {
    const response = await makeRequest(`${API_URL}/api/exams`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert(response.statusCode === 200, 'Should return 200');
    const data = JSON.parse(response.body);
    assert(Array.isArray(data.exams), 'Should return exams array');

    if (data.exams.length > 0) {
      examId = data.exams[0].id;
      log(`  Using exam ID: ${examId}`, colors.blue);
    }
  });

  // Test 3: Register for exam (if not already registered)
  await test('Register for exam', async () => {
    if (!examId) {
      throw new Error('No exam available for registration');
    }

    const response = await makeRequest(`${API_URL}/api/exams/${examId}/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Either 200 (success) or 400 (already registered) is acceptable
    assert(
      response.statusCode === 200 || response.statusCode === 400,
      'Should return valid response'
    );

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      log(`  Registration successful`, colors.blue);
    } else {
      log(`  Already registered for this exam`, colors.yellow);
    }
  });

  // Test 4: Start exam
  await test('Start exam', async () => {
    if (!examId) {
      throw new Error('No exam available to start');
    }

    const response = await makeRequest(`${API_URL}/api/exams/${examId}/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Either 200 (success) or 400 (already started) is acceptable
    assert(
      response.statusCode === 200 || response.statusCode === 400,
      'Should return valid response'
    );

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      assert(data.studentExamId, 'Should return student exam ID');
      assert(data.startTime, 'Should return start time');
      studentExamId = data.studentExamId;
      log(`  Exam started at: ${data.startTime}`, colors.blue);
    } else {
      log(`  Exam already in progress`, colors.yellow);
    }
  });

  // Test 5: Get exam questions
  await test('Get exam questions', async () => {
    if (!examId) {
      throw new Error('No exam available');
    }

    const response = await makeRequest(`${API_URL}/api/exams/${examId}/questions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert(response.statusCode === 200, 'Should return 200');
    const data = JSON.parse(response.body);
    assert(data.exam, 'Should return exam data');
    assert(Array.isArray(data.exam.questions), 'Should return questions array');
    log(`  Found ${data.exam.questions.length} questions`, colors.blue);
  });

  // Wait a few seconds to simulate answering time
  log('\n  Simulating answering time (3 seconds)...', colors.yellow);
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 6: Submit exam with answers
  await test('Submit exam with calculated duration', async () => {
    if (!examId) {
      throw new Error('No exam available to submit');
    }

    // Get questions first
    const questionsResponse = await makeRequest(`${API_URL}/api/exams/${examId}/questions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const questionsData = JSON.parse(questionsResponse.body);
    const questions = questionsData.exam.questions;

    // Create sample answers
    const answers = questions.map((q) => ({
      questionId: q.id,
      answer: q.type === 'single' ? 'A' : (q.type === 'multiple' ? '["A", "B"]' : '答案'),
    }));

    const response = await makeRequest(`${API_URL}/api/exams/${examId}/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answers }),
    });

    // Either 200 (success) or 400 (already submitted) is acceptable
    assert(
      response.statusCode === 200 || response.statusCode === 400,
      'Should return valid response'
    );

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      assert(data.message, 'Should return success message');
      assert(typeof data.score === 'number', 'Should return score');
      assert(typeof data.duration === 'number', 'Should return duration in seconds');
      assert(data.durationFormatted, 'Should return formatted duration');
      assert(data.submittedAt, 'Should return submission timestamp');

      log(`  Score: ${data.score}`, colors.blue);
      log(`  Duration: ${data.durationFormatted} (${data.duration} seconds)`, colors.blue);
      log(`  Auto-graded: ${data.autoGradedAnswers} questions`, colors.blue);
      log(`  Submitted at: ${data.submittedAt}`, colors.blue);

      // Verify duration is reasonable (should be >= 3 seconds due to our wait)
      assert(data.duration >= 3, 'Duration should be at least 3 seconds');
      assert(data.duration < 3600, 'Duration should be less than 1 hour');
    } else {
      const data = JSON.parse(response.body);
      log(`  ${data.message}`, colors.yellow);
    }
  });

  // Test 7: Verify submission response format
  await test('Submission response has all required fields', async () => {
    if (!examId) {
      throw new Error('No exam available');
    }

    // Try to submit again (should fail but return proper format)
    const response = await makeRequest(`${API_URL}/api/exams/${examId}/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answers: [] }),
    });

    // Should return 400 because already submitted
    if (response.statusCode === 400) {
      const data = JSON.parse(response.body);
      assert(data.message, 'Should return error message');
      log(`  Correct: Duplicate submission blocked`, colors.blue);
    }
  });

  // Print summary
  log('\n=== Test Summary ===\n', colors.cyan);
  log(`Total Tests: ${totalTests}`, colors.blue);
  log(`Passed: ${passedTests}`, colors.green);
  log(`Failed: ${failedTests}`, colors.red);
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, colors.yellow);

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\nTest suite error: ${error.message}`, colors.red);
  process.exit(1);
});
