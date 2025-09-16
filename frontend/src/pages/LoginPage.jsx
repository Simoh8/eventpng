import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoginForm from '../components/auth/LoginForm';
import { FaHome } from 'react-icons/fa';

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Get the intended destination or default to '/'
  const from = location.state?.from?.pathname || '/';
  
  // If user is already authenticated, redirect them
  useEffect(() => {
    // Only proceed if auth check is complete and we're not already processing
    if (isLoading || isProcessing) return;
    
    const token = localStorage.getItem('access');
    const isUserAuthenticated = isAuthenticated || (token && token !== 'undefined');
    
    if (isUserAuthenticated) {
      setIsProcessing(true);
      
      // Use a small timeout to ensure the auth state is fully updated
      const timer = setTimeout(() => {
        navigate(from, { 
          replace: true,
          state: { from: undefined } // Clear the from state to prevent loops
        });
        setIsProcessing(false);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        setIsProcessing(false);
      };
    }
  }, [isAuthenticated, from, navigate, isLoading, isProcessing]);
  
  const handleSuccess = useCallback(() => {
    
    toast.success('Login successful!');
    
    // Small delay to show the success message before redirecting
    setTimeout(() => {
      navigate(from, { 
        replace: true,
        state: { from: undefined } // Clear the from state to prevent loops
      });
    }, 500);
  }, [from, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Home Button with simplified Tailwind animations */}
      <Link
        to="/"
        className="animate-pulse fixed top-6 left-6 z-50 flex items-center gap-2 bg-white text-blue-600 hover:text-blue-700 font-medium py-3 px-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-blue-200 hover:border-blue-400 hover:scale-105"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <FaHome className={`w-5 h-5 transition-all duration-300 ${isHovered ? 'animate-bounce' : ''}`} />
        <span className="transition-all duration-300">{isHovered ? 'Return Home' : 'Back to Home'}</span>
        
        {/* Simple shimmer effect on hover */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 transition-all duration-1000 ${
            isHovered ? 'translate-x-full' : '-translate-x-full'
          }`} />
        </div>
      </Link>
      
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