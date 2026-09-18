import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Clock, AlertCircle } from 'lucide-react'
import { MapboxMap, type MapMarker } from '@/components/MapboxMap'
import type { GeofenceExcursion } from '@/types'

type GeofenceExcursionDetailsModalProps = {
    isOpen: boolean
    excursion: GeofenceExcursion | null
    onClose: () => void
}

export function GeofenceExcursionDetailsModal({
    isOpen,
    excursion,
    onClose,
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
                popupHtml: `<div class="text-[10px]">Point ${index + 1}<br/>${new Date(p.recorded_at).toLocaleTimeString()}</div>`
            }
        })
    }, [points])

    // Center coordinate handling
    const centerLat = points.length > 0 ? points[0].latitude : null;
    const centerLng = points.length > 0 ? points[0].longitude : null;

    if (!isOpen || !excursion) return null

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
                            <p className="text-xs text-slate-500 mt-0.5">Time Log Session: <span className="capitalize font-semibold text-slate-700">{excursion.session_period}</span></p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row h-[70vh] max-h-[600px]">
                        {/* Map Area */}
                        <div className="relative w-full md:w-2/3 h-[300px] md:h-full bg-slate-100 border-r border-slate-100">
                            <MapboxMap
                                center={centerLng && centerLat ? [centerLng, centerLat] : undefined}
                                markers={markers}
                                fitMarkers={true}
                                className="w-full"
                                heightClassName="h-full"
                                showCampusMarker={false}
                            />
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
                                            {new Date(excursion.excursion_start).toLocaleTimeString()}
                                            {" - "}
                                            {excursion.excursion_end ? new Date(excursion.excursion_end).toLocaleTimeString() : 'Ongoing'}
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
                                            {excursion.duration_minutes ?? '---'} minutes
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logged Pings</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {points.length} coordinate snapshots
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
