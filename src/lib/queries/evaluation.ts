import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { EvaluationNotificationPayload } from '@/lib/echo';

export interface FormItem {
  item_type: 'rating' | 'single_choice' | 'multiple_choice' | 'text' | 'textarea';
  label: string;
  is_required: boolean;
  options?: {
    min?: number;
    max?: number;
    choices?: string[];
  };
}

export interface Course {
  id: number;
  code: string;
  title: string;
}

export interface CreateEvaluationTemplatePayload {
  title: string;
  description?: string;
  is_active: boolean;
  course_ids: number[]; 
  items: FormItem[];
}

export interface EvaluationTemplateItem {
  id: number;
  evaluation_template_id: number;
  sort_order: number;
  item_type: FormItem['item_type'];
  label: string;
  options: string | null; 
  is_required: boolean | number;
  created_at: string;
  updated_at: string;
}

export interface EvaluationTemplateCreator {
  id: number;
  name: string;
  email?: string;
}

export interface EvaluationTemplateDetail {
  id: number;
  created_by_user_id: number;
  title: string;
  description: string | null;
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
  items?: EvaluationTemplateItem[];
  creator?: EvaluationTemplateCreator;
}

// Hook to fetch active courses for multi-selection
export const useCourses = (token?: string | null) => {
  return useQuery({
    queryKey: queryKeys.courses?.all ?? ['courses'],
    queryFn: () => apiRequest<Course[]>('/courses', { token }),
  });
};

// Fetch a single evaluation template, including its questions and creator
export const useEvaluationTemplate = (id?: number | string, token?: string | null) => {
  return useQuery({
    queryKey: queryKeys.evaluations.templateDetail(id!),
    queryFn: () => apiRequest<EvaluationTemplateDetail>(`/show/evaluation/${id}`, { token }),
    enabled: !!id,
  });
};

// Fetch unread notifications for a user
export const useUnreadNotifications = (userId?: number, token?: string | null) => {
  return useQuery({
    queryKey: queryKeys.notifications.unread(userId),
    queryFn: () =>
      apiRequest<EvaluationNotificationPayload[]>('/notifications/unread', { token }),
    enabled: !!userId,
  });
};

// Mark notifications as read
export const useMarkNotificationsAsRead = (token?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>('/notifications/mark-as-read', {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

// Create Evaluation Template Mutation
export const useCreateEvaluationTemplate = (token?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateEvaluationTemplatePayload) =>
      apiRequest<{ id: number; message: string }>('/evaluation-templates', {
        method: 'POST',
        body: payload,
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.templates() });
    },
  });
};