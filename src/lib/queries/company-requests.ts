import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { queryKeys } from '@/lib/query-keys'
import type { Company, CompanyRequest, GeofencePolygon } from '@/types'

export type BuildingInput = {
  name: string
  code: string
  latitude: number | null
  longitude: number | null
  geofence_radius_meters: number
  geofence_enabled: boolean
  geofence_polygon: GeofencePolygon | null
}

export type AcceptCompanyRequestInput = {
  id: number
  geofence_polygon: GeofencePolygon
  geofence_enabled?: boolean
  geofence_radius_meters?: number
  buildings?: BuildingInput[]
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

export async function acceptCompanyRequest(
  token: string,
  input: AcceptCompanyRequestInput,
): Promise<{ company: Company; company_request: CompanyRequest }> {
  const { id, ...body } = input
  const response = await apiRequest<{
    data: { company: Company; company_request: CompanyRequest }
  }>(`/company-requests/${id}/accept`, {
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

export function useAcceptCompanyRequest() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AcceptCompanyRequestInput) => {
      if (!token) {
        throw new Error('Not authenticated.')
      }
      return acceptCompanyRequest(token, input)
    },
    onSuccess: () => {
      // Company is now pending superadmin approval; invalidate request list
      void queryClient.invalidateQueries({ queryKey: queryKeys.companyRequests.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all })
    },
  })
}
