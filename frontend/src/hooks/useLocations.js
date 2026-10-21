import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await api.get('/api/locations');
      return res.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  });
}
