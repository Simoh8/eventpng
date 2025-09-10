import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config';
import api from '../services/api';

const AuthContext = createContext(null);

// Cache for the auth state
let authPromise = null;
let lastAuthCheck = 0;
let isCheckingAuth = false;
const AUTH_CACHE_TIME = 5 * 60 * 1000; // 5 minutes cache
const AUTH_RETRY_DELAY = 1000; // 1 second delay between retries

// Memoize the default context value to prevent unnecessary re-renders
const defaultContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({}),
  logout: () => {},
  register: async () => ({}),
  updateUser: () => {},
  loginWithGoogle: async () => { 
    console.error('loginWithGoogle called before initialization');
    return { success: false, error: 'Auth context not initialized' };
  }
};

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });
  
  const { user, isLoading, isAuthenticated, error } = state;
  
  const authCheckRef = useRef({
    hasChecked: false,
    isChecking: false
  });
  
  const navigate = useNavigate();

  const clearAuth = useCallback(() => {
    console.log('Clearing authentication state');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    delete api.defaults.headers.common['Authorization'];
    authPromise = null;
    lastAuthCheck = 0;
    authCheckRef.current = { hasChecked: false, isChecking: false };
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }, []);

  const handleGoogleAuthSuccess = useCallback((data) => {
    console.log('Google auth success data:', data);
    if (data.access && data.user) {
      localStorage.setItem('access', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh', data.refresh);
      }
      
      // Ensure user object has is_photographer property
      const userWithRole = {
        ...data.user,
        is_photographer: data.user.is_photographer || false
      };
      
      console.log('Setting user state with:', userWithRole);
      
      const userState = {
        user: userWithRole,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
      
      setState(userState);
      return { 
        success: true, 
        token: data.access,
        refreshToken: data.refresh,
        isNewUser: data.is_new_user || false
      };
    }
    throw new Error('Incomplete authentication data received from server');
  }, []);

  // Set up API defaults on mount
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
          const response = await api.get('/api/accounts/me/');
          if (!isMounted) return;
          
          const userData = response.data;
          setState(prev => ({
            ...prev,
            user: userData,
            isAuthenticated: true,
            isLoading: false
          }));
          
          // Only handle redirection if we're on the login page
          if (window.location.pathname === '/login') {
            if (userData.is_photographer) {
              navigate('/dashboard');
            } else if (userData.is_staff || userData.is_superuser) {
              navigate('/admin');
            } else {
              navigate('/my-gallery');
            }
          }
        } else if (isMounted) {
          setState(prev => ({ ...prev, user: null, isAuthenticated: false, isLoading: false }));
        }
      } catch (err) {
        console.error('Failed to load user', err);
        if (err.response?.status === 401) {
          clearAuth();
        }
        if (isMounted) {
          setState(prev => ({ ...prev, isLoading: false, error: 'Failed to load user' }));
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
          setState(prev => ({ ...prev, user: null, isAuthenticated: false }));
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
  }, [clearAuth, navigate]);

  // Login with email/password
  const login = useCallback(async (email, password) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get authentication tokens
      const tokenResponse = await api.post('/api/accounts/token/', {
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
      const userResponse = await api.get('api/accounts/me/');
      const userData = userResponse.data;
      
      // Update user state
      setState({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      // Redirect to gallery page after successful login
      navigate('/my-gallery');
      
      return { success: true, user: userData };
    } catch (err) {
      console.error('Login failed', err);
      const errorMessage = err.response?.data?.detail || 'Login failed';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Register
  const register = useCallback(async (userData) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
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
        const userResponse = await api.get('/api/accounts/me/');
        const userData = userResponse.data;
        
        // Update user state
        setState({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        
        return { success: true, user: userData };
      }
      
      throw new Error('Registration successful but no access token received');
    } catch (err) {
      console.error('Registration failed', err);
      const errorMessage = err.response?.data?.detail || 'Registration failed';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Get CSRF token from cookies
  const getCSRFToken = () => {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    return cookieValue || '';
  };

  // Handle Google OAuth login/signup
  const loginWithGoogle = useCallback(async (tokenResponse) => {
    try {
      console.log('Initiating Google login with token response:', tokenResponse);
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get CSRF token
      const csrfToken = getCSRFToken();
      if (!csrfToken) {
        console.warn('CSRF token not found. Authentication might fail.');
      }
      
      // If we have an ID token (from the Google Sign-In button)
      if (tokenResponse.credential) {
        console.log('Using ID token from credential');
        const response = await fetch(API_ENDPOINTS.GOOGLE_LOGIN, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': csrfToken
          },
          body: JSON.stringify({
            id_token: tokenResponse.credential
          }),
          credentials: 'include'
        });

        if (response.status === 403) {
          // If CSRF validation failed, try to get a new CSRF token and retry
          const newCsrfToken = await fetch('/api/csrf/', {
            credentials: 'include'
          }).then(res => {
            const token = getCSRFToken();
            if (!token) throw new Error('Failed to get CSRF token');
            return token;
          });
          
          // Retry with new CSRF token
          const retryResponse = await fetch(API_ENDPOINTS.GOOGLE_LOGIN, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-CSRFToken': newCsrfToken
            },
            body: JSON.stringify({
              id_token: tokenResponse.credential
            }),
            credentials: 'include'
          });
          
          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            console.error('Google login API error with ID token (after CSRF retry):', errorData);
            throw new Error(errorData.detail || 'Google authentication failed after CSRF retry');
          }
          
          const data = await retryResponse.json();
          console.log('Google login successful with ID token (after CSRF retry)');
          return handleGoogleAuthSuccess(data);
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Google login API error with ID token:', errorData);
          throw new Error(errorData.detail || 'Google authentication failed');
        }

        const data = await response.json();
        console.log('Google login successful with ID token');
        return handleGoogleAuthSuccess(data);
      }
      
      // If we have an authorization code (from the @react-oauth/google flow)
      if (tokenResponse.code) {
        console.log('Sending authorization code to backend for token exchange');
        
        // Get CSRF token
        const csrfToken = getCSRFToken();
        if (!csrfToken) {
          console.warn('CSRF token not found. Authentication might fail.');
        }
        
        // Send the authorization code to our backend to handle the token exchange
        const response = await fetch(API_ENDPOINTS.GOOGLE_LOGIN, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': csrfToken
          },
          body: JSON.stringify({
            code: tokenResponse.code,
            redirect_uri: window.location.origin + '/login'
          }),
          credentials: 'include'
        });

        if (response.status === 403) {
          // If CSRF validation failed, try to get a new CSRF token and retry
          const newCsrfToken = await fetch('/api/csrf/', {
            credentials: 'include'
          }).then(res => {
            const token = getCSRFToken();
            if (!token) throw new Error('Failed to get CSRF token');
            return token;
          });
          
          // Retry with new CSRF token
          const retryResponse = await fetch(API_ENDPOINTS.GOOGLE_LOGIN, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-CSRFToken': newCsrfToken
            },
            body: JSON.stringify({
              code: tokenResponse.code,
              redirect_uri: window.location.origin + '/login'
            }),
            credentials: 'include'
          });
          
          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            console.error('Google login API error (after CSRF retry):', errorData);
            throw new Error(errorData.detail || 'Google authentication failed after CSRF retry');
          }
          
          const data = await retryResponse.json();
          console.log('Google login successful with access token (after CSRF retry)');
          return handleGoogleAuthSuccess(data);
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Google login API error:', errorData);
          throw new Error(errorData.detail || 'Google authentication failed');
        }

        const data = await response.json();
        console.log('Google login successful with access token');
        return handleGoogleAuthSuccess(data);
      }
      
      throw new Error('No valid authentication data received from Google');
    } catch (error) {
      console.error('Google login error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Google authentication failed. Please try again.';
      const errorState = {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: errorMessage
      };
      setState(errorState);
      return { 
        success: false, 
        error: errorMessage,
        state: errorState
      };
    }
  }, [handleGoogleAuthSuccess]);

  // Logout
  const logout = useCallback(() => {
    clearAuth();
    navigate('/');
  }, [clearAuth, navigate]);

  // Update user data
  const updateUser = useCallback((userData) => {
    setState(prev => ({
      ...prev,
      user: { ...prev.user, ...userData }
    }));
  }, []);

  // Social login (for Google OAuth)
  const socialLogin = useCallback(async (provider, accessToken) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await api.post(`/accounts/${provider}/`, {
        access_token: accessToken,
      });
      
      const { access, refresh, user: userData } = response.data;
      
      // Store tokens and set auth header
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      // Update user state
      setState({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      return { success: true };
    } catch (err) {
      console.error('Social login failed', err);
      const errorMessage = err.response?.data?.detail || 'Social login failed';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Provide the context value
  const contextValue = useMemo(() => ({
    ...state,
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    register,
    updateUser,
    loginWithGoogle,
    socialLogin
  }), [state, login, logout, register, updateUser, loginWithGoogle, socialLogin]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
