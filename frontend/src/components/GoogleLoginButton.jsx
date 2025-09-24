import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleLoginButton = ({ text = 'Continue with Google', isSignUp = false }) => {
  const { loginWithGoogle, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  
  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  const handleSuccess = async (credentialResponse) => {
    
    if (!credentialResponse.credential) {
      const errorMsg = 'Authentication failed: No credential received from Google';
      console.error(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      setIsLoading(true);
      
      // Show loading message
      const loadingToast = toast.loading('Signing in with Google...');
      
      try {
        // Use the loginWithGoogle function from AuthContext which handles redirection
        const result = await loginWithGoogle(credentialResponse.credential);
        
        if (result && result.success) {
          // Dismiss loading and show success message
          toast.dismiss(loadingToast);
          toast.success(
            isSignUp 
              ? 'Account created successfully! Welcome!'
              : 'Successfully logged in with Google!',
            { duration: 3000 }
          );
        } else {
          throw new Error(result?.error || 'Google login failed');
        }
      } catch (error) {
        // Dismiss loading and show error
        toast.dismiss(loadingToast);
        throw error;
      }
    } catch (error) {
      console.error('Google login error:', error);
      
      // Show error toast with more details
      const errorMessage = error.message || 'Failed to sign in with Google';
      toast.error(errorMessage, { duration: 5000 });
      
      // If we're not already on the login page, redirect there
      if (window.location.pathname !== '/login') {
        navigate('/login', { 
          state: { 
            from: from,
            error: errorMessage
          },
          replace: true 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error) => {
    console.error('Google OAuth error:', error);
    toast.error('Failed to sign in with Google. Please try again.', { duration: 5000 });
    setIsLoading(false);
    
    // If we're not already on the login page, redirect there
    if (window.location.pathname !== '/login') {
      navigate('/login', { 
        state: { 
          from: from,
          error: 'Google sign in was cancelled or failed. Please try again.'
        },
        replace: true 
      });
    }
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
