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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to get CSRF token from cookies
const getCSRFToken = () => {
  if (typeof document === 'undefined') return ''; // For server-side rendering
  
  const name = 'csrftoken=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return '';
};

// Check if token is valid
const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (error) {
    console.error('Error checking token:', error);
    return false;
  }
};

// Get stored user from localStorage
const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Check if user is authenticated
const isAuthenticated = () => {
  const token = localStorage.getItem('access');
  return token && isTokenValid(token);
};

// Auth service methods
const authService = {
  // Google OAuth login
  async googleAuth(credential) {
    try {
      console.log('Sending Google credential to backend...');
      
      // Send the credential to the backend
      const response = await api.post('/api/accounts/google/', 
        { credential },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );
      
      console.log('Google auth response:', response.data);
      
      // Store the tokens
      if (response.data.access) {
        localStorage.setItem('access', response.data.access);
        if (response.data.refresh) {
          localStorage.setItem('refresh', response.data.refresh);
        }
        
        try {
          // Get user profile
          const userResponse = await api.get('/api/accounts/me/');
          if (userResponse.data) {
            const userData = userResponse.data;
            // Store user data
            localStorage.setItem('user', JSON.stringify(userData));
            return {
              ...response.data,
              user: userData
            };
          }
        } catch (profileError) {
          console.warn('Could not fetch user profile:', profileError);
          // Continue with the response even if profile fetch fails
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Google authentication error:', error);
      throw error;
    }
  },

  // Login user
  async login(credentials) {
    try {
      console.log('1. [authService.login] Attempting login with credentials');
      
      // Make the login request
      console.log('2. [authService.login] Sending login request to /api/accounts/token/');
      const response = await api.post('/api/accounts/token/', credentials);
      
      console.log('3. [authService.login] Login response received');
      const { access, refresh } = response.data;
      
      if (!access) {
        console.error('4. [authService.login] No access token in response:', response.data);
        throw new Error('No access token received from server');
      }
      
      console.log('4. [authService.login] Login successful, storing tokens');
      
      // Store tokens in localStorage
      localStorage.setItem('access', access);
      if (refresh) {
        localStorage.setItem('refresh', refresh);
      }
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      console.log('5. [authService.login] Auth header set');
      
      // Get user profile
      console.log('6. [authService.login] Fetching user profile...');
      const user = await this.getProfile();
      
      if (!user) {
        console.error('7. [authService.login] Failed to fetch user profile');
        throw new Error('Failed to fetch user profile after login');
      }
      
      console.log('7. [authService.login] User profile fetched successfully');
      return { 
        user, 
        accessToken: access,
        refreshToken: refresh 
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Logout user
  logout() {
    // Clear tokens from storage
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    
    // Remove auth header
    delete api.defaults.headers.common['Authorization'];
  },

  // Get user profile
  async getProfile() {
    try {
      console.log('1. [authService.getProfile] Starting profile fetch');
      
      // Check if we have a token
      const token = localStorage.getItem('access');
      if (!token) {
        console.error('2. [authService.getProfile] No access token found');
        return null;
      }
      
      console.log('2. [authService.getProfile] Token found, preparing request');
      
      // Set auth header for this request
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      };
      
      console.log('3. [authService.getProfile] Sending request to /api/accounts/me/');
      const response = await api.get('/api/accounts/me/', config);
      
      if (!response.data) {
        console.error('4. [authService.getProfile] No data in response');
        throw new Error('No user data received');
      }
      
      console.log('4. [authService.getProfile] Received profile data');
      
      // Handle different response formats
      let userData = response.data;
      if (userData && userData.data) {
        console.log('5. [authService.getProfile] Unwrapping nested data structure');
        userData = userData.data; // Handle nested data structure
      }
      
      if (!userData) {
        console.error('6. [authService.getProfile] Invalid user data format');
        throw new Error('Invalid user data format received');
      }
      
      // Store user data in localStorage
      console.log('6. [authService.getProfile] Storing user data in localStorage');
      localStorage.setItem('user', JSON.stringify(userData));
      
      console.log('7. [authService.getProfile] Profile fetch successful');
      
      return userData;
    } catch (error) {
      // If unauthorized, clear tokens and redirect to login
      if (error.response && error.response.status === 401) {
        this.logout();
      }
      throw this.handleError(error);
    }
  },

  // Refresh access token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post('/api/accounts/token/refresh/', {
        refresh: refreshToken
      });
      
      const { access } = response.data;
      
      if (!access) {
        throw new Error('No access token in refresh response');
      }
      
      // Update the access token in localStorage and axios defaults
      localStorage.setItem('access', access);
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      return access;
    } catch (error) {
      this.logout();
      throw this.handleError(error);
    }
  },

  // Get current user
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Update user data
  updateUser(userData) {
    localStorage.setItem('user', JSON.stringify(userData));
  },

  // Logout user
  logout() {
    // Clear tokens from storage
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
  },

  // Helper to get CSRF token
  getCSRFToken() {
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
  isAuthenticated,
  
  // Get stored user
  getStoredUser
};

export default authService;
