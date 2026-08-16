import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { queryKeys } from '@/lib/query-keys'
import type { Course } from '@/types'

export const useCourses = () => {
    const { token } = useAuth()
    return useQuery({
        queryKey: queryKeys.courses.list(),
        queryFn: () => apiRequest<Course[]>('/courses', { token }),
        enabled: Boolean(token),
    })
}

export const useCourse = (id: string | number | undefined) => {
    const { token } = useAuth()
    return useQuery({
        queryKey: queryKeys.courses.detail(id as string | number),
        queryFn: () => apiRequest<Course>(`/courses/${id}`, { token }),
        enabled: Boolean(token && id),
    })
}

export const useCreateCourse = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: (data: Partial<Course>) =>
            apiRequest<Course>('/courses', {
                method: 'POST',
                body: data,
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
        },
    })
}

export const useUpdateCourse = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Partial<Course> }) =>
            apiRequest<Course>(`/courses/${id}`, {
                method: 'PUT',
                body: data,
                token,
            }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(id) })
        },
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
        },
    })
}
