import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/api/admin/stats');
      return res.data;
    },
    refetchInterval: 30000,
  });
}

export function usePendingProviders({ page = 1, limit = 10 } = {}) {
  return useQuery({
    queryKey: ['admin-pending-providers', { page, limit }],
    queryFn: async () => {
      const res = await api.get(`/api/admin/providers/pending?page=${page}&limit=${limit}`);
      return res;
    },
  });
}

export function useVerificationDocument(providerId, enabled = false) {
  return useQuery({
    queryKey: ['admin-verification-doc', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      const res = await api.get(`/api/admin/providers/${providerId}/verification-document`);
      return res.data;
    },
    enabled: Boolean(enabled && providerId),
    staleTime: 1000 * 60, // 1 min (signed URL expires in 120s)
  });
}

export function useTransitionVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ providerId, status, rejectionReason }) => {
      const res = await api.patch(`/api/admin/providers/${providerId}/verification`, {
        status,
        rejectionReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useUpdateActivation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ providerId, isActive, reason }) => {
      const res = await api.patch(`/api/admin/providers/${providerId}/activation`, {
        isActive,
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] });
    },
  });
}

export function useResetProviderPassword() {
  return useMutation({
    mutationFn: async ({ providerId, reason }) => {
      const res = await api.post(`/api/admin/providers/${providerId}/reset-password`, {
        reason,
      });
      return res.data;
    },
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, status, reason }) => {
      const res = await api.patch(`/api/admin/reviews/${reviewId}`, { status, reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-reviews'] });
    },
  });
}

export function useAdminPhoneRequests({ status = 'PENDING', page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ status, page: String(page), limit: String(limit) });

  return useQuery({
    queryKey: ['admin-phone-requests', { status, page, limit }],
    queryFn: async () => {
      const res = await api.get(`/api/admin/phone-change-requests?${params.toString()}`);
      return res;
    },
  });
}

export function useDecidePhoneRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status, rejectionReason }) => {
      const res = await api.patch(`/api/admin/phone-change-requests/${requestId}`, {
        status,
        rejectionReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-phone-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
