import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
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

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => 
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }),
  register: (userData) => api.post('/auth/register', userData),
};

// Assignments API
export const assignmentsAPI = {
  list: () => api.get('/assignments'),
  get: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
};

// Submissions API
export const submissionsAPI = {
  upload: (assignmentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/submissions/${assignmentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  listByAssignment: (assignmentId) => api.get(`/submissions/assignment/${assignmentId}`),
  get: (id) => api.get(`/submissions/${id}`),
  triggerRegrade: (id) => api.post(`/submissions/${id}/regrade`),
};

// Grades API
export const gradesAPI = {
  getBySubmission: (submissionId) => api.get(`/grades/submission/${submissionId}`),
  get: (id) => api.get(`/grades/${id}`),
  update: (id, data) => api.patch(`/grades/${id}`, data),
  exportByAssignment: (assignmentId) => api.get(`/grades/assignment/${assignmentId}/export`),
};

export default api;
