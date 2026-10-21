import {
  useMutation,
  useQuery,
  useQueries,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { toastMutationError, toastMutationSuccess } from '@/lib/mutationToast'

export interface DocumentRequirement {
  pivot: any
  id: number
  created_by_user_id: number | null
  title: string
  description: string | null
  accepted_file_types: string
  is_active: boolean
  recurrence: 'none' | 'daily' | 'weekly'
  document_type?: 'common' | 'departmental'
  created_by?: { id: number; name: string } | null
}

export interface CourseTheme {
  course_id: number
  department_name: string | null
  theme_color: string | null
  theme_color_hover: string | null
  theme_color_soft: string | null
  logo_url: string | null
}

export interface SchoolYearOption {
  id: number
  name: string
  semester?: string | null
  is_active?: boolean
}

type CreateRequirementPayload = {
  title: string
  description?: string
  accepted_file_types?: string
  recurrence?: 'none' | 'daily' | 'weekly'
  document_type?: 'common' | 'departmental'
  course_ids?: number[]
  deadline_at?: string
  school_year_id?: number
}

// Appends ?school_year_id=… to a path when a school year is selected
const withSchoolYear = (path: string, schoolYearId?: number) =>
  schoolYearId ? `${path}?school_year_id=${schoolYearId}` : path

// --- School years (for the filter dropdown) ---

export function useSchoolYearOptions() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['school-year-options'],
    queryFn: () => apiRequest<SchoolYearOption[]>('/school-years'),
    enabled: !!user,
  })
}

// --- Master list (created/managed by superadmin) ---

// No argument = every requirement across all school years (used by the modals).
// With a school year = only the requirements linked to that year.
export function useDocumentRequirements(schoolYearId?: number) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-requirements', schoolYearId],
    queryFn: () =>
      apiRequest<DocumentRequirement[]>(
        withSchoolYear('/document-requirements', schoolYearId),
      ),
    enabled: !!user,
  })
}

export function useCreateDocumentRequirement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateRequirementPayload) =>
      apiRequest<DocumentRequirement>('/document-requirements', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requirements'] })
      queryClient.invalidateQueries({ queryKey: ['course-document-requirements'] })
      toastMutationSuccess('Document requirement created')
    },
    onError: (error) => toastMutationError(error, 'Failed to create requirement'),
  })
}

// Reuse the requirements of one school year in another
export function useCarryOverRequirements() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      toSchoolYearId,
      fromSchoolYearId,
      document_requirement_ids,
    }: {
      toSchoolYearId: number
      fromSchoolYearId: number
      document_requirement_ids?: number[]
    }) =>
      apiRequest<{ copied: number }>(
        `/school-years/${toSchoolYearId}/document-requirements/carry-over`,
        {
          method: 'POST',
          body: {
            from_school_year_id: fromSchoolYearId,
            document_requirement_ids,
          },
        },
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document-requirements'] })
      queryClient.invalidateQueries({ queryKey: ['course-document-requirements'] })
      toastMutationSuccess(
        `${data.copied} requirement${data.copied === 1 ? '' : 's'} copied`,
      )
    },
    onError: (error) => toastMutationError(error, 'Failed to copy requirements'),
  })
}

// --- Program/dean-scoped ---

export function useCourseDocumentRequirements(
  courseId?: number,
  schoolYearId?: number,
) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['course-document-requirements', courseId, schoolYearId],
    queryFn: () =>
      apiRequest<DocumentRequirement[]>(
        withSchoolYear(`/courses/${courseId}/document-requirements`, schoolYearId),
      ),
    enabled: !!user && !!courseId,
  })
}

// One query per department (super admin cards). Uses the same query key as
// useCourseDocumentRequirements, so the cache is shared and invalidation works.
export function useDepartmentRequirements(
  courseIds: number[],
  schoolYearId?: number,
) {
  const { user } = useAuth()

  return useQueries({
    queries: courseIds.map((id) => ({
      queryKey: ['course-document-requirements', id, schoolYearId],
      queryFn: () =>
        apiRequest<DocumentRequirement[]>(
          withSchoolYear(`/courses/${id}/document-requirements`, schoolYearId),
        ),
      enabled: !!user,
    })),
  })
}

// Per-course name, theme colors and logo from the settings table (super admin only)
export function useCourseThemes(enabled = true) {
  const { user, token } = useAuth()

  return useQuery({
    queryKey: ['course-themes'],
    queryFn: () => apiRequest<CourseTheme[]>('/course-settings', { token }),
    enabled: !!user && !!token && enabled,
  })
}

export function useSyncCourseRequirements(courseId?: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      document_requirement_ids: number[]
      deadline_at?: string | null
      school_year_id?: number
    }) =>
      apiRequest<DocumentRequirement[]>(`/courses/${courseId}/document-requirements`, {
        method: 'PUT',
        body: payload,
      }),
    onSuccess: () => {
      // Prefix match: refreshes this course's requirements for every school year
      queryClient.invalidateQueries({
        queryKey: ['course-document-requirements', courseId],
      })
      // The year-filtered master list changes too when requirements get linked to a year
      queryClient.invalidateQueries({ queryKey: ['document-requirements'] })
      toastMutationSuccess('Requirements assigned')
    },
    onError: (error) => toastMutationError(error, 'Failed to assign requirements'),
  })
}

// --- Submitted Documents by Interns ---

export interface SubmittedDocument {
  id: number
  student_id: number
  document_requirement_id: number | null
  file_path: string
  original_filename: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string | null
  notes: string | null
  review_status: 'pending' | 'approved' | 'rejected' | string
  reviewed_at: string | null
  rejection_reason: string | null
  student?: {
    id: number
    student_number: string
    first_name: string
    middle_name: string | null
    last_name: string
    section?: {
      id: number
      name: string
      code: string
      course?: {
        id: number
        code: string
        name: string
      }
      school_year?: {
        id: number
        name: string
      }
      schoolYear?: {
        id: number
        name: string
      }
    }
  }
  document_type?: DocumentType
  document_requirement?: DocumentRequirement
  reviewed_by?: { id: number; name: string }
}

export function useSubmittedDocuments(params?: {
  course_id?: number | string
  school_year_id?: number | string
  search?: string
}) {
  const { user, token } = useAuth()

  const queryParams = new URLSearchParams()
  if (params?.course_id) queryParams.append('course_id', String(params.course_id))
  if (params?.school_year_id) queryParams.append('school_year_id', String(params.school_year_id))
  if (params?.search) queryParams.append('search', params.search)

  const queryString = queryParams.toString()
  const url = `/submitted-documents${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: [
      'submitted-documents',
      params?.course_id,
      params?.school_year_id,
      params?.search,
    ],
    queryFn: () => apiRequest<SubmittedDocument[]>(url, { token }),
    enabled: !!user,
  })
}

export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      status,
      rejection_reason,
    }: {
      id: number
      status: 'approved' | 'rejected'
      rejection_reason?: string
    }) =>
      apiRequest(`/student/documents/${id}/status`, {
        method: 'PATCH',
        body: { review_status: status, rejection_reason },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submitted-documents'] })
      toastMutationSuccess(
        variables.status === 'approved' ? 'Document approved' : 'Document rejected',
      )
    },
    onError: (error) => toastMutationError(error, 'Failed to update document status'),
  })
}