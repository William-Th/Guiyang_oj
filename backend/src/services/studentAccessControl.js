const { query } = require('../database/connection');

const GLOBAL_ADMIN_ROLES = new Set(['system_admin', 'municipal_admin']);
const SCHOOL_ADMIN_ROLES = new Set([
  'school_admin',
  'municipal_school_admin',
  'base_school_admin'
]);

function normalizeId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Resolve either a users.id or students.id into one canonical student row.
 * A user-id match is preferred because all current web clients use users.id.
 */
async function resolveStudent(identifier) {
  const id = normalizeId(identifier);
  if (!id) return null;

  const result = await query(
    `SELECT s.id AS student_id, s.user_id, s.school_id, sc.district_id
       FROM students s
       LEFT JOIN schools sc ON sc.id = s.school_id
      WHERE s.user_id = $1 OR s.id = $1
      ORDER BY CASE WHEN s.user_id = $1 THEN 0 ELSE 1 END
      LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function teacherCanAccessStudent(userId, student) {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1
         FROM teachers t
        WHERE t.user_id = $1
          AND (
            (t.school_id IS NOT NULL AND t.school_id = $2)
            OR EXISTS (
              SELECT 1
                FROM teaching_class_teachers tct
                JOIN teaching_class_members tcm
                  ON tcm.teaching_class_id = tct.teaching_class_id
                 AND tcm.is_active = TRUE
               WHERE tct.teacher_id = t.id
                 AND tct.is_active = TRUE
                 AND tcm.student_id = $3
            )
          )
     ) AS allowed`,
    [userId, student.school_id, student.student_id]
  );
  return result.rows[0]?.allowed === true;
}

async function parentCanAccessStudent(userId, student) {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1 FROM parent_student_relations
        WHERE parent_user_id = $1 AND student_user_id = $2
     ) AS allowed`,
    [userId, student.user_id]
  );
  return result.rows[0]?.allowed === true;
}

async function adminCanAccessStudent(user, student) {
  if (GLOBAL_ADMIN_ROLES.has(user.role)) return true;
  if (!SCHOOL_ADMIN_ROLES.has(user.role) && user.role !== 'district_admin') return false;

  const result = await query(
    'SELECT school_id, district_id FROM admin_permissions WHERE user_id = $1 LIMIT 1',
    [user.id]
  );
  const permissions = result.rows[0];
  if (!permissions) return false;

  if (user.role === 'district_admin') {
    return permissions.district_id != null
      && Number(permissions.district_id) === Number(student.district_id);
  }
  return permissions.school_id != null
    && Number(permissions.school_id) === Number(student.school_id);
}

/**
 * Default-deny student-data authorization. Returns the resolved target so routes
 * consistently pass students.id to model methods.
 */
async function authorizeStudentAccess(user, identifier, { write = false } = {}) {
  const student = await resolveStudent(identifier);
  if (!student || !user) return { allowed: false, student };

  if (user.role === 'student') {
    return { allowed: Number(user.id) === Number(student.user_id), student };
  }
  if (user.role === 'parent') {
    return {
      allowed: !write && await parentCanAccessStudent(user.id, student),
      student
    };
  }
  if (user.role === 'teacher') {
    return { allowed: await teacherCanAccessStudent(user.id, student), student };
  }
  return { allowed: await adminCanAccessStudent(user, student), student };
}

async function authorizeActivityResultsAccess(user, activityId) {
  const id = normalizeId(activityId);
  if (!id || !user) return false;
  if (GLOBAL_ADMIN_ROLES.has(user.role)) return true;

  const activityResult = await query(
    `SELECT a.created_by,
            COALESCE(t.school_id, ap.school_id) AS school_id,
            COALESCE(ap.district_id, sc.district_id) AS district_id
       FROM activities a
       LEFT JOIN teachers t ON t.user_id = a.created_by
       LEFT JOIN admin_permissions ap ON ap.user_id = a.created_by
       LEFT JOIN schools sc ON sc.id = COALESCE(t.school_id, ap.school_id)
      WHERE a.id = $1`,
    [id]
  );
  const activity = activityResult.rows[0];
  if (!activity) return false;

  if (user.role === 'teacher') {
    return Number(activity.created_by) === Number(user.id);
  }

  const permissionResult = await query(
    'SELECT school_id, district_id FROM admin_permissions WHERE user_id = $1 LIMIT 1',
    [user.id]
  );
  const permissions = permissionResult.rows[0];
  if (!permissions) return false;

  if (user.role === 'district_admin') {
    return permissions.district_id != null && activity.district_id != null
      && Number(permissions.district_id) === Number(activity.district_id);
  }
  if (SCHOOL_ADMIN_ROLES.has(user.role)) {
    return permissions.school_id != null && activity.school_id != null
      && Number(permissions.school_id) === Number(activity.school_id);
  }
  return false;
}

/**
 * Build a parameterized SQL predicate for bulk student data. The caller must
 * join `students` with the supplied alias. This prevents aggregate/export
 * endpoints from authorizing an activity and then leaking out-of-scope rows.
 */
async function getStudentQueryScope(user, { studentAlias = 's', firstParam = 1 } = {}) {
  if (!user) return { allowed: false, sql: 'FALSE', params: [] };
  if (GLOBAL_ADMIN_ROLES.has(user.role)) return { allowed: true, sql: 'TRUE', params: [] };

  const userParam = `$${firstParam}`;
  if (user.role === 'student') {
    return {
      allowed: true,
      sql: `${studentAlias}.user_id = ${userParam}`,
      params: [user.id]
    };
  }
  if (user.role === 'parent') {
    return {
      allowed: true,
      sql: `EXISTS (
        SELECT 1 FROM parent_student_relations scope_psr
         WHERE scope_psr.parent_user_id = ${userParam}
           AND scope_psr.student_user_id = ${studentAlias}.user_id
      )`,
      params: [user.id]
    };
  }
  if (user.role === 'teacher') {
    return {
      allowed: true,
      sql: `EXISTS (
        SELECT 1 FROM teachers scope_teacher
         WHERE scope_teacher.user_id = ${userParam}
           AND (
             (scope_teacher.school_id IS NOT NULL AND scope_teacher.school_id = ${studentAlias}.school_id)
             OR EXISTS (
               SELECT 1
                 FROM teaching_class_teachers scope_tct
                 JOIN teaching_class_members scope_tcm
                   ON scope_tcm.teaching_class_id = scope_tct.teaching_class_id
                  AND scope_tcm.is_active = TRUE
                WHERE scope_tct.teacher_id = scope_teacher.id
                  AND scope_tct.is_active = TRUE
                  AND scope_tcm.student_id = ${studentAlias}.id
             )
           )
      )`,
      params: [user.id]
    };
  }

  if (!SCHOOL_ADMIN_ROLES.has(user.role) && user.role !== 'district_admin') {
    return { allowed: false, sql: 'FALSE', params: [] };
  }
  const result = await query(
    'SELECT school_id, district_id FROM admin_permissions WHERE user_id = $1 LIMIT 1',
    [user.id]
  );
  const permissions = result.rows[0];
  if (!permissions) return { allowed: false, sql: 'FALSE', params: [] };

  if (user.role === 'district_admin' && permissions.district_id != null) {
    return {
      allowed: true,
      sql: `EXISTS (SELECT 1 FROM schools scope_school WHERE scope_school.id = ${studentAlias}.school_id AND scope_school.district_id = ${userParam})`,
      params: [permissions.district_id]
    };
  }
  if (SCHOOL_ADMIN_ROLES.has(user.role) && permissions.school_id != null) {
    return {
      allowed: true,
      sql: `${studentAlias}.school_id = ${userParam}`,
      params: [permissions.school_id]
    };
  }
  return { allowed: false, sql: 'FALSE', params: [] };
}

module.exports = {
  GLOBAL_ADMIN_ROLES,
  SCHOOL_ADMIN_ROLES,
  normalizeId,
  resolveStudent,
  authorizeStudentAccess,
  authorizeActivityResultsAccess,
  getStudentQueryScope
};
