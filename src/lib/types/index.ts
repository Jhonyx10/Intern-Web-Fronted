export type StudentStatus = 'pending' | 'ongoing' | 'completed' | 'failed' | 'dropped'

export type StudentFilters = {
    unassigned?: boolean
    perPage?: number
    search?: string
    status?: StudentStatus
    placement?: 'assigned' | 'unassigned'
    company_id?: string
    course_id?: string
    school_year_id?: string
}