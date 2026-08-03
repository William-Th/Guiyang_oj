jest.mock('../database/connection', () => ({ query: jest.fn() }));

const { query } = require('../database/connection');
const {
  canAssignRole,
  getAdminScope,
  canManageUser
} = require('./adminAuthorization');

describe('adminAuthorization explicit roles and scopes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('denies a school administrator access to a user from another school', async () => {
    query.mockResolvedValueOnce({ rows: [{ school_id: 10, district_id: 2 }] });

    const allowed = await canManageUser(
      { id: 1, role: 'school_admin' },
      { id: 20, role: 'student', school_id: 11, district_id: 2 }
    );

    expect(allowed).toBe(false);
  });

  it('denies a district administrator access to a user from another district', async () => {
    query.mockResolvedValueOnce({ rows: [{ school_id: null, district_id: 2 }] });

    const allowed = await canManageUser(
      { id: 1, role: 'district_admin' },
      { id: 20, role: 'teacher', school_id: 11, district_id: 3 }
    );

    expect(allowed).toBe(false);
  });

  it('fails closed when a scoped administrator has no permission record', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(getAdminScope({ id: 1, role: 'municipal_school_admin' })).resolves.toBeNull();
  });

  it('uses explicit assignment allowlists instead of numeric role ordering', () => {
    expect(canAssignRole('school_admin', 'district_admin')).toBe(false);
    expect(canAssignRole('district_admin', 'municipal_school_admin')).toBe(false);
    expect(canAssignRole('municipal_admin', 'municipal_admin')).toBe(false);
    expect(canAssignRole('system_admin', 'system_admin')).toBe(true);
  });
});
