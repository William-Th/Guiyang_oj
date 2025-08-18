import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || window.location.origin;

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

export default api;