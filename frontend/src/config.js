// API Configuration
const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');
// Remove any trailing /api from the base URL to prevent double /api/api/
export const API_BASE_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}`;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  // Authentication endpoints
  LOGIN: `${API_BASE_URL}accounts/token/`,
  REFRESH_TOKEN: `${API_BASE_URL}accounts/token/refresh/`,
  REGISTER: `${API_BASE_URL}accounts/register/`,
  CURRENT_USER: `${API_BASE_URL}accounts/me/`,
  
  // Auth endpoints (legacy support)
  AUTH_ME: `${API_BASE_URL}accounts/me/`,
  AUTH_TOKEN: `${API_BASE_URL}accounts/token/`,
  
  // Gallery endpoints
  EVENTS: `${API_BASE_URL}/api/gallery/events/`,
  PUBLIC_EVENTS: `${API_BASE_URL}/api/gallery/public/events/`,
  STATS: `${API_BASE_URL}/api/gallery/stats/`,
  GALLERY_STATS: `${API_BASE_URL}/api/gallery/stats/`,
  RECENT_GALLERIES: `${API_BASE_URL}/api/gallery/recent/`,
  
  // Event endpoints
  // EVENT_DETAIL: (slug) => `${API_BASE_URL}gallery/public/events/slug/${slug}/`,
  VERIFY_EVENT_PIN: (slug) => `${API_BASE_URL}gallery/events/${slug}/verify-pin/`,
  
  // Google OAuth
  GOOGLE_AUTH: `${API_BASE_URL}accounts/google/`,
  GOOGLE_LOGIN: `${API_BASE_URL}accounts/google/`,
  GOOGLE_CONFIG: `${API_BASE_URL}accounts/config/google/`,
};

export default {
  API_BASE_URL,
  ...API_ENDPOINTS
};
