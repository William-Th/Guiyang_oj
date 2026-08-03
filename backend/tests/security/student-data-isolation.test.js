const express = require('express');
const request = require('supertest');

jest.mock('../../src/database/connection', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const connection = require('../../src/database/connection');
const { authorizeStudentAccess } = require('../../src/services/studentAccessControl');
const registrationRouter = require('../../src/routes/registration');

describe('student data isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('a student cannot read another student by either id namespace', async () => {
    connection.query.mockResolvedValueOnce({
      rows: [{ student_id: 41, user_id: 141, school_id: 10, district_id: 1 }]
    });

    const access = await authorizeStudentAccess({ id: 142, role: 'student' }, 141);

    expect(access.allowed).toBe(false);
    expect(access.student.student_id).toBe(41);
  });

  test('a parent can read only an explicitly linked child', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [{ student_id: 41, user_id: 141, school_id: 10, district_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ allowed: false }] });

    const access = await authorizeStudentAccess({ id: 501, role: 'parent' }, 141);

    expect(access.allowed).toBe(false);
    expect(connection.query.mock.calls[1][0]).toContain('parent_student_relations');
  });

  test('a teacher cannot read a student from another school or managed class', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [{ student_id: 41, user_id: 141, school_id: 10, district_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ allowed: false }] });

    const access = await authorizeStudentAccess({ id: 301, role: 'teacher' }, 141);

    expect(access.allowed).toBe(false);
    expect(connection.query.mock.calls[1][0]).toContain('teaching_class_members');
  });

  test('a district administrator is denied across district boundaries', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [{ student_id: 41, user_id: 141, school_id: 10, district_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ school_id: null, district_id: 2 }] });

    const access = await authorizeStudentAccess({ id: 601, role: 'district_admin' }, 141);

    expect(access.allowed).toBe(false);
  });

  test('missing administrator scope fails closed', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [{ student_id: 41, user_id: 141, school_id: 10, district_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const access = await authorizeStudentAccess({ id: 701, role: 'school_admin' }, 141);

    expect(access.allowed).toBe(false);
  });
});

describe('registration status privacy', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/registration', registrationRouter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('a phone number alone cannot enumerate registration status', async () => {
    const response = await request(app)
      .post('/api/registration/status')
      .send({ phone: '13800000000' });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('申请信息或查询码不正确');
    expect(connection.pool.query).not.toHaveBeenCalled();
  });

  test('an incorrect code returns the same generic response as an unknown phone', async () => {
    connection.pool.query.mockResolvedValue({ rows: [] });
    const inquiryCode = 'invalid-code-that-is-long-enough';

    const response = await request(app)
      .post('/api/registration/status')
      .send({ phone: '13800000000', inquiryCode });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: '申请信息或查询码不正确' });
    const queryParams = connection.pool.query.mock.calls[0][1];
    expect(queryParams[1]).toHaveLength(64);
    expect(queryParams[1]).not.toBe(inquiryCode);
  });

  test('a valid code returns a minimal status payload', async () => {
    connection.pool.query.mockResolvedValue({
      rows: [{
        id: 9,
        school_name: '测试小学',
        grade: '三年级',
        status: 'pending',
        current_reviewer_level: 2,
        submitted_at: '2026-08-01T00:00:00.000Z',
        reviewed_at: null,
        review_comment: null
      }]
    });

    const response = await request(app)
      .post('/api/registration/status')
      .send({ phone: '13800000000', inquiryCode: 'valid-code-that-is-long-enough' });

    expect(response.status).toBe(200);
    expect(response.body.data.statusText).toBe('审核中');
    expect(response.body.data).not.toHaveProperty('phone');
    expect(response.body.data).not.toHaveProperty('real_name');
    expect(response.body.data).not.toHaveProperty('id_card_last4');
  });
});
