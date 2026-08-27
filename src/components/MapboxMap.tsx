import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
} from 'react'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import mapboxgl from 'mapbox-gl'
import { fetchDrivingRoute, OCC_CENTER, OCC_NAME } from '@/lib/geo'
import type { GeofencePolygon } from '@/types'

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
export const DEFAULT_MAP_CENTER = OCC_CENTER

export type MapMarker = {
  id: number | string
  longitude: number
  latitude: number
  title?: string
  color?: 'accent' | 'amber' | 'campus'
  hexColor?: string
  popupHtml?: string
}

export type MapPolygonFeature = {
  id: number | string
  name?: string
  polygon: GeofencePolygon
  color?: string
}

export type MapRouteDestination = {
  longitude: number
  latitude: number
}

export type MapRouteInfo = {
  distanceMeters: number
  durationSeconds: number
}

export type MapboxMapHandle = {
  flyTo: (longitude: number, latitude: number, zoom?: number) => void
  fitBounds: (points: Array<[number, number]>, maxZoom?: number) => void
  clearDraw: () => void
  startDrawPolygon: () => void
  setSimpleSelect: () => void
  getDrawPolygon: () => GeofencePolygon | null
  /** Restore a saved polygon onto the draw canvas so it is visually editable. */
  loadPolygon: (polygon: GeofencePolygon) => void
}

type MapboxMapProps = {
  className?: string
  heightClassName?: string
  center?: [number, number]
  zoom?: number
  markers?: MapMarker[]
  polygons?: MapPolygonFeature[]
  fitMarkers?: boolean
  fitRouteBounds?: boolean
  drawEnabled?: boolean
  showCampusMarker?: boolean
  routeTo?: MapRouteDestination | null
  onMarkerClick?: (id: number | string) => void
  onDrawChange?: (polygon: GeofencePolygon | null) => void
  onRouteInfo?: (info: MapRouteInfo | null) => void
}

function extractPolygon(draw: MapboxDraw): GeofencePolygon | null {
  const polygon = draw.getAll().features.find((feature) => feature.geometry.type === 'Polygon')

  if (!polygon || polygon.geometry.type !== 'Polygon') {
    return null
  }

  return {
    type: 'Polygon',
    coordinates: polygon.geometry.coordinates as number[][][],
  }
}

function markerClassName(color: MapMarker['color']): string {
  if (color === 'amber') {
    return 'h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-500 shadow'
  }

  if (color === 'campus') {
    return 'h-4 w-4 rounded-sm border-2 border-white bg-[var(--color-ink)] shadow'
  }

  return 'h-3.5 w-3.5 rounded-full border-2 border-white bg-[var(--color-accent)] shadow'
}

function emptyLineCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

export const MapboxMap = forwardRef<MapboxMapHandle, MapboxMapProps>(function MapboxMap(
  {
    className,
    heightClassName = 'h-[560px]',
    center = DEFAULT_MAP_CENTER,
    zoom = 14,
    markers = [],
    polygons = [],
    fitMarkers = true,
    fitRouteBounds = true,
    drawEnabled = false,
    showCampusMarker = true,
    routeTo = null,
    onMarkerClick,
    onDrawChange,
    onRouteInfo,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const initialCenterRef = useRef(center)
  const initialZoomRef = useRef(zoom)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onDrawChangeRef = useRef(onDrawChange)
  const onRouteInfoRef = useRef(onRouteInfo)

  onMarkerClickRef.current = onMarkerClick
  onDrawChangeRef.current = onDrawChange
  onRouteInfoRef.current = onRouteInfo

  const syncGeofenceFromDraw = useEffectEvent(() => {
    const draw = drawRef.current
    if (!draw) {
      onDrawChangeRef.current?.(null)
      return
    }

    const features = draw.getAll().features.filter((feature) => feature.geometry.type === 'Polygon')
    if (features.length > 1) {
      const keep = features[features.length - 1]
      for (const feature of features.slice(0, -1)) {
        if (feature.id !== undefined) {
          draw.delete(String(feature.id))
        }
      }
      if (keep.id !== undefined) {
        draw.changeMode('simple_select', { featureIds: [String(keep.id)] })
      }
    }

    onDrawChangeRef.current?.(extractPolygon(draw))
  })

  useImperativeHandle(ref, () => ({
    flyTo(longitude, latitude, nextZoom = 17) {
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        zoom: nextZoom,
      })
    },
    fitBounds(points, maxZoom = 15) {
      const map = mapRef.current
      if (!map || points.length === 0) {
        return
      }

      const bounds = new mapboxgl.LngLatBounds()
      for (const point of points) {
        bounds.extend(point)
      }
      map.fitBounds(bounds, { padding: 60, maxZoom })
    },
    clearDraw() {
      drawRef.current?.deleteAll()
      onDrawChangeRef.current?.(null)
    },
    startDrawPolygon() {
      drawRef.current?.changeMode('draw_polygon')
    },
    setSimpleSelect() {
      drawRef.current?.changeMode('simple_select')
    },
    getDrawPolygon() {
      return drawRef.current ? extractPolygon(drawRef.current) : null
    },
    loadPolygon(polygon) {
      const draw = drawRef.current
      if (!draw) return
      draw.deleteAll()
      const added = draw.add({
        type: 'Feature',
        properties: {},
        geometry: polygon,
      })
      if (added.length > 0) {
        draw.changeMode('simple_select', { featureIds: added })
      }
      // Notify listeners so state stays in sync
      onDrawChangeRef.current?.(extractPolygon(draw))
    },
  }))

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) {
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: initialCenterRef.current,
      zoom: initialZoomRef.current,
      pitch: 0,
      bearing: 0,
      maxPitch: 0,
    })

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right')

    map.on('load', () => {
      map.addSource('map-polygons', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'map-polygons-fill',
        type: 'fill',
        source: 'map-polygons',
        paint: {
          'fill-color': ['coalesce', ['get', 'color'], '#0b6e4f'],
          'fill-opacity': 0.22,
        },
      })

      map.addLayer({
        id: 'map-polygons-outline',
        type: 'line',
        source: 'map-polygons',
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#0b6e4f'],
          'line-width': 2,
        },
      })

      map.addSource('map-route', {
        type: 'geojson',
        data: emptyLineCollection(),
      })

      map.addLayer({
        id: 'map-route-line',
        type: 'line',
        source: 'map-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#0b6e4f',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      })
    })

    if (drawEnabled) {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: 'simple_select',
      })

      map.addControl(draw, 'top-left')
      map.on('draw.create', syncGeofenceFromDraw)
      map.on('draw.update', syncGeofenceFromDraw)
      map.on('draw.delete', syncGeofenceFromDraw)
      drawRef.current = draw
    }

    mapRef.current = map

    return () => {
      if (drawRef.current) {
        map.off('draw.create', syncGeofenceFromDraw)
        map.off('draw.update', syncGeofenceFromDraw)
        map.off('draw.delete', syncGeofenceFromDraw)
      }
      map.remove()
      mapRef.current = null
      drawRef.current = null
    }
  }, [drawEnabled])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !MAPBOX_TOKEN) {
      return
    }

    const syncPolygons = () => {
      const source = map.getSource('map-polygons') as mapboxgl.GeoJSONSource | undefined
      if (!source) {
        return
      }

      source.setData({
        type: 'FeatureCollection',
        features: polygons.map((feature) => ({
          type: 'Feature' as const,
          properties: { id: feature.id, name: feature.name ?? null, color: feature.color ?? null },
          geometry: feature.polygon,
        })),
      })
    }

    if (map.isStyleLoaded()) {
      syncPolygons()
    } else {
      map.once('load', syncPolygons)
    }

    return () => {
      map.off('load', syncPolygons)
    }
  }, [polygons])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !MAPBOX_TOKEN) {
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const clearRoute = () => {
      const source = map.getSource('map-route') as mapboxgl.GeoJSONSource | undefined
      source?.setData(emptyLineCollection())
      onRouteInfoRef.current?.(null)
    }

    const applyRoute = () => {
      void (async () => {
        if (!routeTo) {
          clearRoute()
          return
        }

        try {
          const route = await fetchDrivingRoute(
            routeTo.longitude,
            routeTo.latitude,
            controller.signal,
          )

          if (cancelled) {
            return
          }

          const source = map.getSource('map-route') as mapboxgl.GeoJSONSource | undefined
          if (!source || !route) {
            clearRoute()
            return
          }

          source.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: route.coordinates,
                },
              },
            ],
          })

          onRouteInfoRef.current?.({
            distanceMeters: route.distanceMeters,
            durationSeconds: route.durationSeconds,
          })

          if (fitRouteBounds) {
            const bounds = new mapboxgl.LngLatBounds()
            bounds.extend(OCC_CENTER)
            bounds.extend([routeTo.longitude, routeTo.latitude])
            for (const coordinate of route.coordinates) {
              bounds.extend(coordinate)
            }
            map.fitBounds(bounds, { padding: 72, maxZoom: 15 })
          }
        } catch (error) {
          if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) {
            return
          }
          clearRoute()
        }
      })()
    }

    if (map.isStyleLoaded()) {
      applyRoute()
    } else {
      map.once('load', applyRoute)
    }

    return () => {
      cancelled = true
      controller.abort()
      map.off('load', applyRoute)
    }
  }, [routeTo])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !MAPBOX_TOKEN) {
      return
    }

    const activeMarkers: mapboxgl.Marker[] = []
    const allMarkers: MapMarker[] = showCampusMarker
      ? [
        {
          id: 'occ-campus',
          longitude: OCC_CENTER[0],
          latitude: OCC_CENTER[1],
          title: OCC_NAME,
          color: 'campus',
          popupHtml: `<strong>${OCC_NAME}</strong><br/>Campus center`,
        },
        ...markers,
      ]
      : markers

    for (const marker of allMarkers) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = markerClassName(marker.color)
      if (marker.hexColor) {
        el.style.backgroundColor = marker.hexColor
      }
      el.title = marker.title ?? ''
      el.addEventListener('click', () => {
        if (marker.id !== 'occ-campus') {
          onMarkerClickRef.current?.(marker.id)
        }
        map.flyTo({
          center: [marker.longitude, marker.latitude],
          zoom: 17,
        })
      })

      const mapMarker = new mapboxgl.Marker({ element: el }).setLngLat([
        marker.longitude,
        marker.latitude,
      ])

      if (marker.popupHtml) {
        mapMarker.setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(marker.popupHtml))
      }

      mapMarker.addTo(map)
      activeMarkers.push(mapMarker)
    }

    if (fitMarkers && markers.length > 0 && !routeTo) {
      const bounds = new mapboxgl.LngLatBounds()
      bounds.extend(OCC_CENTER)
      for (const marker of markers) {
        bounds.extend([marker.longitude, marker.latitude])
      }
      map.fitBounds(bounds, { padding: 60, maxZoom: 15 })
    }

    return () => {
      for (const marker of activeMarkers) {
        marker.remove()
      }
    }
  }, [fitMarkers, markers, routeTo, showCampusMarker])

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`grid place-items-center bg-slate-100 px-4 text-center text-sm text-amber-900 ${heightClassName} ${className ?? ''}`}
      >
        Set <code>VITE_MAPBOX_TOKEN</code> in <code>frontend/.env</code>, then restart the Vite
        dev server.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`w-full bg-slate-100 ${heightClassName} ${className ?? ''}`}
    />
  )
})

export function MapTokenWarning() {
  if (MAPBOX_TOKEN) {
    return null
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Set <code>VITE_MAPBOX_TOKEN</code> in <code>frontend/.env</code>, then restart the Vite
      dev server.
    </div>
  )
}
