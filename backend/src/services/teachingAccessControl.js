const { query } = require('../database/connection');

const GLOBAL_ADMIN_ROLES = new Set(['system_admin', 'municipal_admin']);
const DISTRICT_ADMIN_ROLES = new Set(['district_admin']);
const SCHOOL_ADMIN_ROLES = new Set(['school_admin', 'base_school_admin', 'municipal_school_admin']);
const ADMIN_ROLES = new Set([
  ...GLOBAL_ADMIN_ROLES,
  ...DISTRICT_ADMIN_ROLES,
  ...SCHOOL_ADMIN_ROLES
]);

function sameId(left, right) {
  return Number(left) === Number(right);
}

async function getActorScope(user) {
  if (!user || !user.id || !user.role) return null;
  if (GLOBAL_ADMIN_ROLES.has(user.role)) {
    return { userId: Number(user.id), role: user.role, level: 'municipal' };
  }

  if (user.role === 'teacher') {
    const result = await query(`
      SELECT t.school_id, s.district_id
      FROM teachers t
      JOIN schools s ON s.id = t.school_id
      WHERE t.user_id = $1 AND t.school_id IS NOT NULL
      LIMIT 1
    `, [user.id]);
    if (!result.rows[0]) return null;
    return {
      userId: Number(user.id), role: user.role, level: 'school',
      schoolId: Number(result.rows[0].school_id),
      districtId: Number(result.rows[0].district_id)
    };
  }

  if (user.role === 'student') {
    const result = await query(`
      SELECT st.id AS student_id, st.school_id, s.district_id, st.grade, st.class
      FROM students st
      JOIN schools s ON s.id = st.school_id
      WHERE st.user_id = $1 AND st.school_id IS NOT NULL
      LIMIT 1
    `, [user.id]);
    if (!result.rows[0]) return null;
    return {
      userId: Number(user.id), role: user.role, level: 'school',
      studentId: Number(result.rows[0].student_id),
      schoolId: Number(result.rows[0].school_id),
      districtId: Number(result.rows[0].district_id),
      grade: result.rows[0].grade,
      className: result.rows[0].class
    };
  }

  if (ADMIN_ROLES.has(user.role)) {
    const result = await query(`
      SELECT ap.school_id, COALESCE(ap.district_id, s.district_id) AS district_id
      FROM admin_permissions ap
      LEFT JOIN schools s ON s.id = ap.school_id
      WHERE ap.user_id = $1
      ORDER BY ap.id
      LIMIT 1
    `, [user.id]);
    const row = result.rows[0];
    if (!row) return null;
    if (DISTRICT_ADMIN_ROLES.has(user.role) && !row.district_id) return null;
    if (SCHOOL_ADMIN_ROLES.has(user.role) && !row.school_id) return null;
    return {
      userId: Number(user.id), role: user.role,
      level: DISTRICT_ADMIN_ROLES.has(user.role) ? 'district' : 'school',
      schoolId: row.school_id == null ? null : Number(row.school_id),
      districtId: row.district_id == null ? null : Number(row.district_id)
    };
  }

  return null;
}

async function getUserScope(userId) {
  const result = await query(`
    SELECT u.role,
           COALESCE(t.school_id, st.school_id, ap.school_id) AS school_id,
           COALESCE(ap.district_id, s.district_id) AS district_id
    FROM users u
    LEFT JOIN teachers t ON t.user_id = u.id
    LEFT JOIN students st ON st.user_id = u.id
    LEFT JOIN admin_permissions ap ON ap.user_id = u.id
    LEFT JOIN schools s ON s.id = COALESCE(t.school_id, st.school_id, ap.school_id)
    WHERE u.id = $1
    LIMIT 1
  `, [userId]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    role: row.role,
    schoolId: row.school_id == null ? null : Number(row.school_id),
    districtId: row.district_id == null ? null : Number(row.district_id)
  };
}

async function scopeAllows(actor, resource) {
  if (!actor) return false;
  if (actor.level === 'municipal') return true;
  let schoolId = resource.school_id == null ? null : Number(resource.school_id);
  let districtId = resource.district_id == null ? null : Number(resource.district_id);

  if (!schoolId && !districtId && resource.created_by) {
    const owner = await getUserScope(resource.created_by);
    schoolId = owner && owner.schoolId;
    districtId = owner && owner.districtId;
  }
  if (!districtId && schoolId) {
    const school = await query('SELECT district_id FROM schools WHERE id = $1', [schoolId]);
    districtId = school.rows[0] && Number(school.rows[0].district_id);
  }

  if (actor.level === 'district') return !!districtId && sameId(actor.districtId, districtId);
  return !!schoolId && sameId(actor.schoolId, schoolId);
}

async function isAssignedTeacher(userId, teachingClassId) {
  const result = await query(`
    SELECT 1
    FROM teaching_class_teachers tct
    JOIN teachers t ON t.id = tct.teacher_id
    WHERE tct.teaching_class_id = $1 AND t.user_id = $2 AND tct.is_active = TRUE
    LIMIT 1
  `, [teachingClassId, userId]);
  return result.rows.length > 0;
}

async function canAccessTeachingClass(user, teachingClass, _options = {}) {
  if (!user || !teachingClass) return false;
  if (sameId(teachingClass.created_by, user.id)) return true;
  if (user.role === 'teacher') return isAssignedTeacher(user.id, teachingClass.id);

  // Class rosters contain peer contact/profile data. Students consume their
  // assigned activities through the activity endpoints instead of reading a roster.
  if (user.role === 'student') return false;

  if (!ADMIN_ROLES.has(user.role)) return false;
  return scopeAllows(await getActorScope(user), teachingClass);
}

async function canManageTeachingClass(user, teachingClass) {
  return canAccessTeachingClass(user, teachingClass, { manage: true });
}

async function canManageActivity(user, activity) {
  if (!user || !activity) return false;
  if (sameId(activity.created_by, user.id)) return true;
  if (user.role === 'teacher') {
    const result = await query(`
      SELECT 1
      FROM teaching_class_activities tca
      JOIN teaching_class_teachers tct ON tct.teaching_class_id = tca.teaching_class_id
      JOIN teachers t ON t.id = tct.teacher_id
      WHERE tca.activity_id = $1 AND t.user_id = $2 AND tct.is_active = TRUE
      LIMIT 1
    `, [activity.id, user.id]);
    return result.rows.length > 0;
  }
  if (!ADMIN_ROLES.has(user.role)) return false;
  return scopeAllows(await getActorScope(user), activity);
}

async function canStudentParticipate(user, activity) {
  if (!user || user.role !== 'student' || !activity) return false;
  if (!['published', 'ongoing'].includes(activity.status)) return false;
  const actor = await getActorScope(user);
  if (!actor) return false;

  const audience = activity.target_audience || {};
  if (Array.isArray(audience.grades) && audience.grades.length > 0 &&
      !audience.grades.includes(actor.grade)) return false;
  if (Array.isArray(audience.schools) && audience.schools.length > 0 &&
      !audience.schools.map(Number).includes(actor.schoolId)) return false;
  if (Array.isArray(audience.classes) && audience.classes.length > 0 &&
      !audience.classes.includes(actor.className)) return false;

  if (activity.scope === 'municipal' || activity.scope === 'system') return true;
  if (activity.scope === 'district') {
    const owner = await getUserScope(activity.created_by);
    return !!owner?.districtId && sameId(owner.districtId, actor.districtId);
  }
  if (activity.scope === 'school' || activity.scope === 'base_school' ||
      activity.scope === 'municipal_school') {
    const owner = await getUserScope(activity.created_by);
    return !!owner?.schoolId && sameId(owner.schoolId, actor.schoolId);
  }
  if (activity.scope === 'class') {
    const membership = await query(`
      SELECT 1
      FROM teaching_class_activities tca
      JOIN teaching_class_members tcm ON tcm.teaching_class_id = tca.teaching_class_id
      WHERE tca.activity_id = $1 AND tcm.student_id = $2 AND tcm.is_active = TRUE
      LIMIT 1
    `, [activity.id, actor.studentId]);
    if (membership.rows.length > 0) return true;
    // A physical class target is acceptable only when it was explicitly set.
    // Empty target_audience must not silently expand a class activity to school-wide.
    return Array.isArray(audience.classes) && audience.classes.length > 0;
  }
  return false;
}

async function canReadActivity(user, activity) {
  if (!user || !activity) return false;
  if (user.role === 'student') return canStudentParticipate(user, activity);
  if (await canManageActivity(user, activity)) return true;
  // 同校教师共享：本校教师可只读查看其他教师已发布/进行中的练习活动（管理仍限创建者）
  if (user.role === 'teacher' && activity.type === 'practice' &&
      ['published', 'ongoing'].includes(activity.status)) {
    return sameSchoolTeacher(user.id, activity.created_by);
  }
  return false;
}

/** 判断两个用户是否同校教师（含同一人） */
async function sameSchoolTeacher(userIdA, userIdB) {
  if (sameId(userIdA, userIdB)) return true;
  const result = await query(`
    SELECT 1
    FROM teachers a
    JOIN teachers b ON b.school_id = a.school_id
    WHERE a.user_id = $1 AND b.user_id = $2
    LIMIT 1
  `, [userIdA, userIdB]);
  return result.rows.length > 0;
}

function questionScope(question) {
  const scope = String(question.scope || '');
  let schoolId = question.school_id == null ? null : Number(question.school_id);
  if (!schoolId && scope.startsWith('practice_school_')) {
    schoolId = Number(scope.slice('practice_school_'.length)) || null;
  }
  return {
    scope,
    school_id: schoolId,
    district_id: question.district_id,
    created_by: question.created_by
  };
}

async function canAccessQuestion(user, question) {
  if (!user || !question) return false;
  if (sameId(question.created_by, user.id)) return true;
  if (GLOBAL_ADMIN_ROLES.has(user.role)) return true;
  if (!['teacher', ...ADMIN_ROLES].includes(user.role)) return false;

  const resource = questionScope(question);
  if (!resource.scope) return false; // drafts without an owner match are private
  if (resource.scope === 'assessment' || resource.scope === 'practice_municipal') return true;
  const actor = await getActorScope(user);
  if (!actor) return false;
  if (resource.scope.startsWith('practice_school_')) {
    return !!resource.school_id && sameId(actor.schoolId, resource.school_id);
  }
  if (resource.scope === 'practice_district' || resource.scope.startsWith('practice_district_')) {
    return !!resource.district_id && sameId(actor.districtId, resource.district_id);
  }
  return false;
}

async function canManageQuestion(user, question) {
  if (!user || !question) return false;
  if (sameId(question.created_by, user.id) || GLOBAL_ADMIN_ROLES.has(user.role)) return true;
  if (!ADMIN_ROLES.has(user.role)) return false;
  const resource = questionScope(question);
  if (!resource.scope || ['assessment', 'practice_municipal'].includes(resource.scope)) return false;
  return scopeAllows(await getActorScope(user), resource);
}

async function filterQuestionsForActor(user, questions) {
  const allowed = await Promise.all((questions || []).map(async question => ({
    question,
    allowed: await canAccessQuestion(user, question)
  })));
  return allowed.filter(item => item.allowed).map(item => item.question);
}

module.exports = {
  ADMIN_ROLES,
  getActorScope,
  canAccessTeachingClass,
  canManageTeachingClass,
  canManageActivity,
  canReadActivity,
  canStudentParticipate,
  canAccessQuestion,
  canManageQuestion,
  filterQuestionsForActor
};
