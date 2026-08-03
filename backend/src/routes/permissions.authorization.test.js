const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 7, role: 'district_admin' };
    next();
  }
}));
jest.mock('../models/TeacherPermission', () => ({
  create: jest.fn(),
  grantDistrictPermission: jest.fn()
}));
jest.mock('../services/adminAuthorization', () => ({
  getAdminScope: jest.fn().mockResolvedValue({ type: 'district', id: 2 }),
  getUserResource: jest.fn().mockResolvedValue({ id: 99, role: 'teacher', school_id: 12, district_id: 3 }),
  canManageUser: jest.fn().mockResolvedValue(false),
  scopeAllowsAssignment: jest.fn()
}));

const TeacherPermission = require('../models/TeacherPermission');
const permissionsRouter = require('./permissions');

const app = express();
app.use(express.json());
app.use('/permissions', permissionsRouter);

describe('permission administration scope', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects granting a permission to a teacher from another district', async () => {
    const response = await request(app).post('/permissions/grant').send({
      user_id: 99,
      permission_type: 'practice_district_manage',
      subjects: ['math']
    });

    expect(response.status).toBe(403);
    expect(TeacherPermission.create).not.toHaveBeenCalled();
    expect(TeacherPermission.grantDistrictPermission).not.toHaveBeenCalled();
  });
});
