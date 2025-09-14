import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import authService from '../services/authService';

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
  
  const [state, setState] = useState({
    user: authService.getStoredUser(),
    isAuthenticated: authService.isAuthenticated(),
    isLoading: true,
    error: null
  });

  // Debug log initial state
  console.log('AuthProvider mounted', {
    hasToken: !!localStorage.getItem('token'),
    storedUser: authService.getStoredUser(),
    isAuthenticated: authService.isAuthenticated()
  });

  // Fetch user data on mount and when authentication state changes
  const { data: userData, isLoading: isUserLoading, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      console.log('1. [useQuery] Fetching user profile...');
      try {
        if (!authService.isAuthenticated()) {
          console.log('2. [useQuery] Not authenticated, skipping profile fetch');
          return null;
        }
        
        console.log('2. [useQuery] Fetching user profile from API...');
        const user = await authService.getProfile();
        console.log('3. [useQuery] Fetched user profile:', user);
        
        if (!user) {
          console.log('4. [useQuery] No user data received, clearing auth');
          authService.logout();
          return null;
        }
        
        // Update local storage with fresh user data
        localStorage.setItem('user', JSON.stringify(user));
        console.log('5. [useQuery] Updated user data in localStorage');
        
        return user;
      } catch (error) {
        console.error('6. [useQuery] Error fetching user data:', error);
        if (error.response?.status === 401) {
          console.log('7. [useQuery] 401 Unauthorized, clearing auth');
          authService.logout();
        }
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log('8. [useQuery onSuccess] Updating auth state with user data:', !!data);
      setState(prev => ({
        ...prev,
        user: data,
        isAuthenticated: !!data,
        isLoading: false,
        error: null
      }));
    },
    onError: (error) => {
      console.error('9. [useQuery onError] Error in user query:', error);
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message
      }));
    }
  });

  // Handle successful login
  const handleLoginSuccess = useCallback((userData) => {
    console.log('1. [handleLoginSuccess] Starting with userData:', !!userData);
    
    if (!userData) {
      console.error('2. [handleLoginSuccess] No userData provided');
      return;
    }
    
    // Store user data in localStorage
    console.log('2. [handleLoginSuccess] Storing user data in localStorage');
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Update state
    console.log('3. [handleLoginSuccess] Updating auth state');
    setState(prev => ({
      ...prev,
      user: userData,
      isAuthenticated: true,
      isLoading: false,
      error: null
    }));
    
    // Update React Query cache
    console.log('4. [handleLoginSuccess] Updating React Query cache');
    queryClient.setQueryData(['currentUser'], userData);
    
    // Get redirect path
    const from = location.state?.from?.pathname || '/';
    console.log('5. [handleLoginSuccess] Will redirect to:', from);
    
    // Force a re-render of protected routes
    console.log('6. [handleLoginSuccess] Forcing re-render of protected routes');
    queryClient.invalidateQueries(['currentUser']);
    
    // Redirect
    console.log('7. [handleLoginSuccess] Navigating to:', from);
    navigate(from, { 
      replace: true,
      state: { from: undefined } // Clear the from state to prevent loops
    });
  }, [navigate, location.state, queryClient]);

  // Handle logout
  const handleLogout = useCallback(() => {
    authService.logout();
    queryClient.clear();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
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

  // Login function
  const login = useCallback(async (credentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const { user } = await authService.login(credentials);
      handleLoginSuccess(user);
      return { success: true };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed. Please try again.'
      }));
      return { success: false, error: error.message };
    }
  }, [handleLoginSuccess]);

  // Register function
  const register = useCallback(async (userData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Call your registration API here
      // const response = await api.post('/auth/register/', userData);
      // Then login the user
      // const { user } = await authService.login({
      //   email: userData.email,
      //   password: userData.password
      // });
      // handleLoginSuccess(user);
      // return { success: true };
      
      // For now, just simulate a successful registration
      return { success: true };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed. Please try again.'
      }));
      return { success: false, error: error.message };
    }
  }, []);

  // Google login function
  const loginWithGoogle = useCallback(async (accessToken) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Call your Google login API here
      // const response = await api.post('/auth/google/', { access_token: accessToken });
      // const { user, accessToken: token } = response.data;
      // authService.setToken(token);
      // handleLoginSuccess(user);
      // return { success: true };
      
      // For now, just simulate a successful Google login
      return { success: false, error: 'Google login not implemented' };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Google login failed. Please try again.'
      }));
      return { success: false, error: error.message };
    }
  }, []);

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

  // Redirect to login if not authenticated and not on a public page
  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated && !['/login', '/register', '/forgot-password'].includes(location.pathname)) {
      navigate('/login', { state: { from: location } });
    }
  }, [state.isAuthenticated, state.isLoading, navigate, location]);

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
