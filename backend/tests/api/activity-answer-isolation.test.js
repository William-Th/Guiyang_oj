const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { id: 101, role: 'student' };
    next();
  },
  requireRole: () => (_req, _res, next) => next()
}));

jest.mock('../../src/services/teachingAccessControl', () => ({
  getActorScope: jest.fn(),
  canManageActivity: jest.fn(),
  canReadActivity: jest.fn(),
  canStudentParticipate: jest.fn(),
  canAccessQuestion: jest.fn(),
  filterQuestionsForActor: jest.fn()
}));

jest.mock('../../src/models/Activity', () => ({
  findById: jest.fn(),
  findByIdWithQuestions: jest.fn()
}));
jest.mock('../../src/models/StudentExam', () => ({}));
jest.mock('../../src/models/Answer', () => ({}));
jest.mock('../../src/services/paperGenerationService', () => ({}));
jest.mock('../../src/database/connection', () => ({ query: jest.fn() }));

const Activity = require('../../src/models/Activity');
const access = require('../../src/services/teachingAccessControl');
const activitiesRouter = require('../../src/routes/activities');

const app = express();
app.use(express.json());
app.use('/activities', activitiesRouter);

describe('activity answer isolation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removes correct answers and explanations before a student submits', async () => {
    Activity.findById.mockResolvedValue({ id: 1, status: 'published', scope: 'school', created_by: 8 });
    Activity.findByIdWithQuestions.mockResolvedValue({
      id: 1,
      questions: [{ id: 2, content: '1+1?', correct_answer: '2', explanation: '加法' }]
    });
    access.canStudentParticipate.mockResolvedValue(true);

    const response = await request(app).get('/activities/1/questions');

    expect(response.status).toBe(200);
    expect(response.body.activity.questions[0]).toEqual({ id: 2, content: '1+1?' });
    expect(response.body.activity.questions[0]).not.toHaveProperty('correct_answer');
    expect(response.body.activity.questions[0]).not.toHaveProperty('explanation');
  });

  it('rejects a student outside the activity audience before returning questions', async () => {
    Activity.findById.mockResolvedValue({ id: 1, status: 'published', scope: 'school', created_by: 8 });
    access.canStudentParticipate.mockResolvedValue(false);

    const response = await request(app).get('/activities/1/questions');

    expect(response.status).toBe(403);
    expect(Activity.findByIdWithQuestions).not.toHaveBeenCalled();
  });
});
