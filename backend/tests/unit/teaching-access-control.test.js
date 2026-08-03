jest.mock('../../src/database/connection', () => ({ query: jest.fn() }));

const { query } = require('../../src/database/connection');
const {
  getActorScope,
  canManageActivity,
  canAccessTeachingClass,
  canAccessQuestion
} = require('../../src/services/teachingAccessControl');

describe('teachingAccessControl', () => {
  beforeEach(() => query.mockReset());

  it('fails closed when a scoped administrator has no admin_permissions row', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(getActorScope({ id: 7, role: 'school_admin' })).resolves.toBeNull();
  });

  it('denies a teacher from managing another teacher activity', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(canManageActivity(
      { id: 11, role: 'teacher' },
      { id: 90, created_by: 12, scope: 'class' }
    )).resolves.toBe(false);
  });

  it('denies a teacher who is not assigned to another teaching class', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(canAccessTeachingClass(
      { id: 11, role: 'teacher' },
      { id: 9, created_by: 12, school_id: 1 }
    )).resolves.toBe(false);
  });

  it('does not expose teaching class rosters to student members', async () => {
    await expect(canAccessTeachingClass(
      { id: 101, role: 'student' },
      { id: 9, created_by: 12, school_id: 1 }
    )).resolves.toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it('allows a district administrator only inside the configured district', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ school_id: null, district_id: 3 }] })
      .mockResolvedValueOnce({ rows: [{ role: 'teacher', school_id: 20, district_id: 3 }] });
    await expect(canManageActivity(
      { id: 21, role: 'district_admin' },
      { id: 90, created_by: 12, scope: 'district' }
    )).resolves.toBe(true);
  });

  it('denies school-scoped questions from another school', async () => {
    query.mockResolvedValueOnce({ rows: [{ school_id: 1, district_id: 2 }] });
    await expect(canAccessQuestion(
      { id: 11, role: 'teacher' },
      { id: 4, created_by: 12, scope: 'practice_school_9', school_id: 9 }
    )).resolves.toBe(false);
  });

  it('denies district questions with missing district ownership', async () => {
    query.mockResolvedValueOnce({ rows: [{ school_id: 1, district_id: 2 }] });
    await expect(canAccessQuestion(
      { id: 11, role: 'teacher' },
      { id: 4, created_by: 12, scope: 'practice_district_GY', district_id: null }
    )).resolves.toBe(false);
  });
});
