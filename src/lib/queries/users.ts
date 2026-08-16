import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { queryKeys } from '@/lib/query-keys'
import type { User } from '@/types'

export async function fetchUsers(token: string): Promise<User[]> {
    return await apiRequest<User[]>('/users', { token })
}

export function useUsers() {
    const { token } = useAuth()

    return useQuery({
        queryKey: queryKeys.users.list(),
        queryFn: () => fetchUsers(token!),
        enabled: Boolean(token),
    })
}

export function useUser(id: string | number | undefined) {
    const { token } = useAuth()

    return useQuery({
        queryKey: queryKeys.users.detail(id as string | number),
        queryFn: () => apiRequest<User>(`/users/${id}`, { token }),
        enabled: Boolean(token && id),
    })
}

export function useCreateUser() {
    const queryClient = useQueryClient()
    const { token } = useAuth()

    return useMutation({
        mutationFn: (data: Partial<User>) =>
            apiRequest<User>('/users', {
                method: 'POST',
                body: data,
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
        },
    })
}

export function useUpdateUser() {
    const queryClient = useQueryClient()
    const { token } = useAuth()

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Partial<User> }) =>
            apiRequest<User>(`/users/${id}`, {
                method: 'PUT',
                body: data,
                token,
            }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) })
        },
    })
}

export function useDeleteUser() {
    const queryClient = useQueryClient()
    const { token } = useAuth()

    return useMutation({
        mutationFn: (id: string | number) =>
            apiRequest<void>(`/users/${id}`, {
                method: 'DELETE',
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
        },
    })
}
