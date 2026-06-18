/**
 * User Type Definitions
 * User-related interfaces and types
 */

import { Timestamps } from './common';

/**
 * User role types
 */
export type UserRole = 'student' | 'teacher' | 'admin' | 'super_admin' | 'parent';

/**
 * Permission scope for hierarchical permissions
 */
export type PermissionScope =
  | 'province'           // 省级
  | 'municipal'          // 市级
  | 'district'           // 区县级
  | 'school';            // 学校级

/**
 * User status
 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_approval';

/**
 * Base User interface
 */
export interface User extends Timestamps {
  id: number;
  username: string;
  real_name?: string;
  phone?: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
}

/**
 * Student-specific information
 */
export interface Student extends User {
  role: 'student';
  student_id?: number;
  grade?: string;
  class_name?: string;
  school_id?: number;
  school_name?: string;
  student_number?: string;
  points?: number;  // 积分
  ranking?: number; // 排名
}

/**
 * Teacher-specific information
 */
export interface Teacher extends User {
  role: 'teacher';
  teacher_id?: number;
  school_id?: number;
  school_name?: string;
  subject?: string;
  title?: string;  // 职称
}

/**
 * Admin-specific information
 */
export interface Admin extends User {
  role: 'admin' | 'super_admin';
  admin_id?: number;
  permission_scope?: PermissionScope;
  scope_value?: string;  // e.g., district name, school ID
  permissions?: string[];
}

/**
 * Registration request
 */
export interface RegistrationRequest extends Timestamps {
  id: number;
  username: string;
  real_name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  school_id?: number;
  school_name?: string;
  grade?: string;
  student_number?: string;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string;
  reviewed_by?: number;
  reviewed_at?: string;
}

/**
 * User login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
  role: UserRole;
  captcha?: string;
}

/**
 * User profile update payload
 */
export interface ProfileUpdatePayload {
  real_name?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

/**
 * Password change payload
 */
export interface PasswordChangePayload {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Permission definition
 */
export interface Permission {
  id: number;
  name: string;
  code: string;
  description?: string;
  scope?: PermissionScope;
  resource?: string;
  action?: string;
}

/**
 * User permission assignment
 */
export interface UserPermission {
  user_id: number;
  permission_id: number;
  permission_code: string;
  granted_at: string;
  granted_by?: number;
}
