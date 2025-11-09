import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Achievement API Service
 * 成就系统前端API服务
 */

// ==================== 成就相关 ====================

/**
 * 获取所有成就列表
 */
export const getAllAchievements = async (filters?: {
  category?: string;
  rarity?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.rarity) params.append('rarity', filters.rarity);

  const response = await axios.get(`${API_BASE_URL}/achievements?${params.toString()}`);
  return response.data;
};

/**
 * 获取成就详情
 */
export const getAchievementById = async (achievementId: number) => {
  const response = await axios.get(`${API_BASE_URL}/achievements/${achievementId}`);
  return response.data;
};

/**
 * 获取学生的成就记录
 */
export const getStudentAchievements = async (studentId: number) => {
  const response = await axios.get(`${API_BASE_URL}/achievements/student/${studentId}`);
  return response.data;
};

/**
 * 获取学生成就进度
 */
export const getStudentAchievementProgress = async (studentId: number) => {
  const response = await axios.get(`${API_BASE_URL}/achievements/student/${studentId}/progress`);
  return response.data;
};

// ==================== 积分相关 ====================

/**
 * 获取学生积分账户
 */
export const getStudentPointsAccount = async (studentId: number) => {
  const response = await axios.get(`${API_BASE_URL}/points/account/${studentId}`);
  return response.data;
};

/**
 * 获取积分交易历史
 */
export const getPointsTransactionHistory = async (
  studentId: number,
  filters?: {
    transactionType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
) => {
  const params = new URLSearchParams();
  if (filters?.transactionType) params.append('transactionType', filters.transactionType);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await axios.get(
    `${API_BASE_URL}/points/transactions/${studentId}?${params.toString()}`
  );
  return response.data;
};

/**
 * 获取排行榜
 */
export const getLeaderboard = async (
  type: 'weekly' | 'monthly' | 'total' = 'total',
  scope?: string,
  limit: number = 100
) => {
  const params = new URLSearchParams();
  params.append('type', type);
  if (scope) params.append('scope', scope);
  params.append('limit', limit.toString());

  const response = await axios.get(`${API_BASE_URL}/points/leaderboard?${params.toString()}`);
  return response.data;
};

/**
 * 添加积分（管理员/教师权限）
 */
export const addPoints = async (data: {
  studentId: number;
  points: number;
  transactionType: string;
  sourceId?: number;
  sourceType?: string;
  description?: string;
  expiresAt?: string;
}) => {
  const response = await axios.post(`${API_BASE_URL}/points/add`, data);
  return response.data;
};
