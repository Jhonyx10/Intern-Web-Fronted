import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { queryKeys } from '@/lib/query-keys'
import type { Company, CompanyRequest, GeofencePolygon } from '@/types'

export type ApproveCompanyRequestInput = {
  id: number
  geofence_polygon: GeofencePolygon
  geofence_enabled?: boolean
  geofence_radius_meters?: number
}

export async function fetchCompanyRequests(
  token: string,
  status?: string,
): Promise<CompanyRequest[]> {
  const path = status
    ? `/company-requests?status=${encodeURIComponent(status)}`
    : '/company-requests'
  const response = await apiRequest<{ data: CompanyRequest[] }>(path, { token })
  return response.data
}

export async function approveCompanyRequest(
  token: string,
  input: ApproveCompanyRequestInput,
): Promise<{ company: Company; company_request: CompanyRequest }> {
  const { id, ...body } = input
  const response = await apiRequest<{
    data: { company: Company; company_request: CompanyRequest }
  }>(`/company-requests/${id}/approve`, {
    method: 'POST',
    token,
    body,
  })
  return response.data
}

export function useCompanyRequests(status?: string) {
  const { token } = useAuth()

  return useQuery({
    queryKey: queryKeys.companyRequests.list(status),
    queryFn: () => fetchCompanyRequests(token!, status),
    enabled: Boolean(token),
  })
}

export function useApproveCompanyRequest() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ApproveCompanyRequestInput) => {
      if (!token) {
        throw new Error('Not authenticated.')
      }
      return approveCompanyRequest(token, input)
    },
    onSuccess: ({ company }) => {
      queryClient.setQueryData<Company[]>(queryKeys.companies.list(), (current) => {
        if (!current) {
          return [company]
        }
        const withoutDuplicate = current.filter((item) => item.id !== company.id)
        return [...withoutDuplicate, company].sort((a, b) => a.name.localeCompare(b.name))
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.companyRequests.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all })
    },
  })
}
