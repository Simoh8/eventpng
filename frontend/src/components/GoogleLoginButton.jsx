import React, { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';

const GoogleLoginButton = ({ onSuccess, onError }) => {
  // Debug: Log when component mounts
  useEffect(() => {
    console.log('GoogleLoginButton mounted');
    console.log('Client ID from env:', process.env.REACT_APP_GOOGLE_CLIENT_ID);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <p className="text-sm text-gray-600">Sign in with Google</p>
      <GoogleLogin
        onSuccess={(response) => {
          console.log('Google login success:', response);
          onSuccess(response);
        }}
        onError={(error) => {
          console.error('Google login error:', error);
          onError(error);
        }}
        useOneTap={false} // Disable one-tap for better visibility
        auto_select={false}
        text="continue_with"
        shape="rectangular"
        size="large"
        width="250"
        theme="outline"
        logo_alignment="center"
      />
      <p className="text-xs text-gray-500">This button uses Google OAuth</p>
    </div>
  );
};

export default GoogleLoginButton;
