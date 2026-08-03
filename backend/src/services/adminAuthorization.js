const { query } = require('../database/connection');

const ADMIN_ROLES = Object.freeze([
  'school_admin',
  'district_admin',
  'municipal_school_admin',
  'base_school_admin',
  'municipal_admin',
  'system_admin'
]);

const GLOBAL_ADMIN_ROLES = Object.freeze(['system_admin', 'municipal_admin']);
const SCHOOL_ADMIN_ROLES = Object.freeze([
  'school_admin',
  'base_school_admin',
  'municipal_school_admin'
]);
const MEMBER_ROLES = Object.freeze(['student', 'teacher', 'parent']);

const ASSIGNABLE_ROLES = Object.freeze({
  system_admin: [
    'student', 'teacher', 'parent', 'school_admin', 'district_admin',
    'municipal_school_admin', 'base_school_admin', 'municipal_admin', 'system_admin'
  ],
  municipal_admin: [
    'student', 'teacher', 'parent', 'school_admin', 'district_admin',
    'municipal_school_admin', 'base_school_admin'
  ],
  district_admin: MEMBER_ROLES,
  school_admin: MEMBER_ROLES,
  base_school_admin: MEMBER_ROLES,
  municipal_school_admin: MEMBER_ROLES
});

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function isGlobalAdmin(role) {
  return GLOBAL_ADMIN_ROLES.includes(role);
}

function canAssignRole(actorRole, targetRole) {
  return (ASSIGNABLE_ROLES[actorRole] || []).includes(targetRole);
}

function canManageRole(actorRole, targetRole) {
  if (actorRole === 'system_admin') return true;
  if (actorRole === 'municipal_admin') {
    return targetRole !== 'system_admin' && targetRole !== 'municipal_admin';
  }
  return MEMBER_ROLES.includes(targetRole);
}

async function getAdminScope(actor) {
  if (!actor || !isAdminRole(actor.role)) return null;
  if (isGlobalAdmin(actor.role)) return { type: 'global', id: null };

  const result = await query(
    'SELECT school_id, district_id FROM admin_permissions WHERE user_id = $1',
    [actor.id]
  );
  const permissions = result.rows[0];
  if (!permissions) return null;

  if (actor.role === 'district_admin' && permissions.district_id) {
    return { type: 'district', id: Number(permissions.district_id) };
  }
  if (SCHOOL_ADMIN_ROLES.includes(actor.role) && permissions.school_id) {
    return { type: 'school', id: Number(permissions.school_id) };
  }
  return null;
}

async function getUserResource(userId) {
  const result = await query(`
    SELECT u.id, u.username, u.role, u.real_name, u.phone, u.email, u.status,
           COALESCE(st.school_id, t.school_id, ap.school_id) AS school_id,
           COALESCE(st_school.district_id, t_school.district_id, ap.district_id, ap_school.district_id) AS district_id
    FROM users u
    LEFT JOIN students st ON st.user_id = u.id
    LEFT JOIN schools st_school ON st_school.id = st.school_id
    LEFT JOIN teachers t ON t.user_id = u.id
    LEFT JOIN schools t_school ON t_school.id = t.school_id
    LEFT JOIN admin_permissions ap ON ap.user_id = u.id
    LEFT JOIN schools ap_school ON ap_school.id = ap.school_id
    WHERE u.id = $1
  `, [userId]);
  return result.rows[0] || null;
}

async function parentBelongsToScope(parentUserId, scope) {
  const column = scope.type === 'school' ? 's.school_id' : 'sc.district_id';
  const result = await query(`
    SELECT
      COUNT(*) FILTER (WHERE ${column} = $2) > 0 AS has_in_scope_child,
      COUNT(*) FILTER (WHERE ${column} IS DISTINCT FROM $2) = 0 AS has_no_outside_child
    FROM parent_student_relations psr
    JOIN students s ON s.user_id = psr.student_user_id
    LEFT JOIN schools sc ON sc.id = s.school_id
    WHERE psr.parent_user_id = $1
  `, [parentUserId, scope.id]);
  return result.rows[0]?.has_in_scope_child === true && result.rows[0]?.has_no_outside_child === true;
}

async function userBelongsToScope(target, scope) {
  if (!target || !scope) return false;
  if (scope.type === 'global') return true;
  if (target.role === 'parent') return parentBelongsToScope(target.id, scope);
  if (scope.type === 'school') return Number(target.school_id) === Number(scope.id);
  if (scope.type === 'district') return Number(target.district_id) === Number(scope.id);
  return false;
}

async function canManageUser(actor, target) {
  const scope = await getAdminScope(actor);
  if (!scope || !target || !canManageRole(actor.role, target.role)) return false;
  return userBelongsToScope(target, scope);
}

async function canViewAdmin(actor, target) {
  if (!target || !isAdminRole(target.role)) return false;
  const scope = await getAdminScope(actor);
  if (!scope) return false;
  if (actor.role === 'system_admin') return true;
  if (actor.role === 'municipal_admin') return target.role !== 'system_admin';
  if (isGlobalAdmin(target.role)) return false;
  return userBelongsToScope(target, scope);
}

async function assertManageableUser(actor, userId) {
  const target = await getUserResource(userId);
  if (!target) return { allowed: false, target: null, reason: 'not_found' };
  const allowed = await canManageUser(actor, target);
  return { allowed, target, reason: allowed ? null : 'out_of_scope' };
}

async function scopeAllowsAssignment(actor, { schoolId, districtId }) {
  const scope = await getAdminScope(actor);
  if (!scope) return false;
  if (scope.type === 'global') return true;
  if (scope.type === 'school') return Number(schoolId) === Number(scope.id);
  if (scope.type === 'district') {
    if (districtId != null) return Number(districtId) === Number(scope.id);
    if (schoolId == null) return false;
    const result = await query('SELECT 1 FROM schools WHERE id = $1 AND district_id = $2', [schoolId, scope.id]);
    return result.rows.length > 0;
  }
  return false;
}

function userScopePredicate(scope, userAlias = 'u', parameterIndex = 1) {
  if (scope.type === 'global') return { sql: 'TRUE', params: [] };
  if (scope.type === 'school') {
    return {
      sql: `(
        EXISTS (SELECT 1 FROM students aus WHERE aus.user_id = ${userAlias}.id AND aus.school_id = $${parameterIndex})
        OR EXISTS (SELECT 1 FROM teachers aut WHERE aut.user_id = ${userAlias}.id AND aut.school_id = $${parameterIndex})
        OR EXISTS (SELECT 1 FROM admin_permissions aua WHERE aua.user_id = ${userAlias}.id AND aua.school_id = $${parameterIndex})
        OR EXISTS (
          SELECT 1 FROM parent_student_relations aupr
          JOIN students aups ON aups.user_id = aupr.student_user_id
          WHERE aupr.parent_user_id = ${userAlias}.id AND aups.school_id = $${parameterIndex}
        )
      )`,
      params: [scope.id]
    };
  }
  return {
    sql: `(
      EXISTS (
        SELECT 1 FROM students aus JOIN schools ausc ON ausc.id = aus.school_id
        WHERE aus.user_id = ${userAlias}.id AND ausc.district_id = $${parameterIndex}
      )
      OR EXISTS (
        SELECT 1 FROM teachers aut JOIN schools autc ON autc.id = aut.school_id
        WHERE aut.user_id = ${userAlias}.id AND autc.district_id = $${parameterIndex}
      )
      OR EXISTS (
        SELECT 1 FROM admin_permissions aua LEFT JOIN schools auas ON auas.id = aua.school_id
        WHERE aua.user_id = ${userAlias}.id
          AND COALESCE(aua.district_id, auas.district_id) = $${parameterIndex}
      )
      OR EXISTS (
        SELECT 1 FROM parent_student_relations aupr
        JOIN students aups ON aups.user_id = aupr.student_user_id
        JOIN schools aupsc ON aupsc.id = aups.school_id
        WHERE aupr.parent_user_id = ${userAlias}.id AND aupsc.district_id = $${parameterIndex}
      )
    )`,
    params: [scope.id]
  };
}

module.exports = {
  ADMIN_ROLES,
  GLOBAL_ADMIN_ROLES,
  SCHOOL_ADMIN_ROLES,
  MEMBER_ROLES,
  isAdminRole,
  isGlobalAdmin,
  canAssignRole,
  canManageRole,
  getAdminScope,
  getUserResource,
  userBelongsToScope,
  canManageUser,
  canViewAdmin,
  assertManageableUser,
  scopeAllowsAssignment,
  userScopePredicate
};
