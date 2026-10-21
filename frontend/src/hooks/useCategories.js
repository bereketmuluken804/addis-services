import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/categories');
      return res.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });
}
