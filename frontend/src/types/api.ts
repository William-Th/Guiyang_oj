/**
 * API Response Type Definitions
 * Standard API response structures
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  code?: number;
  success?: boolean;
}

/**
 * List response with pagination
 */
export interface ListResponse<T> {
  items?: T[];
  data?: T[];  // Alternative field name
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Authentication response
 */
export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    real_name?: string;
    role: string;
    phone?: string;
    email?: string;
  };
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * Success response (no data)
 */
export interface SuccessResponse {
  success: boolean;
  message: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string | number;
  details?: Record<string, unknown>;
}

/**
 * Upload response
 */
export interface UploadResponse {
  url: string;
  filename: string;
  size?: number;
  mimetype?: string;
}

/**
 * Batch operation response
 */
export interface BatchResponse {
  success: number;
  failed: number;
  total: number;
  errors?: Array<{
    id: number | string;
    error: string;
  }>;
}

/**
 * Statistics response
 */
export interface StatsResponse {
  [key: string]: number | string | boolean;
}
