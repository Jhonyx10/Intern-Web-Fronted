import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

export type SuperAdminDashboardData = {
    overview: {
        total_users: number
        total_companies: number
        approved_companies: number
        pending_companies: number
        total_students: number
        assigned_students: number
        unassigned_students: number
        pending_company_requests: number
    }
    charts: {
        roles_distribution: Array<{ role: string; label: string; count: number }>
        company_status: Array<{ name: string; value: number; color: string }>
        student_placement: Array<{ name: string; value: number; color: string }>
        company_requests: Array<{ name: string; value: number; color: string }>
        daily_logs_trend: Array<{ date: string; count: number }>
    }
}

export type DeanDashboardData = {
    course: { id: number; code: string; name: string } | null
    major?: { id: number; code: string; name: string } | null
    overview: {
        total_sections: number
        total_students: number
        assigned_students: number
        unassigned_students: number
        total_hours_rendered: number
    }
    charts: {
        section_breakdown: Array<{ id: number; name: string; student_count: number; total_hours: number; avg_hours: number }>
        placement_status: Array<{ name: string; value: number; color: string }>
    }
}

export type ProgramHeadDashboardData = DeanDashboardData

export type CoordinatorDashboardData = {
    section: { id: number; name: string; code: string } | null
    overview: {
        total_students: number
        assigned_students: number
        unassigned_students: number
        pending_company_requests: number
    }
    charts: {
        placement_status: Array<{ name: string; value: number; color: string }>
        student_progress: Array<{ name: string; rendered: number; required: number; pct: number }>
    }
}

export type SupervisorDashboardData = {
    company: { id: number; name: string; address: string } | null
    overview: {
        total_interns: number
        total_schedules: number
        total_hours_logged: number
    }
    charts: {
        intern_hours: Array<{ name: string; rendered: number; required: number; pct: number }>
        attendance_trend: Array<{ date: string; count: number }>
    }
}

export function useSuperAdminDashboard() {
    const { token } = useAuth()
    return useQuery({
        queryKey: ['dashboard', 'superadmin'],
        queryFn: () => apiRequest<{ data: SuperAdminDashboardData }>('/dashboard/superadmin', { token: token! }),
        enabled: Boolean(token),
        select: (res) => res.data,
    })
}

export function useDeanDashboard() {
    const { token } = useAuth()
    return useQuery({
        queryKey: ['dashboard', 'dean'],
        queryFn: () => apiRequest<{ data: DeanDashboardData }>('/dashboard/dean', { token: token! }),
        enabled: Boolean(token),
        select: (res) => res.data,
    })
}

export function useProgramHeadDashboard() {
    const { token } = useAuth()
    return useQuery({
        queryKey: ['dashboard', 'program-head'],
        queryFn: () => apiRequest<{ data: ProgramHeadDashboardData }>('/dashboard/program-head', { token: token! }),
        enabled: Boolean(token),
        select: (res) => res.data,
    })
}

export function useCoordinatorDashboard() {
    const { token } = useAuth()
    return useQuery({
        queryKey: ['dashboard', 'coordinator'],
        queryFn: () => apiRequest<{ data: CoordinatorDashboardData }>('/dashboard/coordinator', { token: token! }),
        enabled: Boolean(token),
        select: (res) => res.data,
    })
}

export function useSupervisorDashboardData() {
    const { token } = useAuth()
    return useQuery({
        queryKey: ['dashboard', 'supervisor'],
        queryFn: () => apiRequest<{ data: SupervisorDashboardData }>('/dashboard/supervisor', { token: token! }),
        enabled: Boolean(token),
        select: (res) => res.data,
    })
}
