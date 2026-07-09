import axios from 'axios';

// API Base URL Configuration
// - Development (localhost:3000): Use empty string to trigger Vite proxy
// - Production (localhost:80 via Nginx): Use window.location.origin
const isDevelopment = window.location.port === '3000';
const API_BASE_URL = isDevelopment ? '' : window.location.origin;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Clear expired tokens and redirect to login on 401 errors
    if (error.response?.status === 401) {
      // Clear expired tokens from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Only redirect if we're not already on login page
      if (window.location.pathname !== '/login' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

      return Promise.reject({ ...error, silent: true });
    }
    return Promise.reject(error);
  }
);

// Certificate API
export const certificateApi = {
  // Apply for certificate
  apply: async (examId: number) => {
    const response = await api.post('/results/certificate', { examId });
    return response.data;
  },

  // Download certificate (old endpoint)
  download: async (examId: number) => {
    const response = await api.get(`/results/certificate/${examId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get available certificates
  getAvailable: async () => {
    const response = await api.get('/results/certificates/available');
    return response.data;
  }
};

// New Certificate API (New implementation)
export const certificateAPI = {
  // Generate certificate for student exam
  generate: async (studentExamId: number) => {
    const response = await api.post(`/certificates/generate/${studentExamId}`);
    return response.data;
  },

  // Download certificate by certificate number
  download: async (certNumber: string) => {
    const response = await api.get(`/certificate/download/${certNumber}`, {
      responseType: 'blob'
    });
    return response;
  },

  // Verify certificate by certificate number (public API, no auth required)
  verify: async (certNumber: string) => {
    const response = await api.get(`/certificate/verify/${certNumber}`);
    return response;
  },

  // Get student certificates
  getStudentCertificates: async (studentId: number) => {
    const response = await api.get(`/certificates/student/${studentId}`);
    return response.data;
  },

  // Get exam certificates (teacher/admin only)
  getExamCertificates: async (examId: number) => {
    const response = await api.get(`/certificates/exam/${examId}`);
    return response.data;
  },

  // Batch generate certificates (teacher/admin only)
  batchGenerate: async (examId: number) => {
    const response = await api.post(`/certificates/batch/${examId}`);
    return response.data;
  },

  // Get certificate statistics (teacher/admin only)
  getStatistics: async (examId?: number) => {
    const params = examId ? { examId } : {};
    const response = await api.get('/certificates/statistics', { params });
    return response.data;
  }
};

// Exam API
export const examApi = {
  // Get all exams
  getAllExams: async (filters?: { subject?: string; grade?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get(`/exams${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get exam details
  getExam: async (examId: number) => {
    const response = await api.get(`/exams/${examId}`);
    return response.data;
  },

  // Get exam with questions
  getExamQuestions: async (examId: number) => {
    const response = await api.get(`/exams/${examId}/questions`);
    return response.data;
  },

  // Register for exam
  registerExam: async (examId: number) => {
    const response = await api.post(`/exams/${examId}/register`);
    return response.data;
  },

  // Start exam
  startExam: async (examId: number) => {
    const response = await api.post(`/exams/${examId}/start`);
    return response.data;
  },

  // Submit exam
  submitExam: async (examId: number, answers: Array<{ questionId: number; answer: string }>) => {
    const response = await api.post(`/exams/${examId}/submit`, { answers });
    return response.data;
  },

  // Create exam (teacher/admin only)
  createExam: async (examData: {
    title: string;
    description?: string;
    subject: string;
    grade: string;
    startTime?: string;
    endTime?: string;
    duration: number;
    totalScore: number;
    passScore: number;
    status?: string;
  }) => {
    const response = await api.post('/exams', examData);
    return response.data;
  }
};

// Results API
export const resultsApi = {
  getStudentResults: async (studentId: number) => {
    const response = await api.get(`/results/student/${studentId}`);
    return response.data;
  },

  getExamResults: async (examId: number) => {
    const response = await api.get(`/results/exam/${examId}`);
    return response.data;
  }
};

// User Management API
export const userManagementApi = {
  // Get all users with filtering
  getAllUsers: async (filters?: { role?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get(`/users/all${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData: {
    username: string;
    password: string;
    role: string;
    realName: string;
    idCard?: string;
    phone?: string;
    email?: string;
  }) => {
    const response = await api.post('/users/create', userData);
    return response.data;
  },

  // Update user information and permissions
  updateUser: async (userId: number, userData: {
    realName?: string;
    role?: string;
    status?: 'active' | 'inactive' | 'suspended';
    phone?: string;
    email?: string;
  }) => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },

  // Reset user password
  resetPassword: async (userId: number, newPassword: string) => {
    const response = await api.put(`/users/${userId}/reset-password`, { newPassword });
    return response.data;
  },

  // Delete user (general - use deleteStudent/deleteTeacher for specific roles)
  deleteUser: async (userId: number) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },

  // Delete student account (handles foreign keys automatically)
  deleteStudent: async (userId: number) => {
    const response = await api.delete(`/users/student/${userId}`);
    return response.data;
  },

  // Delete teacher account (handles foreign keys automatically)
  deleteTeacher: async (userId: number) => {
    const response = await api.delete(`/users/teacher/${userId}`);
    return response.data;
  },

  // Get students list
  getStudents: async () => {
    const response = await api.get('/users/students');
    return response.data;
  },

  // Get teachers list
  getTeachers: async () => {
    const response = await api.get('/users/teachers');
    return response.data;
  },

  // Batch import users (placeholder for future implementation)
  importUsers: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/users/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

// Question Bank API
export const questionBankApi = {
  // Get all questions with filters
  getAllQuestions: async (filters?: {
    subject?: string;
    grade?: string;
    difficulty?: string;
    type?: string;
    scopes?: string[];
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.scopes && filters.scopes.length > 0) {
      // 支持多个 scope 参数
      filters.scopes.forEach(scope => params.append('scope', scope));
    }
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await api.get(`/question-bank/bank${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Search questions
  searchQuestions: async (searchTerm: string, filters?: { subject?: string; grade?: string }) => {
    const params = new URLSearchParams({ q: searchTerm });
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);

    const response = await api.get(`/question-bank/bank/search?${params.toString()}`);
    return response.data;
  },

  // Get single question
  getQuestion: async (id: number) => {
    const response = await api.get(`/question-bank/bank/${id}`);
    return response.data;
  },

  // Create question
  createQuestion: async (questionData: {
    type: string;
    subject: string;
    grade: string;
    content: string;
    options?: string[];
    correct_answer: any;
    score?: number;
    difficulty?: string;
    explanation?: string;
    tags?: string[];
    category_id?: number;
  }) => {
    const response = await api.post('/question-bank/bank', questionData);
    return response.data;
  },

  // Update question
  updateQuestion: async (id: number, questionData: any) => {
    const response = await api.put(`/question-drafts/${id}`, questionData);
    return response.data;
  },

  // Delete question
  deleteQuestion: async (id: number) => {
    const response = await api.delete(`/question-drafts/${id}`);
    return response.data;
  },

  // Clone question (create revision copy for published questions)
  cloneQuestion: async (id: number) => {
    const response = await api.post(`/question-drafts/${id}/clone`);
    return response.data;
  },

  // Get categories
  getCategories: async () => {
    const response = await api.get('/question-bank/categories');
    return response.data;
  },

  // Import questions from file
  importQuestions: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/question-bank/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Download import template
  downloadTemplate: async () => {
    const response = await api.get('/question-bank/import/template', {
      responseType: 'blob',
    });
    return response;
  },

  // Get abilities configuration
  getAbilities: async () => {
    const response = await api.get('/question-bank/config/abilities');
    return response.data;
  },

  // Get knowledge points for a specific subject
  getKnowledgePoints: async (subject: string) => {
    const response = await api.get(`/question-bank/config/knowledge-points/${subject}`);
    return response.data;
  },

  // Get all knowledge points
  getAllKnowledgePoints: async () => {
    const response = await api.get('/question-bank/config/knowledge-points');
    return response.data;
  },

  // Get formatted scope texts (将scope代码转换为中文显示)
  getScopeTexts: async (scopes: string[]) => {
    const response = await api.get('/question-bank/config/scopes', {
      params: { scopes: scopes.join(',') }
    });
    return response.data;
  },

  // Get user's available scopes (用户可见的题库范围)
  getMyScopes: async () => {
    const response = await api.get('/question-bank/my-scopes');
    return response.data;
  },

  // Withdraw a published question (撤回已发布的题目)
  withdrawQuestion: async (questionId: number, reason: string) => {
    const response = await api.post(`/question-bank/bank/${questionId}/withdraw`, { reason });
    return response.data;
  },

  // Export questions to Excel or CSV
  exportQuestions: async (filters?: {
    subject?: string;
    grade?: string;
    difficulty?: string;
    type?: string;
    scopes?: string[];
    district_code?: string;
    format?: 'excel' | 'csv';
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.scopes && filters.scopes.length > 0) {
      filters.scopes.forEach(scope => params.append('scope', scope));
    }
    if (filters?.district_code) params.append('district_code', filters.district_code);
    params.append('format', filters?.format || 'excel');

    const response = await api.get(`/question-bank/export${params.toString() ? '?' + params.toString() : ''}`, {
      responseType: 'blob',
    });
    return response;
  },
};

// Question Review API
export const questionReviewApi = {
  // Get my drafts
  getMyDrafts: async () => {
    const response = await api.get('/question-review/drafts');
    return response.data;
  },

  // Get my submissions
  getMySubmissions: async () => {
    const response = await api.get('/question-review/my-submissions');
    return response.data;
  },

  // Get available reviewers
  getAvailableReviewers: async (subject: string, targetScope?: string) => {
    const params = new URLSearchParams({ subject });
    if (targetScope) params.append('target_scope', targetScope);
    const response = await api.get(`/question-review/available-reviewers?${params.toString()}`);
    return response.data;
  },

  // Submit question for review (使用 target_scope)
  submitForReview: async (questionId: number, reviewerId: number, targetScope: string) => {
    const response = await api.post(`/question-review/${questionId}/submit`, {
      reviewer_id: reviewerId,
      target_scope: targetScope
    });
    return response.data;
  },

  // Publish question directly to school (校级题库直接发布，无需审核)
  publishToSchool: async (questionId: number, schoolId?: number) => {
    const response = await api.post(`/question-review/${questionId}/publish-school`, {
      school_id: schoolId
    });
    return response.data;
  },

  // Get pending reviews (for reviewers)
  getPendingReviews: async () => {
    const response = await api.get('/question-review/pending');
    return response.data;
  },

  // Review a question (approve/reject)
  reviewQuestion: async (questionId: number, status: 'approved' | 'rejected', comment: string) => {
    const response = await api.post(`/question-review/${questionId}/review`, {
      status,
      comment
    });
    return response.data;
  },

  // Get review history
  getReviewHistory: async (questionId: number) => {
    const response = await api.get(`/question-review/${questionId}/history`);
    return response.data;
  },
};

// Permission Management API
export const permissionApi = {
  // Get all permissions
  getAllPermissions: async (filters?: { is_active?: boolean; permission_type?: string }) => {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.permission_type) params.append('permission_type', filters.permission_type);
    const response = await api.get(`/permissions?${params.toString()}`);
    return response.data;
  },

  // Get user permissions
  getUserPermissions: async (userId: number) => {
    const response = await api.get(`/permissions/user/${userId}`);
    return response.data;
  },

  // Grant permission (支持新的权限体系)
  grantPermission: async (data: {
    user_id: number;
    permission_type: string;
    subjects: string[];
    scope_level?: string;
    district_id?: number;
    school_id?: number;
    expires_at?: string;
    notes?: string;
  }) => {
    const response = await api.post('/permissions/grant', data);
    return response.data;
  },

  // Revoke permission
  revokePermission: async (userId: number, permissionType: string) => {
    const response = await api.post('/permissions/revoke', {
      user_id: userId,
      permission_type: permissionType
    });
    return response.data;
  },

  // Check permission
  checkPermission: async (userId: number, permissionType: string, subject?: string) => {
    const response = await api.post('/permissions/check', {
      user_id: userId,
      permission_type: permissionType,
      subject
    });
    return response.data;
  },

  // Get available teachers (根据管理员权限范围过滤)
  getAvailableTeachers: async () => {
    const response = await api.get('/permissions/available-teachers');
    return response.data;
  },

  // Get available reviewers (根据 scope 和 subject 获取审核人)
  getAvailableReviewers: async (targetScope: string, subject: string) => {
    const params = new URLSearchParams();
    params.append('target_scope', targetScope);
    params.append('subject', subject);
    const response = await api.get(`/permissions/available-reviewers?${params.toString()}`);
    return response.data;
  },

  // Delete permission (只能删除已失效的权限)
  deletePermission: async (permissionId: number) => {
    const response = await api.delete(`/permissions/${permissionId}`);
    return response.data;
  },

  // Batch delete permissions (批量删除已失效的权限)
  batchDeletePermissions: async (permissionIds: number[]) => {
    const response = await api.post('/permissions/batch-delete', {
      permissionIds
    });
    return response.data;
  },

  // Get available practice scopes for current user (获取当前用户可发布练习的范围)
  getMyPracticeScopes: async () => {
    const response = await api.get('/permissions/my-practice-scopes');
    return response.data;
  },

  // Check practice publish permission (检查是否有特定范围的练习发布权限)
  checkPracticePublishPermission: async (scope: string, districtId?: number, schoolId?: number) => {
    const response = await api.post('/permissions/check-practice-publish', {
      scope,
      district_id: districtId,
      school_id: schoolId
    });
    return response.data;
  },
};

// Activity API (Practice and Assessment)
export const activityApi = {
  // Get all activities with filters
  getAllActivities: async (filters?: {
    subject?: string;
    grade?: string;
    status?: string;
    type?: 'practice' | 'assessment';
    ability_level?: string;
    scope?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.ability_level) params.append('ability_level', filters.ability_level);
    if (filters?.scope) params.append('scope', filters.scope);

    const response = await api.get(`/activities${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get activity details
  getActivity: async (activityId: number) => {
    const response = await api.get(`/activities/${activityId}`);
    return response.data;
  },

  // Get activity with questions (deprecated - use getStudentActivityDetail + getActivityQuestions for students)
  // This is kept for backward compatibility with teacher/admin views
  getActivityWithQuestions: async (activityId: number) => {
    const response = await api.get(`/activities/${activityId}/questions`);
    return response.data;
  },

  // Create practice activity (teachers and admins)
  createPracticeActivity: async (activityData: {
    title: string;
    description?: string;
    subject: string;
    grade: string;
    startTime?: string;
    endTime?: string;
    duration: number;
    totalScore: number;
    passScore: number;
    abilityLevel?: string;
    allowRetake?: boolean;
    maxAttempts?: number;
  }) => {
    const response = await api.post('/activities/practice', activityData);
    return response.data;
  },

  // Create assessment activity (high-level admins only)
  createAssessmentActivity: async (activityData: {
    title: string;
    description?: string;
    subject: string;
    grade: string;
    startTime?: string;
    endTime?: string;
    duration: number;
    totalScore: number;
    passScore: number;
    abilityLevel?: string;
    scope?: string;
    targetAudience?: {
      grades: string[];
      schools: number[];
      classes: number[];
    };
    certificateConfig?: {
      enabled: boolean;
      template: string | null;
      passingScore?: number;
      validityPeriod?: number;
    };
  }) => {
    const response = await api.post('/activities/assessment', activityData);
    return response.data;
  },

  // Update activity
  updateActivity: async (activityId: number, updateData: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    totalScore?: number;
    passScore?: number;
    abilityLevel?: string;
    allowRetake?: boolean;
    maxAttempts?: number;
    targetAudience?: object;
    certificateConfig?: object;
  }) => {
    const response = await api.put(`/activities/${activityId}`, updateData);
    return response.data;
  },

  // Update activity status (publish/cancel)
  updateActivityStatus: async (activityId: number, status: string) => {
    const response = await api.put(`/activities/${activityId}/status`, { status });
    return response.data;
  },

  // Delete activity (soft delete)
  deleteActivity: async (activityId: number) => {
    const response = await api.delete(`/activities/${activityId}`);
    return response.data;
  },

  // Student operations

  // Get available activities for student
  getAvailableActivities: async (filters?: {
    type?: 'practice' | 'assessment';
    ability_level?: string;
    subject?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.ability_level) params.append('ability_level', filters.ability_level);
    if (filters?.subject) params.append('subject', filters.subject);

    const response = await api.get(`/activities/available${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Register for activity
  registerActivity: async (activityId: number) => {
    const response = await api.post(`/activities/${activityId}/register`);
    return response.data;
  },

  // Register for activity (deprecated - old workflow, kept for backward compatibility)
  startActivityOld: async (activityId: number) => {
    const response = await api.post(`/activities/${activityId}/start`);
    return response.data;
  },

  // Save answers (auto-save during activity) - deprecated, use submitAnswer instead
  saveAnswers: async (studentActivityId: number, answers: Array<{ questionId: number; answer: string | string[] }>) => {
    const response = await api.post(`/student-activities/${studentActivityId}/save-answers`, { answers });
    return response.data;
  },

  // Submit activity with all answers (deprecated - old batch submission)
  submitActivityWithAnswers: async (studentActivityId: number, answers: Array<{ questionId: number; answer: string | string[] }>) => {
    const response = await api.post(`/student-activities/${studentActivityId}/submit`, { answers });
    return response.data;
  },

  // Get student's activity history
  getStudentHistory: async (filters?: {
    type?: 'practice' | 'assessment';
    subject?: string;
    grade?: string;
    ability_level?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.ability_level) params.append('ability_level', filters.ability_level);

    const response = await api.get(`/activities/student/history${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get activities created by current user (teachers/admins)
  getMyActivities: async (filters?: {
    type?: 'practice' | 'assessment';
    status?: string;
    subject?: string;
    ability_level?: string;
    grade?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.ability_level) params.append('ability_level', filters.ability_level);
    if (filters?.grade) params.append('grade', filters.grade);

    // Backend GET /activities automatically filters by created_by for teachers
    const response = await api.get(`/activities${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get activity statistics (teachers/admins)
  getActivityStatistics: async (activityId: number) => {
    const response = await api.get(`/activities/${activityId}/statistics`);
    return response.data;
  },

  // Get activity participants (teachers/admins)
  getActivityParticipants: async (activityId: number) => {
    const response = await api.get(`/activities/${activityId}/participants`);
    return response.data;
  },

  // Student-specific APIs
  // Get student practice list
  getStudentPractices: async (filters?: {
    subject?: string;
    grade?: string;
    ability_level?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.ability_level) params.append('ability_level', filters.ability_level);

    const response = await api.get(`/student/activities/practice${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get student assessment list
  getStudentAssessments: async (filters?: {
    subject?: string;
    grade?: string;
    ability_level?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.ability_level) params.append('ability_level', filters.ability_level);

    const response = await api.get(`/activities/assessments${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get student completed practices (已完成练习列表)
  getStudentCompletedPractices: async (filters?: {
    subject?: string;
    grade?: string;
    ability_level?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.ability_level) params.append('ability_level', filters.ability_level);

    const response = await api.get(`/student/activities/practice/completed${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get activity detail for student
  getStudentActivityDetail: async (activityId: number) => {
    const response = await api.get(`/student/activities/${activityId}`);
    return response.data;
  },

  // Start an activity
  startActivity: async (activityId: number) => {
    const response = await api.post(`/student/activities/${activityId}/start`);
    return response.data;
  },

  // Get questions for an activity
  getActivityQuestions: async (activityId: number) => {
    const response = await api.get(`/student/activities/${activityId}/questions`);
    return response.data;
  },

  // Submit answer for a question
  submitAnswer: async (activityId: number, data: { questionId: number; answer: any }) => {
    const response = await api.post(`/student/activities/${activityId}/answers`, data);
    return response.data;
  },

  // Get my answers for an activity
  getMyAnswers: async (activityId: number) => {
    const response = await api.get(`/student/activities/${activityId}/my-answers`);
    return response.data;
  },

  // Submit entire activity
  submitActivity: async (activityId: number) => {
    const response = await api.post(`/student/activities/${activityId}/submit`);
    return response.data;
  },

  // Get activity result
  getActivityResult: async (activityId: number) => {
    const response = await api.get(`/student/activities/${activityId}/result`);
    return response.data;
  },

  // Admin-specific APIs
  // Get admin assessment list (district/municipal admins)
  getAdminAssessments: async (filters?: {
    subject?: string;
    grade?: string;
    status?: string;
    scope?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.scope) params.append('scope', filters.scope);

    const response = await api.get(`/activities/admin/assessments${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Create admin assessment (district/municipal admins)
  createAdminAssessment: async (activityData: {
    title: string;
    description?: string;
    subject: string;
    grade: string;
    startTime?: string;
    endTime?: string;
    duration: number;
    totalScore: number;
    passScore: number;
    abilityLevel?: string;
    targetAudience?: {
      grades: string[];
      schools: number[];
      classes: number[];
    };
    certificateConfig?: {
      enabled: boolean;
      template: string | null;
      passingScore?: number;
      validityPeriod?: number;
    };
  }) => {
    const response = await api.post('/activities/admin/assessment', activityData);
    return response.data;
  },

  // Paper Generation APIs (组卷功能)

  // Get available questions for activity
  getAvailableQuestions: async (activityId: number, filters?: {
    type?: string;
    difficulty?: string;
    level?: string;
    knowledge_point?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.level) params.append('level', filters.level);
    if (filters?.knowledge_point) params.append('knowledge_point', filters.knowledge_point);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/activities/${activityId}/available-questions${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get activity paper (all questions with details)
  getActivityPaper: async (activityId: number) => {
    const response = await api.get(`/activities/${activityId}/paper`);
    return response.data;
  },

  // Get activity paper statistics
  getActivityPaperStats: async (activityId: number) => {
    const response = await api.get(`/activities/${activityId}/paper/stats`);
    return response.data;
  },

  // Add a question to activity
  addQuestionToActivity: async (activityId: number, questionData: {
    questionId: number;
    score?: number;
  }) => {
    const response = await api.post(`/activities/${activityId}/questions`, questionData);
    return response.data;
  },

  // Batch add questions to activity
  batchAddQuestions: async (activityId: number, questions: Array<{
    questionId: number;
    score?: number;
  }>) => {
    const response = await api.post(`/activities/${activityId}/questions/batch`, { questions });
    return response.data;
  },

  // Remove question from activity
  removeQuestionFromActivity: async (activityId: number, questionId: number) => {
    const response = await api.delete(`/activities/${activityId}/questions/${questionId}`);
    return response.data;
  },

  // Update question score in activity
  updateActivityQuestion: async (activityId: number, questionId: number, updates: {
    score?: number;
  }) => {
    const response = await api.put(`/activities/${activityId}/questions/${questionId}`, updates);
    return response.data;
  },

  // Reorder questions in activity
  reorderQuestions: async (activityId: number, orderUpdates: Array<{
    questionId: number;
    orderIndex: number;
  }>) => {
    const response = await api.put(`/activities/${activityId}/questions/reorder`, { orderUpdates });
    return response.data;
  },

  // Clear all questions from activity
  clearActivityPaper: async (activityId: number) => {
    const response = await api.delete(`/activities/${activityId}/paper`);
    return response.data;
  },

  // Batch remove questions from activity
  batchRemoveQuestions: async (activityId: number, questionIds: number[]) => {
    const response = await api.delete(`/activities/${activityId}/questions/batch`, {
      data: { questionIds }
    });
    return response.data;
  },

  // Validate activity paper before publishing
  validateActivityPaper: async (activityId: number) => {
    const response = await api.get(`/activities/${activityId}/paper/validate`);
    return response.data;
  },
};

// ============================================================================
// Teacher Grading APIs
// ============================================================================
export const gradingApi = {
  // Get pending grading list
  getPendingGrading: async (filters?: {
    activityId?: number;
    subject?: string;
    grade?: string;
    grading_status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.activityId) params.append('activityId', filters.activityId.toString());
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.grading_status) params.append('grading_status', filters.grading_status);

    const response = await api.get(`/teacher/grading/pending${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get student activity detail for grading
  getStudentActivityForGrading: async (studentActivityId: number) => {
    const response = await api.get(`/teacher/grading/student-activity/${studentActivityId}`);
    return response.data;
  },

  // Grade single answer
  gradeAnswer: async (answerId: number, data: {
    score: number;
    feedback?: string;
  }) => {
    const response = await api.put(`/teacher/grading/answers/${answerId}`, data);
    return response.data;
  },

  // Batch grade answers
  batchGradeAnswers: async (answers: Array<{
    answerId: number;
    score: number;
    feedback?: string;
  }>) => {
    const response = await api.put('/teacher/grading/batch', { answers });
    return response.data;
  },

  // Complete grading for student activity
  completeGrading: async (studentActivityId: number) => {
    const response = await api.post(`/teacher/grading/student-activity/${studentActivityId}/complete`);
    return response.data;
  },

  // Get grading statistics
  getGradingStats: async (activityId: number) => {
    const response = await api.get(`/teacher/grading/stats/${activityId}`);
    return response.data;
  },
};

// Achievement API
export const achievementApi = {
  // Get all achievements (admin only)
  getAllAchievements: async (filters?: {
    category?: string;
    rarity?: string;
    is_active?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.rarity) params.append('rarity', filters.rarity);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));

    const response = await api.get(`/achievements${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get student achievements
  getStudentAchievements: async (studentId: number) => {
    const response = await api.get(`/achievements/student/${studentId}`);
    return response.data;
  },

  // Get student achievement progress
  getStudentAchievementProgress: async (studentId: number) => {
    const response = await api.get(`/achievements/student/${studentId}/progress`);
    return response.data;
  },

  // Award achievement to student (admin/teacher only)
  awardAchievement: async (studentId: number, achievementId: number) => {
    const response = await api.post('/achievements/award', {
      studentId,
      achievementId
    });
    return response.data;
  },

  // Create new achievement (admin only)
  createAchievement: async (data: any) => {
    const response = await api.post('/achievements', data);
    return response.data;
  },

  // Update achievement (admin only)
  updateAchievement: async (achievementId: number, data: any) => {
    const response = await api.put(`/achievements/${achievementId}`, data);
    return response.data;
  },

  // Delete achievement (admin only)
  deleteAchievement: async (achievementId: number) => {
    const response = await api.delete(`/achievements/${achievementId}`);
    return response.data;
  },
};

// Points API
export const pointsApi = {
  // Get student points account
  getPointsAccount: async (studentId: number) => {
    const response = await api.get(`/points/account/${studentId}`);
    return response.data;
  },

  // Get points transactions history
  getPointsTransactions: async (studentId: number, filters?: {
    type?: 'earn' | 'spend';
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await api.get(`/points/transactions/${studentId}${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get points leaderboard
  getLeaderboard: async (filters?: {
    scope?: string;
    scopeId?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.scope) params.append('scope', filters.scope);
    if (filters?.scopeId) params.append('scopeId', filters.scopeId.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/points/leaderboard${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
};

// ============================================================================
// Statistics and Data Visualization APIs
// ============================================================================
export const statisticsApi = {
  // Student: Get ability statistics
  getStudentAbilities: async (filters?: {
    subject?: string;
    ability?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.ability) params.append('ability', filters.ability);

    const response = await api.get(`/statistics/student/abilities${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Student: Get knowledge point statistics
  getStudentKnowledgePoints: async (filters?: {
    subject?: string;
    knowledge_point?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.knowledge_point) params.append('knowledge_point', filters.knowledge_point);

    const response = await api.get(`/statistics/student/knowledge-points${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Student: Get learning overview
  getStudentOverview: async () => {
    const response = await api.get('/statistics/student/overview');
    return response.data;
  },

  // Teacher: Get school ability statistics
  getSchoolAbilities: async (filters?: {
    subject?: string;
    ability?: string;
    grade?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.ability) params.append('ability', filters.ability);
    if (filters?.grade) params.append('grade', filters.grade);

    const response = await api.get(`/statistics/teacher/school-abilities${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Teacher: Get district ability statistics (for district/city admins)
  getDistrictAbilities: async (filters?: {
    subject?: string;
    ability?: string;
    grade?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.ability) params.append('ability', filters.ability);
    if (filters?.grade) params.append('grade', filters.grade);

    const response = await api.get(`/statistics/teacher/district-abilities${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
};

// Teaching Class API - 教学班管理
export const teachingClassApi = {
  // Create teaching class
  create: async (data: {
    name: string;
    description?: string;
    scope: 'school' | 'district' | 'municipal';
    academic_year: string;
    subject?: string;
    grade?: string;
  }) => {
    const response = await api.post('/teaching-classes', data);
    return response.data;
  },

  // Get teaching class list
  getList: async (filters?: {
    scope?: string;
    status?: string;
    academic_year?: string;
    subject?: string;
    grade?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.scope) params.append('scope', filters.scope);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.academic_year) params.append('academic_year', filters.academic_year);
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/teaching-classes${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get teaching class detail
  getDetail: async (id: number) => {
    const response = await api.get(`/teaching-classes/${id}`);
    return response.data;
  },

  // Update teaching class
  update: async (id: number, data: {
    name?: string;
    description?: string;
    subject?: string;
    grade?: string;
  }) => {
    const response = await api.put(`/teaching-classes/${id}`, data);
    return response.data;
  },

  // Delete teaching class (draft only)
  delete: async (id: number) => {
    const response = await api.delete(`/teaching-classes/${id}`);
    return response.data;
  },

  // Submit for approval
  submitForApproval: async (id: number) => {
    const response = await api.post(`/teaching-classes/${id}/submit`);
    return response.data;
  },

  // Get pending approvals (admin)
  getPendingApprovals: async () => {
    const response = await api.get('/teaching-classes/admin/pending');
    return response.data;
  },

  // Approve teaching class
  approve: async (id: number, comment?: string) => {
    const response = await api.post(`/teaching-classes/${id}/approve`, { comment });
    return response.data;
  },

  // Reject teaching class
  reject: async (id: number, reason: string) => {
    const response = await api.post(`/teaching-classes/${id}/reject`, { reason });
    return response.data;
  },

  // Get students in teaching class
  getStudents: async (id: number) => {
    const response = await api.get(`/teaching-classes/${id}/students`);
    return response.data;
  },

  // Add student to teaching class
  addStudent: async (id: number, studentId: number) => {
    const response = await api.post(`/teaching-classes/${id}/students`, { student_id: studentId });
    return response.data;
  },

  // Batch add students
  addStudentsBatch: async (id: number, studentIds: number[]) => {
    const response = await api.post(`/teaching-classes/${id}/students/batch`, { student_ids: studentIds });
    return response.data;
  },

  // Remove student from teaching class
  removeStudent: async (id: number, studentId: number) => {
    const response = await api.delete(`/teaching-classes/${id}/students/${studentId}`);
    return response.data;
  },

  // Add activity to teaching class
  addActivity: async (id: number, activityId: number, options?: { deadline?: string; is_required?: boolean }) => {
    const response = await api.post(`/teaching-classes/${id}/activities`, {
      activity_id: activityId,
      ...options
    });
    return response.data;
  },

  // Remove activity from teaching class
  removeActivity: async (id: number, activityId: number) => {
    const response = await api.delete(`/teaching-classes/${id}/activities/${activityId}`);
    return response.data;
  },

  // Archive teaching class
  archive: async (id: number) => {
    const response = await api.post(`/teaching-classes/${id}/archive`);
    return response.data;
  },
};

// Judge API - Code judging service
export const judgeAPI = {
  // Submit code for judging
  submit: async (data: {
    questionId: number;
    activityId?: number;
    code: string;
    language?: string;
  }) => {
    const response = await api.post('/judge/submit', data);
    return response.data;
  },

  // Quick run - execute code without saving (for testing)
  run: async (data: {
    code: string;
    language?: string;
    input?: string;
    expectedOutput?: string;
  }) => {
    const response = await api.post('/judge/run', data);
    return response.data;
  },

  // Get submission status and results
  getStatus: async (submissionId: number | string) => {
    const response = await api.get(`/judge/status/${submissionId}`);
    return response.data;
  },

  // Get full submission details
  getSubmission: async (submissionId: number | string) => {
    const response = await api.get(`/judge/submission/${submissionId}`);
    return response.data;
  },

  // Get submission history for current user on a question
  getHistory: async (questionId: number, limit?: number) => {
    const response = await api.get(`/judge/history/${questionId}`, {
      params: { limit }
    });
    return response.data;
  },

  // Get supported programming languages
  getLanguages: async () => {
    const response = await api.get('/judge/languages');
    return response.data;
  },

  // Get sample test cases for a question
  getSampleTestCases: async (questionId: number) => {
    const response = await api.get(`/judge/testcases/${questionId}/samples`);
    return response.data;
  },

  // Get queue statistics (admin only)
  getQueueStats: async () => {
    const response = await api.get('/judge/queue/stats');
    return response.data;
  },
};

// Test Case Management API
export const testCaseAPI = {
  // Get all test cases for a question
  getTestCases: async (questionId: number) => {
    const response = await api.get(`/testcases/${questionId}`);
    return response.data;
  },

  // Get sample test cases only (public)
  getSamples: async (questionId: number) => {
    const response = await api.get(`/testcases/${questionId}/samples`);
    return response.data;
  },

  // Create a single test case
  create: async (questionId: number, testCase: {
    input_data?: string;
    expected_output: string;
    score?: number;
    time_limit?: number;
    memory_limit?: number;
    is_sample?: boolean;
    description?: string;
  }) => {
    const response = await api.post(`/testcases/${questionId}`, testCase);
    return response.data;
  },

  // Bulk create/replace test cases
  bulkCreate: async (questionId: number, testCases: Array<{
    input_data?: string;
    expected_output: string;
    score?: number;
    time_limit?: number;
    memory_limit?: number;
    is_sample?: boolean;
    description?: string;
  }>, replace: boolean = false) => {
    const response = await api.post(`/testcases/${questionId}/bulk`, {
      testCases,
      replace
    });
    return response.data;
  },

  // Update a test case
  update: async (questionId: number, testCaseId: number, data: {
    input_data?: string;
    expected_output?: string;
    score?: number;
    time_limit?: number;
    memory_limit?: number;
    is_sample?: boolean;
    description?: string;
  }) => {
    const response = await api.put(`/testcases/${questionId}/${testCaseId}`, data);
    return response.data;
  },

  // Delete a test case
  delete: async (questionId: number, testCaseId: number) => {
    const response = await api.delete(`/testcases/${questionId}/${testCaseId}`);
    return response.data;
  },

  // Delete all test cases for a question
  deleteAll: async (questionId: number) => {
    const response = await api.delete(`/testcases/${questionId}`);
    return response.data;
  },
};

// 题目图片上传
export const questionImageUploadApi = async (formData: FormData) => {
  const response = await api.post('/upload/question-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ============================================================================
// 阶段一~四新增 API
// ============================================================================

// 错题集（D4）
export const wrongQuestionApi = {
  list: async (filters?: { subject?: string; status?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const response = await api.get(`/wrong-questions${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
  getStats: async (subject?: string) => {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    const response = await api.get(`/wrong-questions/stats${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
  redo: async (questionId: number, answer: string) => {
    const response = await api.post(`/wrong-questions/${questionId}/redo`, { answer });
    return response.data;
  },
  mastered: async (questionId: number) => {
    const response = await api.post(`/wrong-questions/${questionId}/mastered`);
    return response.data;
  },
  remove: async (questionId: number) => {
    const response = await api.delete(`/wrong-questions/${questionId}`);
    return response.data;
  },
};

// 推荐 / 每日推题 / 连胜（D1/D3/D2）
export const recommendApi = {
  recommend: async (subject: string, count?: number, excludeShownIds?: number[]) => {
    const params = new URLSearchParams({ subject });
    if (count) params.append('count', count.toString());
    // 换一批：传入本会话已展示的 question_id（逗号拼接），后端排除以强制换内容
    if (excludeShownIds && excludeShownIds.length) {
      params.append('excludeShownIds', excludeShownIds.join(','));
    }
    const response = await api.get(`/student/activities/recommend${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
  dailyQuestions: async (subject?: string) => {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    const response = await api.get(`/student/activities/daily-questions${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
  answerQuestion: async (questionId: number, answer: any) => {
    const response = await api.post(`/student/activities/recommend/${questionId}/answer`, { answer });
    return response.data;
  },
  getStreak: async () => {
    const response = await api.get('/points/streak');
    return response.data;
  },
};

// 积分商店（E2）
export const shopApi = {
  listItems: async (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    const response = await api.get(`/shop/items${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
  purchase: async (itemId: number) => {
    const response = await api.post(`/shop/items/${itemId}/purchase`);
    return response.data;
  },
  myItems: async () => {
    const response = await api.get('/shop/my-items');
    return response.data;
  },
  equip: async (purchaseId: number, equip: boolean) => {
    const response = await api.post(`/shop/my-items/${purchaseId}/equip`, { equip });
    return response.data;
  },
};

// 题库治理（A1 提级 / A2 隐藏 / C4 配额 / C5 纠错 / 同质）
export const questionGovernanceApi = {
  promote: async (bankId: number) => {
    const response = await api.post(`/question-bank/bank/${bankId}/promote`);
    return response.data;
  },
  adminPromote: async (bankId: number) => {
    const response = await api.post(`/question-bank/bank/${bankId}/admin-promote`);
    return response.data;
  },
  listPromotions: async (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const response = await api.get(`/question-bank/promotions${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
  reviewPromotion: async (promotionId: number, approve: boolean, comment?: string) => {
    const response = await api.post(`/question-bank/promotions/${promotionId}/review`, { approve, comment });
    return response.data;
  },
  setHidden: async (bankId: number, isHidden: boolean) => {
    const response = await api.put(`/question-bank/bank/${bankId}/hidden`, { is_hidden: isHidden });
    return response.data;
  },
  getQuota: async (userId: number) => {
    const response = await api.get(`/question-bank/quotas/${userId}`);
    return response.data;
  },
  getMyQuota: async () => {
    const response = await api.get('/question-bank/my-quota');
    return response.data;
  },
  setQuota: async (userId: number, quota: number, reason?: string) => {
    const response = await api.put(`/question-bank/quotas/${userId}`, { quota, reason });
    return response.data;
  },
  listQuotas: async () => {
    const response = await api.get('/question-bank/quotas');
    return response.data;
  },
  checkSimilarity: async (draftId: number, againstDraftIds: number[]) => {
    const response = await api.post('/question-bank/similarity/check', { draftId, againstDraftIds });
    return response.data;
  },
  // 纠错（C5）
  listErrorReports: async (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const response = await api.get(`/error-reports${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
  submitErrorReport: async (questionId: number, errorType: string, errorDescription: string) => {
    const response = await api.post('/error-reports', { questionId, errorType, errorDescription });
    return response.data;
  },
  handleErrorReport: async (id: number, action: 'accepted' | 'rejected', comment?: string) => {
    const response = await api.post(`/error-reports/${id}/handle`, { action, comment });
    return response.data;
  },
};

// 组卷导出 / 虚拟练习 / 导入成绩（C2）
export const paperExportApi = {
  exportPaperPdfUrl: (activityId: number) => `/api/activities/${activityId}/paper/pdf`,
  importGradesTemplateUrl: () => '/api/activities/import-grades/template',
  importGrades: async (activityId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/activities/${activityId}/import-grades`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// 学习统计（E3）
export const learningStatsApi = {
  bySubject: async (subject?: string, weakThreshold?: number) => {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (weakThreshold) params.append('weak_threshold', weakThreshold.toString());
    const response = await api.get(`/statistics/student/by-subject${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
};

// 家长端（E4）
export const parentApi = {
  getChildren: async () => {
    const response = await api.get('/parent/children');
    return response.data;
  },
  getChildProfile: async (studentId: number) => {
    const response = await api.get(`/parent/children/${studentId}/profile`);
    return response.data;
  },
  getChildResults: async (studentId: number) => {
    const response = await api.get(`/parent/children/${studentId}/results`);
    return response.data;
  },
  getChildWrongQuestions: async (studentId: number, subject?: string) => {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    const response = await api.get(`/parent/children/${studentId}/wrong-questions${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },
  getChildStats: async (studentId: number) => {
    const response = await api.get(`/parent/children/${studentId}/stats`);
    return response.data;
  },
  registerForChild: async (studentId: number, activityId: number) => {
    const response = await api.post(`/parent/children/${studentId}/register/${activityId}`);
    return response.data;
  },
};

export default api;