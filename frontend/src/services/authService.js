import axios from 'axios';
import { API_BASE_URL } from '../config';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Check if token is valid
const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

// Get stored user from localStorage
const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Check if user is authenticated
const isAuthenticated = () => {
  const token = localStorage.getItem('access');
  return isTokenValid(token);
};

// Auth service methods
const authService = {
  // Google OAuth login
  googleAuth: async function(credential) {
    try {
      const response = await api.post('/api/accounts/google/', { credential });
      const { access, refresh, user } = response.data;
      
      if (access && user) {
        localStorage.setItem('access', access);
        if (refresh) {
          localStorage.setItem('refresh', refresh);
        }
        localStorage.setItem('user', JSON.stringify(user));
        this.setAuthHeader(access);
        return user;
      }
      
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  },

  // Login user
  login: async function(credentials) {
    try {
      // Clear any existing auth data
      this.logout();
      
      const response = await api.post('/api/accounts/login/', credentials);
      const { access, refresh, user } = response.data;
      
      if (access && user) {
        localStorage.setItem('access', access);
        if (refresh) {
          localStorage.setItem('refresh', refresh);
        }
        localStorage.setItem('user', JSON.stringify(user));
        this.setAuthHeader(access);
        return user;
      }
      
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout user
  logout: function() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
  },

  // Get user profile
  getProfile: async function() {
    try {
      const response = await api.get('/api/accounts/profile/');
      const userData = response.data;
      
      if (!userData || !userData.id) {
        throw new Error('Invalid user data received');
      }
      
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      if (error.response?.status === 401) {
        this.logout();
      }
      throw error;
    }
  },

  // Refresh access token
  refreshToken: async function() {
    try {
      console.log('[authService] Starting token refresh');
      
      const refreshToken = localStorage.getItem('refresh');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post(
        '/api/accounts/token/refresh/',
        { refresh: refreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000 // 10 second timeout
        }
      );
      
      const { access, refresh: newRefreshToken } = response.data;
      
      if (!access) {
        throw new Error('No access token in refresh response');
      }
      
      // Update tokens in localStorage
      localStorage.setItem('access', access);
      if (newRefreshToken) {
        localStorage.setItem('refresh', newRefreshToken);
      }
      
      // Update auth header
      this.setAuthHeader(access);
      
      // Verify the new token is valid
      if (!isTokenValid(access)) {
        throw new Error('New token is invalid');
      }
      
      console.log('[authService] Token refresh successful');
      return { access, refresh: newRefreshToken || refreshToken };
      
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
      
      // Add more specific error handling if needed
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Request setup error:', error.message);
      }
      
      throw error;
    }
  },

  // Get current user
  getCurrentUser: function() {
    return getStoredUser();
  },

  // Update user data
  updateUser: function(userData) {
    localStorage.setItem('user', JSON.stringify(userData));
  },
  
  // Set authentication header
  setAuthHeader: function(token) {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },

  // Helper to get CSRF token
  getCSRFToken: function() {
    if (typeof document === 'undefined') return '';
    
    const name = 'csrftoken=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for (let i = 0; i < cookieArray.length; i++) {
      const cookie = cookieArray[i].trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length);
      }
    }
    return '';
  },
  
  // Check if user is authenticated
  isAuthenticated: isAuthenticated,
  
  // Get stored user
  getStoredUser: getStoredUser,
  
  // Token validation
  isTokenValid: isTokenValid
};

export default authService;
