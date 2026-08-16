import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { queryKeys } from '@/lib/query-keys'
import type { Student } from '@/types'

export type CreateStudentInput = {
  student_number: string
  first_name: string
  middle_name: string | null
  last_name: string
  section_id: number
  is_active: boolean
}

export type PaginatedStudents = {
  data: Student[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type ImportFailure = {
  row: number
  attribute: string
  errors: string[]
}

export type ImportStudentsResult = {
  imported: number
  failures: ImportFailure[]
}

export async function fetchStudents(token: string, page: number = 1): Promise<PaginatedStudents> {
  const response = await apiRequest<{ data: PaginatedStudents }>(`/students?page=${page}`, { token })
  return response.data
}

export async function createStudent(token: string, body: CreateStudentInput): Promise<Student> {
  const response = await apiRequest<{ data: Student }>('/students', {
    method: 'POST',
    token,
    body,
  })
  return response.data
}

export function useStudents(page: number = 1) {
  const { token } = useAuth()

  return useQuery({
    queryKey: queryKeys.students.list(page),
    queryFn: () => fetchStudents(token!, page),
    enabled: Boolean(token),
  })
}

export function useStudent(id: string | number | undefined) {
  const { token } = useAuth()

  return useQuery({
    queryKey: queryKeys.students.detail(Number(id)),
    queryFn: () =>
      apiRequest<{ data: Student }>(`/students/${id}`, { token }).then((res) => res.data),
    enabled: Boolean(token && id),
  })
}

export function useCreateStudent() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateStudentInput) => {
      if (!token) {
        throw new Error('Not authenticated.')
      }
      return createStudent(token, body)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.students.all })
    },
  })
}

export type UpdateStudentInput = Partial<CreateStudentInput>

export async function updateStudent(token: string, id: number, body: UpdateStudentInput): Promise<Student> {
  const response = await apiRequest<{ data: Student }>(`/students/${id}`, {
    method: 'PUT',
    token,
    body,
  })
  return response.data
}

export function useUpdateStudent() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateStudentInput & { id: number }) => {
      if (!token) {
        throw new Error('Not authenticated.')
      }
      return updateStudent(token, id, body)
    },
    onSuccess: (student) => {
      queryClient.setQueriesData<PaginatedStudents>({ queryKey: queryKeys.students.all }, (current) => {
        if (!current) return current
        return {
          ...current,
          data: current.data.map((s) => (s.id === student.id ? { ...s, ...student } : s)),
        }
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.students.all })
    },
  })
}

export async function deleteStudent(token: string, id: number): Promise<void> {
  await apiRequest(`/students/${id}`, {
    method: 'DELETE',
    token,
  })
}

export function useDeleteStudent() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => {
      if (!token) {
        throw new Error('Not authenticated.')
      }
      return deleteStudent(token, id)
    },
    onSuccess: (_data, id) => {
      queryClient.setQueriesData<PaginatedStudents>({ queryKey: queryKeys.students.all }, (current) => {
        if (!current) return current
        return {
          ...current,
          data: current.data.filter((s) => s.id !== id),
          total: Math.max(0, current.total - 1),
        }
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.students.all })
    },
  })
}

export async function importStudents(
  token: string,
  sectionId: number | string,
  file: File
): Promise<ImportStudentsResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('section_id', sectionId.toString())

  const response = await fetch(`${import.meta.env.VITE_API_URL}/students/import`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Import failed.')
  }

  return response.json()
}

export function useImportStudents() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sectionId, file }: { sectionId: number | string; file: File }) => {
      if (!token) {
        throw new Error('Not authenticated.')
      }
      return importStudents(token, sectionId, file)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.students.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sections.all })
    },
  })
}

async function downloadTemplate(token: string | null) {
  if (!token) return

  const response = await fetch(`${import.meta.env.VITE_API_URL}/templates/students-import`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error('Failed to download template.')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'students-import-template.xlsx'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function useDownloadTemplate() {
  const { token } = useAuth()

  return useMutation({
    mutationFn: () => {
      if (!token) {
        throw new Error('Not authenticated.')
      }
      return downloadTemplate(token)
    },
  })
}