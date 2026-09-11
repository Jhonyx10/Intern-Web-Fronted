import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MapboxMap,
  MapTokenWarning,
  MAPBOX_TOKEN,
  type MapboxMapHandle,
  type MapMarker,
  type MapPolygonFeature,
} from '@/components/MapboxMap'
import { ApiError } from '@/lib/api'
import { createCompany } from '@/lib/queries/companies'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/Toaster'
import type { GeofencePolygon } from '@/types'

export interface BuildingFormInput {
  tempId: string
  name: string
  code: string
  latitude: number | null
  longitude: number | null
  geofence_radius_meters: number
  geofence_enabled: boolean
  geofence_polygon: GeofencePolygon | null
}

export interface OrganizationDraft {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  companyGeofence: GeofencePolygon | null
  buildings: BuildingFormInput[]
}

export function AddOrganization() {
  const mapRef = useRef<MapboxMapHandle>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const { token } = useAuth()
  const { addToast } = useToast()

  // Search and location states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MapMarker[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Selected organization/draft states
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationDraft | null>(null)
  const [organizationForm, setOrganizationForm] = useState({
    name: '',
    address: '',
  })

  // Geofence states
  const [companyGeofence, setCompanyGeofence] = useState<GeofencePolygon | null>(null)
  const [buildings, setBuildings] = useState<BuildingFormInput[]>([])
  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null)
  const [drawingTarget, setDrawingTarget] = useState<'company' | 'building'>('company')

  // Whether we're waiting for the user to click the map to set the org's center
  const [pickingCenter, setPickingCenter] = useState(true)
  const pickingCenterRef = useRef(true)

  const drawingTargetRef = useRef<'company' | 'building'>('company')
  const activeBuildingIdRef = useRef<string | null>(null)

  const [isSaving, setIsSaving] = useState(false)

  // Search using Mapbox Geocoding API - Philippines/Mindanao only
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      if (!MAPBOX_TOKEN) {
        addToast('error', 'Mapbox token not configured.')
        setIsSearching(false)
        return
      }

      // Misamis Oriental province center for proximity bias
      const proximityLng = 124.65
      const proximityLat = 8.5

      // Mindanao bounding box (more specific) or just use country filter
      // Mindanao bbox: minLng, minLat, maxLng, maxLat
      const mindanaoBbox = '121.8,5.0,126.5,10.0'

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=PH&bbox=${mindanaoBbox}&proximity=${proximityLng},${proximityLat}&access_token=${MAPBOX_TOKEN}`,
      )

      if (!response.ok) {
        throw new Error('Mapbox API request failed')
      }

      const data = await response.json()

      const results: MapMarker[] = data.features.map((feature: any) => {
        const [lng, lat] = feature.center
        const placeName = feature.place_name || feature.text
        
        return {
          id: feature.id,
          latitude: lat,
          longitude: lng,
          title: placeName,
          color: 'amber',
          popupHtml: `<strong>${feature.text}</strong><br/>${feature.place_name}`,
        }
      })

      setSearchResults(results)
    } catch (err) {
      console.error('Search error:', err)
      addToast('error', 'Failed to search locations. Please try again.')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectSearchResult = (result: MapMarker) => {
    // Just navigate to the location, don't open the form yet.
    // The user still needs to click the map to set the exact center,
    // then draw the boundary.
    setSearchResults([])
    mapRef.current?.flyTo(result.longitude, result.latitude, 16)
  }

  const handleMapMarkerClick = (id: number | string) => {
    // Only handle search result marker clicks, not organization markers
    const result = searchResults.find((r) => String(r.id) === String(id))
    if (result) {
      handleSelectSearchResult(result)
    }
  }

  function handleMapClick(longitude: number, latitude: number) {
    if (!pickingCenterRef.current) return

    const newOrg: OrganizationDraft = {
      id: crypto.randomUUID(),
      name: 'New Organization',
      address: '',
      latitude,
      longitude,
      companyGeofence: null,
      buildings: [],
    }
    setSelectedOrganization(newOrg)
    setOrganizationForm({ name: '', address: '' })
    setCompanyGeofence(null)
    setPickingCenter(false)
    pickingCenterRef.current = false

    mapRef.current?.clearDraw()
    mapRef.current?.startDrawPolygon()
  }

  function addBuilding() {
    const newBuilding: BuildingFormInput = {
      tempId: crypto.randomUUID(),
      name: `Building ${buildings.length + 1}`,
      code: `BLDG-${buildings.length + 1}`,
      latitude: selectedOrganization?.latitude ?? null,
      longitude: selectedOrganization?.longitude ?? null,
      geofence_radius_meters: 30,
      geofence_enabled: true,
      geofence_polygon: null,
    }
    setBuildings((prev) => [...prev, newBuilding])
    setActiveBuildingId(newBuilding.tempId)
    drawingTargetRef.current = 'building'
    activeBuildingIdRef.current = newBuilding.tempId
    setDrawingTarget('building')
    mapRef.current?.clearDraw()
    mapRef.current?.startDrawPolygon()
  }

  function updateBuilding(tempId: string, updates: Partial<BuildingFormInput>) {
    setBuildings((prev) =>
      prev.map((b) => (b.tempId === tempId ? { ...b, ...updates } : b)),
    )
  }

  function removeBuilding(tempId: string) {
    setBuildings((prev) => prev.filter((b) => b.tempId !== tempId))
    if (activeBuildingId === tempId) {
      setActiveBuildingId(null)
      activeBuildingIdRef.current = null
      drawingTargetRef.current = 'company'
      setDrawingTarget('company')
      mapRef.current?.clearDraw()
      if (companyGeofence) {
        mapRef.current?.loadPolygon(companyGeofence)
      } else {
        mapRef.current?.startDrawPolygon()
      }
    }
  }

  function handleDrawChange(polygon: GeofencePolygon | null) {
    if (drawingTargetRef.current === 'company') {
      setCompanyGeofence(polygon)
    } else if (activeBuildingIdRef.current) {
      updateBuilding(activeBuildingIdRef.current, { geofence_polygon: polygon })
    }
  }

  function clearSelection() {
    setSelectedOrganization(null)
    setOrganizationForm({ name: '', address: '' })
    setCompanyGeofence(null)
    setBuildings([])
    setActiveBuildingId(null)
    activeBuildingIdRef.current = null
    setDrawingTarget('company')
    setSearchQuery('')
    setSearchResults([])
    setPickingCenter(true)
    pickingCenterRef.current = true
    mapRef.current?.clearDraw()
    mapRef.current?.setSimpleSelect()
  }

  async function onSave() {
    if (!selectedOrganization) return

    if (!organizationForm.name.trim()) {
      addToast('error', 'Please enter an organization name.')
      return
    }

    if (!companyGeofence) {
      addToast('error', 'Please draw a company boundary polygon.')
      return
    }

    if (!token) {
      addToast('error', 'Authentication required. Please log in.')
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        name: organizationForm.name.trim(),
        address: organizationForm.address.trim(),
        latitude: selectedOrganization.latitude,
        longitude: selectedOrganization.longitude,
        geofence_polygon: companyGeofence,
        geofence_enabled: true,
        geofence_radius_meters: 50,
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        buildings: buildings.map(({ tempId, ...building }) => ({
          ...building,
          geofence_polygon: building.geofence_polygon || null,
        })),
      }

      const company = await createCompany(token, payload)

      // Success - show toast and clear form
      addToast('success', 'Organization created successfully!', `${organizationForm.name} has been added to your system.`)
      clearSelection()
      
      console.log('Organization created successfully:', company)
    } catch (err) {
      console.error('Error saving organization:', err)
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to create organization. Please try again.'
      addToast('error', 'Creation failed', errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchResults([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markers = useMemo<MapMarker[]>(() => {
    const results: MapMarker[] = searchResults
    if (selectedOrganization) {
      results.push({
        id: selectedOrganization.id,
        latitude: selectedOrganization.latitude,
        longitude: selectedOrganization.longitude,
        title: selectedOrganization.name,
        color: 'accent',
        popupHtml: `<strong>${selectedOrganization.name}</strong><br/>${selectedOrganization.address}`,
      })
    }
    return results
  }, [searchResults, selectedOrganization])

  const polygons = useMemo<MapPolygonFeature[]>(() => {
    const features: MapPolygonFeature[] = []

    // Selected organization's company geofence
    if (drawingTarget !== 'company' && companyGeofence?.type === 'Polygon') {
      features.push({
        id: `draft-company`,
        name: `${selectedOrganization?.name || 'Organization'} Boundary`,
        polygon: companyGeofence,
      })
    }

    // Draft buildings
    features.push(
      ...buildings
        .filter((b) => b.tempId !== activeBuildingId && b.geofence_polygon?.type === 'Polygon')
        .map((b) => ({
          id: `building-${b.tempId}`,
          name: `${b.name || 'Unnamed Building'}`,
          polygon: b.geofence_polygon!,
        })),
    )

    return features
  }, [selectedOrganization?.name, drawingTarget, companyGeofence, buildings, activeBuildingId])

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
            Setup
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Create organization</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
            Search for a location, set company & building perimeters, then save.
          </p>
        </div>
      </div>

      {/* Search Bar with Dropdown */}
      <div ref={searchContainerRef} className="relative mb-4 max-w-md">
        <div className="relative">
          <input
            type="text"
            placeholder="Search location or address..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              handleSearch(e.target.value)
            }}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]"></div>
            </div>
          )}
        </div>
        {searchQuery.trim() && !selectedOrganization && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--color-line)] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {isSearching ? (
              <div className="px-3 py-4 text-center text-sm text-[var(--color-muted)]">
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-[var(--color-line)] last:border-b-0 text-sm transition"
                >
                  <p className="font-medium text-[var(--color-ink)]">{result.title}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    {result.latitude.toFixed(4)}°, {result.longitude.toFixed(4)}°
                  </p>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-[var(--color-muted)]">
                No results found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur overflow-hidden">
        <MapTokenWarning />

        <div className="grid gap-4 lg:grid-cols-[380px_1fr] p-4">
          {/* Form Panel */}
          <aside className="max-h-[640px] overflow-auto rounded-2xl border border-[var(--color-line)] bg-white/80 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
            <AnimatePresence mode="wait" initial={false}>
              {selectedOrganization ? (
                <motion.div
                  key={`detail-${selectedOrganization.id}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-full flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase transition hover:text-[var(--color-accent)]"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs font-semibold tracking-wide text-red-600 uppercase transition hover:text-red-700"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Organization Details Form */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-muted)] uppercase">
                      Organization Details
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-[var(--color-ink)]">Name</label>
                      <input
                        type="text"
                        value={organizationForm.name}
                        onChange={(e) =>
                          setOrganizationForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Organization name"
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[var(--color-ink)]">Address</label>
                      <input
                        type="text"
                        value={organizationForm.address}
                        onChange={(e) =>
                          setOrganizationForm((prev) => ({ ...prev, address: e.target.value }))
                        }
                        placeholder="Address"
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-[var(--color-ink)]">Coordinates</p>
                      <p className="text-xs text-[var(--color-muted)] mt-1">
                        {selectedOrganization.latitude.toFixed(4)}, {selectedOrganization.longitude.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  {/* Company Perimeter Control */}
                  <div
                    onClick={() => {
                      drawingTargetRef.current = 'company'
                      setDrawingTarget('company')
                      setActiveBuildingId(null)
                      activeBuildingIdRef.current = null
                      mapRef.current?.clearDraw()
                      if (companyGeofence) {
                        mapRef.current?.loadPolygon(companyGeofence)
                      } else {
                        mapRef.current?.startDrawPolygon()
                      }
                    }}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      drawingTarget === 'company'
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]/20'
                        : 'border-[var(--color-line)] bg-slate-50/80 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-[var(--color-ink)]">
                        1. Company Outer Perimeter
                      </p>
                      {drawingTarget === 'company' && (
                        <span className="text-[10px] font-bold text-[var(--color-accent)]">Active</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {companyGeofence ? '✓ Boundary configured' : 'Click to draw boundary'}
                    </p>
                  </div>

                  {/* Buildings Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-muted)] uppercase">
                        2. Sub-Buildings ({buildings.length})
                      </p>
                      <button
                        type="button"
                        onClick={addBuilding}
                        className="rounded-lg bg-[var(--color-accent)] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
                      >
                        + Add
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {buildings.length === 0 ? (
                        <p className="text-xs text-[var(--color-muted)] italic">No buildings yet.</p>
                      ) : (
                        buildings.map((b) => (
                          <div
                            key={b.tempId}
                            onClick={() => {
                              setActiveBuildingId(b.tempId)
                              activeBuildingIdRef.current = b.tempId
                              drawingTargetRef.current = 'building'
                              setDrawingTarget('building')
                              mapRef.current?.clearDraw()
                              if (b.geofence_polygon) {
                                mapRef.current?.loadPolygon(b.geofence_polygon)
                              } else {
                                mapRef.current?.startDrawPolygon()
                              }
                            }}
                            className={`rounded-xl border p-3 cursor-pointer transition ${
                              activeBuildingId === b.tempId && drawingTarget === 'building'
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]/20'
                                : 'border-[var(--color-line)] bg-slate-50/80 hover:bg-slate-100/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={b.name}
                                onChange={(e) => updateBuilding(b.tempId, { name: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Building name"
                                className="w-full bg-transparent text-xs font-semibold text-[var(--color-ink)] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeBuilding(b.tempId)
                                }}
                                className="text-xs text-red-500 hover:text-red-700 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                              <span>Code: {b.code}</span>
                              <span
                                className={
                                  b.geofence_polygon ? 'text-green-600 font-medium' : 'text-amber-600'
                                }
                              >
                                {b.geofence_polygon ? '✓ Set' : 'Draw'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={onSave}
                      className="w-full rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                    >
                      {isSaving ? 'Creating Organization…' : 'Create Organization'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-full flex-col items-center justify-center text-center gap-3"
                >
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    Click on the map to set the organization's location
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Search to jump nearby, then click to place the center pin
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>

          {/* Map */}
          <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur h-[640px]">
            <MapboxMap
              ref={mapRef}
              markers={markers}
              polygons={polygons}
              fitMarkers={false}
              center={[124.65, 8.5]}
              zoom={13}
              drawEnabled
              pickPointMode={pickingCenter}
              onMapClick={handleMapClick}
              heightClassName="h-full"
              onMarkerClick={handleMapMarkerClick}
              onDrawChange={handleDrawChange}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default AddOrganization