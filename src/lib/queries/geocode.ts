import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const DEFAULT_CENTER: [number, number] = [124.57234, 8.52155]
/** Mindanao bbox for Mapbox: minLon,minLat,maxLon,maxLat */
export const MINDANAO_BBOX = '119.2,4.5,126.8,10.5' as const
export const MINDANAO_BOUNDS = {
  minLon: 119.2,
  minLat: 4.5,
  maxLon: 126.8,
  maxLat: 10.5,
} as const
export const GEOCODE_DEFAULT_CENTER = DEFAULT_CENTER

export type GeocodeFeature = {
  id: string
  place_name: string
  text: string
  center: [number, number]
}

function isInMindanao(feature: GeocodeFeature): boolean {
  const [lng, lat] = feature.center
  return (
    lng >= MINDANAO_BOUNDS.minLon &&
    lng <= MINDANAO_BOUNDS.maxLon &&
    lat >= MINDANAO_BOUNDS.minLat &&
    lat <= MINDANAO_BOUNDS.maxLat
  )
}

export async function searchMindanaoPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeFeature[]> {
  if (!MAPBOX_TOKEN) {
    throw new Error('Missing Mapbox token.')
  }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  )
  url.searchParams.set('access_token', MAPBOX_TOKEN)
  url.searchParams.set('autocomplete', 'true')
  url.searchParams.set('limit', '8')
  url.searchParams.set('country', 'ph')
  url.searchParams.set('bbox', MINDANAO_BBOX)
  url.searchParams.set('proximity', `${DEFAULT_CENTER[0]},${DEFAULT_CENTER[1]}`)

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error('Location search failed.')
  }

  const payload = (await response.json()) as { features?: GeocodeFeature[] }
  return (payload.features ?? []).filter(isInMindanao)
}

export function useMindanaoGeocode(query: string) {
  const normalized = query.trim()

  return useQuery({
    queryKey: queryKeys.geocode.mindanao(normalized),
    queryFn: ({ signal }) => searchMindanaoPlaces(normalized, signal),
    enabled: Boolean(MAPBOX_TOKEN) && normalized.length >= 2,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
  })
}

export { MAPBOX_TOKEN }
