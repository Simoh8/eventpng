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
        console.error('Error validating token:', error);
        return false;
      }
    })();
    const isAuthenticated = isTokenValid && storedUser;
    
    // console.log('1. [AuthProvider] Initializing state', {
    //   hasStoredUser: !!storedUser,
    //   hasToken: !!token,
    //   isTokenValid,
    //   isAuthenticated
    // });
    
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

  // // Debug log initial state
  // console.log('AuthProvider mounted', {
  //   hasToken: !!localStorage.getItem('access'),
  //   storedUser: authService.getStoredUser(),
  //   isAuthenticated: authService.isAuthenticated()
  // });

  // Fetch user data on mount and when authentication state changes
  const { data: userData, isLoading: isUserLoading, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      
      // Check if we have an access token
      const token = localStorage.getItem('access');
      const storedUser = authService.getStoredUser();
      
      // If no token, clear any existing auth state
      if (!token) {
        if (storedUser) {
          authService.logout();
        }
        
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false
        }));
        return null;
      }
      
      // Check if token is valid
      const isTokenValid = (() => {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.exp * 1000 > Date.now();
        } catch (error) {
          return false;
        }
      })();
      
      if (!isTokenValid) {
        try {
          // Attempt to refresh the token
          const refreshToken = localStorage.getItem('refresh');
          if (refreshToken) {
            const newTokens = await authService.refreshToken();
            if (newTokens && newTokens.access) {
              // Set the new token and try to get the profile again
              localStorage.setItem('access', newTokens.access);
              if (newTokens.refresh) {
                localStorage.setItem('refresh', newTokens.refresh);
              }
              // Continue with getting the profile
              const user = await authService.getProfile();
              if (user) {
                console.log('2.3. [useQuery] Successfully refreshed user data');
                setState(prev => ({
                  ...prev,
                  user,
                  isAuthenticated: true,
                  isLoading: false
                }));
                return user;
              }
            }
          }
        } catch (refreshError) {
          console.error('2.4. [useQuery] Token refresh failed:', refreshError);
        }
        
        authService.logout();
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false
        }));
        return null;
      }
      
      // Set auth header
      authService.setAuthHeader(token);
      
      // If we have a valid user in localStorage and token is valid, use it
      if (storedUser) {
        setState(prev => ({
          ...prev,
          user: storedUser,
          isAuthenticated: true,
          isLoading: false
        }));
        
        authService.getProfile().then(freshUser => {
          if (freshUser) {
            setState(prev => ({
              ...prev,
              user: freshUser,
              isAuthenticated: true
            }));
          }
        }).catch(error => {
          console.error('3.3. [useQuery] Error fetching fresh user data:', error);
        });
        
        return storedUser;
      }
      
      try {
        const user = await authService.getProfile();
        
        if (!user) {
          authService.logout();
          setState(prev => ({
            ...prev,
            user: null,
            isAuthenticated: false,
            isLoading: false
          }));
          return null;
        }
        
        // Update local storage with fresh user data
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update the auth state with the new user data
        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false
        }));
        
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
    retry: (failureCount, error) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2; // Retry other errors up to 2 times
    },
    onSuccess: (data) => {
      if (!data) {
        authService.logout();
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Session expired. Please log in again.'
        }));
        return;
      }
      
      setState(prev => ({
        ...prev,
        user: data,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }));
    },
    onError: (error) => {
      console.error('9. [useQuery onError] Error in user query:', error);
      
      // Clear auth state on 401
      if (error?.response?.status === 401) {
        authService.logout();
      }
      
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.response?.data?.message || 'Failed to load user data. Please try again.'
      }));
    },
    onSettled: () => {
      setState(prev => ({
        ...prev,
        isLoading: false
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
    
    // Determine redirect path based on user role
    let redirectPath = '/';
    if (userData.is_staff || userData.is_superuser) {
      redirectPath = '/admin/dashboard';
    } else if (userData.is_photographer) {
      redirectPath = '/photographer/dashboard';
    } else {
      redirectPath = '/my-gallery';
    }
    
    // Get the redirect path from location state or use the default based on user role
    const targetPath = location.state?.from?.pathname || redirectPath;
    
    // Update state
    setState(prev => ({
      ...prev,
      user: userData,
      isAuthenticated: true,
      isLoading: false,
      error: null
    }));
    
    // Update React Query cache
    queryClient.setQueryData(['currentUser'], userData);
    
    // Force a re-render of protected routes
    queryClient.invalidateQueries(['currentUser']);
    
    // Redirect
    navigate(targetPath, { 
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
      console.error('Registration error:', error);
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

  const loginWithGoogle = useCallback(async (credential) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
  
    try {
      const { access, refresh, user } = await authService.googleAuth(credential);
  
      if (!access || !user) {
        throw new Error('Authentication failed: No valid token received');
      }
  
      handleLoginSuccess(user); // updates context state + redirects
  
      return { success: true };
    } catch (error) {
      console.error('[loginWithGoogle] Error:', error);
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
