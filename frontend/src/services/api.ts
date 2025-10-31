import axios from 'axios';

// 使用相对路径，通过Nginx代理到后端
const API_BASE_URL = window.location.origin;
// const API_BASE_URL = 'http://localhost:3001'; // 仅用于本地开发

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
    role: 'student' | 'teacher' | 'admin';
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
    role?: 'student' | 'teacher' | 'admin';
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
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.type) params.append('type', filters.type);
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
    const response = await api.put(`/question-bank/bank/${id}`, questionData);
    return response.data;
  },

  // Delete question
  deleteQuestion: async (id: number) => {
    const response = await api.delete(`/question-bank/bank/${id}`);
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
  getAvailableReviewers: async (subject: string, scope?: string) => {
    const params = new URLSearchParams({ subject });
    if (scope) params.append('scope', scope);
    const response = await api.get(`/question-review/available-reviewers?${params.toString()}`);
    return response.data;
  },

  // Submit question for review
  submitForReview: async (questionId: number, reviewerId: number, scope: string[]) => {
    const response = await api.post(`/question-review/${questionId}/submit`, {
      reviewer_id: reviewerId,
      scope
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

  // Grant permission
  grantPermission: async (data: {
    user_id: number;
    permission_type: string;
    subjects: string[];
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
    ability_level?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.ability_level) params.append('ability_level', filters.ability_level);

    const response = await api.get(`/activities/history${params.toString() ? '?' + params.toString() : ''}`);
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

    const response = await api.get(`/student/activities/assessment${params.toString() ? '?' + params.toString() : ''}`);
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
    isRequired?: boolean;
    section?: string;
  }) => {
    const response = await api.post(`/activities/${activityId}/questions`, questionData);
    return response.data;
  },

  // Batch add questions to activity
  batchAddQuestions: async (activityId: number, questions: Array<{
    questionId: number;
    score?: number;
    isRequired?: boolean;
    section?: string;
  }>) => {
    const response = await api.post(`/activities/${activityId}/questions/batch`, { questions });
    return response.data;
  },

  // Remove question from activity
  removeQuestionFromActivity: async (activityId: number, questionId: number) => {
    const response = await api.delete(`/activities/${activityId}/questions/${questionId}`);
    return response.data;
  },

  // Update question properties in activity
  updateActivityQuestion: async (activityId: number, questionId: number, updates: {
    score?: number;
    isRequired?: boolean;
    section?: string;
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

    const response = await api.get(`/grading/pending${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get student activity detail for grading
  getStudentActivityForGrading: async (studentActivityId: number) => {
    const response = await api.get(`/grading/student-activity/${studentActivityId}`);
    return response.data;
  },

  // Grade single answer
  gradeAnswer: async (answerId: number, data: {
    score: number;
    feedback?: string;
  }) => {
    const response = await api.put(`/grading/answers/${answerId}`, data);
    return response.data;
  },

  // Batch grade answers
  batchGradeAnswers: async (answers: Array<{
    answerId: number;
    score: number;
    feedback?: string;
  }>) => {
    const response = await api.put('/grading/batch', { answers });
    return response.data;
  },

  // Complete grading for student activity
  completeGrading: async (studentActivityId: number) => {
    const response = await api.post(`/grading/student-activity/${studentActivityId}/complete`);
    return response.data;
  },

  // Get grading statistics
  getGradingStats: async (activityId: number) => {
    const response = await api.get(`/grading/stats/${activityId}`);
    return response.data;
  },
};

export default api;