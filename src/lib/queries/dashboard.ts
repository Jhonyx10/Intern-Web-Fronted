import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

export type SuperAdminDashboardData = {
    overview: {
        total_users: number
        total_administrators: number
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

export type DeanSectionStats = {
    id: number
    name: string
    code: string | null
    coordinator: string | null

    student_count: number
    assigned_students: number
    unassigned_students: number

    total_hours: number
    avg_hours: number
    avg_completion_pct: number

    completed_students: number
    in_progress_students: number
    not_started_students: number

    evaluated_students: number
    passed_requirements_students: number
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
        total_required_hours: number
        avg_hours_per_student: number
        overall_progress_pct: number
        completed_students: number
        in_progress_students: number
        not_started_students: number
        evaluated_students: number
        passed_requirements_students: number
        total_required_documents: number
    }
    charts: {
        section_breakdown: DeanSectionStats[]
        placement_status: Array<{ name: string; value: number; color: string }>
        completion_status: Array<{ name: string; value: number; color: string }>
    }
}

export type CourseAnalytics = {
    id: number
    code: string
    name: string

    total_sections: number
    total_students: number

    // Enrolled / deployed
    enrolled_students: number
    deployed_students: number
    deployment_rate: number

    // Kept for backwards compatibility
    assigned_students: number
    unassigned_students: number
    assignment_rate: number

    // Hours
    total_required_hours: number
    total_rendered_hours: number
    internship_percentage: number
    avg_hours_per_student: number
    avg_completion_percentage: number

    // Internship status
    completed_students: number
    in_progress_students: number
    not_started_students: number

    // Evaluation
    evaluated_students: number
    not_evaluated_students: number

    // Documents
    total_required_documents: number
    docs_completed_students: number
    docs_incomplete_students: number
    docs_completion_rate: number

    // Kept for backwards compatibility
    passed_requirements_students: number
    not_passed_requirements_students: number
}

export type AdminDashboardData = {
    overview: {
        total_courses: number
        total_sections: number
        total_students: number
        enrolled_students: number
        deployed_students: number
        assigned_students: number
        unassigned_students: number
        total_required_hours: number
        total_rendered_hours: number
        completed_students: number
        in_progress_students: number
        not_started_students: number
        evaluated_students: number
        not_evaluated_students: number
        docs_completed_students: number
        docs_incomplete_students: number
        passed_requirements_students: number
        not_passed_requirements_students: number
        overall_internship_percentage: number
    }
    courses: CourseAnalytics[]
    charts: {
        enrollment_by_course: Array<{ name: string; value: number }>
        course_summary: Array<{
            name: string
            enrolled: number
            deployed: number
            docs_done: number
        }>
        placement_by_course: Array<{ name: string; assigned: number; unassigned: number }>
        internship_progress_by_course: Array<{ name: string; percentage: number }>
        status_by_course: Array<{
            name: string
            completed: number
            in_progress: number
            not_started: number
        }>
        evaluation_by_course: Array<{
            name: string
            evaluated: number
            not_evaluated: number
        }>
        documents_by_course: Array<{
            name: string
            completed: number
            incomplete: number
        }>
        // Kept for backwards compatibility
        requirements_by_course: Array<{
            name: string
            passed: number
            not_passed: number
        }>
        placement_status: Array<{ name: string; value: number; color: string }>
        completion_status: Array<{ name: string; value: number; color: string }>
        evaluation_status: Array<{ name: string; value: number; color: string }>
        documents_status: Array<{ name: string; value: number; color: string }>
        // Kept for backwards compatibility
        requirements_status: Array<{ name: string; value: number; color: string }>
    }
}

export type CoordinatorSectionStats = {
    id: number
    name: string
    code: string
    total_students: number
    assigned_students: number
    unassigned_students: number
    progress_buckets: Array<{ label: string; count: number }>
}

export type CoordinatorDashboardData = {
    sections: CoordinatorSectionStats[]
    overview: {
        total_students: number
        assigned_students: number
        unassigned_students: number
        pending_company_requests: number
    }
    charts: {
        placement_status: Array<{ name: string; value: number; color: string }>
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

export function useAdminDashboard() {
    const { token } = useAuth()
    return useQuery({
        queryKey: ['dashboard', 'admin'],
        queryFn: () => apiRequest<{ data: AdminDashboardData }>('/dashboard/program-head', { token: token! }),
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