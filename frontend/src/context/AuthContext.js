import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up API defaults
  useEffect(() => {
    const token = localStorage.getItem('access');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Load user on mount and handle redirection
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    const loadUser = async () => {
      if (!isMounted) return;
      
      try {
        const token = localStorage.getItem('access');
        if (token) {
          const response = await api.get('/accounts/me/');
          if (!isMounted) return;
          
          const userData = response.data;
          setUser(userData);
          
          // Only handle redirection if we're on the login page
          if (window.location.pathname === '/login') {
            if (userData.is_photographer) {
              window.location.href = '/dashboard';
            } else if (userData.is_staff || userData.is_superuser) {
              window.location.href = '/admin';
            } else {
              window.location.href = '/my-gallery';
            }
          }
        } else if (isMounted) {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to load user', err);
        if (err.response?.status === 401) {
          logout();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Debounce the loadUser function to prevent rapid successive calls
    const debouncedLoadUser = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(loadUser, 100);
    };
    
    // Initial load
    debouncedLoadUser();
    
    // Set up a listener for storage events to handle login/logout from other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'access') {
        if (e.newValue) {
          api.defaults.headers.common['Authorization'] = `Bearer ${e.newValue}`;
          debouncedLoadUser();
        } else {
          delete api.defaults.headers.common['Authorization'];
          if (isMounted) setUser(null);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Login with email/password
  const login = async (email, password) => {
    try {
      // Get authentication tokens
      const tokenResponse = await api.post('/accounts/token/', {
        email,
        password,
      });
      
      const { access, refresh } = tokenResponse.data;
      
      // Store tokens
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      
      // Set auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      // Fetch user data
      const userResponse = await api.get('/accounts/me/');
      const userData = userResponse.data;
      
      // Update user state
      setUser(userData);
      
      return { 
        success: true, 
        user: userData 
      };
    } catch (err) {
      console.error('Login failed', err);
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Login failed' 
      };
    }
  };

  // Social login
  const socialLogin = async (provider, accessToken) => {
    try {
      const response = await api.post(`/accounts/${provider}/`, {
        access_token: accessToken,
      });
      
      const { access, refresh, user: userData } = response.data;
      
      // Store tokens and set auth header
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      // Update user state
      setUser(userData);
      
      return { success: true };
    } catch (err) {
      console.error('Social login failed', err);
      return { success: false, error: err.response?.data?.detail || 'Social login failed' };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Register
  const register = async (userData) => {
    try {
      // Get CSRF token
      await api.get('/accounts/csrf/');
      
      // Prepare registration data
      const requestData = {
        email: userData.email,
        full_name: userData.name,  
        password: userData.password,
        confirm_password: userData.password,  
        is_photographer: userData.isPhotographer || false
      };
      
      // Make the registration request
      const response = await api.post('/accounts/register/', requestData);
      
      // If registration was successful, log the user in
      if (response.data && response.data.access) {
        const { access, refresh } = response.data;
        
        // Store tokens
        localStorage.setItem('access', access);
        localStorage.setItem('refresh', refresh);
        
        // Set auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        
        // Get user data
        const userResponse = await api.get('/accounts/me/');
        const userData = userResponse.data;
        
        // Update user state
        setUser(userData);
        
        return { 
          success: true, 
          user: userData 
        };
      } else {
        throw new Error('No access token received');
      }
    } catch (err) {
      console.error('Registration failed:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers
      });
      return { 
        success: false, 
        error: err.response?.data || { detail: 'Registration failed' },
        status: err.response?.status
      };
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    socialLogin,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
