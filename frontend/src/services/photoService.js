// services/photoService.js
import api from './api';

export const likePhoto = async (photoId) => {
  const response = await api.post(`/api/photos/${photoId}/like/`);
  return response.data;
};

export const unlikePhoto = async (photoId) => {
  const response = await api.delete(`/api/photos/${photoId}/like/`);
  return response.data;
};