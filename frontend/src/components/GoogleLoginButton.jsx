import React, { useState, useCallback } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';

const GoogleLoginButton = ({ text = 'Continue with Google', isSignUp = false }) => {
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error('Authentication failed: No credential received');
      return;
    }

    try {
      setIsLoading(true);
      
      // Make the API call directly instead of using loginWithGoogle
      const response = await fetch(`${API_BASE_URL}/api/accounts/google/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRFToken': document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          id_token: credentialResponse.credential,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.access) {
        
        // Store tokens
        localStorage.setItem('access', data.access);
        if (data.refresh) {
          localStorage.setItem('refresh', data.refresh);
        }
        
        // Set auth header for future requests
        const api = (await import('../services/api')).default;
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
        
        // Show success message
        toast.success(
          isSignUp 
            ? 'Account created successfully! Welcome!'
            : 'Logged in successfully!'
        );
        
        // Store user data if available
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Use the loginWithGoogle function from AuthContext to update the auth state
          if (loginWithGoogle) {
            await loginWithGoogle({
              access: data.access,
              refresh: data.refresh,
              user: data.user,
              is_new_user: data.is_new_user || false
            });
          }
          
          // Use window.location.href for a full page reload to ensure auth state is properly set
          if (data.user.is_photographer) {
            window.location.href = '/photographer-dashboard';
          } else {
            window.location.href = '/my-gallery';
          }
        } else {
          window.location.href = '/my-gallery';
        }
      } else {
        throw new Error(data.detail || 'Authentication failed');
      }
    } catch (error) {
      toast.error(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    toast.error('Failed to sign in with Google. Please try again.');
    setIsLoading(false);
  };

  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    return (
      <div className="w-full p-3 text-center text-red-600 bg-red-100 rounded">
        Google sign-in is not properly configured. Please contact support.
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="w-full">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
          auto_select
          text="continue_with"
          shape="rectangular"
          width="100%"
          size="large"
          type="standard"
          theme="outline"
          logo_alignment="left"
        />
      </div>
    </GoogleOAuthProvider>
  );
};

export default GoogleLoginButton;
