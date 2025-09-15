import axios from 'axios';
import authService from '../services/authService';
import { API_BASE_URL } from '../config';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CSRF and session cookies
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Don't intercept refresh token request to prevent infinite loops
    if (config.url.includes('/token/') || config.url.includes('/login/')) {
      return config;
    }
    
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token if available
    const csrfToken = authService.getCSRFToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is not 401 or it's a retry request, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    
    // Mark the request as a retry
    originalRequest._retry = true;
    
    try {
      // Try to refresh the token
      await authService.refreshToken();
      
      // Update the Authorization header
      const token = localStorage.getItem('access');
      if (token) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
      }
      
      // Retry the original request
      return api(originalRequest);
    } catch (refreshError) {
      // If refresh fails, log the user out
      console.error('Token refresh failed:', refreshError);
      authService.logout();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }
);

// Cache implementation
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const { timestamp, data } = cached;
  if (Date.now() - timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return data;
};

// API methods with caching
export const getWithCache = async (url, config = {}) => {
  const cacheKey = JSON.stringify({ url, ...config });
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    return { data: cachedData };
  }
  
  const response = await api.get(url, config);
  cache.set(cacheKey, {
    timestamp: Date.now(),
    data: response.data,
  });
  
  return response;
};

export default api;