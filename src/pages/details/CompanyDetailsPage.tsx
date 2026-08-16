import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
    MapboxMap,
    MapTokenWarning,
    type MapboxMapHandle,
    type MapMarker,
    type MapPolygonFeature,
} from '@/components/MapboxMap'
import { useCompany } from '@/lib/queries/companies'
import { formatDistance, formatDuration, haversineMeters, OCC_CENTER, OCC_NAME } from '@/lib/geo'
import { type MapRouteInfo } from '@/components/MapboxMap'
import { Building2, MapPin, Phone, Mail, User2, Shield, ShieldOff, Navigation } from 'lucide-react'

export function CompanyDetailsPage() {
    const { id } = useParams()
    const mapRef = useRef<MapboxMapHandle>(null)
    const { data: company, isLoading, error } = useCompany(id)
    const [routeInfo, setRouteInfo] = useState<MapRouteInfo | null>(null)

    const markers: MapMarker[] = company?.latitude && company?.longitude
        ? [{ id: company.id, latitude: company.latitude, longitude: company.longitude, title: company.name, color: 'accent', popupHtml: `<strong>${company.name}</strong><br/>${company.address ?? ''}` }]
        : []

    const polygons: MapPolygonFeature[] = company?.geofence_polygon
        ? [{ id: company.id, name: company.name, polygon: company.geofence_polygon }]
        : []

    const routeTo = company?.latitude && company?.longitude
        ? { latitude: company.latitude, longitude: company.longitude }
        : null

    const distanceMeters = company?.latitude && company?.longitude
        ? haversineMeters(OCC_CENTER[0], OCC_CENTER[1], company.longitude, company.latitude)
        : null

    if (isLoading) {
        return <p className="text-sm text-[var(--color-muted)]">Loading company…</p>
    }

    if (error || !company) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">Failed to load company details.</p>
            </div>
        )
    }

    return (
        <section className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
                        Companies
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight">{company.name}</h2>
                    {company.address && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
                            <MapPin size={13} /> {company.address}
                        </p>
                    )}
                </div>
                <Link
                    to="/companies/map"
                    className="rounded-xl border border-[var(--color-line)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                    ← Back to map
                </Link>
            </div>

            <MapTokenWarning />

            <div className="space-y-6">
                {/* Info panels — horizontal row */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Contact info */}
                    <div className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--color-muted)] uppercase mb-3">
                            Contact information
                        </p>
                        <div className="space-y-3">
                            {company.contact_person && (
                                <div className="flex items-start gap-2.5 text-sm text-[var(--color-ink)]">
                                    <User2 size={14} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
                                    <span>{company.contact_person}</span>
                                </div>
                            )}
                            {company.contact_email && (
                                <div className="flex items-start gap-2.5 text-sm text-[var(--color-ink)]">
                                    <Mail size={14} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
                                    <a
                                        href={`mailto:${company.contact_email}`}
                                        className="hover:text-[var(--color-accent)] transition"
                                    >
                                        {company.contact_email}
                                    </a>
                                </div>
                            )}
                            {company.contact_phone && (
                                <div className="flex items-start gap-2.5 text-sm text-[var(--color-ink)]">
                                    <Phone size={14} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
                                    <a
                                        href={`tel:${company.contact_phone}`}
                                        className="hover:text-[var(--color-accent)] transition"
                                    >
                                        {company.contact_phone}
                                    </a>
                                </div>
                            )}
                            {!company.contact_person && !company.contact_email && !company.contact_phone && (
                                <p className="text-sm text-[var(--color-muted)]">No contact info available.</p>
                            )}
                        </div>
                    </div>

                    {/* Location info */}
                    {company.latitude && company.longitude && (
                        <div className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
                            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--color-muted)] uppercase mb-3">
                                Location
                            </p>
                            <div className="space-y-2 text-sm text-[var(--color-ink)]">
                                <div className="flex items-center gap-2">
                                    <Building2 size={14} className="text-[var(--color-muted)]" />
                                    <span className="font-mono text-xs">
                                        {company.latitude.toFixed(5)}, {company.longitude.toFixed(5)}
                                    </span>
                                </div>
                                {distanceMeters !== null && (
                                    <div className="mt-3 space-y-1 rounded-xl border border-[var(--color-line)] bg-slate-50/80 px-3 py-3">
                                        <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-muted)] uppercase">
                                            Distance from {OCC_NAME}
                                        </p>
                                        <p className="text-sm font-medium text-[var(--color-ink)]">
                                            {routeInfo
                                                ? formatDistance(routeInfo.distanceMeters)
                                                : `${formatDistance(distanceMeters)} (straight line)`}
                                        </p>
                                        {routeInfo ? (
                                            <p className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                                                <Navigation size={11} />
                                                Driving · about {formatDuration(routeInfo.durationSeconds)}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-[var(--color-muted)]">Loading driving route…</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Geofence status */}
                    <div className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--color-muted)] uppercase mb-3">
                            Geofence
                        </p>
                        <div className={`flex items-center gap-2 text-sm font-medium ${company.geofence_enabled ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                            {company.geofence_enabled
                                ? <><Shield size={14} /> Enabled</>
                                : <><ShieldOff size={14} /> Disabled</>
                            }
                        </div>
                        {company.geofence_radius_meters && (
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                                Radius: {company.geofence_radius_meters} m
                            </p>
                        )}
                        {!company.geofence_polygon && (
                            <p className="mt-1 text-xs text-[var(--color-muted)]">No polygon defined.</p>
                        )}
                    </div>
                </div>
                  {/* Map — full width */}
                <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
                    <MapboxMap
                        ref={mapRef}
                        heightClassName="h-[420px]"
                        markers={markers}
                        polygons={polygons}
                        fitMarkers={false}
                        routeTo={routeTo}
                        onRouteInfo={setRouteInfo}
                    />
                </div>
            </div>
        </section>
    )
}
