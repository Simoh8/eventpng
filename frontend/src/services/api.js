import axios from 'axios';

// Ensure the API base URL ends with /api
const API_BASE_URL = process.env.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL.endsWith('/') 
    ? process.env.REACT_APP_API_URL.slice(0, -1) // Remove trailing slash
    : process.env.REACT_APP_API_URL
  : 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add CSRF token for non-GET requests
    const csrfToken = getCSRFToken();
    if (csrfToken && config.method !== 'get') {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to get CSRF token from cookies or fetch a new one
function getCSRFToken() {
  // First try to get from cookies
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
    
  if (cookieValue) {
    return cookieValue;
  }
  
  // If not in cookies, try to fetch a new one
  try {
    return fetch(`${API_BASE_URL}api/accounts/csrf/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    })
    .then(response => {
      if (!response.ok) {
        console.error('Failed to fetch CSRF token');
        return '';
      }
      return document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';
    })
    .catch(error => {
      console.error('Error fetching CSRF token:', error);
      return '';
    });
  } catch (error) {
    console.error('Error in getCSRFToken:', error);
    return '';
  }
}

// Response interceptor to handle 401 errors
try {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If error is 401 and we haven't tried to refresh yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const refreshToken = localStorage.getItem('refresh');
          if (refreshToken) {
            const response = await axios.post(
              `${API_BASE_URL}/api/accounts/token/refresh/`,
              { refresh: refreshToken }
            );
            
            const { access } = response.data;
            localStorage.setItem('access', access);
            api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
            originalRequest.headers['Authorization'] = `Bearer ${access}`;
            
            return api(originalRequest);
          }
        } catch (error) {
          console.error('Failed to refresh token:', error);
          // Clear auth data and redirect to login
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          window.location.href = '/login';
        }
      }
      
      return Promise.reject(error);
    }
  );
} catch (e) {
  console.error('Error setting up response interceptor:', e);
}

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already tried to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/accounts/token/refresh/`,
            { refresh: refreshToken },
            { withCredentials: true }
          );
          
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          // Retry the original request with the new token
          originalRequest.headers['Authorization'] = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (error) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => 
    api.post('/api/accounts/token/', { email, password }),
  
  refreshToken: (refresh) => 
    api.post('/api/accounts/token/refresh/', { refresh }),
  
  getCurrentUser: () => 
    api.get('/api/accounts/me/'),
};

export default api;
