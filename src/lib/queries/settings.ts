import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Setting } from '@/types'

export interface UpdateProfileInput {
    name: string
}

export interface UpdatePasswordInput {
    current_password: string
    password: string
    password_confirmation: string
}

export interface UpdateDeanSettingsInput {
    department_name?: string
    logo?: File | null
    remove_logo?: boolean
    theme_color?: string
    theme_color_hover?: string
    theme_color_soft?: string
}

export function useSettings() {
    const { token } = useAuth()

    return useQuery<Setting>({
        queryKey: ['settings'],
        queryFn: () => apiRequest<Setting>('/settings', { token }),
        enabled: Boolean(token),
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

export function useUpdateProfile() {
    const queryClient = useQueryClient()
    const { token } = useAuth()

    return useMutation({
        mutationFn: (input: UpdateProfileInput) =>
            apiRequest<{ message: string; user: any }>('/user/profile', {
                method: 'PUT',
                body: input,
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
        },
    })
}

export function useUpdatePassword() {
    const { token } = useAuth()

    return useMutation({
        mutationFn: (input: UpdatePasswordInput) =>
            apiRequest<{ message: string }>('/user/password', {
                method: 'PUT',
                body: input,
                token,
            }),
    })
}

export function useUpdateDeanSettings() {
    const queryClient = useQueryClient()
    const { token } = useAuth()

    return useMutation({
        mutationFn: (input: UpdateDeanSettingsInput) => {
            const formData = new FormData()
            if (input.department_name !== undefined) {
                formData.append('department_name', input.department_name)
            }
            if (input.logo) {
                formData.append('logo', input.logo)
            }
            if (input.remove_logo) {
                formData.append('remove_logo', 'true')
            }
            if (input.theme_color) {
                formData.append('theme_color', input.theme_color)
            }
            if (input.theme_color_hover) {
                formData.append('theme_color_hover', input.theme_color_hover)
            }
            if (input.theme_color_soft) {
                formData.append('theme_color_soft', input.theme_color_soft)
            }

            return apiRequest<{ message: string; settings: Setting }>('/dean/settings', {
                method: 'POST',
                body: formData,
                token,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] })
        },
    })
}
