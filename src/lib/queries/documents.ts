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

type CreateRequirementPayload = {
  title: string
  description?: string
  accepted_file_types?: string
  recurrence?: 'none' | 'daily' | 'weekly'
  course_ids?: number[]
  deadline_at?: string
}

// --- Master list (created/managed by superadmin) ---

export function useDocumentRequirements() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-requirements'],
    queryFn: () => apiRequest<DocumentRequirement[]>('/document-requirements'),
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

// --- Program/dean-scoped ---

export function useCourseDocumentRequirements(courseId?: number) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['course-document-requirements', courseId],
    queryFn: () =>
      apiRequest<DocumentRequirement[]>(`/courses/${courseId}/document-requirements`),
    enabled: !!user && !!courseId,
  })
}

// One query per department (super admin cards). Uses the same query key as
// useCourseDocumentRequirements, so the cache is shared and invalidation works.
export function useDepartmentRequirements(courseIds: number[]) {
  const { user } = useAuth()

  return useQueries({
    queries: courseIds.map((id) => ({
      queryKey: ['course-document-requirements', id],
      queryFn: () =>
        apiRequest<DocumentRequirement[]>(`/courses/${id}/document-requirements`),
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
      deadline_at: string
    }) =>
      apiRequest<DocumentRequirement[]>(`/courses/${courseId}/document-requirements`, {
        method: 'PUT',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['course-document-requirements', courseId],
      })
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
    }
  }
  document_type?: DocumentType
  document_requirement?: DocumentRequirement
  reviewed_by?: { id: number; name: string }
}

export function useSubmittedDocuments(params?: { course_id?: number | string; search?: string }) {
  const { user, token } = useAuth()

  const queryParams = new URLSearchParams()
  if (params?.course_id) queryParams.append('course_id', String(params.course_id))
  if (params?.search) queryParams.append('search', params.search)

  const queryString = queryParams.toString()
  const url = `/submitted-documents${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: ['submitted-documents', params?.course_id, params?.search],
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