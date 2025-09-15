import axios from 'axios';
import { API_BASE_URL } from '../config';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple simultaneous token refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      return;

    }
  });
  failedQueue = [];
};

// Add a request interceptor to include the auth token in requests
api.interceptors.request.use(
  (config) => {
    // Don't intercept refresh token request to prevent infinite loops
    if (config.url.includes('/token/refresh/')) {
      return config;
    }
    
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

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't already tried to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we're already refreshing the token, add this request to the queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark that we're refreshing the token
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const { access } = await authService.refreshToken();
        
        // Update the authorization header
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        // Process any queued requests
        processQueue(null, access);
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear auth data and reject all queued requests
        processQueue(refreshError, null);
        authService.logout();
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
      // For other errors, just reject
    return Promise.reject(error);
  }
);

// Check if token is valid
const isTokenValid = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    // Decode the payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token has expired
    const currentTime = Date.now() / 1000; // Convert to seconds
    const isExpired = payload.exp < currentTime;
    
    if (isExpired) {
      return false;
    }
        
    return true;
    
  } catch (error) {
    return false;
  }
};

// Get stored user from localStorage with validation
const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return null;
    }
    
    const user = JSON.parse(userStr);
    
    // Basic validation of user object
    if (!user || typeof user !== 'object' || !user.id) {
      localStorage.removeItem('user');
      return null;
    }
        
    return user;
    
  } catch (error) {
    // Clean up corrupted user data
    localStorage.removeItem('user');
    return null;
  }
};

// Check if user is authenticated with comprehensive validation
const isAuthenticated = () => {
  const token = localStorage.getItem('access');
  const user = getStoredUser();
  
  // Check if we have both a valid token and user data
  const tokenValid = isTokenValid(token);
  const hasUser = !!user;
  
  // console.log('[authService] Authentication check:', {
  //   hasToken: !!token,
  //   tokenValid,
  //   hasUser
  // });
  
  // If token is invalid but we have a user, clean up
  if (!tokenValid && hasUser) {
    localStorage.removeItem('user');
  }
  
  return tokenValid && hasUser;
};

// Auth service methods
const authService = {
  // Google OAuth login
  googleAuth: async function(credential) {
    const response = await api.post('/api/accounts/google/', { credential });
    const { access, refresh, user } = response.data;
  
    if (access && user) {
      localStorage.setItem('access', access);
      if (refresh) {
        localStorage.setItem('refresh', refresh);
      }
      localStorage.setItem('user', JSON.stringify(user));
      this.setAuthHeader(access);
  
      // return everything so AuthProvider can use it
      return { access, refresh, user };
    }
  
    throw new Error('Invalid response from server');
  },

  // Login user
  login: async function(credentials) {
    try {
      // Clear any existing auth data
      this.logout();
      
      const response = await api.post('/api/accounts/token/', {
        email: credentials.email,
        password: credentials.password
      });
      
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

  // getProfile: async function() {
  //   try {
  //     const response = await api.get('/api/accounts/profile/');
  //     const userData = response.data;
      
  //     if (!userData || !userData.id) {
  //       throw new Error('Invalid user data received');
  //     }
      
  //     // Update stored user data
  //     localStorage.setItem('user', JSON.stringify(userData));
  //     return userData;
  //   } catch (error) {
  //     if (error.response?.status === 401) {
  //       this.logout();
  //     }
  //     throw error;
  //   }
  // },

  // Refresh access token
  
  
  
  refreshToken: async function() {
    try {
      console.log('[authService] Starting token refresh');
      
      const refreshToken = localStorage.getItem('refresh');
      if (!refreshToken) {
        console.error('[authService] No refresh token available');
        throw new Error('No refresh token available');
      }
      
      // Create a new axios instance without interceptors to avoid infinite loops
      const refreshApi = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });
      
      const response = await refreshApi.post(
        '/api/accounts/token/refresh/',
        { refresh: refreshToken }
      );
      
      const { access, refresh: newRefreshToken } = response.data;
      
      if (!access) {
        throw new Error('No access token in refresh response');
      }
      
      // Verify the new token is valid before saving
      if (!isTokenValid(access)) {
        throw new Error('New token is invalid');
      }
      
      // Update tokens in localStorage
      localStorage.setItem('access', access);
      if (newRefreshToken) {
        console.log('[authService] New refresh token received');
        localStorage.setItem('refresh', newRefreshToken);
      }
      
      // Update auth header for future requests
      this.setAuthHeader(access);
      
      return { 
        access, 
        refresh: newRefreshToken || refreshToken 
      };
      
    } catch (error) {
      console.error('[authService] Token refresh failed:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('[authService] Response status:', error.response.status);
        console.error('[authService] Response data:', error.response.data);
        
        // If we get a 401, the refresh token is invalid or expired
        if (error.response.status === 401) {
          console.log('[authService] Refresh token is invalid or expired');
          // Clear all auth data
          this.logout();
          throw new Error('Session expired. Please log in again.');
        }
      } else if (error.request) {
        console.error('[authService] No response received:', error.request);
      } else {
        console.error('[authService] Request setup error:', error.message);
      }
      
      // Don't logout for network errors, just throw
      if (!error.response) {
        throw new Error('Network error. Please check your connection.');
      }
      
      // For other errors, let the caller decide what to do
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
    if (token && isTokenValid(token)) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('access', token); // Ensure token is saved
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('access');
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
