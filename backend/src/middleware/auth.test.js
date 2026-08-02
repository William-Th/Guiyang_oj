jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));
jest.mock('../models/User', () => ({
  findById: jest.fn()
}));
jest.mock('../utils/logger', () => ({ error: jest.fn() }));

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('./auth');

function response() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return res;
}

describe('authMiddleware session version checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a token invalidated by logout or password reset', async () => {
    jwt.verify.mockReturnValue({ userId: 7, tokenVersion: 0 });
    User.findById.mockResolvedValue({ id: 7, status: 'active', token_version: 1 });
    const req = { header: jest.fn().mockReturnValue('Bearer stale-token') };
    const res = response();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts an active user with the current token version', async () => {
    jwt.verify.mockReturnValue({ userId: 7, tokenVersion: 2 });
    User.findById.mockResolvedValue({
      id: 7,
      username: 'student_7',
      role: 'student',
      real_name: '测试学生',
      status: 'active',
      token_version: 2
    });
    const req = { header: jest.fn().mockReturnValue('Bearer current-token') };
    const res = response();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 7, role: 'student' });
  });
});
