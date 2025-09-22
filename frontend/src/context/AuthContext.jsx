import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState(() => {
    const token = localStorage.getItem('access');
    const storedUser = authService.getStoredUser();

    const isTokenValid = token && (() => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 > Date.now();
      } catch {
        return false;
      }
    })();

    if (token && !isTokenValid) authService.logout();

    return {
      user: isTokenValid ? storedUser : null,
      isAuthenticated: !!(isTokenValid && storedUser),
      isLoading: false,
      error: null
    };
  });

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = authService.getStoredUser();
      const token = localStorage.getItem('access');
      const isAuthenticated = token && storedUser;

      setState(prev => ({
        ...prev,
        user: storedUser || null,
        isAuthenticated: !!isAuthenticated
      }));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLoginSuccess = useCallback((userData) => {
    if (!userData) return;

    localStorage.setItem('user', JSON.stringify(userData));

    const redirectPath = userData.is_staff || userData.is_superuser
      ? '/admin/dashboard'
      : userData.is_photographer
        ? '/photographer/dashboard'
        : '/my-gallery';

    const targetPath = location.state?.from?.pathname || redirectPath;

    setState({
      user: userData,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });

    queryClient.setQueryData(['currentUser'], userData);

    navigate(targetPath, { replace: true, state: { from: undefined } });
  }, [navigate, location.state, queryClient]);

  const logout = useCallback(() => {
    authService.logout();
    queryClient.clear();
    localStorage.removeItem('authState');

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });

    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  }, [navigate, queryClient]);

  const updateUser = useCallback((userData) => {
    setState(prev => ({
      ...prev,
      user: { ...prev.user, ...userData }
    }));
    authService.updateUser(userData);
  }, []);

  const register = useCallback(async (userData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.register(userData);
      if (response.success && response.data?.user) {
        const user = response.data.user;
        localStorage.setItem('access', response.data.access);
        if (response.data.refresh) localStorage.setItem('refresh', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(user));

        setState({ user, isAuthenticated: true, isLoading: false, error: null });
        queryClient.invalidateQueries(['currentUser']);
        handleLoginSuccess(user);

        return { success: true, data: { user, access: response.data.access, refresh: response.data.refresh } };
      } else if (response.success) {
        return { success: true, message: 'Registration successful! Please log in.' };
      } else throw new Error(response.error || 'Registration failed');
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message || 'Registration failed' }));
      return { success: false, error: error.message || 'Registration failed', errors: error.response?.data || {} };
    }
  }, [handleLoginSuccess, queryClient]);

  const login = useCallback(async (credentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { user, access, refresh } = await authService.login(credentials);
      if (!user || !access) throw new Error('Invalid server response');

      localStorage.setItem('access', access);
      if (refresh) localStorage.setItem('refresh', refresh);
      localStorage.setItem('user', JSON.stringify(user));

      setState({ user, isAuthenticated: true, isLoading: false, error: null });
      queryClient.setQueryData(['currentUser'], user);

      handleLoginSuccess(user);
      return { success: true, user };
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message || 'Login failed' }));
      return { success: false, error: error.message || 'Login failed' };
    }
  }, [handleLoginSuccess, queryClient]);

  const loginWithGoogle = useCallback(async (credential) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { access, refresh, user } = await authService.googleAuth(credential);
      if (!access || !user) throw new Error('Google login failed');

      localStorage.setItem('access', access);
      if (refresh) localStorage.setItem('refresh', refresh);
      localStorage.setItem('user', JSON.stringify(user));

      handleLoginSuccess(user);
      return { success: true };
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message || 'Google login failed' }));
      return { success: false, error: error.message };
    }
  }, [handleLoginSuccess]);

  const value = useMemo(() => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    register,
    updateUser,
    loginWithGoogle
  }), [state, login, logout, register, updateUser, loginWithGoogle]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;
