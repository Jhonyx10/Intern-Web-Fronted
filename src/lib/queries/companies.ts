import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
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
    },
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
    },
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
    },
  })
}

export function useAssignStudentToCompany() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ companyId, studentId }: { companyId: number | string; studentId: number }) => {
      if (!token) throw new Error('Not authenticated.')
      return apiRequest(`/companies/${companyId}/assign-student`, {
        method: 'POST',
        token,
        body: { student_id: studentId },
      })
    },
    onSuccess: (_, { companyId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(Number(companyId)) })
    },
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
    },
  })
}
