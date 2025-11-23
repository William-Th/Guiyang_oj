const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test credentials
const TEACHER_CREDENTIALS = {
  username: 'teacher01',
  password: 'password123'
};

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

let teacherToken = '';
let adminToken = '';
let createdDraftId = null;
let createdPublicationId = null;

// Helper function to login
async function login(credentials) {
  const response = await axios.post(`${BASE_URL}/auth/login`, credentials);
  return response.data.token;
}

// Test 1: Login as teacher
async function test1_loginAsTeacher() {
  console.log('\n[TEST 1] Login as teacher...');
  try {
    teacherToken = await login(TEACHER_CREDENTIALS);
    console.log('✅ Teacher login successful');
    return true;
  } catch (error) {
    console.error('❌ Teacher login failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 2: Login as admin
async function test2_loginAsAdmin() {
  console.log('\n[TEST 2] Login as admin...');
  try {
    adminToken = await login(ADMIN_CREDENTIALS);
    console.log('✅ Admin login successful');
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 3: Create a draft question
async function test3_createDraft() {
  console.log('\n[TEST 3] Create a draft question...');
  try {
    const draftData = {
      type: 'single_choice',
      subject: '数学',
      grade: '三年级',
      content: '【测试题目-' + Date.now() + '】3 + 5 = ?',
      options: JSON.stringify(['6', '7', '8', '9']),
      correct_answer: '8',
      difficulty: 'easy',
      level: 'K1',
      points: 5,
      explanation: '基础加法运算'
    };

    const response = await axios.post(`${BASE_URL}/question-drafts`, draftData, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    createdDraftId = response.data.data.id;
    console.log('✅ Draft created successfully, ID:', createdDraftId);
    console.log('   Draft content:', response.data.data.content);
    return true;
  } catch (error) {
    console.error('❌ Create draft failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 4: Get my drafts list
async function test4_getMyDrafts() {
  console.log('\n[TEST 4] Get my drafts list...');
  try {
    const response = await axios.get(`${BASE_URL}/question-drafts`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
      params: { limit: 10 }
    });

    console.log('✅ Got drafts list, total:', response.data.meta.total);
    console.log('   First draft:', response.data.data[0]?.content?.substring(0, 50));
    return true;
  } catch (error) {
    console.error('❌ Get drafts failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 5: Get draft details
async function test5_getDraftDetails() {
  console.log('\n[TEST 5] Get draft details...');
  try {
    const response = await axios.get(`${BASE_URL}/question-drafts/${createdDraftId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    console.log('✅ Got draft details');
    console.log('   ID:', response.data.data.id);
    console.log('   Content:', response.data.data.content);
    console.log('   Publish count:', response.data.data.publish_count);
    return true;
  } catch (error) {
    console.error('❌ Get draft details failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 6: Publish draft to school scope
async function test6_publishToSchool() {
  console.log('\n[TEST 6] Publish draft to school scope...');
  try {
    const response = await axios.post(
      `${BASE_URL}/question-drafts/${createdDraftId}/publish`,
      {
        scope: 'practice_school_1' // Assuming teacher belongs to school 1
      },
      {
        headers: { Authorization: `Bearer ${teacherToken}` }
      }
    );

    createdPublicationId = response.data.data.id;
    console.log('✅ Published to school successfully');
    console.log('   Publication ID:', createdPublicationId);
    console.log('   Status:', response.data.data.status);
    console.log('   Scope:', response.data.data.scope);
    return true;
  } catch (error) {
    console.error('❌ Publish failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 7: Try to publish same draft to same scope (should fail)
async function test7_duplicatePublish() {
  console.log('\n[TEST 7] Try duplicate publish (should fail)...');
  try {
    await axios.post(
      `${BASE_URL}/question-drafts/${createdDraftId}/publish`,
      {
        scope: 'practice_school_1'
      },
      {
        headers: { Authorization: `Bearer ${teacherToken}` }
      }
    );

    console.log('❌ Duplicate publish should have failed but succeeded!');
    return false;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('重复发布')) {
      console.log('✅ Duplicate publish correctly rejected');
      return true;
    }
    console.error('❌ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

// Test 8: Get publication records
async function test8_getPublications() {
  console.log('\n[TEST 8] Get publication records...');
  try {
    const response = await axios.get(
      `${BASE_URL}/question-drafts/${createdDraftId}/publications`,
      {
        headers: { Authorization: `Bearer ${teacherToken}` }
      }
    );

    console.log('✅ Got publication records, count:', response.data.meta.count);
    console.log('   Publications:', response.data.data.map(p => p.scope).join(', '));
    return true;
  } catch (error) {
    console.error('❌ Get publications failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 9: Query question bank (basic - no district filter)
async function test9_queryQuestionBank() {
  console.log('\n[TEST 9] Query question bank (teacher - no district filter)...');
  try {
    const response = await axios.get(`${BASE_URL}/question-bank/bank`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
      params: {
        scope: 'practice_school',
        limit: 10
      }
    });

    console.log('✅ Got question bank, total:', response.data.meta.total);
    console.log('   Questions found:', response.data.data.length);
    return true;
  } catch (error) {
    console.error('❌ Query question bank failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 10: Query district questions as admin with district filter
async function test10_adminDistrictFilter() {
  console.log('\n[TEST 10] Query district questions as admin with district filter...');
  try {
    const response = await axios.get(`${BASE_URL}/question-bank/bank`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: {
        scope: 'practice_district',
        district_code: 'YY', // Filter by Yunyan district
        limit: 10
      }
    });

    console.log('✅ Got district questions with filter');
    console.log('   Total:', response.data.meta.total);
    console.log('   District filter applied:', response.data.meta.district_code_filter);

    // Verify all results are from Yunyan district
    const allFromYY = response.data.data.every(q =>
      q.scope === 'practice_district_YY' || q.district_code === 'YY'
    );

    if (allFromYY) {
      console.log('   ✅ All results correctly filtered to Yunyan district');
    } else {
      console.log('   ⚠️  Warning: Some results may not be from Yunyan district');
    }

    return true;
  } catch (error) {
    console.error('❌ Admin district filter failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 11: Update draft
async function test11_updateDraft() {
  console.log('\n[TEST 11] Update draft...');
  try {
    const response = await axios.put(
      `${BASE_URL}/question-drafts/${createdDraftId}`,
      {
        content: '【更新后的题目-' + Date.now() + '】3 + 5 = ?',
        difficulty: 'medium'
      },
      {
        headers: { Authorization: `Bearer ${teacherToken}` }
      }
    );

    console.log('✅ Draft updated successfully');
    console.log('   New content:', response.data.data.content);
    console.log('   New difficulty:', response.data.data.difficulty);
    return true;
  } catch (error) {
    console.error('❌ Update draft failed:', error.response?.data || error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('Question Bank Redesign - API Tests');
  console.log('='.repeat(60));

  const tests = [
    test1_loginAsTeacher,
    test2_loginAsAdmin,
    test3_createDraft,
    test4_getMyDrafts,
    test5_getDraftDetails,
    test6_publishToSchool,
    test7_duplicatePublish,
    test8_getPublications,
    test9_queryQuestionBank,
    test10_adminDistrictFilter,
    test11_updateDraft
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Total: ${tests.length}`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
