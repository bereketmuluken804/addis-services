import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useProviders({
  categoryId,
  subCityId,
  availableOnly,
  searchTerm,
  sortBy,
  page = 1,
  limit = 12,
} = {}) {
  const queryParams = new URLSearchParams();
  if (categoryId) queryParams.set('categoryId', categoryId);
  if (subCityId) queryParams.set('subCityId', subCityId);
  if (availableOnly) queryParams.set('availableOnly', 'true');
  if (searchTerm) queryParams.set('search', searchTerm);
  if (sortBy) queryParams.set('sortBy', sortBy);
  queryParams.set('page', String(page));
  queryParams.set('limit', String(limit));

  return useQuery({
    queryKey: ['providers', { categoryId, subCityId, availableOnly, searchTerm, sortBy, page, limit }],
    queryFn: async () => {
      const res = await api.get(`/api/providers?${queryParams.toString()}`);
      return res;
    },
    keepPreviousData: true,
  });
}

export function useProvider(id) {
  return useQuery({
    queryKey: ['provider', id],
    queryFn: async () => {
      const res = await api.get(`/api/providers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}
