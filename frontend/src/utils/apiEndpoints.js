/**
 * Centralized configuration for all API endpoints
 * Usage:
 * import { API_ENDPOINTS } from '../utils/apiEndpoints';
 * 
 * Then use: API_ENDPOINTS.PHOTOGRAPHER_DASHBOARD.STORAGE
 */

const BASE = {
  PHOTOGRAPHER: '/api/photographer/dashboard',
  AUTH: '/api/accounts',
  GALLERY: '/api/gallery',
};

export const API_ENDPOINTS = {
  // Photographer Dashboard
  PHOTOGRAPHER_DASHBOARD: {
    BASE: BASE.PHOTOGRAPHER,
    STATS: `${BASE.PHOTOGRAPHER}/stats/`,
    GALLERIES: `${BASE.PHOTOGRAPHER}/galleries/`,
    SESSIONS: `${BASE.PHOTOGRAPHER}/sessions/`,
    EARNINGS: `${BASE.PHOTOGRAPHER}/earnings/`,
    STORAGE: `${BASE.PHOTOGRAPHER}/storage/`,
    ACTIVITY: `${BASE.PHOTOGRAPHER}/activity/`,
  },
  
  // Auth
  AUTH: {
    LOGIN: `${BASE.AUTH}/login/`,
    LOGOUT: `${BASE.AUTH}/logout/`,
    REGISTER: `${BASE.AUTH}/register/`,
    SESSIONS: `${BASE.AUTH}/sessions/`,
  },
  
  // Gallery
  GALLERY: {
    BASE: BASE.GALLERY,
    UPLOAD: `${BASE.GALLERY}/upload/`,
    LIST: `${BASE.GALLERY}/`,
    DETAIL: (id) => `${BASE.GALLERY}/${id}/`,
  },
};

export default API_ENDPOINTS;
