import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useEvents = (options = {}) => {
  return useQuery({
    queryKey: ['publicEvents'],
    queryFn: async () => {
      const response = await api.get('/api/gallery/public/events/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    ...options
  });
};
