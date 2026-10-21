import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useProviderReviews(providerId, { page = 1, limit = 10 } = {}) {
  return useQuery({
    queryKey: ['provider-reviews', providerId, { page, limit }],
    queryFn: async () => {
      const res = await api.get(`/api/providers/${providerId}/reviews?page=${page}&limit=${limit}`);
      return res;
    },
    enabled: !!providerId,
  });
}

export function useCreateReview(providerId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rating, comment }) => {
      const res = await api.post('/api/reviews', { providerId, rating, comment });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-reviews', providerId] });
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useUpdateReview(providerId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, rating, comment }) => {
      const res = await api.patch(`/api/reviews/${reviewId}`, { rating, comment });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-reviews', providerId] });
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useDeleteReview(providerId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId) => {
      await api.delete(`/api/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-reviews', providerId] });
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useReportReview(providerId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, reason }) => {
      const res = await api.post(`/api/reviews/${reviewId}/report`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-reviews', providerId] });
    },
  });
}
