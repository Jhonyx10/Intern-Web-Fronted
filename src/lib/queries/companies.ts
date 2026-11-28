import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { toastMutationError, toastMutationSuccess } from '@/lib/mutationToast'
import { queryKeys } from '@/lib/query-keys'
import type { Company } from '@/types'

export type CreateCompanyInput = {
  name: string
  address: string | null
  latitude: number
  longitude: number
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  geofence_enabled: boolean
  geofence_radius_meters: number | null
}

export async function fetchCompanies(token: string): Promise<Company[]> {
  const response = await apiRequest<{ data: Company[] }>('/companies', { token })
  return response.data
}

export async function fetchPendingCompanies(token: string): Promise<Company[]> {
  const response = await apiRequest<{ data: Company[] }>('/companies/pending', { token })
  return response.data
}

export async function createCompany(token: string, body: CreateCompanyInput): Promise<Company> {
  const response = await apiRequest<{ data: Company }>('/companies', {
    method: 'POST',
    token,
    body,
  })
  return response.data
}

export function useMyCompany() {
  const { user } = useAuth()
  const { data: companies, ...rest } = useCompanies()

  const myCompany = companies?.find((company) =>
    company.supervisors?.some((s) => s.user_id === user?.id)
  )

  return { data: myCompany, ...rest }
}

export function useCompanies() {
  const { token } = useAuth()

  return useQuery({
    queryKey: queryKeys.companies.list(),
    queryFn: () => fetchCompanies(token!),
    enabled: Boolean(token),
  })
}

export function usePendingCompanies() {
  const { token } = useAuth()

  return useQuery({
    queryKey: queryKeys.companies.pending(),
    queryFn: () => fetchPendingCompanies(token!),
    enabled: Boolean(token),
  })
}

export function useCompany(id: string | number | undefined) {
  const { token } = useAuth()

  return useQuery({
    queryKey: queryKeys.companies.detail(Number(id)),
    queryFn: () =>
      apiRequest<{ data: Company }>(`/companies/${id}`, { token }).then((res) => res.data),
    enabled: Boolean(token && id),
  })
}

export function useCreateCompany() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateCompanyInput) => {
      if (!token) {
        throw new Error('Not authenticated.')
      }
      return createCompany(token, body)
    },
    onSuccess: (company) => {
      queryClient.setQueryData<Company[]>(queryKeys.companies.list(), (current) => {
        if (!current) {
          return [company]
        }
        const withoutDuplicate = current.filter((item) => item.id !== company.id)
        return [...withoutDuplicate, company].sort((a, b) => a.name.localeCompare(b.name))
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all })
      toastMutationSuccess('Company created')
    },
    onError: (error) => toastMutationError(error, 'Failed to create company'),
  })
}

export function useApproveCompany() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => {
      if (!token) throw new Error('Not authenticated.')
      return apiRequest<{ data: Company }>(`/companies/${id}/approve`, {
        method: 'POST',
        token,
      }).then((res) => res.data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.companyRequests.all })
      toastMutationSuccess('Company approved')
    },
    onError: (error) => toastMutationError(error, 'Failed to approve company'),
  })
}

export function useRejectCompany() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => {
      if (!token) throw new Error('Not authenticated.')
      return apiRequest<{ data: Company }>(`/companies/${id}/reject`, {
        method: 'POST',
        token,
      }).then((res) => res.data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.companyRequests.all })
      toastMutationSuccess('Company rejected')
    },
    onError: (error) => toastMutationError(error, 'Failed to reject company'),
  })
}

export function useAssignStudentToCompany() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ companyId, studentIds }: { companyId: number | string; studentIds: number[] }) => {
      if (!token) throw new Error('Not authenticated.')
      return apiRequest(`/companies/${companyId}/assign-student`, {
        method: 'POST',
        token,
        body: { student_ids: studentIds },
      })
    },
    onSuccess: (_, { companyId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(Number(companyId)) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.students.all })
      toastMutationSuccess('Student(s) assigned')
    },
    onError: (error) => toastMutationError(error, 'Failed to assign student(s)'),
  })
}

export type CreateSupervisorInput = {
  first_name: string
  last_name: string
  email: string
  position_title: string
}

export function useCreateSupervisor() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ companyId, input }: { companyId: number | string; input: CreateSupervisorInput }) => {
      if (!token) throw new Error('Not authenticated.')
      return apiRequest(`/companies/${companyId}/supervisors`, {
        method: 'POST',
        token,
        body: input,
      })
    },
    onSuccess: (_, { companyId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(Number(companyId)) })
      toastMutationSuccess('Supervisor added')
    },
    onError: (error) => toastMutationError(error, 'Failed to add supervisor'),
  })
}

export function useToggleCompanyActive() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => {
      if (!token) throw new Error('Not authenticated.')
      return apiRequest<{ data: { id: number; name: string; is_active: boolean; is_approved: boolean } }>(
        `/companies/${id}/toggle-active`,
        { method: 'PATCH', token },
      ).then((res) => res.data)
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(data.id) })
      toastMutationSuccess(data.is_active ? 'Company activated' : 'Company deactivated')
    },
    onError: (error) => toastMutationError(error, 'Failed to toggle company status'),
  })
}

export type UpdateCompanyLocationInput = {
  address: string | null
  latitude: number
  longitude: number
  geofence_polygon?: GeoJSON.Polygon | null
}

export function useUpdateCompanyLocation() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ companyId, input }: { companyId: number | string; input: UpdateCompanyLocationInput }) => {
      if (!token) throw new Error('Not authenticated.')
      return apiRequest<{ data: Company }>(`/companies/${companyId}/location`, {
        method: 'PATCH',
        token,
        body: input,
      }).then((res) => res.data)
    },
    onSuccess: (_, { companyId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(Number(companyId)) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.list() })
      toastMutationSuccess('Location updated')
    },
    onError: (error) => toastMutationError(error, 'Failed to update location'),
  })
}


export type CompanySchedule = {
  id: number
  company_id: number
  start_date: string
  time_in: string
  break_out: string | null
  break_in: string | null
  time_out: string
  /** null when a coordinator set it */
  supervisor_id: number | null
  created_at?: string
  updated_at?: string
}

export type CompanyScheduleInput = {
  start_date: string // YYYY-MM-DD
  time_in: string // HH:mm
  break_out: string | null
  break_in: string | null
  time_out: string
}

export function useCompanySchedules(companyId?: number | string) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['companies', String(companyId), 'schedules'],
    queryFn: () =>
      apiRequest<{ data: CompanySchedule[] }>(`/companies/${companyId}/schedules`, {
        token: token!,
      }),
    enabled: Boolean(token) && Boolean(companyId),
    select: (res) => res.data,
  })
}

export function useCreateCompanySchedule() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, input }: { companyId: number; input: CompanyScheduleInput }) =>
      apiRequest(`/companies/${companyId}/schedules`, {
        method: 'POST',
        token: token!,
        body: input,
      }),
    onSuccess: () => {
      // prefix match refreshes the company, its schedules and any DTR data using them
      void queryClient.invalidateQueries({ queryKey: ['companies'] })
      void queryClient.invalidateQueries({ queryKey: ['supervisor', 'schedules'] })
      toastMutationSuccess('Schedule saved')
    },
    onError: (error) => toastMutationError(error, 'Failed to save schedule'),
  })
}