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
import TicketsPage from './pages/TicketsPage';
import PricingPage from './pages/PricingPage';
import FaqPage from './pages/FaqPage';
import TermsAndPrivacy from './pages/TermsAndPrivacy';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import CustomerDashboard from './pages/CustomerDashboard';
import PhotographerDashboard from './pages/PhotographerDashboard';
import CreateGallery from './pages/CreateGallery';
import GalleriesDetail from './pages/dashboard/GalleriesDetail';
import EarningsDetail from './pages/dashboard/EarningsDetail';
import StorageDetail from './pages/dashboard/StorageDetail';
import SessionsDetail from './pages/dashboard/SessionsDetail';
import AdminEvents from './pages/admin/AdminEvents';
import EventForm from './pages/admin/EventForm';
import MyPhotosPage from './pages/MyPhotosPage';
import MyOrdersPage from './pages/MyOrdersPage';
import SavedPhotosPage from './pages/SavedPhotosPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import HelpAndSupportPage from './pages/HelpAndSupportPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import CheckoutPage from './pages/CheckoutPage';
import TicketDetail from './pages/TicketDetail';
import TicketSuccess from './pages/TicketSuccess';
// import TicketPurchaseForm from './components/forms/TicketPurchaseForm';
import MyTickets from './pages/MyTickets';


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
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const token = localStorage.getItem('access');

  useEffect(() => {
    if (!isLoading) {
      setAuthChecked(true);
    }
  }, [isLoading]);

  // Show loader while checking auth
  if (isLoading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // ✅ If no requiredRole or allowedRoles → this is a public route
  if (!requiredRole && (!allowedRoles || allowedRoles.length === 0)) {
    return children;
  }

  // 🔒 Protected routes: check auth
  const isUserAuthenticated = isAuthenticated || (token && token !== 'undefined');
  if (!isUserAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Role checks
  const userData = user?.data || user || {};
  const isPhotographer = userData?.is_photographer === true;
  const isStaff = userData?.is_staff || userData?.is_superuser;

  if (requiredRole) {
    const hasRequiredRole =
      (requiredRole === 'staff' && isStaff) ||
      (requiredRole === 'photographer' && isPhotographer);

    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  if (allowedRoles.length > 0) {
    const userRole = isStaff ? 'staff' : isPhotographer ? 'photographer' : 'customer';
    const isAllowed = allowedRoles.includes(userRole);

    if (!isAllowed) {
      const redirectPath = isPhotographer
        ? '/photographer-dashboard'
        : isStaff
        ? '/admin/events'
        : '/my-gallery';
      return <Navigate to={redirectPath} replace />;
    }
  }

  return children;
};



function AppContent() {
  return (
    <Routes>
      {/* ================= ROUTES WITH NAVBAR (MainLayout) ================= */}
      <Route path="/" element={<MainLayout />}>
        {/* --- Public --- */}
        <Route index element={<HomePage />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:slug" element={<EventDetail />} />
        <Route path="tickets">
          <Route index element={<TicketsPage />} />
          <Route path="purchase/:eventId" element={
            <ProtectedRoute>
              {/* <TicketPurchaseForm /> */}
            </ProtectedRoute>
          } />
          <Route path="my-tickets" element={
            <ProtectedRoute>
              <MyTickets />
            </ProtectedRoute>
          } />
          <Route path=":id" element={
            <ProtectedRoute>
              <TicketDetail />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="checkout" element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        } />
        <Route path="ticket/success" element={
          <ProtectedRoute>
            <TicketSuccess />
          </ProtectedRoute>
        } />
        <Route path="gallery/:id" element={<GalleryDetail />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="terms" element={<TermsAndPrivacy />} />

        {/* --- Customer --- */}
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

        {/* --- Photographer --- */}
        {/* Photographer Dashboard Routes */}
        <Route path="photographer-dashboard">
          <Route
            index
            element={
              <ProtectedRoute requiredRole="photographer" allowedRoles={['photographer']}>
                <PhotographerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="galleries"
            element={
              <ProtectedRoute requiredRole="photographer">
                <GalleriesDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="sessions"
            element={
              <ProtectedRoute requiredRole="photographer">
                <SessionsDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="earnings"
            element={
              <ProtectedRoute requiredRole="photographer">
                <EarningsDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="storage"
            element={
              <ProtectedRoute requiredRole="photographer">
                <StorageDetail />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route
          path="galleries/new"
          element={
            <ProtectedRoute requiredRole="photographer" allowedRoles={['photographer']}>
              <CreateGallery />
            </ProtectedRoute>
          }
        />

        {/* --- Shared protected --- */}
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

        {/* --- Admin --- */}
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

        {/* --- Legacy redirect --- */}
        <Route
          path="old-dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* --- 404 --- */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* ================= AUTH ROUTES (no navbar) ================= */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
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