const express = require('express');
const request = require('supertest');

let mockActor = { id: 7, role: 'school_admin' };

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = mockActor;
    next();
  },
  requireAdmin: (req, res, next) => next(),
  requireRole: () => (req, res, next) => next()
}));
jest.mock('../models/User', () => ({
  findById: jest.fn(),
  updateUser: jest.fn(),
  checkUsernameExists: jest.fn(),
  create: jest.fn()
}));
jest.mock('../models/School', () => ({ findAll: jest.fn() }));
jest.mock('../database/connection', () => ({
  query: jest.fn(),
  getClient: jest.fn()
}));
jest.mock('../utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));
jest.mock('../services/adminAuthorization', () => ({
  SCHOOL_ADMIN_ROLES: ['school_admin', 'base_school_admin', 'municipal_school_admin'],
  isAdminRole: role => role.endsWith('_admin'),
  isGlobalAdmin: role => ['system_admin', 'municipal_admin'].includes(role),
  canAssignRole: jest.fn(),
  getAdminScope: jest.fn(),
  assertManageableUser: jest.fn(),
  scopeAllowsAssignment: jest.fn()
}));

const User = require('../models/User');
const authorization = require('../services/adminAuthorization');
const usersRouter = require('./users');

const app = express();
app.use(express.json());
app.use('/users', usersRouter);

describe('users route scoped administration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActor = { id: 7, role: 'school_admin' };
  });

  it('rejects an ID update when the target is outside the administrator scope', async () => {
    User.findById.mockResolvedValue({ id: 99, role: 'student', real_name: '外校学生', status: 'active' });
    authorization.assertManageableUser.mockResolvedValue({ allowed: false, reason: 'out_of_scope' });

    const response = await request(app).put('/users/99').send({ realName: '越权修改' });

    expect(response.status).toBe(403);
    expect(User.updateUser).not.toHaveBeenCalled();
  });

  it('rejects creation of an elevated role not present in the actor allowlist', async () => {
    authorization.canAssignRole.mockReturnValue(false);

    const response = await request(app).post('/users/create').send({
      username: 'blocked_admin',
      password: 'password123',
      role: 'district_admin',
      realName: '越权管理员'
    });

    expect(response.status).toBe(403);
    expect(User.checkUsernameExists).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });
});
