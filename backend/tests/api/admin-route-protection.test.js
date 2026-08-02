const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => ({
  authMiddleware: (_req, res) => res.status(401).json({ message: 'Authentication required.' }),
  requireAdmin: (_req, res) => res.status(403).json({ message: 'Admin required.' }),
  requireRole: () => (_req, res) => res.status(403).json({ message: 'Admin required.' })
}));
jest.mock('../../src/database/connection', () => ({
  pool: { query: jest.fn(), connect: jest.fn() }
}));

const registrationRouter = require('../../src/routes/registration');
const certificateRouter = require('../../src/routes/certificate_verify');

const app = express();
app.use(express.json());
app.use('/registration', registrationRouter);
app.use('/certificate', certificateRouter);

describe('admin-only route protection', () => {
  it.each([
    ['post', '/registration/admin/requests/1/approve'],
    ['post', '/registration/admin/requests/1/reject'],
    ['get', '/registration/admin/requests/1/history'],
    ['get', '/registration/admin/requests']
  ])('rejects anonymous requests to %s %s', async (method, path) => {
    const response = await request(app)[method](path).send({ comment: 'test' });
    expect(response.status).toBe(401);
  });

  it('rejects anonymous test-certificate creation', async () => {
    const response = await request(app).post('/certificate/test/create');
    expect(response.status).toBe(401);
  });
});
