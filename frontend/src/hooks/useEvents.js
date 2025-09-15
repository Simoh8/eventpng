import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useEvents = (options = {}) => {
  return useQuery({
    queryKey: ['publicEvents'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/gallery/public/events/');
        return response.data;
      } catch (error) {
        console.error('Error fetching public events:', error);
        throw error; // Re-throw to let React Query handle the error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    ...options
  });
};
