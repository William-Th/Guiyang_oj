/**
 * Activity Permission API Tests
 * Tests for activity management permission control
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

// Test data
const testActivity = {
  title: `Test Activity ${Date.now()}`,
  subject: '数学',
  grade: '三年级',
  abilityLevel: 'L3',
  duration: 60,
  totalScore: 100,
  passScore: 60
};

describe('Activity Permission API Tests', () => {
  let teacherToken;
  let adminToken;
  let studentToken;

  beforeAll(async () => {
    // Get authentication tokens for different roles
    try {
      teacherToken = await getAuthToken('teacher01', 'password123');
      adminToken = await getAuthToken('yunyan_admin', 'password123'); // Use yunyan district admin
      studentToken = await getAuthToken('520102200801011234', 'password123');
    } catch (error) {
      console.error('Failed to get auth tokens:', error);
      throw error;
    }
  });

  describe('Teacher Permissions', () => {
    test('Teacher can create practice activity', async () => {
      const response = await axios.post(
        `${API_BASE_URL}/activities/practice`,
        testActivity,
        {
          headers: { Authorization: `Bearer ${teacherToken}` }
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.activity.type).toBe('practice');
    });

    test('Teacher cannot create assessment activity', async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/activities/assessment`,
          testActivity,
          {
            headers: { Authorization: `Bearer ${teacherToken}` }
          }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.message).toContain('没有权限');
      }
    });

    test('Teacher can only view their own practice activities', async () => {
      const response = await axios.get(`${API_BASE_URL}/activities`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Verify all activities are practice type
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.type).toBe('practice');
      });
    });

    test('Teacher cannot access admin assessment endpoints', async () => {
      try {
        await axios.get(`${API_BASE_URL}/activities/admin/assessments`, {
          headers: { Authorization: `Bearer ${teacherToken}` }
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });
  });

  describe('Admin Permissions', () => {
    test('Admin can create assessment activity', async () => {
      const response = await axios.post(
        `${API_BASE_URL}/activities/admin/assessment`,
        testActivity,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.activity.type).toBe('assessment');
      expect(response.data.activity.is_official).toBe(true);
    });

    test('Admin can view all assessments', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/activities/admin/assessments`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Verify all activities are assessment type
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.type).toBe('assessment');
      });
    });

    test('Admin can filter assessments by subject', async () => {
      const response = await axios.get(
        `${API_BASE_URL}/activities/admin/assessments?subject=数学`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      expect(response.status).toBe(200);
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.subject).toBe('数学');
        expect(activity.type).toBe('assessment');
      });
    });
  });

  describe('Student Permissions', () => {
    test('Student can view available practices', async () => {
      const response = await axios.get(`${API_BASE_URL}/activities/practice`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Verify all activities are practice type and published
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.type).toBe('practice');
        expect(activity.status).toBe('published');
      });
    });

    test('Student can view available assessments', async () => {
      const response = await axios.get(`${API_BASE_URL}/activities/assessments`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Verify all activities are assessment type and published
      const activities = response.data.activities;
      activities.forEach(activity => {
        expect(activity.type).toBe('assessment');
        expect(activity.status).toBe('published');
      });
    });

    test('Student cannot create activities', async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/activities/practice`,
          testActivity,
          {
            headers: { Authorization: `Bearer ${studentToken}` }
          }
        );
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });

    test('Student cannot access admin endpoints', async () => {
      try {
        await axios.get(`${API_BASE_URL}/activities/admin/assessments`, {
          headers: { Authorization: `Bearer ${studentToken}` }
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });

    test('Non-student cannot access student-specific practice endpoint', async () => {
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

    test('Non-student cannot access student-specific assessment endpoint', async () => {
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

  describe('Permission Boundary Tests', () => {
    test('Unauthenticated user cannot access protected endpoints', async () => {
      const endpoints = [
        '/activities/practice',
        '/activities/assessments',
        '/activities/admin/assessments'
      ];

      for (const endpoint of endpoints) {
        try {
          await axios.get(`${API_BASE_URL}${endpoint}`);
          expect(true).toBe(false);
        } catch (error) {
          expect(error.response.status).toBe(401);
        }
      }
    });

    test('Invalid token cannot access protected endpoints', async () => {
      try {
        await axios.get(`${API_BASE_URL}/activities/practice`, {
          headers: { Authorization: 'Bearer invalid_token' }
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });
});

console.log('Activity Permission API Tests loaded');
