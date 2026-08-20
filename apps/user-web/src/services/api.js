import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach token & active organization ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    const activeOrgId = localStorage.getItem('active_org_id');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (activeOrgId) {
      config.headers['x-organization-id'] = activeOrgId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 token refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
          if (res.data?.success && res.data.data?.accessToken) {
            localStorage.setItem('access_token', res.data.data.accessToken);
            localStorage.setItem('refresh_token', res.data.data.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
