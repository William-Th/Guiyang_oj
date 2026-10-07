/**
 * 通知中心契约（对后端 src/routes/notifications.js 核实）：
 * - GET /notifications 返回 { success, data, pagination }，支持 type/is_read/分页；
 * - 未读数 = 用户通知 + 目标受众内公告，两套已读体系互相独立；
 * - 全部已读只作用于用户通知；公告点开需单独调公告已读。
 */
import { request } from '../utils/request';

export interface UserNotification {
  id: number;
  /** system | achievement | activity | reminder | announcement（历史数据以库为准） */
  type: string;
  title: string;
  content?: string;
  related_type?: string;
  related_id?: number;
  is_read: boolean;
  created_at?: string;
}

export interface NotificationPagination {
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

export interface UnreadCounts {
  notifications: number;
  announcements: number;
  total: number;
}

export interface SystemAnnouncement {
  id: number;
  title: string;
  content: string;
  summary?: string;
  /** notice | activity | emergency…（展示兜底为"公告"） */
  type: string;
  is_pinned?: boolean;
  published_at?: string;
  is_read?: boolean;
}

export function getNotifications(page = 1, isRead?: boolean, pageSize = 20) {
  let query = `?page=${page}&page_size=${pageSize}`;
  if (isRead !== undefined) query += `&is_read=${String(isRead)}`;
  return request<{ success: boolean; data: UserNotification[]; pagination: NotificationPagination }>(
    'GET',
    `/notifications${query}`
  );
}

export function getUnreadCounts() {
  return request<{ success: boolean; count: UnreadCounts }>('GET', '/notifications/unread-count');
}

export function markNotificationRead(id: number) {
  return request<{ success: boolean }>('PUT', `/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return request<{ success: boolean }>('PUT', '/notifications/read-all');
}

export function getAnnouncements(page = 1, pageSize = 10) {
  return request<{ success: boolean; data: SystemAnnouncement[]; pagination: NotificationPagination }>(
    'GET',
    `/notifications/announcements?page=${page}&page_size=${pageSize}`
  );
}

export function markAnnouncementRead(id: number) {
  return request<{ success: boolean }>('PUT', `/notifications/announcements/${id}/read`);
}
