import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config';

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
  updateUser: () => {}
};

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    isLoading: true,
    isAuthenticated: false
  });
  
  const authCheckRef = useRef({
    hasChecked: false,
    isChecking: false
  });
  
  const navigate = useNavigate();

  const clearAuth = useCallback(() => {
    console.log('Clearing authentication state');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    // Clear any session storage that might contain auth data
    sessionStorage.removeItem('auth');
    
    // Clear the auth promise
    authPromise = null;
    
    // Reset the last auth check time
    lastAuthCheck = 0;
    
    // Reset the auth check ref
    authCheckRef.current = { hasChecked: false, isChecking: false };
    
    // Reset the state
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
    
    console.log('Authentication state and tokens cleared');
  }, []);

  const fetchUserData = useCallback(async (token) => {
    if (!token) {
      console.log('No token provided to fetchUserData');
      clearAuth();
      throw new Error('No authentication token available');
    }

    const now = Date.now();
    
    // Return existing promise if it's still valid
    if (authPromise && now - lastAuthCheck < AUTH_CACHE_TIME) {
      console.log('Returning cached auth promise');
      return authPromise;
    }
    
    console.log('Creating new auth promise');
    
    // Create a new promise
    authPromise = (async () => {
      try {
        console.log('Fetching user data from server');
        const response = await fetch(API_ENDPOINTS.CURRENT_USER, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { detail: errorText };
          }
          console.error('Failed to fetch user data:', response.status, errorData);
          throw new Error(errorData.detail || 'Authentication failed');
        }

        const userData = await response.json();
        console.log('Successfully fetched user data:', userData);
        lastAuthCheck = Date.now();
        return userData;
      } catch (error) {
        console.error('Error in fetchUserData:', error);
        clearAuth();
        throw error;
      }
    })();
    
    return authPromise;
  }, [clearAuth]);

  // Memoized checkAuth function with deduplication and caching
  const checkAuth = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Skip if already checked recently and not forced
    if (!force && authCheckRef.current.hasChecked && (now - lastAuthCheck < AUTH_CACHE_TIME)) {
      console.log('Skipping auth check - recently checked');
      return { 
        fromCache: true, 
        success: true, 
        user: state.user 
      };
    }

    // If we're already checking, return the existing promise
    if (isCheckingAuth && !force) {
      console.log('Auth check already in progress, returning existing promise');
      return authPromise || Promise.resolve({ 
        success: false, 
        error: 'Auth check in progress' 
      });
    }

    // Mark as checking to prevent concurrent requests
    isCheckingAuth = true;
    const currentCheckId = Date.now();
    
    // Store the promise immediately so other calls can await it
    authPromise = (async () => {
      try {
        authCheckRef.current = { 
          hasChecked: false, 
          isChecking: true, 
          checkId: currentCheckId,
          timestamp: now
        };
        
        const token = localStorage.getItem('token');
        
        // If no token, clear auth state and return
        if (!token) {
          console.log('No token found in localStorage');
          clearAuth();
          return { 
            success: false, 
            error: 'No token found',
            fromCache: false
          };
        }

        try {
          console.log('Fetching user data with token:', token.substring(0, 10) + '...');
          const userData = await fetchUserData(token);
          
          // Only update state if this is still the most recent check
          if (!authCheckRef.current || authCheckRef.current.checkId !== currentCheckId) {
            console.log('Skipping outdated auth check');
            return { 
              success: false, 
              error: 'Check outdated',
              fromCache: false
            };
          }
          
          // If we got here, the token is valid
          console.log('Updating auth state with user data');
          const user = {
            id: userData.id,
            name: userData.full_name || userData.email,
            email: userData.email,
            is_photographer: userData.is_photographer || false,
            is_staff: userData.is_staff || false,
            is_superuser: userData.is_superuser || false,
            avatar: userData.avatar,
            token: token // Store the token in the user object for easy access
          };
          
          const newState = {
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          };
          
          setState(newState);
          lastAuthCheck = Date.now();
          console.log('Auth check successful, lastAuthCheck updated to:', new Date(lastAuthCheck).toISOString());
          
          return { 
            success: true, 
            user,
            fromCache: false
          };
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          // If we have a token but failed to fetch user data, the token might be invalid
          if (authCheckRef.current?.checkId === currentCheckId) {
            console.log('Clearing auth due to fetch error');
            clearAuth();
            const errorState = {
              isAuthenticated: false,
              user: null,
              isLoading: false,
              error: 'Session expired. Please log in again.'
            };
            setState(errorState);
            return { 
              success: false, 
              error: error.message, 
              state: errorState,
              fromCache: false
            };
          }
          throw error;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Don't clear auth here as it's already handled in the inner catch
        throw error;
      } finally {
        if (authCheckRef.current?.checkId === currentCheckId) {
          authCheckRef.current = { 
            hasChecked: true, 
            isChecking: false, 
            lastCheck: Date.now() 
          };
        }
        isCheckingAuth = false;
      }
    })();

    return authPromise;
  }, [clearAuth]);

  // Check auth status on mount and clean up on unmount
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;
    
    const checkInitialAuth = async () => {
      if (!isMounted) return;
      
      const token = localStorage.getItem('token');
      
      // If no token, no need to check auth
      if (!token) {
        console.log('No token found, skipping initial auth check');
        if (isMounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isAuthenticated: false,
            user: null
          }));
        }
        return;
      }
      
      // If we're already checking, don't start another check
      if (authCheckRef.current.isChecking) {
        console.log('Auth check already in progress, skipping duplicate check');
        return;
      }
      
      // Add a small delay to prevent rapid-fire requests on mount
      // This helps with React's double mount in development mode
      timeoutId = setTimeout(async () => {
        if (!isMounted) return;
        
        try {
          console.log('Performing initial auth check');
          const result = await checkAuth();
          
          if (!isMounted) return;
          
          if (result?.fromCache) {
            console.log('Used cached auth check result');
            return;
          }
          
          if (result?.success) {
            console.log('Initial auth check completed successfully');
            // Ensure the state is properly updated with the user data
            if (isMounted) {
              setState(prev => ({
                ...prev,
                isLoading: false,
                isAuthenticated: true,
                user: result.user,
                error: null
              }));
            }
          } else if (result?.error) {
            console.error('Initial auth check failed:', result.error);
            if (isMounted) {
              setState(prev => ({
                ...prev,
                isLoading: false,
                isAuthenticated: false,
                user: null,
                error: result.error === 'No token found' 
                  ? 'Please log in to continue' 
                  : 'Session expired. Please log in again.'
              }));
              // Clear invalid token
              localStorage.removeItem('token');
            }
          }
        } catch (error) {
          console.error('Unexpected error during initial auth check:', error);
          if (isMounted) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isAuthenticated: false,
              user: null,
              error: 'Authentication error. Please log in again.'
            }));
            // Clear potentially invalid token
            localStorage.removeItem('token');
          }
        }
      }, 150); // Small delay to allow React to settle
    };
    
    // Always run the initial check if we have a token
    if (token) {
      checkInitialAuth();
    } else {
      // No token, set loading to false immediately
      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        user: null
      }));
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({
        detail: 'Invalid server response'
      }));

      if (!response.ok) {
        console.error('Login failed:', response.status, data);
        throw new Error(data.detail || 'Login failed');
      }

      const { access, refresh } = data;
      
      if (!access) {
        throw new Error('No access token received from server');
      }
      
      console.log('Login successful, storing tokens');
      
      // Store tokens securely
      localStorage.setItem('token', access);
      if (refresh) {
        localStorage.setItem('refreshToken', refresh);
      }
      
      // Update last auth check time
      lastAuthCheck = Date.now();
      
      console.log('Verifying authentication...');
      // Force a new auth check to update the state
      await checkAuth(true);
      
      console.log('Authentication verified, login complete');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      // Clear any partial auth state on error
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: error.message || 'Login failed. Please try again.'
      }));
      throw error;
      return { 
        success: false, 
        error: 'An error occurred during login. Please try again.' 
      };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const requestData = {
        email: userData.email,
        full_name: userData.name,
        password: userData.password,
        confirm_password: userData.password,
        is_photographer: userData.isPhotographer || false
      };

      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
  
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('access_token', data.access);
        setState({
          user: {
            id: data.user.id,
            name: data.user.full_name || data.user.email,
            email: data.user.email,
            isPhotographer: data.user.is_photographer || false,
            avatar: data.user.avatar
          },
          isAuthenticated: true,
          isLoading: false
        });
        // Return success and the full response data
        return { 
          success: true, 
          data: data,
          message: data.message || 'Registration successful!',
          user: data.user
        };
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        return { 
          success: false, 
          error: data.detail || data.message || 'Registration failed',
          data: data
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: 'An error occurred during registration. Please try again.' 
      };
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    navigate('/');
  }, [clearAuth, navigate]);

  const updateUser = useCallback((userData) => {
    setState(prev => {
      const currentToken = prev.user?.token || localStorage.getItem('access_token');
      if (!currentToken) {
        console.warn('No token found when updating user data');
        return prev;
      }
      
      return {
        ...prev,
        user: {
          ...prev.user,
          ...userData,
          // Always include the current token
          token: currentToken
        }
      };
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      checkAuth();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkAuth]);

  const contextValue = useMemo(() => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    loginWithGoogle,
    logout,
    register,
    updateUser
  }), [state.user, state.isAuthenticated, state.isLoading, state.error, login, loginWithGoogle, logout, register, updateUser]);

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