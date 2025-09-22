import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import authService from '../services/authService';

// Custom event name for auth state changes
const AUTH_STATE_CHANGED_EVENT = 'authStateChanged';

const AuthContext = createContext(null);

// Default context value
const defaultContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  logout: () => {},
  register: async () => {},
  updateUser: () => {},
  loginWithGoogle: async () => {}
};

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [state, setState] = useState(() => {
    // Initialize state from localStorage if available
    const token = localStorage.getItem('access');
    const storedUser = authService.getStoredUser();
    
    // Check if token is valid using the authService method
    const isTokenValid = token && (() => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 > Date.now();
      } catch (error) {
        return false;
      }
    })();
    const isAuthenticated = isTokenValid && storedUser;
    

    
    // If token is invalid but exists, clear it
    if (token && !isTokenValid) {
      authService.logout();
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    }
    
    return {
      user: isAuthenticated ? storedUser : null,
      isAuthenticated: !!isAuthenticated,
      isLoading: false, // Don't start in loading state
      error: null
    };
  });
  
  // Effect to handle component unmount
  useEffect(() => {
    return () => {
      // Any cleanup if needed
    };
  }, []);



  const handleLoginSuccess = useCallback((userData) => {
    if (!userData) return;
  
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(userData));
  
    // Decide redirect path
    const redirectPath = userData.is_staff || userData.is_superuser 
      ? '/admin/dashboard' 
      : userData.is_photographer 
        ? '/photographer/dashboard' 
        : '/my-gallery';
  
    const targetPath = location.state?.from?.pathname || redirectPath;
  
    // ✅ Update state
    setState({
      user: userData,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  
    // ✅ Update React Query cache
    queryClient.setQueryData(['currentUser'], userData);
  
    // ✅ Navigate without reload
    navigate(targetPath, { replace: true, state: { from: undefined } });
  }, [navigate, location.state, queryClient]);
  



  // Handle logout
  const handleLogout = useCallback(() => {
    authService.logout();
    queryClient.clear();
    
    // Clear auth state from localStorage
    localStorage.removeItem('authState');
    
    // Update local state
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
    
    // Dispatch storage event to sync across tabs
    window.dispatchEvent(new Event('storage'));
    
    navigate('/login');
  }, [navigate, queryClient]);

  // Handle user update
  const handleUpdateUser = useCallback((userData) => {
    setState(prev => ({
      ...prev,
      user: { ...prev.user, ...userData }
    }));
    authService.updateUser(userData);
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Call the register API
      const response = await authService.register(userData);
      
      if (response.success) {
        // If registration is successful and we have tokens, update auth state
        if (response.data?.access) {
          // Store tokens
          localStorage.setItem('access', response.data.access);
          if (response.data.refresh) {
            localStorage.setItem('refresh', response.data.refresh);
          }
          
          // Update auth state with user data
          if (response.data.user) {
            const user = response.data.user;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Update context state and handle login success
            setState(prev => ({
              ...prev,
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            }));
            
            // Invalidate any existing user queries
            queryClient.invalidateQueries(['currentUser']);
            
            // Handle login success to set up proper redirection
            handleLoginSuccess(user);
            
            return { 
              success: true, 
              data: {
                user,
                access: response.data.access,
                refresh: response.data.refresh
              },
              message: 'Registration successful!'
            };
          }
        }
        
        // If we don't have user data but registration was successful
        return { 
          success: true, 
          message: 'Registration successful! Please log in with your credentials.'
        };
      } else {
        // Handle registration errors
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed. Please try again.'
      }));
      
      return { 
        success: false, 
        error: error.message || 'Registration failed. Please try again.',
        errors: error.response?.data || {}
      };
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Call the login service (make sure it returns { user, access, refresh })
      const response = await authService.login(credentials);
      const { user, access, refresh } = response;
  
      if (!user || !access) {
        throw new Error('Invalid response from server');
      }
  
      // Update state
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
  
      // Store in localStorage
      localStorage.setItem('access', access);
      if (refresh) localStorage.setItem('refresh', refresh);
      localStorage.setItem('user', JSON.stringify(user));
  
      // Update React Query cache
      queryClient.setQueryData(['currentUser'], user);
  
      // Redirect based on role
      const redirectPath = user.is_staff || user.is_superuser 
        ? '/admin/dashboard' 
        : user.is_photographer 
          ? '/photographer/dashboard' 
          : '/my-gallery';
  
      const targetPath = location.state?.from?.pathname || redirectPath;
      navigate(targetPath, { replace: true, state: { from: undefined } });
  
      return { success: true, user };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed. Please check your credentials and try again.'
      }));
      return { success: false, error: error.message || 'Login failed. Please check your credentials and try again.' };
    }
  }, [navigate, queryClient, location.state]);
  
  const loginWithGoogle = useCallback(async (credential) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { access, refresh, user } = await authService.googleAuth(credential);

      if (!access || !user) {
        throw new Error('Authentication failed: No valid token received');
      }

      // ✅ Save tokens
      localStorage.setItem('access', access);
      if (refresh) localStorage.setItem('refresh', refresh);
      localStorage.setItem('user', JSON.stringify(user));

      // ✅ Update state + redirect
      handleLoginSuccess(user);

      return { success: true };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Google login failed. Please try again.'
      }));
      return { success: false, error: error.message };
    }
  }, [handleLoginSuccess]);

  

  // Provide the auth context value
  const contextValue = useMemo(() => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout: handleLogout,
    register,
    updateUser: handleUpdateUser,
    loginWithGoogle
  }), [
    state.user,
    state.isAuthenticated,
    state.isLoading,
    state.error,
    login,
    handleLogout,
    register,
    handleUpdateUser,
    loginWithGoogle
  ]);


  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
