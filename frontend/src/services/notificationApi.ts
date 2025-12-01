/**
 * Notification API Service
 * 通知相关API服务
 */

import api from './api';

// ============================================
// Types
// ============================================

export interface Notification {
  id: number;
  user_id: number;
  type: 'system' | 'activity' | 'achievement' | 'reminder' | 'announcement';
  title: string;
  content?: string;
  metadata?: Record<string, any>;
  related_type?: string;
  related_id?: number;
  is_read: boolean;
  read_at?: string;
  priority: number;
  expires_at?: string;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  summary?: string;
  type: 'notice' | 'update' | 'maintenance' | 'event';
  target_audience: 'all' | 'student' | 'teacher' | 'admin';
  is_pinned: boolean;
  is_popup: boolean;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  start_time?: string;
  end_time?: string;
  created_by?: number;
  creator_name?: string;
  created_at: string;
  is_read?: boolean;
}

export interface UnreadCount {
  notifications: number;
  announcements: number;
  total: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// ============================================
// User Notification APIs
// ============================================

/**
 * 获取通知列表
 */
export const getNotifications = async (params?: {
  type?: string;
  is_read?: boolean;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<Notification>> => {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.is_read !== undefined) queryParams.append('is_read', String(params.is_read));
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.page_size) queryParams.append('page_size', String(params.page_size));

  const response = await api.get(`/notifications${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
  return response.data;
};

/**
 * 获取未读数量
 */
export const getUnreadCount = async (): Promise<{ success: boolean; count: UnreadCount }> => {
  const response = await api.get('/notifications/unread-count');
  return response.data;
};

/**
 * 标记单个通知为已读
 */
export const markNotificationAsRead = async (notificationId: number): Promise<{ success: boolean; notification: Notification }> => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * 批量标记通知为已读
 */
export const markNotificationsAsRead = async (notificationIds: number[]): Promise<{ success: boolean; count: number }> => {
  const response = await api.put('/notifications/batch-read', { notification_ids: notificationIds });
  return response.data;
};

/**
 * 标记所有通知为已读
 */
export const markAllNotificationsAsRead = async (type?: string): Promise<{ success: boolean; count: number }> => {
  const response = await api.put('/notifications/read-all', { type });
  return response.data;
};

/**
 * 删除通知
 */
export const deleteNotification = async (notificationId: number): Promise<{ success: boolean }> => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};

/**
 * 批量删除通知
 */
export const deleteNotifications = async (notificationIds: number[]): Promise<{ success: boolean; count: number }> => {
  const response = await api.delete('/notifications/batch', { data: { notification_ids: notificationIds } });
  return response.data;
};

/**
 * 删除所有已读通知
 */
export const deleteAllReadNotifications = async (): Promise<{ success: boolean; count: number }> => {
  const response = await api.delete('/notifications/read');
  return response.data;
};

// ============================================
// Announcement APIs
// ============================================

/**
 * 获取公告列表（用户可见）
 */
export const getAnnouncements = async (params?: {
  page?: number;
  page_size?: number;
  include_read?: boolean;
}): Promise<PaginatedResponse<Announcement>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.page_size) queryParams.append('page_size', String(params.page_size));
  if (params?.include_read !== undefined) queryParams.append('include_read', String(params.include_read));

  const response = await api.get(`/notifications/announcements${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
  return response.data;
};

/**
 * 获取需要弹窗的公告
 */
export const getPopupAnnouncements = async (): Promise<{ success: boolean; announcements: Announcement[] }> => {
  const response = await api.get('/notifications/announcements/popup');
  return response.data;
};

/**
 * 获取公告详情
 */
export const getAnnouncementDetail = async (announcementId: number): Promise<{ success: boolean; announcement: Announcement }> => {
  const response = await api.get(`/notifications/announcements/${announcementId}`);
  return response.data;
};

/**
 * 标记公告为已读
 */
export const markAnnouncementAsRead = async (announcementId: number): Promise<{ success: boolean }> => {
  const response = await api.put(`/notifications/announcements/${announcementId}/read`);
  return response.data;
};

// ============================================
// Admin Announcement APIs
// ============================================

/**
 * 获取公告列表（管理后台）
 */
export const getAdminAnnouncements = async (params?: {
  status?: string;
  type?: string;
  target_audience?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<Announcement>> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.target_audience) queryParams.append('target_audience', params.target_audience);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.page_size) queryParams.append('page_size', String(params.page_size));

  const response = await api.get(`/notifications/admin/announcements${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
  return response.data;
};

/**
 * 创建公告
 */
export const createAnnouncement = async (data: {
  title: string;
  content: string;
  summary?: string;
  type?: string;
  target_audience?: string;
  is_pinned?: boolean;
  is_popup?: boolean;
  start_time?: string;
  end_time?: string;
}): Promise<{ success: boolean; announcement: Announcement }> => {
  const response = await api.post('/notifications/admin/announcements', data);
  return response.data;
};

/**
 * 更新公告
 */
export const updateAnnouncement = async (announcementId: number, data: Partial<Announcement>): Promise<{ success: boolean; announcement: Announcement }> => {
  const response = await api.put(`/notifications/admin/announcements/${announcementId}`, data);
  return response.data;
};

/**
 * 发布公告
 */
export const publishAnnouncement = async (announcementId: number): Promise<{ success: boolean; announcement: Announcement }> => {
  const response = await api.put(`/notifications/admin/announcements/${announcementId}/publish`);
  return response.data;
};

/**
 * 归档公告
 */
export const archiveAnnouncement = async (announcementId: number): Promise<{ success: boolean; announcement: Announcement }> => {
  const response = await api.put(`/notifications/admin/announcements/${announcementId}/archive`);
  return response.data;
};

/**
 * 删除公告
 */
export const deleteAnnouncement = async (announcementId: number): Promise<{ success: boolean }> => {
  const response = await api.delete(`/notifications/admin/announcements/${announcementId}`);
  return response.data;
};

// ============================================
// Export
// ============================================

export default {
  // User notifications
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteNotifications,
  deleteAllReadNotifications,

  // Announcements
  getAnnouncements,
  getPopupAnnouncements,
  getAnnouncementDetail,
  markAnnouncementAsRead,

  // Admin announcements
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement
};
