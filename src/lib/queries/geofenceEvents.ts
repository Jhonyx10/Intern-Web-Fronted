import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { queryKeys } from '@/lib/query-keys'

export type GeofenceEventType = 'exit' | 'entry'

export type LatestGeofenceEvent = {
  student_id: number
  student_name: string
  event_type: GeofenceEventType
  latitude: number | null
  longitude: number | null
  occurred_at: string
}

export async function fetchLatestGeofenceEvents(token: string): Promise<LatestGeofenceEvent[]> {
  const response = await apiRequest<{ data: LatestGeofenceEvent[] }>('/geofence-events', { token })
  return response.data
}

export function useLatestGeofenceEvents() {
  const { token } = useAuth()

  return useQuery({
    queryKey: queryKeys.geofenceEvents.latest(),
    queryFn: () => fetchLatestGeofenceEvents(token!),
    enabled: Boolean(token),
    refetchInterval: 30000, // poll every 30s — reasonable for "last known position", not true live tracking
  })
}