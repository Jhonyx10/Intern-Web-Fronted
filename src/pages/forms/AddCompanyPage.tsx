import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MapboxMap,
  MapTokenWarning,
  type MapboxMapHandle,
  type MapMarker,
  type MapPolygonFeature,
  type MapRouteInfo,
} from '@/components/MapboxMap'
import { ApiError } from '@/lib/api'
import { formatDistance, formatDuration, haversineMeters, OCC_CENTER, OCC_NAME } from '@/lib/geo'
import {
  useApproveCompanyRequest,
  useCompanyRequests,
} from '@/lib/queries/company-requests'
import type { CompanyRequest, GeofencePolygon } from '@/types'

function statusLabel(status: CompanyRequest['status']): string {
  if (status === 'approved') {
    return 'Approved'
  }
  if (status === 'rejected') {
    return 'Rejected'
  }
  return 'Pending'
}

export function AddCompanyPage() {
  const mapRef = useRef<MapboxMapHandle>(null)

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('pending')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [geofencePolygon, setGeofencePolygon] = useState<GeofencePolygon | null>(null)
  const [routeInfo, setRouteInfo] = useState<MapRouteInfo | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const queryStatus = statusFilter === 'all' ? undefined : statusFilter
  const { data: requests = [], isPending, error } = useCompanyRequests(queryStatus)
  const approveRequest = useApproveCompanyRequest()

  const selected = requests.find((request) => request.id === selectedId) ?? null

  const routeTo = selected
    ? { latitude: selected.latitude, longitude: selected.longitude }
    : null

  const straightLineMeters = selected
    ? haversineMeters(OCC_CENTER[0], OCC_CENTER[1], selected.longitude, selected.latitude)
    : null

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

  const polygons = useMemo<MapPolygonFeature[]>(
    () =>
      requests
        .filter((request) => request.geofence_polygon?.type === 'Polygon')
        .map((request) => ({
          id: request.id,
          name: request.name,
          polygon: request.geofence_polygon!,
        })),
    [requests],
  )

  useEffect(() => {
    if (selectedId !== null && !requests.some((request) => request.id === selectedId)) {
      setSelectedId(null)
    }
  }, [requests, selectedId])

  useEffect(() => {
    mapRef.current?.clearDraw()
    setGeofencePolygon(null)
    setActionError(null)

    if (selected?.status === 'pending') {
      mapRef.current?.startDrawPolygon()
    } else {
      mapRef.current?.setSimpleSelect()
    }
  }, [selected?.id, selected?.status])

  function focusRequest(request: CompanyRequest) {
    setSelectedId(request.id)
    mapRef.current?.flyTo(request.longitude, request.latitude)
  }

  function clearSelection() {
    setSelectedId(null)
    mapRef.current?.clearDraw()
    mapRef.current?.setSimpleSelect()
    setGeofencePolygon(null)
    setRouteInfo(null)
  }

  async function onApprove(request: CompanyRequest) {
    if (!geofencePolygon) {
      setActionError('Draw a geofence polygon on the map before approving.')
      mapRef.current?.startDrawPolygon()
      return
    }

    setActionError(null)
    setApprovingId(request.id)

    try {
      await approveRequest.mutateAsync({
        id: request.id,
        geofence_polygon: geofencePolygon,
        geofence_enabled: true,
      })
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
            Select a request, draw a geofence polygon around the site, then approve.
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
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
              statusFilter === filter
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

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="max-h-[560px] overflow-auto rounded-2xl border border-[var(--color-line)] bg-white/80 p-3 shadow-[var(--shadow-soft)] backdrop-blur">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div
                key={`detail-${selected.id}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="flex h-full flex-col gap-4 p-1"
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
                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                      selected.status === 'approved'
                        ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                        : selected.status === 'rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {statusLabel(selected.status)}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">{selected.name}</h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                    {selected.address ?? 'No address provided'}
                  </p>
                </div>

                <div className="space-y-1 rounded-xl border border-[var(--color-line)] bg-slate-50/80 px-3 py-3">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-muted)] uppercase">
                    Coordinates
                  </p>
                  <p className="font-mono text-sm text-[var(--color-ink)]">
                    {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                  </p>
                </div>

                {straightLineMeters !== null ? (
                  <div className="space-y-1 rounded-xl border border-[var(--color-line)] bg-slate-50/80 px-3 py-3">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-muted)] uppercase">
                      Distance from {OCC_NAME}
                    </p>
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {routeInfo
                        ? formatDistance(routeInfo.distanceMeters)
                        : `${formatDistance(straightLineMeters)} (straight line)`}
                    </p>
                    {routeInfo ? (
                      <p className="text-xs text-[var(--color-muted)]">
                        Driving · about {formatDuration(routeInfo.durationSeconds)}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--color-muted)]">Loading driving route…</p>
                    )}
                  </div>
                ) : null}

                {selected.status === 'pending' ? (
                  <div className="space-y-1 rounded-xl border border-[var(--color-line)] bg-slate-50/80 px-3 py-3">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-muted)] uppercase">
                      Geofence
                    </p>
                    <p className="text-sm text-[var(--color-ink)]">
                      {geofencePolygon
                        ? 'Polygon ready — you can edit or trash and redraw.'
                        : 'Use the polygon tool on the map to draw the site boundary.'}
                    </p>
                  </div>
                ) : selected.geofence_polygon ? (
                  <div className="space-y-1 rounded-xl border border-[var(--color-line)] bg-slate-50/80 px-3 py-3">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-muted)] uppercase">
                      Geofence
                    </p>
                    <p className="text-sm font-medium text-[var(--color-ink)]">Polygon enabled</p>
                  </div>
                ) : null}

                {selected.user ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-muted)] uppercase">
                      Submitted by
                    </p>
                    <p className="text-sm font-medium">{selected.user.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">{selected.user.email}</p>
                  </div>
                ) : null}

                <div className="mt-auto pt-2">
                  {selected.status === 'pending' ? (
                    <button
                      type="button"
                      disabled={approvingId === selected.id}
                      onClick={() => void onApprove(selected)}
                      className="w-full rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                    >
                      {approvingId === selected.id ? 'Approving…' : 'Approve company'}
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
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            request.status === 'approved'
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
                      {request.user ? (
                        <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                          by {request.user.name}
                        </p>
                      ) : null}
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
            onDrawChange={setGeofencePolygon}
            onRouteInfo={setRouteInfo}
          />
        </div>
      </div>
    </section>
  )
}
