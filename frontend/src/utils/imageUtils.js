import { API_BASE_URL } from '../config';

/**
 * Get a protected image URL with authentication
 * @param {string} imagePath - The path to the image
 * @returns {string} - The full URL to the protected image
 */
export const getProtectedImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If it's a path, construct the protected URL
  const photoId = imagePath.split('/').pop().split('.')[0];
  return `${API_BASE_URL}/api/photos/${photoId}/protected/`;
};

/**
 * Get the authorization headers for authenticated requests
 * @returns {Object} - Headers object with authorization token
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem('access');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};
