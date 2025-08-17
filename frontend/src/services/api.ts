import axios from 'axios'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Certificate API
export const certificateApi = {
  // Apply for certificate
  apply: async (examId: number) => {
    const response = await api.post('/results/certificate', { examId })
    return response.data
  },

  // Download certificate
  download: async (examId: number) => {
    const response = await api.get(`/results/certificate/${examId}/download`, {
      responseType: 'blob'
    })
    return response.data
  },

  // Get available certificates
  getAvailable: async () => {
    const response = await api.get('/results/certificates/available')
    return response.data
  }
}

// Results API
export const resultsApi = {
  getStudentResults: async (studentId: number) => {
    const response = await api.get(`/results/student/${studentId}`)
    return response.data
  },

  getExamResults: async (examId: number) => {
    const response = await api.get(`/results/exam/${examId}`)
    return response.data
  }
}

export default api