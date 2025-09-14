import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoginForm from '../components/auth/LoginForm';

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  // Get the intended destination or default to '/'
  const from = location.state?.from?.pathname || '/';
  
  console.log('LoginPage mounted', {
    isAuthenticated,
    user: user ? 'User data exists' : 'No user data',
    from,
    locationState: location.state
  });
  
  // If user is already authenticated, redirect them
  useEffect(() => {
    console.log('useEffect - isAuthenticated changed:', isAuthenticated);
    if (isAuthenticated) {
      console.log('User is already authenticated, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);
  
  const handleSuccess = useCallback(() => {
    console.log('handleSuccess called, will redirect to:', from);
    console.log('Current location state:', window.location.pathname);
    
    toast.success('Login successful!');
    
    // Small delay to show the success message before redirecting
    setTimeout(() => {
      console.log('Executing navigation to:', from);
      navigate(from, { 
        replace: true,
        state: { from: undefined } // Clear the from state to prevent loops
      });
    }, 500);
  }, [from, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Decorative header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-center">
            <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
            <p className="mt-2 text-blue-100">Sign in to access your account</p>
          </div>
          
          {/* Main content */}
          <div className="px-8 py-8">
            <LoginForm 
              onSuccess={handleSuccess} 
              redirectTo={from} 
            />
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Having trouble? <a href="/support" className="font-medium text-blue-600 hover:text-blue-500">Contact support</a></p>
        </div>
      </div>
    </div>
  );
}
