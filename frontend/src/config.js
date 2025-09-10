// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/api/accounts/token/`,
  REFRESH_TOKEN: `${API_BASE_URL}/api/accounts/token/refresh/`,
  REGISTER: `${API_BASE_URL}/api/accounts/register/`,
  CURRENT_USER: `${API_BASE_URL}/api/accounts/me/`,
  
  // Auth endpoints (legacy support)
  AUTH_ME: `${API_BASE_URL}/api/accounts/me/`,
  AUTH_TOKEN: `${API_BASE_URL}/api/accounts/token/`,
  
  // Gallery endpoints
  PUBLIC_EVENTS: `${API_BASE_URL}/api/gallery/public/events/`,
  
  // Google OAuth
  GOOGLE_AUTH: `${API_BASE_URL}/api/accounts/google/`,
  GOOGLE_LOGIN: `${API_BASE_URL}/api/accounts/google/`,
  GOOGLE_CONFIG: `${API_BASE_URL}/api/accounts/config/google/`,
};

export default {
  API_BASE_URL,
  ...API_ENDPOINTS
};
