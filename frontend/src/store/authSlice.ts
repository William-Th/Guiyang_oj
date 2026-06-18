import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string
  username: string
  role: 'student' | 'teacher' | 'admin' | 'school_admin' | 'district_admin' | 'municipal_school_admin' | 'base_school_admin' | 'municipal_admin' | 'system_admin' | 'parent'
  realName?: string
  school?: string
  grade?: string
  class?: string
  email?: string
  phone?: string
  idCard?: string
  createdAt?: string
  avatarUrl?: string
  status?: string
  updatedAt?: string
  // Teacher-specific fields
  teacherNo?: string
  subjects?: string[]
  title?: string
  schoolId?: number
  district?: string
  // Student-specific fields
  studentNo?: string
  guardianName?: string
  guardianPhone?: string
  // Admin-specific fields
  districtId?: number
  permissionScope?: string
  managementLevel?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
}

// Helper function to get stored user
const getStoredUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const storedToken = localStorage.getItem('token');
const storedUser = getStoredUser();

const initialState: AuthState = {
  user: storedUser,
  token: storedToken,
  isAuthenticated: !!(storedToken && storedUser),
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    loginFailure: (state) => {
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;