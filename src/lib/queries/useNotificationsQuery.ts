import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api'; // Adjust based on your folder structure
import { queryKeys } from '@/lib/query-keys';
import type { EvaluationNotificationPayload } from '@/lib/echo';

export const useNotificationsQuery = (token?: string | null) => {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () =>
      apiRequest<EvaluationNotificationPayload[]>('/notifications', { token }),
    enabled: !!token,
  });
};

export const useClearNotificationsMutation = (token?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<{ success: boolean }>('/notifications/mark-as-read', {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      // Optimistically update or invalidate notification queries
      queryClient.setQueryData<EvaluationNotificationPayload[]>(
        queryKeys.notifications.list(),
        []
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};