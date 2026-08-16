const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

/** Opol Community College — map origin / campus center */
export const OCC_CENTER: [number, number] = [124.57234, 8.52155]
export const OCC_NAME = 'Opol Community College'

export type RouteInfo = {
  coordinates: Array<[number, number]>
  distanceMeters: number
  durationSeconds: number
}

export function haversineMeters(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadius = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  return 2 * earthRadius * Math.asin(Math.sqrt(a))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }

  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60))
  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`
}

export async function fetchDrivingRoute(
  toLongitude: number,
  toLatitude: number,
  signal?: AbortSignal,
): Promise<RouteInfo | null> {
  if (!MAPBOX_TOKEN) {
    return null
  }

  const [fromLng, fromLat] = OCC_CENTER
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLongitude},${toLatitude}`,
  )
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('overview', 'full')
  url.searchParams.set('access_token', MAPBOX_TOKEN)

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error('Unable to fetch driving route.')
  }

  const payload = (await response.json()) as {
    routes?: Array<{
      distance: number
      duration: number
      geometry?: { coordinates?: Array<[number, number]> }
    }>
  }

  const route = payload.routes?.[0]
  if (!route?.geometry?.coordinates?.length) {
    return null
  }

  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  }
}
