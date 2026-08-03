import type { UserRole } from '@/types/user';

export const ADMIN_ROLES = [
  'school_admin',
  'district_admin',
  'municipal_school_admin',
  'base_school_admin',
  'municipal_admin',
  'system_admin',
] as const satisfies readonly UserRole[];

export const GLOBAL_ADMIN_ROLES = [
  'municipal_admin',
  'system_admin',
] as const satisfies readonly UserRole[];

export const PERMISSION_ADMIN_ROLES = [
  'district_admin',
  'municipal_admin',
  'system_admin',
] as const satisfies readonly UserRole[];

export const isAdminRole = (role?: UserRole): boolean =>
  !!role && (ADMIN_ROLES as readonly UserRole[]).includes(role);

export const hasRole = (role: UserRole | undefined, roles: readonly UserRole[]): boolean =>
  !!role && roles.includes(role);

export const getDefaultPathForRole = (role?: UserRole): string => {
  if (role === 'student') return '/student/practice';
  if (role === 'teacher') return '/teacher/activities';
  if (role === 'parent') return '/parent/dashboard';
  if (isAdminRole(role)) return '/admin/home';
  return '/login';
};
