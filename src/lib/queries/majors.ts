import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { queryKeys } from '@/lib/query-keys'
import type { Major } from '@/types'

export const useMajors = (courseId?: string | number) => {
    const { token } = useAuth()
    return useQuery({
        queryKey: queryKeys.majors.list(courseId),
        queryFn: () => {
            const url = courseId ? `/majors?course_id=${courseId}` : '/majors'
            return apiRequest<Major[]>(url, { token })
        },
        enabled: Boolean(token),
    })
}

export const useMajor = (id: string | number | undefined) => {
    const { token } = useAuth()
    return useQuery({
        queryKey: queryKeys.majors.detail(id as string | number),
        queryFn: () => apiRequest<Major>(`/majors/${id}`, { token }),
        enabled: Boolean(token && id),
    })
}

export type CreateMajorPayload = {
    course_id: string | number
    name: string
    code: string
    program_head_user_id?: string | number | null
    sort_order?: number | null
}

export const useCreateMajor = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: (data: CreateMajorPayload) =>
            apiRequest<Major>('/majors', {
                method: 'POST',
                body: data,
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.majors.all })
        },
    })
}

export const useUpdateMajor = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Partial<CreateMajorPayload> }) =>
            apiRequest<Major>(`/majors/${id}`, {
                method: 'PUT',
                body: data,
                token,
            }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.majors.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.majors.detail(id) })
        },
    })
}

export const useDeleteMajor = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: (id: string | number) =>
            apiRequest<void>(`/majors/${id}`, {
                method: 'DELETE',
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.majors.all })
        },
    })
}
