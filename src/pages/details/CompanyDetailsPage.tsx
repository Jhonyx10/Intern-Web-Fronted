import { useRef, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { Building2, MapPin, Phone, Mail, User2, Users2, Shield, ShieldOff, Navigation, ArrowLeft } from 'lucide-react'
import AssignStudentModal from '@/components/modal/AssignStudentModal'
import AddSupervisorModal from '@/components/modal/AddSupervisorModal'
import { useAssignStudentToCompany, useCreateSupervisor } from '@/lib/queries/companies'
import { useAuth } from '@/lib/auth'

export function CompanyDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const mapRef = useRef<MapboxMapHandle>(null)
    const { data: company, isLoading, error } = useCompany(id)
    const [routeInfo, setRouteInfo] = useState<MapRouteInfo | null>(null)
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false)
    const { mutate: assignStudent, isPending: isAssigning } = useAssignStudentToCompany()
    const { mutate: createSupervisor, isPending: isCreatingSupervisor } = useCreateSupervisor()
    const { user } = useAuth()

    const markers = useMemo<MapMarker[]>(() => {
        const marks: MapMarker[] = []
        const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1']

        if (company?.latitude && company?.longitude) {
            marks.push({
                id: company.id,
                latitude: company.latitude,
                longitude: company.longitude,
                title: company.name,
                color: 'accent',
                hexColor: '#0b6e4f',
                popupHtml: `<strong>${company.name}</strong><br/>${company.address ?? 'Main HQ'}`
            })
        }

        if (company?.buildings) {
            company.buildings.forEach((b, index) => {
                if (b.latitude && b.longitude) {
                    marks.push({
                        id: `building-marker-${b.id}`,
                        latitude: b.latitude,
                        longitude: b.longitude,
                        title: b.name || 'Unnamed Building',
                        color: 'accent',
                        hexColor: colors[index % colors.length],
                        popupHtml: `<strong>${b.name || 'Unnamed Building'}</strong>`
                    })
                }
            })
        }
        return marks
    }, [company])

    const polygons = useMemo<MapPolygonFeature[]>(() => {
        const features: MapPolygonFeature[] = []
        const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1']

        if (company?.geofence_polygon) {
            features.push({ id: company.id, name: company.name, polygon: company.geofence_polygon, color: '#0b6e4f' })
        }
        if (company?.buildings) {
            company.buildings.forEach((b, index) => {
                if (b.geofence_polygon?.type === 'Polygon') {
                    features.push({
                        id: `building-${b.id}`,
                        name: b.name || 'Unnamed Building',
                        polygon: b.geofence_polygon,
                        color: colors[index % colors.length]
                    })
                }
            })
        }
        return features
    }, [company?.geofence_polygon, company?.buildings])

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
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="rounded-full p-2 text-[var(--color-muted)] hover:bg-slate-100 hover:text-[var(--color-ink)] transition"
                        title="Back to map"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
                            Companies
                        </p>
                        <h2 className="text-3xl font-semibold tracking-tight">{company.name}</h2>
                        {company.address && (
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
                                <MapPin size={13} /> {company.address}
                            </p>
                        )}
                    </div>
                </div>
                {user?.role?.name === 'coordinator' && (
                    <div className="flex gap-2">
                        <button
                            className="rounded-xl border border-[var(--color-line)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-ink)]"
                            onClick={() => setIsSupervisorModalOpen(true)}
                        >
                            Add Supervisor
                        </button>
                        <button
                            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
                            onClick={() => setIsAssignModalOpen(true)}
                        >
                            Assign Student
                        </button>
                    </div>
                )}
            </div>

            <MapTokenWarning />

            <div className="space-y-6">
                {/* Map — full width */}
                <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
                    <MapboxMap
                        ref={mapRef}
                        heightClassName="h-[420px]"
                        center={company?.longitude && company?.latitude ? [company.longitude, company.latitude] : undefined}
                        zoom={17}
                        markers={markers}
                        polygons={polygons}
                        fitMarkers={false}
                        fitRouteBounds={false}
                        routeTo={routeTo}
                        onRouteInfo={setRouteInfo}
                    />
                </div>

                {/* Info panels — horizontal row */}
                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
            </div>

            {/* Buildings & Geofences Section */}
            <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                <div className="border-b border-[var(--color-line)] px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MapPin size={18} className="text-[var(--color-muted)]" />
                        Buildings & Geofences
                    </h2>
                </div>
                <div className="p-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Main Company Location */}
                        <div className="rounded-xl border border-[var(--color-line)] bg-slate-50/50 p-4 border-l-4 border-l-[#0b6e4f]">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="font-semibold text-sm text-[var(--color-ink)]">Main Config / General</h3>
                                <div className={`flex items-center gap-1.5 text-xs font-medium ${company.geofence_enabled ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                                    {company.geofence_enabled ? <><Shield size={12} /> Enabled</> : <><ShieldOff size={12} /> Disabled</>}
                                </div>
                            </div>
                            <div className="space-y-1 mt-3 text-xs text-[var(--color-muted)]">
                                {company.geofence_radius_meters && <p>Radius: <strong>{company.geofence_radius_meters} m</strong></p>}
                                <p>Polygon Map: {company.geofence_polygon ? <strong className="text-green-600">Defined</strong> : 'None'}</p>
                            </div>
                        </div>

                        {/* Buildings */}
                        {company.buildings?.map((b, index) => {
                            const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1']
                            const buildingColor = colors[index % colors.length]
                            return (
                                <div key={b.id} className="rounded-xl border border-[var(--color-line)] bg-slate-50/50 p-4 border-l-4" style={{ borderLeftColor: buildingColor }}>
                                    <div className="mb-2 flex items-center justify-between">
                                        <h3 className="font-semibold text-sm text-[var(--color-ink)] text-ellipsis whitespace-nowrap overflow-hidden pr-2">{b.name}</h3>
                                        <div className={`flex items-center gap-1.5 text-xs font-medium ${b.geofence_enabled ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                                            {b.geofence_enabled ? <><Shield size={12} /> Enabled</> : <><ShieldOff size={12} /> Disabled</>}
                                        </div>
                                    </div>
                                    <div className="space-y-1 mt-3 text-xs text-[var(--color-muted)]">
                                        {b.latitude && b.longitude && (
                                            <p className="flex items-center gap-1">
                                                <Building2 size={10} /> {b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}
                                            </p>
                                        )}
                                        {b.geofence_radius_meters && <p>Radius: <strong>{b.geofence_radius_meters} m</strong></p>}
                                        <p>Polygon Map: {b.geofence_polygon ? <strong className="text-green-600">Defined</strong> : 'None'}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {company.supervisors && (
                <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                    <div className="border-b border-[var(--color-line)] px-6 py-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <User2 size={18} className="text-[var(--color-muted)]" />
                            Supervisors <span className="text-sm font-normal text-[var(--color-muted)]">({company.supervisors.length})</span>
                        </h2>
                    </div>
                    {company.supervisors.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-[var(--color-muted)]">
                                <thead className="bg-slate-50/50 text-xs uppercase text-[var(--color-muted)]">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Name</th>
                                        <th className="px-6 py-3 font-medium">Email</th>
                                        <th className="px-6 py-3 font-medium">Position</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                    {company.supervisors.map((supervisor) => (
                                        <tr key={supervisor.id} className="transition-colors hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-medium">
                                                {supervisor.user?.name ?? '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {supervisor.user?.email
                                                    ? <a href={`mailto:${supervisor.user.email}`} className="hover:text-[var(--color-accent)] transition">{supervisor.user.email}</a>
                                                    : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {supervisor.position_title ?? <span className="italic text-[var(--color-muted)]">Not set</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {supervisor.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Inactive</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-[var(--color-muted)]">
                            No supervisors have been added to this company yet.
                        </div>
                    )}
                </div>
            )}

            {company.students && (
                <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                    <div className="border-b border-[var(--color-line)] px-6 py-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Users2 size={18} className="text-[var(--color-muted)]" />
                            Assigned Students <span className="text-sm font-normal text-[var(--color-muted)]">({company.students.length})</span>
                        </h2>
                    </div>
                    {company.students.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-[var(--color-muted)]">
                                <thead className="bg-slate-50/50 text-xs uppercase text-[var(--color-muted)]">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Student No.</th>
                                        <th className="px-6 py-3 font-medium">Name</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                    {company.students.map((student) => (
                                        <tr key={student.id} className="transition-colors hover:bg-slate-50/50">
                                            <td className="whitespace-nowrap px-6 py-4 font-medium">
                                                {student.student_number}
                                            </td>
                                            <td className="px-6 py-4">
                                                {student.last_name}, {student.first_name} {student.middle_name || ''}
                                            </td>
                                            <td className="px-6 py-4">
                                                {student.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-[var(--color-muted)]">
                            No students are currently assigned to this company.
                        </div>
                    )}
                </div>
            )}

            {company && (
                <>
                    <AssignStudentModal
                        open={isAssignModalOpen}
                        onClose={() => setIsAssignModalOpen(false)}
                        isLoading={isAssigning}
                        assignedStudentIds={company.students?.map(s => s.id) ?? []}
                        onAssign={(studentId) => {
                            assignStudent({ companyId: company.id, studentId }, {
                                onSuccess: () => setIsAssignModalOpen(false),
                            })
                        }}
                    />
                    <AddSupervisorModal
                        open={isSupervisorModalOpen}
                        onClose={() => setIsSupervisorModalOpen(false)}
                        isLoading={isCreatingSupervisor}
                        onAdd={(formData) => {
                            createSupervisor({ companyId: company.id, input: formData }, {
                                onSuccess: () => setIsSupervisorModalOpen(false),
                            })
                        }}
                    />
                </>
            )}
        </section>
    )
}
