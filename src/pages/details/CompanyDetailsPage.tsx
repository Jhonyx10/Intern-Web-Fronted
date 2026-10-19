import { useRef, useState, useMemo, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
    MapboxMap,
    MapTokenWarning,
    type MapboxMapHandle,
    type MapMarker,
    type MapPolygonFeature,
    type MapRouteInfo,
} from '@/components/MapboxMap'
import { useCompany, useAssignStudentToCompany, useCreateSupervisor, useToggleCompanyActive } from '@/lib/queries/companies'
import { formatDistance, formatDuration, haversineMeters, OCC_CENTER, OCC_NAME } from '@/lib/geo'
import { Building2, MapPin, Phone, Mail, User2, Users2, Shield, ShieldOff, Navigation, ArrowLeft, MoreVertical, History } from 'lucide-react'
import AssignStudentModal from '@/components/modal/AssignStudentModal'
import AddSupervisorModal from '@/components/modal/AddSupervisorModal'
import { DeploymentHistoryModal } from '@/components/modal/CompanyDeploymentModal'
import { useAuth } from '@/lib/auth'

const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1']
const MAIN_COLOR = '#0b6e4f'

/** Shared card shell: title row + body */
function Card({
    title,
    icon,
    count,
    action,
    children,
}: {
    title: string
    icon: ReactNode
    count?: number
    action?: ReactNode
    children: ReactNode
}) {
    return (
        <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]">
                    <span className="text-[var(--color-muted)]">{icon}</span>
                    {title}
                    {count !== undefined && (
                        <span className="text-sm font-normal text-[var(--color-muted)]">{count}</span>
                    )}
                </h2>
                {action}
            </div>
            {children}
        </div>
    )
}

function StatusPill({ active }: { active?: boolean }) {
    return active ? (
        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Active
        </span>
    ) : (
        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
            Inactive
        </span>
    )
}

function EmptyRow({ children }: { children: ReactNode }) {
    return <p className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">{children}</p>
}

export function CompanyDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const mapRef = useRef<MapboxMapHandle>(null)
    const actionsMenuRef = useRef<HTMLDivElement>(null)
    const { user } = useAuth()

    const { data: company, isLoading, error } = useCompany(id)
    const { mutate: assignStudent, isPending: isAssigning } = useAssignStudentToCompany()
    const { mutate: createSupervisor, isPending: isCreatingSupervisor } = useCreateSupervisor()
    const toggleActive = useToggleCompanyActive()

    const [routeInfo, setRouteInfo] = useState<MapRouteInfo | null>(null)
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setIsActionsMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const markers = useMemo<MapMarker[]>(() => {
        const marks: MapMarker[] = []

        if (company?.latitude && company?.longitude) {
            marks.push({
                id: company.id,
                latitude: company.latitude,
                longitude: company.longitude,
                title: company.name,
                color: 'accent',
                hexColor: MAIN_COLOR,
                popupHtml: `<strong>${company.name}</strong><br/>${company.address ?? 'Main HQ'}`,
            })
        }

        company?.buildings?.forEach((b, index) => {
            if (b.latitude && b.longitude) {
                marks.push({
                    id: `building-marker-${b.id}`,
                    latitude: b.latitude,
                    longitude: b.longitude,
                    title: b.name || 'Unnamed Building',
                    color: 'accent',
                    hexColor: COLORS[index % COLORS.length],
                    popupHtml: `<strong>${b.name || 'Unnamed Building'}</strong>`,
                })
            }
        })
        return marks
    }, [company])

    const polygons = useMemo<MapPolygonFeature[]>(() => {
        const features: MapPolygonFeature[] = []

        if (company?.geofence_polygon) {
            features.push({ id: company.id, name: company.name, polygon: company.geofence_polygon, color: MAIN_COLOR })
        }
        company?.buildings?.forEach((b, index) => {
            if (b.geofence_polygon?.type === 'Polygon') {
                features.push({
                    id: `building-${b.id}`,
                    name: b.name || 'Unnamed Building',
                    polygon: b.geofence_polygon,
                    color: COLORS[index % COLORS.length],
                })
            }
        })
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

    // Main location + each building as one flat list
    const geofences = [
        {
            key: 'main',
            name: 'Main location',
            color: MAIN_COLOR,
            enabled: Boolean(company.geofence_enabled),
            radius: company.geofence_radius_meters,
            hasPolygon: Boolean(company.geofence_polygon),
        },
        ...(company.buildings ?? []).map((b, index) => ({
            key: `building-${b.id}`,
            name: b.name || 'Unnamed building',
            color: COLORS[index % COLORS.length],
            enabled: Boolean(b.geofence_enabled),
            radius: b.geofence_radius_meters,
            hasPolygon: Boolean(b.geofence_polygon),
        })),
    ]

    const hasContact = company.contact_person || company.contact_email || company.contact_phone
    const hasLocation = Boolean(company.latitude && company.longitude)
    const activeYears = company.active_school_years ?? []
    const partnerYears = company.total_school_years_count ?? 0

    return (
        <section className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-1 rounded-full p-2 text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
                        title="Back"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-semibold tracking-tight">{company.name}</h2>
                        {company.address && (
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
                                <MapPin size={13} /> {company.address}
                            </p>
                        )}
                        {(activeYears.length > 0 || partnerYears > 0) && (
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[var(--color-muted)]">
                                {activeYears.length > 0 && (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-800">
                                        S.Y. {activeYears.join(', ')}
                                    </span>
                                )}
                                {partnerYears > 0 && (
                                    <span>
                                        Partnered for {partnerYears} {partnerYears === 1 ? 'school year' : 'school years'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {user?.role?.name === 'super_admin' && (
                    <div className="relative" ref={actionsMenuRef}>
                        <button
                            onClick={() => setIsActionsMenuOpen((p) => !p)}
                            aria-label="Company actions"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-line)] bg-white text-[var(--color-ink)] transition hover:bg-slate-50"
                        >
                            <MoreVertical size={20} />
                        </button>

                        <AnimatePresence>
                            {isActionsMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                                    className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[var(--color-line)] bg-white p-2 shadow-lg"
                                >
                                    <div className="flex items-center justify-between rounded-lg px-3 py-2.5">
                                        <span className="text-sm font-medium text-[var(--color-ink)]">Active status</span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={company.is_active !== false}
                                            disabled={toggleActive.isPending}
                                            onClick={() => toggleActive.mutate(company.id)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${company.is_active !== false ? 'bg-[var(--color-accent)]' : 'bg-slate-300'}`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${company.is_active !== false ? 'translate-x-4' : 'translate-x-0.5'}`}
                                            />
                                        </button>
                                    </div>
                                    <div className="my-1 h-px w-full bg-[var(--color-line)]" />
                                    <button
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-slate-50"
                                        onClick={() => {
                                            setIsSupervisorModalOpen(true)
                                            setIsActionsMenuOpen(false)
                                        }}
                                    >
                                        <User2 size={16} /> Add supervisor
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {user?.role?.name === 'coordinator' && (
                    <button
                        type="button"
                        onClick={() => setIsAssignModalOpen(true)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                    >
                        <Users2 size={16} /> Assign student
                    </button>
                )}
            </div>

            <MapTokenWarning />

            {/* Map */}
            <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                <MapboxMap
                    ref={mapRef}
                    heightClassName="h-[380px]"
                    center={company.longitude && company.latitude ? [company.longitude, company.latitude] : undefined}
                    zoom={17}
                    markers={markers}
                    polygons={polygons}
                    fitMarkers={false}
                    fitRouteBounds={false}
                    routeTo={routeTo}
                    onRouteInfo={setRouteInfo}
                />
            </div>

            {/* Contact + location in one card */}
            <div className="grid gap-6 rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:grid-cols-2">
                <div>
                    <h3 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Contact</h3>
                    {hasContact ? (
                        <div className="space-y-2.5 text-sm text-[var(--color-ink)]">
                            {company.contact_person && (
                                <p className="flex items-center gap-2.5">
                                    <User2 size={14} className="shrink-0 text-[var(--color-muted)]" />
                                    {company.contact_person}
                                </p>
                            )}
                            {company.contact_email && (
                                <p className="flex items-center gap-2.5">
                                    <Mail size={14} className="shrink-0 text-[var(--color-muted)]" />
                                    <a href={`mailto:${company.contact_email}`} className="transition hover:text-[var(--color-accent)]">
                                        {company.contact_email}
                                    </a>
                                </p>
                            )}
                            {company.contact_phone && (
                                <p className="flex items-center gap-2.5">
                                    <Phone size={14} className="shrink-0 text-[var(--color-muted)]" />
                                    <a href={`tel:${company.contact_phone}`} className="transition hover:text-[var(--color-accent)]">
                                        {company.contact_phone}
                                    </a>
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--color-muted)]">No contact info available.</p>
                    )}
                </div>

                <div>
                    <h3 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Location</h3>
                    {hasLocation ? (
                        <div className="space-y-2.5 text-sm text-[var(--color-ink)]">
                            <p className="flex items-center gap-2.5">
                                <Building2 size={14} className="shrink-0 text-[var(--color-muted)]" />
                                <span className="font-mono text-xs">
                                    {company.latitude!.toFixed(5)}, {company.longitude!.toFixed(5)}
                                </span>
                            </p>
                            {distanceMeters !== null && (
                                <div>
                                    <p className="font-medium">
                                        {routeInfo
                                            ? formatDistance(routeInfo.distanceMeters)
                                            : `${formatDistance(distanceMeters)} (straight line)`}{' '}
                                        <span className="font-normal text-[var(--color-muted)]">from {OCC_NAME}</span>
                                    </p>
                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-muted)]">
                                        <Navigation size={11} />
                                        {routeInfo
                                            ? `Driving, about ${formatDuration(routeInfo.durationSeconds)}`
                                            : 'Loading driving route…'}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--color-muted)]">No location set.</p>
                    )}
                </div>
            </div>

            {/* Geofences */}
            <Card title="Geofences" icon={<MapPin size={17} />} count={geofences.length}>
                <ul className="divide-y divide-[var(--color-line)]">
                    {geofences.map((g) => (
                        <li key={g.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: g.color }}
                                aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 truncate font-medium text-[var(--color-ink)]">{g.name}</span>
                            <span className="text-xs text-[var(--color-muted)]">
                                {g.radius ? `${g.radius} m radius` : 'No radius'}
                                {g.hasPolygon ? ', polygon set' : ''}
                            </span>
                            <span
                                className={`flex w-20 items-center gap-1.5 text-xs font-medium ${g.enabled ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}
                            >
                                {g.enabled ? <Shield size={12} /> : <ShieldOff size={12} />}
                                {g.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </li>
                    ))}
                </ul>
            </Card>

            {/* Supervisors */}
            {company.supervisors && (
                <Card title="Supervisors" icon={<User2 size={17} />} count={company.supervisors.length}>
                    {company.supervisors.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50/60 text-xs text-[var(--color-muted)]">
                                    <tr>
                                        <th className="px-5 py-2.5 font-medium">Name</th>
                                        <th className="px-5 py-2.5 font-medium">Email</th>
                                        <th className="px-5 py-2.5 font-medium">Position</th>
                                        <th className="px-5 py-2.5 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                    {company.supervisors.map((s) => (
                                        <tr key={s.id}>
                                            <td className="px-5 py-3 font-medium">{s.user?.name ?? '—'}</td>
                                            <td className="px-5 py-3">
                                                {s.user?.email ? (
                                                    <a href={`mailto:${s.user.email}`} className="transition hover:text-[var(--color-accent)]">
                                                        {s.user.email}
                                                    </a>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-[var(--color-muted)]">{s.position_title ?? 'Not set'}</td>
                                            <td className="px-5 py-3">
                                                <StatusPill active={s.is_active} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyRow>No supervisors added yet.</EmptyRow>
                    )}
                </Card>
            )}

            {/* Deployed students */}
            {company.students && (
                <Card
                    title="Deployed students"
                    icon={<Users2 size={17} />}
                    count={company.students.length}
                    action={
                        <button
                            type="button"
                            onClick={() => setIsHistoryOpen(true)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 text-sm font-medium text-[var(--color-ink)] transition hover:bg-slate-50"
                        >
                            <History size={15} /> Deployment history
                        </button>
                    }
                >
                    {company.students.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50/60 text-xs text-[var(--color-muted)]">
                                    <tr>
                                        <th className="px-5 py-2.5 font-medium">Student no.</th>
                                        <th className="px-5 py-2.5 font-medium">Name</th>
                                        <th className="px-5 py-2.5 font-medium">Section / S.Y.</th>
                                        <th className="px-5 py-2.5 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                    {company.students.map((student) => {
                                        const syName =
                                            student.section?.school_year?.name ?? student.section?.schoolYear?.name
                                        return (
                                            <tr key={student.id}>
                                                <td className="whitespace-nowrap px-5 py-3 font-medium">
                                                    {student.student_number}
                                                </td>
                                                <td className="px-5 py-3">
                                                    {student.last_name}, {student.first_name} {student.middle_name || ''}
                                                </td>
                                                <td className="px-5 py-3">
                                                    {student.section?.name ? (
                                                        <>
                                                            <p>{student.section.name}</p>
                                                            {syName && (
                                                                <p className="text-xs text-[var(--color-muted)]">S.Y. {syName}</p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-[var(--color-muted)]">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <StatusPill active={student.is_active} />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyRow>No students are currently assigned to this company.</EmptyRow>
                    )}
                </Card>
            )}

            <AssignStudentModal
                open={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                isLoading={isAssigning}
                onAssign={(studentIds) => {
                    assignStudent(
                        { companyId: company.id, studentIds },
                        { onSuccess: () => setIsAssignModalOpen(false) }
                    )
                }}
            />
            <AddSupervisorModal
                open={isSupervisorModalOpen}
                onClose={() => setIsSupervisorModalOpen(false)}
                isLoading={isCreatingSupervisor}
                onAdd={(formData) => {
                    createSupervisor(
                        { companyId: company.id, input: formData },
                        { onSuccess: () => setIsSupervisorModalOpen(false) }
                    )
                }}
            />

            <AnimatePresence>
                {isHistoryOpen && (
                    <DeploymentHistoryModal
                        companyId={company.id}
                        companyName={company.name}
                        onClose={() => setIsHistoryOpen(false)}
                    />
                )}
            </AnimatePresence>
        </section>
    )
}