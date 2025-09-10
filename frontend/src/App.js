import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth, AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
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
  

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Handle nested user data structure (user.data)
  const userData = user?.data || user || {};
  
  // Check if user is a photographer
  const isPhotographer = userData?.is_photographer === true;
  
  const redirectPath = isPhotographer ? '/photographer-dashboard' : '/my-gallery';
  
  return <Navigate to={redirectPath} replace />;
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole, allowedRoles = [] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();
  
  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  const userData = user?.data || user || {};
  const isPhotographer = userData?.is_photographer === true;
  const isStaff = userData?.is_staff || userData?.is_superuser;
  
  // Check if user has the required role
  if (requiredRole) {
    const hasRequiredRole = 
      (requiredRole === 'staff' && isStaff) ||
      (requiredRole === 'photographer' && isPhotographer);
    
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }
  
  // Check if route is allowed for the user's role
  if (allowedRoles.length > 0) {
    const userRole = isStaff ? 'staff' : isPhotographer ? 'photographer' : 'customer';
    const isAllowed = allowedRoles.includes(userRole);
    
    if (!isAllowed) {
      // Redirect to appropriate dashboard based on role
      const redirectPath = isPhotographer ? '/photographer-dashboard' : isStaff ? '/admin/events' : '/my-gallery';
      return <Navigate to={redirectPath} replace />;
    }
  }
  
  return children;
};


function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="terms" element={<TermsAndPrivacy />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        
        {/* Photographer Routes */}
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

        {/* Customer Routes */}
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

        {/* Shared Routes */}
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

        {/* Admin Routes */}
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
        <Route 
          path="admin/events/:id/edit" 
          element={
            <ProtectedRoute requiredRole="staff">
              <EventForm />
            </ProtectedRoute>
          } 
        />
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