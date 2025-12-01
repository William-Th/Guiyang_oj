/**
 * Assessment Registration API Service
 * 测评报名相关API服务
 */

import api from './api';

// ============================================
// Types
// ============================================

export interface AssessmentLocation {
  id: number;
  activity_id: number;
  name: string;
  address?: string;
  district_id?: number;
  district_name?: string;
  capacity: number;
  registered_count: number;
  remaining_capacity?: number;
  is_full?: boolean;
  contact_name?: string;
  contact_phone?: string;
  exam_date?: string;
  exam_time_start?: string;
  exam_time_end?: string;
  check_in_time?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface AssessmentRegistration {
  id: number;
  activity_id: number;
  student_id: number;
  location_id?: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'absent';
  registered_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  student_name?: string;
  student_phone?: string;
  student_grade?: string;
  student_class?: string;
  school_name?: string;
  location_name?: string;
  location_address?: string;
  activity_title?: string;
  ability_level?: string;
}

export interface RegistrationEligibility {
  eligible: boolean;
  reason?: string;
  activity?: {
    id: number;
    title: string;
    ability_level: string;
    require_location: boolean;
    registration_start_time?: string;
    registration_end_time?: string;
  };
  locations?: AssessmentLocation[];
}

export interface RegistrationStatistics {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  rejected: number;
  completed: number;
  absent: number;
}

export interface CreateLocationParams {
  name: string;
  address?: string;
  district_id?: number;
  capacity?: number;
  contact_name?: string;
  contact_phone?: string;
  exam_date?: string;
  exam_time_start?: string;
  exam_time_end?: string;
  check_in_time?: string;
  notes?: string;
}

// ============================================
// Location APIs (Admin)
// ============================================

/**
 * Get locations for an activity
 */
export const getActivityLocations = async (
  activityId: number,
  options?: { activeOnly?: boolean; availableOnly?: boolean }
): Promise<{ data: AssessmentLocation[] }> => {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.append('active_only', 'true');
  if (options?.availableOnly) params.append('available_only', 'true');

  const queryString = params.toString();
  const url = `/activities/${activityId}/locations${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url);
  return response.data;
};

/**
 * Get single location
 */
export const getLocation = async (locationId: number): Promise<{ data: AssessmentLocation }> => {
  const response = await api.get(`/locations/${locationId}`);
  return response.data;
};

/**
 * Create a new location
 */
export const createLocation = async (
  activityId: number,
  params: CreateLocationParams
): Promise<{ data: AssessmentLocation }> => {
  const response = await api.post(`/activities/${activityId}/locations`, params);
  return response.data;
};

/**
 * Update a location
 */
export const updateLocation = async (
  locationId: number,
  params: Partial<CreateLocationParams & { is_active?: boolean }>
): Promise<{ data: AssessmentLocation }> => {
  const response = await api.put(`/locations/${locationId}`, params);
  return response.data;
};

/**
 * Delete a location
 */
export const deleteLocation = async (locationId: number): Promise<{ success: boolean }> => {
  const response = await api.delete(`/locations/${locationId}`);
  return response.data;
};

// ============================================
// Student Registration APIs
// ============================================

/**
 * Check registration eligibility
 */
export const checkEligibility = async (
  activityId: number
): Promise<RegistrationEligibility> => {
  const response = await api.get(`/activities/${activityId}/registration/eligibility`);
  return response.data;
};

/**
 * Register for an assessment
 */
export const registerForAssessment = async (
  activityId: number,
  locationId?: number
): Promise<{ data: AssessmentRegistration }> => {
  const body: { location_id?: number } = {};
  if (locationId) {
    body.location_id = locationId;
  }
  const response = await api.post(`/activities/${activityId}/register`, body);
  return response.data;
};

/**
 * Cancel registration
 */
export const cancelRegistration = async (
  activityId: number,
  reason?: string
): Promise<{ success: boolean }> => {
  const response = await api.post(`/activities/${activityId}/register/cancel`, {
    reason
  });
  return response.data;
};

/**
 * Get student's registrations
 */
export const getMyRegistrations = async (): Promise<{ data: AssessmentRegistration[] }> => {
  const response = await api.get('/assessments/my-registrations');
  return response.data;
};

// ============================================
// Admin Registration Management APIs
// ============================================

/**
 * Get registrations for an activity (admin)
 */
export const getActivityRegistrations = async (
  activityId: number,
  options?: {
    status?: string;
    location_id?: number;
    page?: number;
    page_size?: number;
  }
): Promise<{
  data: AssessmentRegistration[];
  statistics: RegistrationStatistics;
  pagination?: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}> => {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.location_id) params.append('location_id', String(options.location_id));
  if (options?.page) params.append('page', String(options.page));
  if (options?.page_size) params.append('page_size', String(options.page_size));

  const queryString = params.toString();
  const url = `/activities/${activityId}/registrations${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url);
  return response.data;
};

/**
 * Batch update registration status (admin)
 */
export const batchUpdateRegistrations = async (
  activityId: number,
  registrationIds: number[],
  action: 'confirm' | 'reject' | 'cancel' | 'mark_completed' | 'mark_absent',
  reason?: string
): Promise<{
  success: boolean;
  updated_count: number;
}> => {
  const response = await api.post(`/activities/${activityId}/registrations/batch`, {
    registration_ids: registrationIds,
    action,
    reason
  });
  return response.data;
};

/**
 * Get location statistics for an activity
 */
export const getLocationStatistics = async (
  activityId: number
): Promise<{
  total_locations: number;
  total_capacity: number;
  total_registered: number;
  total_remaining: number;
  full_locations: number;
  active_locations: number;
}> => {
  const response = await api.get(`/activities/${activityId}/locations/statistics`);
  return response.data;
};

export default {
  // Location APIs
  getActivityLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,

  // Student APIs
  checkEligibility,
  registerForAssessment,
  cancelRegistration,
  getMyRegistrations,

  // Admin APIs
  getActivityRegistrations,
  batchUpdateRegistrations,
  getLocationStatistics
};
