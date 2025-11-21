/**
 * Grading Management API Tests
 * 评卷管理系统API测试
 *
 * 测试范围:
 * - GET /teacher/grading/pending - 获取待评卷列表
 * - GET /teacher/grading/student-activity/:id - 获取评卷详情
 * - PUT /teacher/grading/answers/:id - 单题评分
 * - PUT /teacher/grading/batch - 批量评分
 * - POST /teacher/grading/student-activity/:id/complete - 完成评卷
 * - GET /teacher/grading/stats/:activityId - 评卷统计
 */

const axios = require('axios');

// 禁用代理
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;

// 测试配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const TEST_CONFIG = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  proxy: false // 禁用axios代理
};

// 测试用户凭证
const TEACHER_CREDENTIALS = {
  username: 'teacher01',
  password: 'password123'
};

const STUDENT_CREDENTIALS = {
  username: '13800138003', // 学生使用手机号作为用户名
  password: 'password123'
};

// 全局变量
let teacherToken = null;
let studentToken = null;
let testActivityId = null;
let testStudentActivityId = null;
let testAnswerIds = [];
let testQuestionIds = [];

/**
 * 辅助函数：登录并获取token
 */
async function login(credentials) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials, TEST_CONFIG);

    if (response.data.token) {
      return {
        token: response.data.token,
        user: response.data.user
      };
    }
    throw new Error('Login failed: No token received');
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
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
 * 辅助函数：创建测试活动
 */
async function createTestActivity() {
  try {
    // 获取题库中的题目
    const questionsResponse = await axios.get(
      `${API_BASE_URL}/question-bank`,
      authConfig(teacherToken)
    );

    const questions = questionsResponse.data.questions;
    if (!questions || questions.length < 3) {
      throw new Error('题库中题目不足，至少需要3道题');
    }

    // 选择2道客观题和1道主观题
    const objectiveQuestions = questions.filter(q =>
      ['single', 'multiple', 'true_false'].includes(q.type)
    ).slice(0, 2);

    const subjectiveQuestions = questions.filter(q =>
      ['short_answer', 'essay'].includes(q.type)
    ).slice(0, 1);

    const selectedQuestions = [...objectiveQuestions, ...subjectiveQuestions];
    testQuestionIds = selectedQuestions.map(q => q.id);

    // 创建活动
    const totalScore = 30 + 30 + 40; // 100分
    const activityData = {
      title: `【API测试】评卷功能测试活动-${Date.now()}`,
      subject: '数学',
      grade: '三年级',
      abilityLevel: 'beginner',
      duration: null,
      totalScore: totalScore,
      passScore: 60,
      allowRetake: true,
      maxAttempts: 3,
      timeLimitType: 'scheduled',
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      questions: selectedQuestions.map((q, index) => ({
        questionId: q.id,
        score: index === 2 ? 40 : 30, // 主观题40分，客观题各30分
        orderIndex: index + 1
      }))
    };

    const response = await axios.post(
      `${API_BASE_URL}/activities/practice`,
      activityData,
      authConfig(teacherToken)
    );

    if (response.data.success && response.data.activity) {
      testActivityId = response.data.activity.id;
      console.log(`✅ 测试活动创建成功 (ID: ${testActivityId})`);
      return testActivityId;
    }
    throw new Error('创建测试活动失败');
  } catch (error) {
    console.error('创建测试活动错误:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 辅助函数：学生提交答题
 */
async function submitStudentAnswers() {
  try {
    // 学生注册活动
    const registerResponse = await axios.post(
      `${API_BASE_URL}/student-activities/register/${testActivityId}`,
      {},
      authConfig(studentToken)
    );

    if (!registerResponse.data.success) {
      throw new Error('学生注册活动失败');
    }

    testStudentActivityId = registerResponse.data.studentActivity.id;
    console.log(`✅ 学生注册活动成功 (ID: ${testStudentActivityId})`);

    // 获取活动题目
    const activityResponse = await axios.get(
      `${API_BASE_URL}/student-activities/${testStudentActivityId}`,
      authConfig(studentToken)
    );

    const questions = activityResponse.data.questions;

    // 提交答案
    const answers = questions.map((q, index) => {
      if (q.type === 'single') {
        return { questionId: q.id, answer: 'A' };
      } else if (q.type === 'multiple') {
        return { questionId: q.id, answer: ['A', 'B'] };
      } else if (q.type === 'true_false') {
        return { questionId: q.id, answer: 'true' };
      } else if (q.type === 'short_answer' || q.type === 'essay') {
        return { questionId: q.id, answer: '这是一个测试答案。学生的主观题回答内容。' };
      }
      return { questionId: q.id, answer: '测试答案' };
    });

    const submitResponse = await axios.post(
      `${API_BASE_URL}/student-activities/${testStudentActivityId}/submit`,
      { answers },
      authConfig(studentToken)
    );

    if (submitResponse.data.success) {
      console.log('✅ 学生提交答案成功');

      // 获取答案ID
      const detailResponse = await axios.get(
        `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}`,
        authConfig(teacherToken)
      );

      testAnswerIds = detailResponse.data.answers.map(a => a.id);
      console.log(`✅ 获取答案ID成功 (共${testAnswerIds.length}个答案)`);

      return testStudentActivityId;
    }
    throw new Error('提交答案失败');
  } catch (error) {
    console.error('提交答案错误:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 测试1：教师登录
 */
async function test01_TeacherLogin() {
  console.log('\n=== 测试1: 教师登录 ===');

  try {
    const result = await login(TEACHER_CREDENTIALS);
    teacherToken = result.token;
    console.log('✅ 教师登录成功');
    console.log(`   Token: ${teacherToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('❌ 教师登录失败:', error.message);
    return false;
  }
}

/**
 * 测试2：学生登录
 */
async function test02_StudentLogin() {
  console.log('\n=== 测试2: 学生登录 ===');

  try {
    const result = await login(STUDENT_CREDENTIALS);
    studentToken = result.token;
    console.log('✅ 学生登录成功');
    console.log(`   Token: ${studentToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('❌ 学生登录失败:', error.message);
    return false;
  }
}

/**
 * 测试3：准备测试数据（使用现有数据）
 */
async function test03_PrepareTestData() {
  console.log('\n=== 测试3: 准备测试数据 ===');

  try {
    // 获取已有的待评卷数据
    const response = await axios.get(
      `${API_BASE_URL}/teacher/grading/pending`,
      authConfig(teacherToken)
    );

    if (response.data.submissions && response.data.submissions.length > 0) {
      const submission = response.data.submissions[0];
      testStudentActivityId = submission.student_activity_id;
      testActivityId = submission.activity_id;

      console.log(`✅ 使用现有测试数据`);
      console.log(`   - 活动ID: ${testActivityId}`);
      console.log(`   - 学生答题ID: ${testStudentActivityId}`);
      console.log(`   - 活动标题: ${submission.activity_title}`);
      console.log(`   - 待评题数: ${submission.pending_answers}/${submission.total_answers}`);

      // 获取答案ID
      const detailResponse = await axios.get(
        `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}`,
        authConfig(teacherToken)
      );

      testAnswerIds = detailResponse.data.answers.map(a => a.id);
      console.log(`✅ 获取答案ID成功 (共${testAnswerIds.length}个答案)`);

      return true;
    } else {
      console.warn('⚠️  没有找到待评卷数据，部分测试将跳过');
      console.warn('⚠️  提示：请先手动创建一个测评活动并让学生提交答案');
      return true; // 不失败，继续其他测试
    }
  } catch (error) {
    console.error('❌ 准备测试数据失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试4：获取待评卷列表
 */
async function test04_GetPendingGrading() {
  console.log('\n=== 测试4: 获取待评卷列表 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/teacher/grading/pending`,
      authConfig(teacherToken)
    );

    // 验证响应结构
    if (!response.data.success) {
      throw new Error('API返回失败状态');
    }

    if (!Array.isArray(response.data.submissions)) {
      throw new Error('返回数据格式错误：submissions不是数组');
    }

    console.log(`✅ 成功获取待评卷列表 (共${response.data.submissions.length}条)`);

    // 验证是否包含我们的测试数据
    const testSubmission = response.data.submissions.find(
      s => s.student_activity_id === testStudentActivityId
    );

    if (!testSubmission) {
      console.warn('⚠️  警告: 列表中未找到测试提交记录');
    } else {
      console.log('✅ 验证: 测试提交记录存在于列表中');
      console.log(`   - 活动标题: ${testSubmission.activity_title}`);
      console.log(`   - 学生姓名: ${testSubmission.student_name}`);
      console.log(`   - 评卷状态: ${testSubmission.grading_status}`);
      console.log(`   - 待评题数: ${testSubmission.pending_answers}/${testSubmission.total_answers}`);
    }

    return true;
  } catch (error) {
    console.error('❌ 获取待评卷列表失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试5：获取待评卷列表（带筛选条件）
 */
async function test05_GetPendingGradingWithFilters() {
  console.log('\n=== 测试5: 获取待评卷列表（带筛选条件）===');

  try {
    // 测试按活动ID筛选
    const response1 = await axios.get(
      `${API_BASE_URL}/teacher/grading/pending?activityId=${testActivityId}`,
      authConfig(teacherToken)
    );

    if (!response1.data.success) {
      throw new Error('按活动ID筛选失败');
    }

    console.log(`✅ 按活动ID筛选成功 (${response1.data.submissions.length}条)`);

    // 测试按科目筛选
    const response2 = await axios.get(
      `${API_BASE_URL}/teacher/grading/pending?subject=数学`,
      authConfig(teacherToken)
    );

    if (!response2.data.success) {
      throw new Error('按科目筛选失败');
    }

    console.log(`✅ 按科目筛选成功 (${response2.data.submissions.length}条)`);

    // 测试按年级筛选
    const response3 = await axios.get(
      `${API_BASE_URL}/teacher/grading/pending?grade=三年级`,
      authConfig(teacherToken)
    );

    if (!response3.data.success) {
      throw new Error('按年级筛选失败');
    }

    console.log(`✅ 按年级筛选成功 (${response3.data.submissions.length}条)`);

    // 测试按评卷状态筛选
    const response4 = await axios.get(
      `${API_BASE_URL}/teacher/grading/pending?grading_status=auto_graded`,
      authConfig(teacherToken)
    );

    if (!response4.data.success) {
      throw new Error('按评卷状态筛选失败');
    }

    console.log(`✅ 按评卷状态筛选成功 (${response4.data.submissions.length}条)`);

    return true;
  } catch (error) {
    console.error('❌ 筛选测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试6：获取评卷详情
 */
async function test06_GetGradingDetail() {
  console.log('\n=== 测试6: 获取评卷详情 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}`,
      authConfig(teacherToken)
    );

    // 验证响应结构
    if (!response.data.success) {
      throw new Error('API返回失败状态');
    }

    const { student_activity, student, activity, answers, questions } = response.data;

    // 验证student_activity字段
    if (!student_activity || !student_activity.id) {
      throw new Error('缺少student_activity数据');
    }

    console.log('✅ student_activity数据验证通过');
    console.log(`   - ID: ${student_activity.id}`);
    console.log(`   - 评卷状态: ${student_activity.grading_status}`);
    console.log(`   - 当前得分: ${student_activity.score || 0}`);

    // 验证student字段
    if (!student || !student.real_name) {
      throw new Error('缺少student数据');
    }

    console.log('✅ student数据验证通过');
    console.log(`   - 学生姓名: ${student.real_name}`);

    // 验证activity字段
    if (!activity || !activity.title) {
      throw new Error('缺少activity数据');
    }

    console.log('✅ activity数据验证通过');
    console.log(`   - 活动标题: ${activity.title}`);
    console.log(`   - 总分: ${activity.total_score}`);

    // 验证answers字段
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new Error('answers不是数组或为空');
    }

    console.log(`✅ answers数据验证通过 (共${answers.length}个答案)`);
    answers.forEach((answer, index) => {
      console.log(`   答案${index + 1}:`);
      console.log(`     - ID: ${answer.id}`);
      console.log(`     - 题目ID: ${answer.question_id}`);
      console.log(`     - 评分状态: ${answer.grading_status}`);
      console.log(`     - 得分: ${answer.score !== null ? answer.score : '未评分'}`);
    });

    // 验证questions字段
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('questions不是数组或为空');
    }

    console.log(`✅ questions数据验证通过 (共${questions.length}道题)`);
    questions.forEach((question, index) => {
      console.log(`   题目${index + 1}:`);
      console.log(`     - ID: ${question.id}`);
      console.log(`     - 类型: ${question.type}`);
      console.log(`     - 满分: ${question.score}`);
    });

    // 验证answers和questions数量一致
    if (answers.length !== questions.length) {
      throw new Error(`答案数量(${answers.length})与题目数量(${questions.length})不一致`);
    }

    console.log('✅ 答案与题目数量一致性验证通过');

    return true;
  } catch (error) {
    console.error('❌ 获取评卷详情失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试7：单题评分
 */
async function test07_GradeSingleAnswer() {
  console.log('\n=== 测试7: 单题评分 ===');

  try {
    // 找一道主观题进行评分
    const detailResponse = await axios.get(
      `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}`,
      authConfig(teacherToken)
    );

    const subjectiveAnswer = detailResponse.data.answers.find(a => {
      const question = detailResponse.data.questions.find(q => q.id === a.question_id);
      return question && ['short_answer', 'essay'].includes(question.type);
    });

    if (!subjectiveAnswer) {
      console.warn('⚠️  没有找到主观题，跳过单题评分测试');
      return true;
    }

    const answerId = subjectiveAnswer.id;
    const question = detailResponse.data.questions.find(q => q.id === subjectiveAnswer.question_id);
    const maxScore = question.score;

    // 进行评分
    const gradeData = {
      score: maxScore * 0.8, // 给80%的分数
      feedback: '回答较好，但还有改进空间。'
    };

    const response = await axios.put(
      `${API_BASE_URL}/teacher/grading/answers/${answerId}`,
      gradeData,
      authConfig(teacherToken)
    );

    if (!response.data.success) {
      throw new Error('API返回失败状态');
    }

    console.log('✅ 单题评分成功');
    console.log(`   - 答案ID: ${answerId}`);
    console.log(`   - 评分: ${gradeData.score}/${maxScore}`);
    console.log(`   - 评语: ${gradeData.feedback}`);

    // 验证评分是否生效
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}`,
      authConfig(teacherToken)
    );

    const updatedAnswer = verifyResponse.data.answers.find(a => a.id === answerId);

    if (!updatedAnswer) {
      throw new Error('验证失败：找不到已评分的答案');
    }

    if (updatedAnswer.manual_score !== gradeData.score) {
      throw new Error(`验证失败：分数不匹配 (期望${gradeData.score}，实际${updatedAnswer.manual_score})`);
    }

    if (updatedAnswer.grading_status !== 'manual_graded') {
      throw new Error(`验证失败：评分状态错误 (${updatedAnswer.grading_status})`);
    }

    console.log('✅ 评分结果验证通过');

    return true;
  } catch (error) {
    console.error('❌ 单题评分失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试8：单题评分（分数验证）
 */
async function test08_GradeAnswerValidation() {
  console.log('\n=== 测试8: 单题评分（分数验证）===');

  try {
    // 获取一个答案和其对应题目的最大分值
    const detailResponse = await axios.get(
      `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}`,
      authConfig(teacherToken)
    );

    const answer = detailResponse.data.answers[0];
    const question = detailResponse.data.questions.find(q => q.id === answer.question_id);
    const maxScore = question.score;

    // 测试：分数超过最大值
    try {
      await axios.put(
        `${API_BASE_URL}/teacher/grading/answers/${answer.id}`,
        { score: maxScore + 10, feedback: '测试超出分数' },
        authConfig(teacherToken)
      );
      throw new Error('应该拒绝超出范围的分数');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ 正确拒绝超出最大分值的评分');
      } else {
        throw error;
      }
    }

    // 测试：负分
    try {
      await axios.put(
        `${API_BASE_URL}/teacher/grading/answers/${answer.id}`,
        { score: -5, feedback: '测试负分' },
        authConfig(teacherToken)
      );
      throw new Error('应该拒绝负分');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ 正确拒绝负分');
      } else {
        throw error;
      }
    }

    // 测试：有效范围内的分数
    const validScore = maxScore * 0.5;
    const response = await axios.put(
      `${API_BASE_URL}/teacher/grading/answers/${answer.id}`,
      { score: validScore, feedback: '有效分数测试' },
      authConfig(teacherToken)
    );

    if (!response.data.success) {
      throw new Error('有效分数评分失败');
    }

    console.log(`✅ 有效分数评分成功 (${validScore}/${maxScore})`);

    return true;
  } catch (error) {
    console.error('❌ 分数验证测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试9：批量评分
 */
async function test09_BatchGradeAnswers() {
  console.log('\n=== 测试9: 批量评分 ===');

  try {
    // 获取所有答案
    const detailResponse = await axios.get(
      `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}`,
      authConfig(teacherToken)
    );

    const answers = detailResponse.data.answers;
    const questions = detailResponse.data.questions;

    // 构造批量评分数据
    const batchData = {
      answers: answers.map(answer => {
        const question = questions.find(q => q.id === answer.question_id);
        return {
          answerId: answer.id,
          score: question.score * 0.9, // 给90%的分数
          feedback: `批量评分测试 - 答案${answer.id}`
        };
      })
    };

    const response = await axios.put(
      `${API_BASE_URL}/teacher/grading/batch`,
      batchData,
      authConfig(teacherToken)
    );

    if (!response.data.success) {
      throw new Error('API返回失败状态');
    }

    console.log('✅ 批量评分成功');
    console.log(`   - 成功评分: ${response.data.graded.length}道题`);
    console.log(`   - 失败: ${response.data.failed.length}道题`);

    if (response.data.failed.length > 0) {
      console.warn('⚠️  部分评分失败:');
      response.data.failed.forEach(f => {
        console.warn(`     答案${f.answerId}: ${f.error}`);
      });
    }

    // 验证批量评分结果
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}`,
      authConfig(teacherToken)
    );

    const allGraded = verifyResponse.data.answers.every(a => a.grading_status !== 'pending');

    if (!allGraded) {
      throw new Error('验证失败：仍有未评分的题目');
    }

    console.log('✅ 批量评分结果验证通过：所有题目已评分');

    return true;
  } catch (error) {
    console.error('❌ 批量评分失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试10：完成评卷
 */
async function test10_CompleteGrading() {
  console.log('\n=== 测试10: 完成评卷 ===');

  try {
    const response = await axios.post(
      `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}/complete`,
      {},
      authConfig(teacherToken)
    );

    if (!response.data.success) {
      throw new Error('API返回失败状态');
    }

    console.log('✅ 完成评卷成功');
    console.log(`   - 最终得分: ${response.data.total_score}`);

    // 验证评卷状态
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}`,
      authConfig(teacherToken)
    );

    const studentActivity = verifyResponse.data.student_activity;

    if (studentActivity.grading_status !== 'completed') {
      throw new Error(`验证失败：评卷状态错误 (${studentActivity.grading_status})`);
    }

    if (studentActivity.status !== 'graded') {
      throw new Error(`验证失败：活动状态错误 (${studentActivity.status})`);
    }

    console.log('✅ 评卷完成状态验证通过');
    console.log(`   - 评卷状态: ${studentActivity.grading_status}`);
    console.log(`   - 活动状态: ${studentActivity.status}`);
    console.log(`   - 最终得分: ${studentActivity.score}`);

    return true;
  } catch (error) {
    console.error('❌ 完成评卷失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试11：完成评卷（待评题检查）
 */
async function test11_CompleteGradingValidation() {
  console.log('\n=== 测试11: 完成评卷（待评题检查）===');

  try {
    // 创建新的测试数据
    await createTestActivity();
    await submitStudentAnswers();

    // 尝试在未评完所有题的情况下完成评卷
    try {
      await axios.post(
        `${API_BASE_URL}/teacher/grading/student-activity/${testStudentActivityId}/complete`,
        {},
        authConfig(teacherToken)
      );
      throw new Error('应该拒绝未完成评分的完成请求');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ 正确拒绝未完成评分的完成请求');
        if (error.response.data.pending_count) {
          console.log(`   - 待评题数: ${error.response.data.pending_count}`);
        }
      } else {
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ 完成评卷验证失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试12：评卷统计
 */
async function test12_GetGradingStats() {
  console.log('\n=== 测试12: 评卷统计 ===');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/teacher/grading/stats/${testActivityId}`,
      authConfig(teacherToken)
    );

    if (!response.data.success) {
      throw new Error('API返回失败状态');
    }

    const stats = response.data.statistics;

    console.log('✅ 成功获取评卷统计');
    console.log('   统计数据:');
    console.log(`     - 总提交数: ${stats.total_submissions || 0}`);
    console.log(`     - 待评卷: ${stats.pending_count || 0}`);
    console.log(`     - 自动评分: ${stats.auto_graded_count || 0}`);
    console.log(`     - 部分评分: ${stats.partial_graded_count || 0}`);
    console.log(`     - 已完成: ${stats.completed_count || 0}`);
    console.log(`     - 平均分: ${stats.avg_score !== null ? stats.avg_score : 'N/A'}`);
    console.log(`     - 最高分: ${stats.max_score !== null ? stats.max_score : 'N/A'}`);
    console.log(`     - 最低分: ${stats.min_score !== null ? stats.min_score : 'N/A'}`);

    return true;
  } catch (error) {
    console.error('❌ 获取评卷统计失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试13：权限控制（学生不能访问评卷API）
 */
async function test13_PermissionControl() {
  console.log('\n=== 测试13: 权限控制 ===');

  try {
    // 学生尝试访问待评卷列表
    try {
      await axios.get(
        `${API_BASE_URL}/teacher/grading/pending`,
        authConfig(studentToken)
      );
      throw new Error('学生不应该能访问待评卷列表');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ 正确拒绝学生访问待评卷列表');
      } else {
        throw error;
      }
    }

    // 学生尝试评分
    try {
      await axios.put(
        `${API_BASE_URL}/teacher/grading/answers/${testAnswerIds[0]}`,
        { score: 10, feedback: '测试' },
        authConfig(studentToken)
      );
      throw new Error('学生不应该能进行评分');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ 正确拒绝学生进行评分');
      } else {
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ 权限控制测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         评卷管理系统 API 测试                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  const tests = [
    { name: '测试1: 教师登录', fn: test01_TeacherLogin },
    { name: '测试2: 学生登录', fn: test02_StudentLogin },
    { name: '测试3: 准备测试数据', fn: test03_PrepareTestData },
    { name: '测试4: 获取待评卷列表', fn: test04_GetPendingGrading },
    { name: '测试5: 获取待评卷列表（带筛选）', fn: test05_GetPendingGradingWithFilters },
    { name: '测试6: 获取评卷详情', fn: test06_GetGradingDetail },
    { name: '测试7: 单题评分', fn: test07_GradeSingleAnswer },
    { name: '测试8: 单题评分（分数验证）', fn: test08_GradeAnswerValidation },
    { name: '测试9: 批量评分', fn: test09_BatchGradeAnswers },
    { name: '测试10: 完成评卷', fn: test10_CompleteGrading },
    { name: '测试11: 完成评卷（待评题检查）', fn: test11_CompleteGradingValidation },
    { name: '测试12: 评卷统计', fn: test12_GetGradingStats },
    { name: '测试13: 权限控制', fn: test13_PermissionControl },
  ];

  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 输出测试总结
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                   测试总结                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\n总计: ${results.total} 个测试`);
  console.log(`通过: ${results.passed} 个 ✅`);
  console.log(`失败: ${results.failed} 个 ❌`);
  console.log(`成功率: ${((results.passed / results.total) * 100).toFixed(2)}%\n`);

  // 如果有失败的测试，退出码为1
  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runAllTests().catch(error => {
  console.error('\n测试运行出错:', error);
  process.exit(1);
});
