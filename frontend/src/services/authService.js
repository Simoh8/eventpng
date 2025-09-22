import axios from 'axios';
import { API_BASE_URL } from '../config';


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  withCredentials: true, 
});


let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
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

api.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Only handle 401 errors and avoid retry loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, add to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const refreshed = await authService.refreshToken();
        if (refreshed?.access) {
          localStorage.setItem('access', refreshed.access);
          api.defaults.headers.common['Authorization'] = `Bearer ${refreshed.access}`;
          
          // Process queued requests
          processQueue(null, refreshed.access);
          
          return api(originalRequest); // retry the failed request
        }
      } catch (refreshError) {
        // console.error('[Axios] Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        authService.logout();
      } finally {
        isRefreshing = false;
      }
    }
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
  
  // If token is invalid but we have a user, clean up
  if (!tokenValid && hasUser) {
    localStorage.removeItem('user');
  }
  
  return tokenValid && hasUser;
};

// Get CSRF token from cookies
const getCSRFToken = () => {
  // Get CSRF token from cookies if using session authentication
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  
  return cookieValue || null;
};

// Auth service methods
const authService = {
  // Add CSRF token getter
  getCSRFToken,
  // Register a new user
  register: async function(userData) {
    try {
      // Make sure required fields are present
      if (!userData.email || !userData.password || !userData.full_name) {
        throw new Error('Email, password, and full name are required');
      }

      // Prepare the registration data
      const registrationData = {
        email: userData.email,
        full_name: userData.full_name,
        password: userData.password,
        confirm_password: userData.confirmPassword || userData.password,
        is_photographer: userData.is_photographer || false
      };
      
      // Add optional fields if they exist
      if (userData.phone_number) {
        registrationData.phone_number = userData.phone_number;
      }

      // Make the API call
      const response = await api.post('/api/accounts/register/', registrationData);
      
      // If we get here, registration was successful
      return {
        success: true,
        data: response.data,
        message: 'Registration successful!',
        user: response.data.user,
        access: response.data.access,
        refresh: response.data.refresh
      };
      
    } catch (error) {
      
      // Handle different types of errors
      if (error.response) {
        const { data, status } = error.response;
        
        return {
          success: false,
          error: data.detail || 'Registration failed',
          errors: data,
          status
        };
      } else if (error.request) {
        return {
          success: false,
          error: 'No response from server. Please try again later.'
        };
      } else {
        return {
          success: false,
          error: error.message || 'An error occurred during registration.'
        };
      }
    }
  },
  
  // Google OAuth login
  googleAuth: async function(credential) {
    try {
      
      // Try to get CSRF token from cookies
      let csrfToken = this.getCSRFToken();
      
      // If no CSRF token found in cookies, try to get it from the meta tag
      if (!csrfToken && typeof document !== 'undefined') {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
          csrfToken = metaTag.getAttribute('content');
        }
      }

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      // Add CSRF token if available
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/api/accounts/google/`,
        { credential },
        {
          headers,
          withCredentials: true,
        }
      );
      
      if (response.data?.access && response.data?.user) {
        const { access, refresh, user } = response.data;
        
        // Store tokens and user data
        localStorage.setItem('access', access);
        if (refresh) {
          localStorage.setItem('refresh', refresh);
        }
        localStorage.setItem('user', JSON.stringify(user));
        
        // Set auth header for future requests
        this.setAuthHeader(access);
        
        // Return in the same format as the login function
        return { 
          access, 
          refresh, 
          user,
          data: { access, refresh, user } // For compatibility with the login flow
        };
      } else {
        throw new Error('Invalid response from Google OAuth');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  },

  // Login user
  login: async function(credentials) {
    this.logout();
    const response = await api.post('/api/accounts/token/', {
      email: credentials.email,
      password: credentials.password
    });
    
    const { access, refresh, user } = response.data;
    
    if (access && user) {
      localStorage.setItem('access', access);
      if (refresh) localStorage.setItem('refresh', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      this.setAuthHeader(access);
      return { user, access, refresh }; // ✅ return everything
    }
    
    throw new Error('Invalid response from server');
  },
  

  // Logout user
  logout: function() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
  },

  // Refresh access token
  refreshToken: async function() {
    try {
      const refreshToken = localStorage.getItem('refresh');
      if (!refreshToken) {
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
        localStorage.setItem('refresh', newRefreshToken);
      }
      
      // Update auth header for future requests
      this.setAuthHeader(access);
      
      return { 
        access, 
        refresh: newRefreshToken || refreshToken 
      };
      
    } catch (error) {
      // If we get a 401, the refresh token is invalid or expired
      if (error.response?.status === 401) {
        // Clear all auth data
        this.logout();
        throw new Error('Session expired. Please log in again.');
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





  forgotPassword: async (email) => {
    try {
      const response = await api.post('/api/accounts/auth/password/reset/', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  resetPassword: async (uid, token, newPassword) => {
    try {
      const response = await api.post('/api/accounts/auth/password/reset/confirm/', {
        uid,
        token,
        new_password1: newPassword,
        new_password2: newPassword, // Send the same password twice as confirmation
      });
      return response.data;
    } catch (error) {
      // Return the full error response for better error handling
      const errorData = error.response?.data;
      if (errorData) {
        throw errorData;
      }
      throw new Error(error.message || 'Failed to reset password');
    }
  },
  // Check if user is authenticated
  isAuthenticated: isAuthenticated,
  

  // Get stored user
  getStoredUser: getStoredUser,
  
  // Token validation
  isTokenValid: isTokenValid
};

export default authService;