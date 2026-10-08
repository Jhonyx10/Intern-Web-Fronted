import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { toastMutationError, toastMutationSuccess } from '@/lib/mutationToast'
import { queryKeys } from '@/lib/query-keys'
import type { Program } from '@/types'

export const useCourses = () => {
    const { token } = useAuth()
    return useQuery({
        queryKey: queryKeys.courses.list(),
        queryFn: () => apiRequest<Program[]>('/courses', { token }),
        enabled: Boolean(token),
    })
}

export const useCourse = (
    id: string | number | undefined,
    schoolYearId?: string | number | null
) => {
    const { token } = useAuth()
    return useQuery({
        queryKey: [
            ...queryKeys.courses.detail(id as string | number),
            { schoolYearId: schoolYearId ?? null },
        ],
        queryFn: () =>
            apiRequest<Program>(
                `/courses/${id}${schoolYearId ? `?school_year_id=${schoolYearId}` : ''}`,
                { token }
            ),
        enabled: Boolean(token && id),
    })
}

export const useCreateCourse = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: (data: Partial<Program>) =>
            apiRequest<Program>('/courses', {
                method: 'POST',
                body: data,
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
            toastMutationSuccess('Program created')
        },
        onError: (error) => toastMutationError(error, 'Failed to create course'),
    })
}

export const useUpdateCourse = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Partial<Program> }) =>
            apiRequest<Program>(`/courses/${id}`, {
                method: 'PUT',
                body: data,
                token,
            }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(id) })
            toastMutationSuccess('Program updated')
        },
        onError: (error) => toastMutationError(error, 'Failed to update course'),
    })
}

export const useDeleteCourse = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: (id: string | number) =>
            apiRequest<void>(`/courses/${id}`, {
                method: 'DELETE',
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
            toastMutationSuccess('Program deleted')
        },
        onError: (error) => toastMutationError(error, 'Failed to delete course'),
    })
}

export const useToggleCourseActive = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: (id: string | number) =>
            apiRequest<{ id: number; is_active: boolean }>(`/courses/${id}/toggle-active`, {
                method: 'PATCH',
                token,
            }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
            toastMutationSuccess(data.is_active ? 'Department activated' : 'Department deactivated')
        },
        onError: (error) => toastMutationError(error, 'Failed to update department status'),
    })
}
