import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import Layouts
import MainLayout from './layouts/MainLayout';

// Import Pages
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

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Dashboard Redirect Component
const DashboardRedirect = () => {
  const { user } = useAuth();
  return user?.is_photographer ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/my-gallery" replace />
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
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
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }
  
  // Check user role if required
  if (requiredRole) {
    const hasRequiredRole = 
      (requiredRole === 'staff' && (user?.is_staff || user?.is_superuser)) ||
      (requiredRole === 'photographer' && user?.is_photographer);
      
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
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
        
        {/* Protected Routes */}
        <Route 
          path="dashboard" 
          element={
            <ProtectedRoute>
              <PhotographerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="my-gallery" 
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="my-photos" 
          element={
            <ProtectedRoute>
              <MyPhotosPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="orders" 
          element={
            <ProtectedRoute>
              <MyOrdersPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="saved" 
          element={
            <ProtectedRoute>
              <SavedPhotosPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="settings" 
          element={
            <ProtectedRoute>
              <AccountSettingsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="support" 
          element={
            <ProtectedRoute>
              <HelpAndSupportPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="galleries/new" 
          element={
            <ProtectedRoute requiredRole="photographer">
              <CreateGallery />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin/events" 
          element={
            <ProtectedRoute requiredRole="staff">
              <AdminEvents />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin/events/new" 
          element={
            <ProtectedRoute requiredRole="staff">
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
        
        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '796270989266-7vtm7rl1bedsm1e664oe6b9fn45ht0s5.apps.googleusercontent.com';
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleOAuthProvider clientId={googleClientId}>
          <Router>
            <AppContent />
          </Router>
        </GoogleOAuthProvider>
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
    </QueryClientProvider>
  );
}

export default App;