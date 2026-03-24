import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Interceptor para añadir el token Bearer automáticamente
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
