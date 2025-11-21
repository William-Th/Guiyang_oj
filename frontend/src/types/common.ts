/**
 * Common Type Definitions
 * Reusable types across the application
 */

/**
 * Generic API Error type
 * Used for error handling in catch blocks
 */
export interface ApiError {
  code?: string;
  message: string;
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  name?: string;
}

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

/**
 * Generic filter parameters
 * Used for search and filter functionality
 */
export type FilterParams = Record<string, string | number | boolean | undefined | null>;

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Date range filter
 */
export interface DateRange {
  startDate?: string;
  endDate?: string;
}

/**
 * Form field error
 */
export interface FieldError {
  name: string | string[];
  errors: string[];
}

/**
 * Form validation error
 */
export interface ValidationError extends Error {
  errorFields: FieldError[];
}

/**
 * Generic ID type
 */
export type ID = number | string;

/**
 * Generic timestamp fields
 */
export interface Timestamps {
  created_at: string;
  updated_at?: string;
}

/**
 * Common status types
 */
export type CommonStatus = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';

/**
 * Loading state helper
 */
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

/**
 * Select option for dropdowns
 */
export interface SelectOption<T = string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}

/**
 * Table column definition (for Ant Design)
 */
export interface TableColumn<T = unknown> {
  title: string;
  dataIndex: string;
  key: string;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  sorter?: boolean | ((a: T, b: T) => number);
  filters?: { text: string; value: string }[];
  onFilter?: (value: string | number | boolean, record: T) => boolean;
  width?: number | string;
  fixed?: 'left' | 'right';
}

/**
 * Component base props
 */
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Callback types
 */
export type VoidCallback = () => void;
export type AsyncVoidCallback = () => Promise<void>;
export type Callback<T> = (value: T) => void;
export type AsyncCallback<T> = (value: T) => Promise<void>;
