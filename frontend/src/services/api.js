import axios from 'axios';
import { API_BASE_URL } from '../config';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token for non-GET requests
    const csrfToken = getCSRFToken();
    if (csrfToken && config.method !== 'get') {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to get CSRF token from cookies or fetch a new one
function getCSRFToken() {
  // First try to get from cookies
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
    
  if (cookieValue) {
    return cookieValue;
  }
  
  // If not in cookies, try to fetch a new one
  try {
    return fetch(`${API_BASE_URL}accounts/csrf/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    })
    .then(response => {
      if (!response.ok) {
        return '';
      }
      return document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';
    })
    .catch(error => {
      return '';
    });
  } catch (error) {
    return '';
  }
}

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already tried to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh');
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}accounts/token/refresh/`,
            { refresh: refreshToken },
            { 
              withCredentials: true,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          const { access } = response.data;
          if (access) {
            localStorage.setItem('access', access);
            api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
            originalRequest.headers['Authorization'] = `Bearer ${access}`;
            
            // Retry the original request with the new token
            return api(originalRequest);
          }
        }
      } catch (error) {
        // Clear auth data and redirect to login
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => 
    api.post('/api/accounts/token/', { email, password }),
  
  refreshToken: (refresh) => 
    api.post('/api/accounts/token/refresh/', { refresh }),
  
  getCurrentUser: () => 
    api.get('/api/accounts/me/'),
};

export default api;
