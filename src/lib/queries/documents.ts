import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { toastMutationError, toastMutationSuccess } from '@/lib/mutationToast'

export interface DocumentType {
  id: number
  code: string
  name: string
  is_required: boolean
  recurrence: 'none' | 'daily' | 'weekly'
}

export interface DocumentRequirement {
  pivot: any
  id: number
  document_type_id: number
  created_by_user_id: number | null
  title: string
  description: string | null
  accepted_file_types: string
  is_active: boolean
  document_type?: DocumentType
  created_by?: { id: number; name: string } | null
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

export function useDocumentTypes() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-types'],
    queryFn: () => apiRequest<DocumentType[]>('/document-types'),
    enabled: !!user,
  })
}

export function useCreateDocumentRequirement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      document_type_id: number
      title: string
      description?: string
      accepted_file_types?: string
    }) =>
      apiRequest<DocumentRequirement>('/document-requirements', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requirements'] })
      toastMutationSuccess('Document requirement created')
    },
    onError: (error) => toastMutationError(error, 'Failed to create requirement'),
  })
}

export function useCreateDocumentType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { code: string; name: string; is_required?: boolean, recurrence?: 'none' | 'daily' | 'weekly' }) =>
      apiRequest<DocumentType>('/document-types', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] })
      toastMutationSuccess('Document type created')
    },
    onError: (error) => toastMutationError(error, 'Failed to create document type'),
  })
}

// --- Course/dean-scoped ---

export function useCourseDocumentRequirements(courseId?: number) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['course-document-requirements', courseId],
    queryFn: () =>
      apiRequest<DocumentRequirement[]>(`/courses/${courseId}/document-requirements`),
    enabled: !!user && !!courseId,
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