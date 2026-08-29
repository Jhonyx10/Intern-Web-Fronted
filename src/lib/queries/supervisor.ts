import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

export type SupervisorIntern = {
    id: number
    student_number: string
    first_name: string
    middle_name: string | null
    last_name: string
    is_active: boolean
    section: { id: number; name: string } | null
    required_hours: number | null
    total_hours: number
    building_id: number | null
}

export type SupervisorAttendanceLog = {
    id: number
    student_id: number
    student_name: string
    student_number: string | null
    time_in: string | null
    time_out: string | null
    duration_minutes: number | null
    task_note: string | null
    verification_method: string | null
}

export type CompanyScheduleData = {
    id: number
    company_id: number
    start_date: string
    time_in: string
    lunch_break: string | null
    time_out: string
    supervisor_id: number | null
    created_at?: string
    updated_at?: string
}

export type ScheduleInput = {
    start_date: string
    time_in: string
    lunch_break?: string | null
    time_out: string
}

export type SupervisorProfile = {
    id: number
    position_title: string
    is_active: boolean
    company: {
        id: number
        name: string
        address: string
    } | null
}

export type BuildingWithInterns = {
    id: number
    name: string
    interns: SupervisorIntern[]
}

export type BuildingAssigment = {
    student_id: number
    building_id: number
    date_start: string
    date_end: string | null
    assigned_by: number
    created_at: string
    updated_at: string
}

export function useSupervisorProfile() {
    const { token } = useAuth()
    return useQuery({
        queryKey: ['supervisor', 'profile'],
        queryFn: () => apiRequest<{ data: SupervisorProfile }>('/supervisor/profile', { token: token! }),
        enabled: Boolean(token),
        select: (res) => res.data,
    })
}

export function useSupervisorInterns() {
    const { token } = useAuth()
    return useQuery({
        queryKey: ['supervisor', 'interns'],
        queryFn: () => apiRequest<{ data: SupervisorIntern[] }>('/supervisor/interns', { token: token! }),
        enabled: Boolean(token),
        select: (res) => res.data,
    })
}

export function useSupervisorAttendance() {
    const { token } = useAuth()
    return useQuery({
        queryKey: ['supervisor', 'attendance'],
        queryFn: () => apiRequest<{ data: SupervisorAttendanceLog[] }>('/supervisor/attendance', { token: token! }),
        enabled: Boolean(token),
        select: (res) => res.data,
    })
}

export function useSupervisorSchedules() {
    const { token } = useAuth()
    return useQuery({
        queryKey: ['supervisor', 'schedules'],
        queryFn: () => apiRequest<{ data: CompanyScheduleData[] }>('/supervisor/schedules', { token: token! }),
        enabled: Boolean(token),
        select: (res) => res.data,
    })
}

export function useCreateSupervisorSchedule() {
    const { token } = useAuth()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: ScheduleInput) =>
            apiRequest('/supervisor/schedules', {
                method: 'POST',
                token: token!,
                body: input,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['supervisor', 'schedules'] })
        },
    })
}

export function useUpdateSupervisorSchedule() {
    const { token } = useAuth()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, input }: { id: number; input: Partial<ScheduleInput> }) =>
            apiRequest(`/supervisor/schedules/${id}`, {
                method: 'PUT',
                token: token!,
                body: input,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['supervisor', 'schedules'] })
        },
    })
}

export function useDeleteSupervisorSchedule() {
    const { token } = useAuth()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) =>
            apiRequest(`/supervisor/schedules/${id}`, {
                method: 'DELETE',
                token: token!,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['supervisor', 'schedules'] })
        },
    })
}

export function useAssignInternsToBuilding() {
    const { token } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            buildingId,
            studentIds,
            dateStart,
            dateEnd,
        }: {
            buildingId: number
            studentIds: number[]
            dateStart: string
            dateEnd: string | null
        }) =>
            apiRequest(`/buildings/${buildingId}/assign-interns`, {
                method: 'POST',
                token: token!,
                body: {
                    student_ids: studentIds,
                    date_start: dateStart,
                    date_end: dateEnd,
                },
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['supervisor', 'interns'] })
        },
    })
}


