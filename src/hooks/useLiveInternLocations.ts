import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { echo, type LiveLocationPayload } from '@/lib/echo'

const STALE_MS = 5 * 60 * 1000
const EMPTY: LiveLocationPayload[] = []

export function useLiveInternLocations(companyIds: number[]) {
  const { token } = useAuth()
  const key = companyIds.join(',')

  // live pings received over the websocket, keyed by intern_id
  const [live, setLive] = useState<Map<number, LiveLocationPayload>>(() => new Map())
  // ticks so stale interns drop off the map even if no new event arrives
  const [now, setNow] = useState(() => Date.now())

  // 1) one-time load from the database (no refetchInterval)
  const { data: initial = EMPTY } = useQuery({
    queryKey: ['intern-locations', key],
    queryFn: async () => {
      const params = new URLSearchParams()
      companyIds.forEach((id) => params.append('company_ids[]', String(id)))
      const res = await apiRequest<{ data: LiveLocationPayload[] }>(
        `/intern-locations?${params.toString()}`,
        { token: token! }
      )
      return res.data
    },
    enabled: Boolean(token) && companyIds.length > 0,
    refetchOnWindowFocus: true, // re-sync if the tab was asleep and missed events
  })

  // 2) live updates over Pusher
  useEffect(() => {
    if (companyIds.length === 0) return

    const channelNames = companyIds.map((id) => `company.${id}.locations`)

    for (const name of channelNames) {
      echo.private(name).listen('.location.updated', (payload: LiveLocationPayload) => {
        setLive((prev) => {
          const next = new Map(prev)
          next.set(payload.intern_id, payload)
          return next
        })
      })
    }

    return () => {
      for (const name of channelNames) echo.leave(name)
      setLive(new Map())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // 3) merge: DB snapshot as the base, newer live pings override it
  return useMemo(() => {
    const merged = new Map<number, LiveLocationPayload>()
    for (const loc of initial) merged.set(loc.intern_id, loc)
    for (const loc of live.values()) {
      const existing = merged.get(loc.intern_id)
      if (!existing || loc.recorded_at >= existing.recorded_at) {
        merged.set(loc.intern_id, loc)
      }
    }
    return Array.from(merged.values()).filter(
      (loc) => now - new Date(loc.recorded_at).getTime() < STALE_MS
    )
  }, [initial, live, now])
}