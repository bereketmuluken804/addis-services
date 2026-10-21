import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useCallLead() {
  return useMutation({
    mutationFn: async (providerId) => {
      const res = await api.post('/api/leads/call', { providerId });
      return res.data;
    },
  });
}
