/**
 * Student Activities API Tests
 * Tests for student-specific activity endpoints
 */

const axios = require('axios');

const API_BASE_URL = 'http://127.0.0.1:3001/api';

// Configure axios to not use proxy for localhost
axios.defaults.proxy = false;

// Helper function to login and get token
async function getAuthToken(username, password) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username,
      password
    });
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

describe('Student Activities API Tests', () => {
  let studentToken;
  let teacherToken;
  let testActivityId;

  beforeAll(async () => {
    try {
      studentToken = await getAuthToken('520102200801011234', 'password123');
      teacherToken = await getAuthToken('teacher_yy_ps_math', 'password123');

      // Create a test activity for eligibility testing
      const activityResponse = await axios.post(
        `${API_BASE_URL}/activities/practice`,
        {
          title: `Test Practice ${Date.now()}`,
          subject: '数学',
          grade: '三年�?,
          abilityLevel: 'L3',
          duration: 60,
          totalScore: 100,
          passScore: 60,
          status: 'published'
        },
        {
          headers: { Authorization: `Bearer ${teacherToken}` }
        }
      );

      testActivityId = activityResponse.data.activity.id;
    } catch (error) {
      console.error('Setup failed:', error.response?.data || error.message);
      throw error;
    }
  });

  describe('GET /api/activities/practice', () => {
    test('Student can retrieve practice list', async () => {
      const response = await axios.get(`${API_BASE_URL}/activities/practice`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.activities)).toBe(true);
      expect(response.data).toHaveProperty('count');
    });

    test('Practice list only contains practice type activities', async () => {
      const response = await axios.get(`${API_BASE_URL}/activities/practice`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });

      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.type).toBe('practice');
        expect(activity.status).toBe('published');
      });
    });

    test('Student can filter practices by subject', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/activities/practice?subject=数学`,
        {
          headers: { Authorization: `Bearer ${studentToken}` }
        }
      );

      expect(response.status).toBe(200);
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.subject).toBe('数学');
        expect(activity.type).toBe('practice');
      });
    });

    test('Student can filter practices by grade', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/activities/practice?grade=三年级`,
        {
          headers: { Authorization: `Bearer ${studentToken}` }
        }
      );

      expect(response.status).toBe(200);
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.grade).toBe('三年�?);
      });
    });

    test('Student can filter practices by ability level', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/activities/practice?ability_level=L3`,
        {
          headers: { Authorization: `Bearer ${studentToken}` }
        }
      );

      expect(response.status).toBe(200);
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.ability_level).toBe('L3');
      });
    });

    test('Non-student cannot access practice endpoint', async () => {
      try {
        await axios.get(`${API_BASE_URL}/activities/practice`, {
          headers: { Authorization: `Bearer ${teacherToken}` }
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.message).toContain('只有学生可以访问');
      }
    });
  });

  describe('GET /api/activities/assessments', () => {
    test('Student can retrieve assessment list', async () => {
      const response = await axios.get(`${API_BASE_URL}/activities/assessments`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.activities)).toBe(true);
      expect(response.data).toHaveProperty('count');
    });

    test('Assessment list only contains assessment type activities', async () => {
      const response = await axios.get(`${API_BASE_URL}/activities/assessments`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });

      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.type).toBe('assessment');
        expect(activity.status).toBe('published');
      });
    });

    test('Student can filter assessments by subject', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/activities/assessments?subject=数学`,
        {
          headers: { Authorization: `Bearer ${studentToken}` }
        }
      );

      expect(response.status).toBe(200);
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.subject).toBe('数学');
        expect(activity.type).toBe('assessment');
      });
    });

    test('Non-student cannot access assessment endpoint', async () => {
      try {
        await axios.get(`${API_BASE_URL}/activities/assessments`, {
          headers: { Authorization: `Bearer ${teacherToken}` }
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.message).toContain('只有学生可以访问');
      }
    });
  });

  describe('GET /api/activities/:id/eligibility', () => {
    test('Student can check eligibility for an activity', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/activities/${testActivityId}/eligibility`,
        {
          headers: { Authorization: `Bearer ${studentToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('eligible');
      expect(response.data).toHaveProperty('reason');
      expect(response.data).toHaveProperty('attemptsUsed');
      expect(response.data).toHaveProperty('maxAttempts');
      expect(response.data).toHaveProperty('activityType');
      expect(response.data).toHaveProperty('activityStatus');
    });

    test('Eligibility check returns correct data structure', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/activities/${testActivityId}/eligibility`,
        {
          headers: { Authorization: `Bearer ${studentToken}` }
        }
      );

      const data = response.data;
      expect(typeof data.eligible).toBe('boolean');
      expect(typeof data.reason).toBe('string');
      expect(typeof data.attemptsUsed).toBe('number');
      expect(typeof data.maxAttempts).toBe('number');
      expect(data.attemptsUsed).toBeGreaterThanOrEqual(0);
    });

    test('Non-existent activity returns appropriate error', async () => {
      try {
        await axios.get(
          `${API_BASE_URL}/activities/999999/eligibility`,
          {
            headers: { Authorization: `Bearer ${studentToken}` }
          }
        );
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    test('Non-student cannot check eligibility', async () => {
      try {
        await axios.get(
          `${API_BASE_URL}/activities/${testActivityId}/eligibility`,
          {
            headers: { Authorization: `Bearer ${teacherToken}` }
          }
        );
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });

    test('Unauthenticated user cannot check eligibility', async () => {
      try {
        await axios.get(
          `${API_BASE_URL}/activities/${testActivityId}/eligibility`
        );
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Multiple Filter Combinations', () => {
    test('Student can apply multiple filters to practice list', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/activities/practice?subject=数学&grade=三年�?ability_level=L3`,
        {
          headers: { Authorization: `Bearer ${studentToken}` }
        }
      );

      expect(response.status).toBe(200);
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.subject).toBe('数学');
        expect(activity.grade).toBe('三年�?);
        expect(activity.ability_level).toBe('L3');
        expect(activity.type).toBe('practice');
      });
    });

    test('Student can apply multiple filters to assessment list', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/activities/assessments?subject=数学&ability_level=L3`,
        {
          headers: { Authorization: `Bearer ${studentToken}` }
        }
      );

      expect(response.status).toBe(200);
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.subject).toBe('数学');
        expect(activity.ability_level).toBe('L3');
        expect(activity.type).toBe('assessment');
      });
    });
  });
});

console.log('Student Activities API Tests loaded');
