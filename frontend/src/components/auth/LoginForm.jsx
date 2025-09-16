import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import * as yup from 'yup';
import authService from '../../services/authService';
import FormInput from '../forms/FormInput';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Import eye icons

const handleGoogleLogin = async (response, onSuccess, setError) => {
  try {
    if (!response.credential) {
      throw new Error('No credential received from Google');
    }

    // Clear any existing auth data before Google login
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');

    // Send the credential to the backend
    const result = await authService.googleAuth(response.credential);

    // ✅ Fix: check SimpleJWT-style tokens
    if (result && result.access) {
      localStorage.setItem('access', result.access);
      if (result.refresh) {
        localStorage.setItem('refresh', result.refresh);
      }
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      // Small delay to let context update
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('Calling onSuccess callback');
      onSuccess();
    } else {
      throw new Error('Authentication failed: No valid token received');
    }
  } catch (err) {
    console.error('Google login error:', err);
    const errorMessage =
      err.response?.data?.message ||
      err.message ||
      'Google login failed. Please try again.';
    console.error('Error details:', errorMessage);
    setError(errorMessage);
  }
};

// Define validation schema using Yup
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

const LoginForm = ({ onSuccess, redirectTo = '/' }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State for password visibility
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const onSubmit = async (formData) => {
    setError('');
    setIsLoading(true);
    
    console.log('1. [LoginForm] Form submitted with data:', { email: formData.email });

    try {
      console.log('2. [LoginForm] Calling authService.login...');
      
      // Clear any existing auth data before login
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      });
      
      console.log('3. [LoginForm] Login successful, response:', {
        hasUser: !!response?.user,
        hasToken: !!response?.accessToken
      });
      
      // Store user data in localStorage
      if (response?.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      // Force a small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Call onSuccess callback which will handle the navigation
      if (onSuccess) {
        console.log('4. [LoginForm] Calling onSuccess callback with redirectTo:', redirectTo);
        onSuccess();
      } else {
        // Fallback navigation if onSuccess is not provided
        console.log('4. [LoginForm] No onSuccess callback, navigating to:', redirectTo);
        navigate(redirectTo, { 
          replace: true,
          state: { from: undefined } // Clear the from state to prevent loops
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.detail || 
                         err.message || 
                         'Invalid email or password. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google OAuth success
  const onGoogleSuccess = useCallback((response) => {
    handleGoogleLogin(response, () => {
      if (onSuccess) onSuccess();
      navigate(redirectTo);
    }, setError);
  }, [onSuccess, navigate, redirectTo]);

  // Handle Google OAuth error
  const onGoogleError = useCallback(() => {
    setError('Google login failed. Please try again.');
  }, []);

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="eventpng@gmail.com"
                className={`appearance-none block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
               <Link 
                  to="/forgot-password" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
                >
                  Forgot password?
                </Link>
            </div>
            <div className="mt-1 relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"} // Toggle between text and password
                autoComplete="current-password"
                placeholder="••••••••"
                className={`appearance-none block w-full px-3 py-2 pr-10 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                {...register('password')}
              />
              {/* Password toggle button */}
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? (
                  <FaEyeSlash className="h-5 w-5" />
                ) : (
                  <FaEye className="h-5 w-5" />
                )}
              </button>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
              
              <div className="mt-2 text-right">
                {/* <Link 
                  to="/forgot-password" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
                >
                  Forgot password?
                </Link> */}
              </div>
            </div>
          </div>
          
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
          
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Keep me signed in
            </label>
          </div>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
        <div className="w-full">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={onGoogleError}
            useOneTap
            text="continue_with"
            shape="rectangular"
            size="large"
            width="100%"
            theme="outline"
            logo_alignment="left"
            locale="en"
          />
        </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
    </GoogleOAuthProvider>
  );
};

export default LoginForm;