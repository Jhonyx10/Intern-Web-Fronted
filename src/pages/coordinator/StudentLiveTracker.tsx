import { useMemo, useRef, useState } from 'react'
import {
    MapboxMap,
    type MapboxMapHandle,
    type MapMarker,
    type MapPolygonFeature,
} from '@/components/MapboxMap'
import { useCompanies } from '@/lib/queries/companies'
import type { Company } from '@/types'

type LocatedCompany = Company & { latitude: number; longitude: number }

function hasCoordinates(company: Company): company is LocatedCompany {
    return company.latitude !== null && company.longitude !== null
}

const StudentLiveTracker = () => {
    const { data: companies, isLoading, isError, error } = useCompanies()
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const mapRef = useRef<MapboxMapHandle>(null)

    const approvedCompanies = useMemo<LocatedCompany[]>(
        () =>
            (companies ?? []).filter(
                (company): company is LocatedCompany => Boolean(company.is_approved) && hasCoordinates(company),
            ),
        [companies],
    )

    const markers: MapMarker[] = approvedCompanies.map((company) => ({
        id: company.id,
        longitude: company.longitude,
        latitude: company.latitude,
        title: company.name,
        color: 'accent',
        popupHtml: `<strong>${company.name}</strong>${company.address ? `<br/>${company.address}` : ''
            }`,
    }))

    const polygons = useMemo<MapPolygonFeature[]>(() => {
        const features: MapPolygonFeature[] = []

        for (const company of approvedCompanies) {
            if (company.geofence_enabled && company.geofence_polygon) {
                features.push({
                    id: company.id,
                    name: company.name,
                    polygon: company.geofence_polygon as NonNullable<Company['geofence_polygon']>,
                })
            }

            if (company.buildings) {
                for (const b of company.buildings) {
                    if (b.geofence_polygon?.type === 'Polygon') {
                        features.push({
                            id: `building-${b.id}`,
                            name: b.name || 'Unnamed Building',
                            polygon: b.geofence_polygon,
                        })
                    }
                }
            }
        }
        return features
    }, [approvedCompanies])

    function geofenceLabel(company: LocatedCompany): string | null {
        if (!company.geofence_enabled) {
            return null
        }
        if (company.geofence_polygon) {
            return null // already drawn on the map
        }
        if (company.geofence_radius_meters) {
            return `Radius geofence (${company.geofence_radius_meters}m) — not drawn`
        }
        return 'Geofence enabled, no shape set'
    }

    function handleSelect(company: LocatedCompany) {
        setSelectedId(company.id)
        mapRef.current?.flyTo(company.longitude, company.latitude, 17)
    }

    return (
        <section className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-[var(--color-ink)]">Student Live Tracker</h1>
                <p className="text-sm text-slate-500">
                    Approved partner companies and their geofenced zones.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
                <aside className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
                    <div className="border-b border-[var(--color-line)] px-4 py-3">
                        <h2 className="text-sm font-medium text-[var(--color-ink)]">
                            Approved companies{' '}
                            {!isLoading && !isError && (
                                <span className="text-slate-400">({approvedCompanies.length})</span>
                            )}
                        </h2>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto">
                        {isLoading && <p className="px-4 py-6 text-sm text-slate-500">Loading companies…</p>}

                        {isError && (
                            <p className="px-4 py-6 text-sm text-red-600">
                                Couldn't load companies
                                {error instanceof Error ? `: ${error.message}` : '.'}
                            </p>
                        )}

                        {!isLoading && !isError && approvedCompanies.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500">
                                No approved companies with a location yet.
                            </p>
                        )}

                        {!isLoading &&
                            !isError &&
                            approvedCompanies.map((company) => {
                                const note = geofenceLabel(company)
                                return (
                                    <button
                                        key={company.id}
                                        type="button"
                                        onClick={() => handleSelect(company)}
                                        className={`flex w-full flex-col items-start gap-0.5 border-b border-[var(--color-line)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 ${selectedId === company.id ? 'bg-slate-50' : ''
                                            }`}
                                    >
                                        <span className="text-sm font-medium text-[var(--color-ink)]">
                                            {company.name}
                                        </span>
                                        {company.address && (
                                            <span className="text-xs text-slate-500">{company.address}</span>
                                        )}
                                        {note && <span className="text-xs text-amber-600">{note}</span>}
                                    </button>
                                )
                            })}
                    </div>
                </aside>

                <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
                    <MapboxMap
                        ref={mapRef}
                        markers={markers}
                        polygons={polygons}
                        fitMarkers
                        heightClassName="h-[560px]"
                    />
                </div>
            </div>
        </section>
    )
}

export default StudentLiveTracker
