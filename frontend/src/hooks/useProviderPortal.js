import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useProviderMe() {
  return useQuery({
    queryKey: ['provider-me'],
    queryFn: async () => {
      const res = await api.get('/api/provider/me');
      return res.data;
    },
  });
}

export function useUpdateProviderProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData) => {
      const res = await api.patch('/api/provider/me', profileData);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['provider-me'], updated);
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isAvailable) => {
      const res = await api.patch('/api/provider/me/availability', { isAvailable });
      return res.data;
    },
    // Optimistic update
    onMutate: async (newIsAvailable) => {
      await queryClient.cancelQueries({ queryKey: ['provider-me'] });
      const previous = queryClient.getQueryData(['provider-me']);

      if (previous) {
        queryClient.setQueryData(['provider-me'], {
          ...previous,
          isAvailable: newIsAvailable,
        });
      }

      return { previous };
    },
    onError: (_err, _newIsAvailable, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['provider-me'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-me'] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useResubmitDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      const res = await api.post('/api/provider/me/verification-document', formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-me'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const res = await api.patch('/api/provider/me/password', { currentPassword, newPassword });
      return res.data;
    },
  });
}

export function useCurrentPhoneChangeRequest() {
  return useQuery({
    queryKey: ['provider-phone-request'],
    queryFn: async () => {
      const res = await api.get('/api/provider/me/phone-change-requests/current');
      return res.data;
    },
  });
}

export function useCreatePhoneChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ newPhone, currentPassword, reason }) => {
      const res = await api.post('/api/provider/me/phone-change-requests', {
        newPhone,
        currentPassword,
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-phone-request'] });
    },
  });
}

export function useCancelPhoneChangeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.delete('/api/provider/me/phone-change-requests/current');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-phone-request'] });
    },
  });
}
