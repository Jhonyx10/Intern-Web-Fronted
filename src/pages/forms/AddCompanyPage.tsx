import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MapboxMap,
  MapTokenWarning,
  type MapboxMapHandle,
  type MapMarker,
  type MapPolygonFeature,
} from '@/components/MapboxMap'
import { ApiError } from '@/lib/api'
import {
  useAcceptCompanyRequest,
  useCompanyRequests,
} from '@/lib/queries/company-requests'
import type { CompanyRequest, GeofencePolygon } from '@/types'

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

function statusLabel(status: CompanyRequest['status']): string {
  if (status === 'approved') return 'Approved'
  if (status === 'accepted') return 'Pending Superadmin Approval'
  if (status === 'rejected') return 'Rejected'
  return 'Pending'
}

export function AddCompanyPage() {
  const mapRef = useRef<MapboxMapHandle>(null)

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('pending')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Geofence states
  const [companyGeofence, setCompanyGeofence] = useState<GeofencePolygon | null>(null)
  const [buildings, setBuildings] = useState<BuildingFormInput[]>([])
  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null)
  const [drawingTarget, setDrawingTarget] = useState<'company' | 'building'>('company')
  // Ref mirrors drawingTarget so handleDrawChange always reads the current value,
  // even when called synchronously from inside clearDraw() before React flushes state.
  const drawingTargetRef = useRef<'company' | 'building'>('company')

  const activeBuildingIdRef = useRef<string | null>(null)


  const [actionError, setActionError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const queryStatus = statusFilter === 'all' ? undefined : statusFilter
  const { data: requests = [], isPending, error } = useCompanyRequests(queryStatus)
  const approveRequest = useAcceptCompanyRequest()

  const selected = requests.find((request) => request.id === selectedId) ?? null

  const routeTo = useMemo(() => {
    return selected ? { latitude: selected.latitude, longitude: selected.longitude } : null
  }, [selected?.latitude, selected?.longitude])


  const markers = useMemo<MapMarker[]>(
    () =>
      requests.map((request) => ({
        id: request.id,
        latitude: request.latitude,
        longitude: request.longitude,
        title: request.name,
        color: request.status === 'pending' ? 'amber' : 'accent',
        popupHtml: `<strong>${request.name}</strong><br/>${request.address ?? ''}`,
      })),
    [requests],
  )

  const polygons = useMemo<MapPolygonFeature[]>(() => {
    const features: MapPolygonFeature[] = []

    // 1. Other pending/approved requests (excluding the currently selected one to avoid overlap)
    features.push(
      ...requests
        .filter((r) => r.id !== selectedId && r.geofence_polygon?.type === 'Polygon')
        .map((r) => ({
          id: `company-${r.id}`,
          name: `${r.name} (Company Boundary)`,
          polygon: r.geofence_polygon!,
        })),
    )

    // 2. The selected request's draft company perimeter (if we aren't actively editing it)
    if (drawingTarget !== 'company' && companyGeofence?.type === 'Polygon') {
      features.push({
        id: `draft-company`,
        name: `${selected?.name || 'Company'} Boundary`,
        polygon: companyGeofence,
      })
    }

    // 3. The draft buildings (excluding the one being actively edited)
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
  }, [
    requests,
    selectedId,
    selected?.name,
    drawingTarget,
    companyGeofence,
    buildings,
    activeBuildingId,
  ])

  useEffect(() => {
    if (selectedId !== null && !requests.some((request) => request.id === selectedId)) {
      setSelectedId(null)
    }
  }, [requests, selectedId])

  // Restore or reset draft when the selected request changes
  useEffect(() => {
    drawingTargetRef.current = 'company'
    mapRef.current?.clearDraw()
    setActiveBuildingId(null)
    activeBuildingIdRef.current = null
    setDrawingTarget('company')
    setActionError(null)

    if (selected?.status === 'pending' && selectedId !== null) {
      // Try to restore a previously saved draft
      const saved = localStorage.getItem(`company_request_draft_${selectedId}`)
      if (saved) {
        try {
          const draft = JSON.parse(saved) as { companyGeofence: typeof companyGeofence; buildings: typeof buildings }
          setCompanyGeofence(draft.companyGeofence ?? null)
          setBuildings(draft.buildings ?? [])

          if (draft.companyGeofence) {
            mapRef.current?.loadPolygon(draft.companyGeofence)
          } else {
            mapRef.current?.startDrawPolygon()
          }
        } catch {
          setCompanyGeofence(null)
          setBuildings([])
          mapRef.current?.startDrawPolygon()
        }
      } else {
        setCompanyGeofence(null)
        setBuildings([])
        mapRef.current?.startDrawPolygon()
      }
    } else {
      setCompanyGeofence(null)
      setBuildings([])
      mapRef.current?.setSimpleSelect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.status])

  // Auto-save the current draft to localStorage whenever geofence or buildings change
  useEffect(() => {
    if (selectedId === null) return
    localStorage.setItem(
      `company_request_draft_${selectedId}`,
      JSON.stringify({ companyGeofence, buildings }),
    )
  }, [selectedId, companyGeofence, buildings])

  function addBuilding() {
    const newBuilding: BuildingFormInput = {
      tempId: crypto.randomUUID(),
      name: `Building ${buildings.length + 1}`,
      code: `BLDG-${buildings.length + 1}`,
      latitude: selected?.latitude ?? null,
      longitude: selected?.longitude ?? null,
      geofence_radius_meters: 30,
      geofence_enabled: true,
      geofence_polygon: null,
    }
    setBuildings((prev) => [...prev, newBuilding])
    setActiveBuildingId(newBuilding.tempId)
    // Update ref BEFORE clearDraw so handleDrawChange sees 'building' immediately
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
      mapRef.current?.startDrawPolygon()
    }
  }

  function handleDrawChange(polygon: GeofencePolygon | null) {
    // Read from ref (not state) to avoid stale closure when clearDraw fires synchronously
    if (drawingTargetRef.current === 'company') {
      setCompanyGeofence(polygon)
    } else if (activeBuildingIdRef.current) {
      updateBuilding(activeBuildingIdRef.current, { geofence_polygon: polygon })
    }
  }

  function focusRequest(request: CompanyRequest) {
    setSelectedId(request.id)
    mapRef.current?.flyTo(request.longitude, request.latitude)
  }

  function clearSelection() {
    // Discard the localStorage draft when the user cancels
    if (selectedId !== null) {
      localStorage.removeItem(`company_request_draft_${selectedId}`)
    }
    setSelectedId(null)
    mapRef.current?.clearDraw()
    mapRef.current?.setSimpleSelect()
    setCompanyGeofence(null)
    setBuildings([])
    setActiveBuildingId(null)
    activeBuildingIdRef.current = null
  }

  async function onApprove(request: CompanyRequest) {
    if (!companyGeofence) {
      setActionError('Draw a outer geofence polygon for the company before approving.')
      setDrawingTarget('company')
      mapRef.current?.startDrawPolygon()
      return
    }

    setActionError(null)
    setApprovingId(request.id)

    try {
      await approveRequest.mutateAsync({
        id: request.id,
        geofence_polygon: companyGeofence,
        geofence_enabled: true,
        buildings: buildings.map(({ tempId, ...building }) => building),
      })
      // Remove the draft now that it has been persisted to the database
      localStorage.removeItem(`company_request_draft_${request.id}`)
      clearSelection()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to approve request.')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
            Locations
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Company requests</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
            Select a request, set company & building perimeters, then approve.
          </p>
        </div>
        <Link
          to="/companies/map"
          className="rounded-xl border border-[var(--color-line)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          Back to map
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['pending', 'approved', 'all'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => {
              setStatusFilter(filter)
              clearSelection()
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${statusFilter === filter
              ? 'bg-[var(--color-accent)] text-white'
              : 'border border-[var(--color-line)] bg-white/80 text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
              }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <MapTokenWarning />

      {error ? (
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Failed to load company requests.'}
        </p>
      ) : null}
      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
      {isPending ? <p className="text-sm text-[var(--color-muted)]">Loading requests…</p> : null}

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <aside className="max-h-[640px] overflow-auto rounded-2xl border border-[var(--color-line)] bg-white/80 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div
                key={`detail-${selected.id}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="flex h-full flex-col gap-4"
              >
                <button
                  type="button"
                  onClick={clearSelection}
                  className="self-start text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase transition hover:text-[var(--color-accent)]"
                >
                  ← Back to list
                </button>

                <div>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${selected.status === 'approved'
                      ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : selected.status === 'rejected'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-800'
                      }`}
                  >
                    {statusLabel(selected.status)}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight">{selected.name}</h3>
                  <p className="mt-1 text-xs text-[var(--color-muted)] leading-relaxed">
                    {selected.address ?? 'No address provided'}
                  </p>
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
                  className={`cursor-pointer rounded-xl border p-3 transition ${drawingTarget === 'company'
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]/20'
                    : 'border-[var(--color-line)] bg-slate-50/80 hover:bg-slate-100/80'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-[var(--color-ink)]">
                      1. Main Company Outer Perimeter
                    </p>
                    {drawingTarget === 'company' && (
                      <span className="text-[10px] font-bold text-[var(--color-accent)]">Active Drawing</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {companyGeofence ? 'Outer polygon configured.' : 'Click to draw outer campus boundary.'}
                  </p>
                </div>

                {/* Buildings Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-muted)] uppercase">
                      2. Sub-Buildings ({buildings.length})
                    </p>
                    {selected.status === 'pending' && (
                      <button
                        type="button"
                        onClick={addBuilding}
                        className="rounded-lg bg-[var(--color-accent)] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
                      >
                        + Add Building
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {buildings.length === 0 ? (
                      <p className="text-xs text-[var(--color-muted)] italic">No buildings added yet.</p>
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
                          className={`rounded-xl border p-3 cursor-pointer transition ${activeBuildingId === b.tempId && drawingTarget === 'building'
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
                              placeholder="Building Name"
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
                            <span className={b.geofence_polygon ? 'text-green-600 font-medium' : 'text-amber-600'}>
                              {b.geofence_polygon ? 'Polygon Set' : 'Draw Polygon'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-2">
                  {selected.status === 'pending' ? (
                    <button
                      type="button"
                      disabled={approvingId === selected.id}
                      onClick={() => void onApprove(selected)}
                      className="w-full rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                    >
                      {approvingId === selected.id ? 'Approving…' : 'Approve Company & Buildings'}
                    </button>
                  ) : (
                    <p className="text-center text-xs text-[var(--color-muted)]">
                      {selected.company_id
                        ? `Approved as company #${selected.company_id}`
                        : statusLabel(selected.status)}
                    </p>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="request-list"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
              >
                <p className="px-2 py-1 text-[11px] font-semibold tracking-[0.14em] text-[var(--color-muted)] uppercase">
                  {requests.length} requests
                </p>
                {!isPending && requests.length === 0 ? (
                  <p className="px-2 py-6 text-sm text-[var(--color-muted)]">
                    No company requests yet.
                  </p>
                ) : null}
                {requests.map((request, index) => (
                  <motion.button
                    key={request.id}
                    type="button"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.3 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => focusRequest(request)}
                    className="relative w-full rounded-xl px-3 py-2.5 text-left text-sm text-[var(--color-ink)] transition-colors hover:bg-slate-50"
                  >
                    <span className="block">
                      <span className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{request.name}</p>
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${request.status === 'approved'
                            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                            : request.status === 'rejected'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-800'
                            }`}
                        >
                          {statusLabel(request.status)}
                        </span>
                      </span>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">{request.address}</p>
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
          <MapboxMap
            ref={mapRef}
            markers={markers}
            polygons={polygons}
            fitMarkers={selectedId === null}
            drawEnabled
            routeTo={routeTo}
            onMarkerClick={(id) => setSelectedId(Number(id))}
            onDrawChange={handleDrawChange}

          />
        </div>
      </div>
    </section>
  )
}