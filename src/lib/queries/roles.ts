import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { queryKeys } from '@/lib/query-keys'
import type { Role } from '@/types'

export const useRoles = () => {
    const { token } = useAuth()
    return useQuery({
        queryKey: queryKeys.roles.list(),
        queryFn: () => apiRequest<Role[]>('/roles', { token }),
        enabled: Boolean(token),
    })
}

export const useRole = (id: string | number | undefined) => {
    const { token } = useAuth()
    return useQuery({
        queryKey: queryKeys.roles.detail(id as string | number),
        queryFn: () => apiRequest<Role>(`/roles/${id}`, { token }),
        enabled: Boolean(token && id),
    })
}

export const useCreateRole = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: (data: Partial<Role>) =>
            apiRequest<Role>('/roles', {
                method: 'POST',
                body: data,
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
        },
    })
}

export const useUpdateRole = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Partial<Role> }) =>
            apiRequest<Role>(`/roles/${id}`, {
                method: 'PUT',
                body: data,
                token,
            }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.roles.detail(id) })
        },
    })
}

export const useDeleteRole = () => {
    const queryClient = useQueryClient()
    const { token } = useAuth()
    return useMutation({
        mutationFn: (id: string | number) =>
            apiRequest<void>(`/roles/${id}`, {
                method: 'DELETE',
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
        },
    })
}
