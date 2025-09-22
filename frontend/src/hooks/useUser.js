import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useUser = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/accounts/me/');
        return response.data;
      } catch (error) {
        // Don't throw error for 401 (unauthorized) as it's handled by the interceptor
        if (error.response?.status !== 401) {
        }
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};
