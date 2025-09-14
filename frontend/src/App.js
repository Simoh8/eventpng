import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth, AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import GalleryDetail from './pages/GalleryDetail';
import PricingPage from './pages/PricingPage';
import FaqPage from './pages/FaqPage';
import TermsAndPrivacy from './pages/TermsAndPrivacy';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomerDashboard from './pages/CustomerDashboard';
import PhotographerDashboard from './pages/PhotographerDashboard';
import CreateGallery from './pages/CreateGallery';
import AdminEvents from './pages/admin/AdminEvents';
import EventForm from './pages/admin/EventForm';
import MyPhotosPage from './pages/MyPhotosPage';
import MyOrdersPage from './pages/MyOrdersPage';
import SavedPhotosPage from './pages/SavedPhotosPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import HelpAndSupportPage from './pages/HelpAndSupportPage';
import NotFoundPage from './pages/NotFoundPage';


// Dashboard Redirect Component
const DashboardRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const token = localStorage.getItem('access');
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  // If not authenticated and no token, redirect to login
  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />;
  }
  
  // Handle nested user data structure (user.data)
  const userData = user?.data || user || {};
  
  // Check if user is a photographer or staff
  const isPhotographer = userData?.is_photographer === true;
  const isStaff = userData?.is_staff || userData?.is_superuser;
  
  // Determine redirect path based on user role
  let redirectPath = '/my-gallery'; // Default for customers
  
  if (isStaff) {
    redirectPath = '/admin/events';
  } else if (isPhotographer) {
    redirectPath = '/photographer-dashboard';
  }
  
  return <Navigate to={redirectPath} replace />;
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole, allowedRoles = [] }) => {
  console.log('1. [ProtectedRoute] Rendering with requiredRole:', requiredRole, 'allowedRoles:', allowedRoles);
  
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const token = localStorage.getItem('access');
  
  console.log('2. [ProtectedRoute] Auth state - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'hasUser:', !!user, 'hasToken:', !!token);
  
  // Handle initial authentication check
  useEffect(() => {
    if (!isLoading) {
      // Add a small delay to ensure auth state is properly updated
      const timer = setTimeout(() => {
        setAuthChecked(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // If still loading or checking auth, show loading state
  if (isLoading || !authChecked) {
    console.log('3. [ProtectedRoute] Checking authentication state...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  // If no required role and no allowed roles, allow access (public route)
  if (!requiredRole && (!allowedRoles || allowedRoles.length === 0)) {
    console.log('4. [ProtectedRoute] No role requirements, allowing access');
    return children;
  }
  
  // Check authentication state based on both context and token
  const isUserAuthenticated = isAuthenticated || (token && token !== 'undefined');
  
  // If not authenticated, redirect to login
  if (!isUserAuthenticated) {
    console.log('5. [ProtectedRoute] Not authenticated, redirecting to login');
    console.log('6. [ProtectedRoute] Saving current location for redirect:', location.pathname);
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  // If we have a token but not authenticated, try to refresh
  if (token && !isAuthenticated) {
    console.log('6. [ProtectedRoute] Token exists but not authenticated, forcing refresh');
    // Force a hard refresh to reset the app state
    window.location.href = window.location.href;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  const userData = user?.data || user || {};
  const isPhotographer = userData?.is_photographer === true;
  const isStaff = userData?.is_staff || userData?.is_superuser;
  
  console.log('3. [ProtectedRoute] User data:', {
    userData,
    isPhotographer,
    isStaff,
    requiredRole,
    allowedRoles
  });
  
  // Check if user has the required role
  if (requiredRole) {
    const hasRequiredRole = 
      (requiredRole === 'staff' && isStaff) ||
      (requiredRole === 'photographer' && isPhotographer);
    
    console.log('4. [ProtectedRoute] Checking required role:', {
      requiredRole,
      hasRequiredRole
    });
    
    if (!hasRequiredRole) {
      console.log('5. [ProtectedRoute] Missing required role, redirecting to home');
      return <Navigate to="/" replace />;
    }
  }
  
  // Check if route is allowed for the user's role
  if (allowedRoles.length > 0) {
    const userRole = isStaff ? 'staff' : isPhotographer ? 'photographer' : 'customer';
    const isAllowed = allowedRoles.includes(userRole);
    
    console.log('5. [ProtectedRoute] Checking allowed roles:', {
      userRole,
      allowedRoles,
      isAllowed
    });
    
    if (!isAllowed) {
      // Redirect to appropriate dashboard based on role
      const redirectPath = isPhotographer ? '/photographer-dashboard' : isStaff ? '/admin/events' : '/my-gallery';
      console.log('6. [ProtectedRoute] Role not allowed, redirecting to:', redirectPath);
      return <Navigate to={redirectPath} replace />;
    }
  }
  
  console.log('6. [ProtectedRoute] Access granted, rendering children');
  
  return children;
};


function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Public Routes - No authentication required */}
        <Route index element={<HomePage />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:slug" element={<EventDetail />} />
        <Route path="gallery/:id" element={<GalleryDetail />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="terms" element={<TermsAndPrivacy />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        
        {/* Photographer Routes - Protected */}
        <Route 
          path="photographer-dashboard" 
          element={
            <ProtectedRoute requiredRole="photographer" allowedRoles={['photographer']}>
              <PhotographerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="dashboard" 
          element={
            <ProtectedRoute requiredRole="photographer" allowedRoles={['photographer']}>
              <PhotographerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="galleries/new" 
          element={
            <ProtectedRoute requiredRole="photographer" allowedRoles={['photographer']}>
              <CreateGallery />
            </ProtectedRoute>
          } 
        />

        {/* Customer Routes - Protected */}
        <Route 
          path="my-gallery" 
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="my-photos" 
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <MyPhotosPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="orders" 
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <MyOrdersPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="saved" 
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <SavedPhotosPage />
            </ProtectedRoute>
          } 
        />

        {/* Shared Protected Routes */}
        <Route 
          path="settings" 
          element={
            <ProtectedRoute allowedRoles={['customer', 'photographer', 'staff']}>
              <AccountSettingsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="support" 
          element={
            <ProtectedRoute allowedRoles={['customer', 'photographer', 'staff']}>
              <HelpAndSupportPage />
            </ProtectedRoute>
          } 
        />

        {/* Admin Routes - Protected */}
        <Route 
          path="admin/events" 
          element={
            <ProtectedRoute requiredRole="staff" allowedRoles={['staff']}>
              <AdminEvents />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin/events/new" 
          element={
            <ProtectedRoute requiredRole="staff" allowedRoles={['staff']}>
              <EventForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin/events/:id/edit" 
          element={
            <ProtectedRoute requiredRole="staff" allowedRoles={['staff']}>
              <EventForm />
            </ProtectedRoute>
          } 
        />
        
        {/* Old Dashboard - Protected but without specific role requirements */}
        <Route 
          path="old-dashboard" 
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          } 
        />
        
        {/* 404 - Catch all unmatched routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '796270989266-7vtm7rl1bedsm1e664oe6b9fn45ht0s5.apps.googleusercontent.com';
  
  
  // Check if client ID is valid
  if (!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID') {
  }
  
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <AppContent />
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              maxWidth: '500px',
            },
            success: {
              duration: 4000,
              style: {
                background: '#10B981',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10B981',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#EF4444',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#EF4444',
              },
            },
            loading: {
              style: {
                background: '#3B82F6',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#3B82F6',
              },
            },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;