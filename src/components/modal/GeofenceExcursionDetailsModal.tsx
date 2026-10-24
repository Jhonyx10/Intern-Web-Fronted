import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Clock, AlertCircle, Ruler } from 'lucide-react'
import { MapboxMap, type MapMarker, type MapPolygonFeature } from '@/components/MapboxMap'
import type { GeofenceExcursion, GeofencePolygon } from '@/types'

type GeofenceExcursionDetailsModalProps = {
    isOpen: boolean
    excursion: GeofenceExcursion | null
    onClose: () => void
    /** Optional label for the linked time log (e.g. "morning"). Falls back to "Log #id". */
    sessionLabel?: string | null
    /** The company's geofence polygon to draw on the map. */
    geofencePolygon?: GeofencePolygon | null
}

// Handles ISO strings and MySQL "YYYY-MM-DD HH:mm:ss" (Safari-safe).
function parseDate(value?: string | null): Date | null {
    if (!value) return null
    const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
    return isNaN(d.getTime()) ? null : d
}

function formatTime(value?: string | null): string {
    const d = parseDate(value)
    return d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—'
}

function formatSeconds(seconds?: number | null): string {
    if (seconds == null) return '—'
    const total = Math.round(Number(seconds))
    if (isNaN(total)) return '—'
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

export function GeofenceExcursionDetailsModal({
    isOpen,
    excursion,
    onClose,
    sessionLabel,
    geofencePolygon,
}: GeofenceExcursionDetailsModalProps) {
    const points = excursion?.points ?? []

    // Create markers for each point recorded
    const markers = useMemo<MapMarker[]>(() => {
        return points.map((p, index) => {
            return {
                id: `point-${p.id}`,
                longitude: p.longitude,
                latitude: p.latitude,
                color: index === 0 ? 'amber' : index === points.length - 1 ? 'danger' : 'primary',
                shape: 'circle',
                popupHtml: `<div class="text-[10px]">Point ${index + 1}<br/>${formatTime(p.recorded_at)}</div>`
            }
        })
    }, [points])

    // Build the geofence polygon layer for the map
    const polygons = useMemo<MapPolygonFeature[]>(() => {
        if (!geofencePolygon) return []
        return [
            {
                id: 'company-geofence',
                name: 'Company Geofence',
                polygon: geofencePolygon,
                color: '#6366f1', // indigo
            },
        ]
    }, [geofencePolygon])

    // Build an ordered [lng, lat] trail connecting all excursion points
    const trail = useMemo<[number, number][]>(() => {
        return points.map((p) => [p.longitude, p.latitude])
    }, [points])

    // Compute a smart map center: first excursion point, or polygon centroid
    const center = useMemo<[number, number] | undefined>(() => {
        if (points.length > 0) {
            return [points[0].longitude, points[0].latitude]
        }
        if (geofencePolygon) {
            const coords = geofencePolygon.coordinates[0]
            const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length
            const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length
            return [avgLng, avgLat]
        }
        return undefined
    }, [points, geofencePolygon])

    if (!isOpen || !excursion) return null

    const isActive = !excursion.return_at || excursion.status === 'active'
    const sessionText = sessionLabel || `Log #${excursion.time_log_id}`

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Geofence Excursion Incident</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Time Log Session: <span className="capitalize font-semibold text-slate-700">{sessionText}</span></p>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row h-[70vh] max-h-[600px]">
                        {/* Map Area */}
                        <div className="relative w-full md:w-2/3 h-[300px] md:h-full bg-slate-100 border-r border-slate-100">
                            <MapboxMap
                                center={center}
                                markers={markers}
                                polygons={polygons}
                                trail={trail}
                                trailColor="#f97316"
                                fitMarkers={points.length > 0}
                                className="w-full"
                                heightClassName="h-full"
                                showCampusMarker={false}
                            />

                            {/* Map legend */}
                            {(geofencePolygon || points.length > 0) && (
                                <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded-xl bg-white/90 px-3 py-2 text-[10px] shadow backdrop-blur-sm">
                                    {geofencePolygon && (
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500 opacity-70" />
                                            <span className="text-slate-600 font-medium">Company Geofence</span>
                                        </span>
                                    )}
                                    {points.length > 0 && (
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-0.5 w-4 bg-orange-400" style={{ borderTop: '2px dashed #f97316' }} />
                                            <span className="text-slate-600 font-medium">Excursion Trail</span>
                                        </span>
                                    )}
                                </div>
                            )}

                            {points.length === 0 && (
                                <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white/90 px-4 py-3 text-xs text-slate-500 shadow">
                                    No location snapshots were recorded for this excursion.
                                </div>
                            )}
                        </div>

                        {/* Details Area */}
                        <div className="w-full md:w-1/3 p-6 bg-white overflow-y-auto space-y-6">

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                                        <Clock size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Outside</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {formatTime(excursion.exit_at)}
                                            {" - "}
                                            {isActive ? 'Ongoing' : formatTime(excursion.return_at)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                                        <AlertCircle size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {formatSeconds(excursion.duration_seconds)}
                                        </p>
                                    </div>
                                </div>

                                {excursion.max_distance_meters != null && (
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                                            <Ruler size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Farthest Distance</p>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {Math.round(Number(excursion.max_distance_meters))} m from the geofence
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logged Pings</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {points.length} coordinate snapshot{points.length === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Student's Stated Reason</h4>
                                {excursion.reason ? (
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed italic">
                                        "{excursion.reason}"
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 border border-slate-100 text-center rounded-xl py-6 px-4 text-sm text-slate-400">
                                        No reason provided by the student.
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}