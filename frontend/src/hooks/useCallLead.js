import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useCallLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (providerId) => {
      const res = await api.post("/api/leads/call", { providerId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-me"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["provider"] });
    },
  });
}
