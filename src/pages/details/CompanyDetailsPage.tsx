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
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    User2,
    Users2,
    Shield,
    ShieldOff,
    Navigation,
    ArrowLeft,
    MoreVertical,
    History,
    Search,
    CalendarDays,
    Handshake,
    ChevronRight,
    LayoutDashboard,
} from 'lucide-react'
import AssignStudentModal from '@/components/modal/AssignStudentModal'
import AddSupervisorModal from '@/components/modal/AddSupervisorModal'
import { DeploymentHistoryModal } from '@/components/modal/CompanyDeploymentModal'
import { useAuth } from '@/lib/auth'

const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1']
const MAIN_COLOR = '#0b6e4f'

type TabKey = 'overview' | 'students' | 'supervisors'

// ── Small building blocks ─────────────────────────────────────────

function Panel({
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
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                    <span className="text-[var(--color-muted)]">{icon}</span>
                    {title}
                    {count !== undefined && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-muted)]">
                            {count}
                        </span>
                    )}
                </h3>
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

function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
    return (
        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-[var(--color-muted)]">
                {icon}
            </div>
            <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
            {hint && <p className="max-w-xs text-xs text-[var(--color-muted)]">{hint}</p>}
        </div>
    )
}

function StatTile({
    icon,
    label,
    value,
    tone,
}: {
    icon: ReactNode
    label: string
    value: ReactNode
    tone: string
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3.5 shadow-sm">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-xl font-bold leading-tight tracking-tight text-[var(--color-ink)]">{value}</p>
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    {label}
                </p>
            </div>
        </div>
    )
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('')
}

// ── Page ──────────────────────────────────────────────────────────

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
    const [tab, setTab] = useState<TabKey>('overview')
    const [studentQuery, setStudentQuery] = useState('')
    const [studentYear, setStudentYear] = useState<string>('all')

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

    // Students with a resolved school year label, for filtering
    const studentRows = useMemo(
        () =>
            (company?.students ?? []).map((s) => ({
                student: s,
                syName: (s.section?.school_year?.name ?? s.section?.schoolYear?.name ?? '') as string,
            })),
        [company?.students]
    )

    const studentYears = useMemo(
        () => Array.from(new Set(studentRows.map((r) => r.syName).filter(Boolean))).sort().reverse(),
        [studentRows]
    )

    const filteredStudents = useMemo(() => {
        const q = studentQuery.trim().toLowerCase()
        return studentRows.filter(({ student, syName }) => {
            if (studentYear !== 'all' && syName !== studentYear) return false
            if (!q) return true
            const haystack = `${student.student_number ?? ''} ${student.first_name ?? ''} ${student.middle_name ?? ''} ${student.last_name ?? ''}`.toLowerCase()
            return haystack.includes(q)
        })
    }, [studentRows, studentQuery, studentYear])

    const routeTo =
        company?.latitude && company?.longitude
            ? { latitude: company.latitude, longitude: company.longitude }
            : null

    const distanceMeters =
        company?.latitude && company?.longitude
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
    const isActive = company.is_active !== false
    const role = user?.role?.name
    const enabledGeofences = geofences.filter((g) => g.enabled).length

    const tabs: { key: TabKey; label: string; icon: ReactNode; count?: number }[] = [
        { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
        ...(company.students
            ? [{ key: 'students' as const, label: 'Students', icon: <Users2 size={14} />, count: company.students.length }]
            : []),
        ...(company.supervisors
            ? [{ key: 'supervisors' as const, label: 'Supervisors', icon: <User2 size={14} />, count: company.supervisors.length }]
            : []),
    ]

    return (
        <section className="space-y-5 pb-10">
            {/* Back */}
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-sm transition hover:bg-slate-50"
            >
                <ArrowLeft size={14} /> Back
            </button>

            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)]"
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-accent-soft)] text-lg font-bold text-[var(--color-accent)]">
                            {initials(company.name) || <Building2 size={22} />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                                    {company.name}
                                </h1>
                                <StatusPill active={isActive} />
                            </div>
                            {company.address && (
                                <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
                                    <MapPin size={13} className="shrink-0" /> {company.address}
                                </p>
                            )}
                            {(activeYears.length > 0 || partnerYears > 0) && (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {activeYears.length > 0 && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                            <CalendarDays size={12} />
                                            S.Y. {activeYears.join(', ')}
                                        </span>
                                    )}
                                    {partnerYears > 0 && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-[var(--color-muted)]">
                                            <Handshake size={12} />
                                            Partnered for {partnerYears} {partnerYears === 1 ? 'school year' : 'school years'}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Deployment history: always one click away */}
                        <button
                            type="button"
                            onClick={() => setIsHistoryOpen(true)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        >
                            <History size={16} /> Deployment history
                        </button>

                        {role === 'coordinator' && (
                            <button
                                type="button"
                                onClick={() => setIsAssignModalOpen(true)}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                            >
                                <Users2 size={16} /> Assign student
                            </button>
                        )}

                        {role === 'super_admin' && (
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
                                                    aria-checked={isActive}
                                                    disabled={toggleActive.isPending}
                                                    onClick={() => toggleActive.mutate(company.id)}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'bg-[var(--color-accent)]' : 'bg-slate-300'}`}
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`}
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
                    </div>
                </div>
            </motion.div>

            {/* Stat tiles */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            >
                <StatTile
                    icon={<Users2 size={18} />}
                    label="Deployed students"
                    value={company.students?.length ?? 0}
                    tone="bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                />
                <StatTile
                    icon={<User2 size={18} />}
                    label="Supervisors"
                    value={company.supervisors?.length ?? 0}
                    tone="bg-violet-50 text-violet-600"
                />
                <StatTile
                    icon={<Shield size={18} />}
                    label="Geofences on"
                    value={`${enabledGeofences}/${geofences.length}`}
                    tone="bg-emerald-50 text-emerald-600"
                />
                <StatTile
                    icon={<Handshake size={18} />}
                    label="School years"
                    value={partnerYears}
                    tone="bg-amber-50 text-amber-600"
                />
            </motion.div>

            {/* Tabs */}
            <div className="border-b border-[var(--color-line)]">
                <div role="tablist" className="-mb-px flex gap-1 overflow-x-auto">
                    {tabs.map((t) => {
                        const selected = tab === t.key
                        return (
                            <button
                                key={t.key}
                                role="tab"
                                aria-selected={selected}
                                type="button"
                                onClick={() => setTab(t.key)}
                                className={`relative inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${selected
                                    ? 'text-[var(--color-accent)]'
                                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                                    }`}
                            >
                                {t.icon}
                                {t.label}
                                {t.count !== undefined && (
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selected
                                            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                                            : 'bg-slate-100 text-[var(--color-muted)]'
                                            }`}
                                    >
                                        {t.count}
                                    </span>
                                )}
                                {selected && (
                                    <motion.span
                                        layoutId="company-tab-underline"
                                        className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-accent)]"
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-5"
                >
                    {/* ── Overview ───────────────────────────────── */}
                    {tab === 'overview' && (
                        <>
                            <MapTokenWarning />

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

                            <div className="grid gap-5 lg:grid-cols-2">
                                <Panel title="Contact" icon={<User2 size={16} />}>
                                    {hasContact ? (
                                        <div className="space-y-3 p-5 text-sm text-[var(--color-ink)]">
                                            {company.contact_person && (
                                                <p className="flex items-center gap-3">
                                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[var(--color-muted)]">
                                                        <User2 size={14} />
                                                    </span>
                                                    {company.contact_person}
                                                </p>
                                            )}
                                            {company.contact_email && (
                                                <p className="flex items-center gap-3">
                                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[var(--color-muted)]">
                                                        <Mail size={14} />
                                                    </span>
                                                    <a href={`mailto:${company.contact_email}`} className="truncate transition hover:text-[var(--color-accent)]">
                                                        {company.contact_email}
                                                    </a>
                                                </p>
                                            )}
                                            {company.contact_phone && (
                                                <p className="flex items-center gap-3">
                                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[var(--color-muted)]">
                                                        <Phone size={14} />
                                                    </span>
                                                    <a href={`tel:${company.contact_phone}`} className="transition hover:text-[var(--color-accent)]">
                                                        {company.contact_phone}
                                                    </a>
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyState icon={<User2 size={18} />} title="No contact info available" />
                                    )}
                                </Panel>

                                <Panel title="Location" icon={<MapPin size={16} />}>
                                    {hasLocation ? (
                                        <div className="space-y-3 p-5 text-sm text-[var(--color-ink)]">
                                            <p className="flex items-center gap-3">
                                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[var(--color-muted)]">
                                                    <Building2 size={14} />
                                                </span>
                                                <span className="font-mono text-xs">
                                                    {company.latitude!.toFixed(5)}, {company.longitude!.toFixed(5)}
                                                </span>
                                            </p>
                                            {distanceMeters !== null && (
                                                <div className="flex items-start gap-3">
                                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[var(--color-muted)]">
                                                        <Navigation size={14} />
                                                    </span>
                                                    <div>
                                                        <p className="font-medium">
                                                            {routeInfo
                                                                ? formatDistance(routeInfo.distanceMeters)
                                                                : `${formatDistance(distanceMeters)} (straight line)`}{' '}
                                                            <span className="font-normal text-[var(--color-muted)]">from {OCC_NAME}</span>
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                                                            {routeInfo
                                                                ? `Driving, about ${formatDuration(routeInfo.durationSeconds)}`
                                                                : 'Loading driving route…'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyState icon={<MapPin size={18} />} title="No location set" />
                                    )}
                                </Panel>
                            </div>

                            <Panel title="Geofences" icon={<MapPin size={16} />} count={geofences.length}>
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
                                                className={`inline-flex w-24 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${g.enabled
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-slate-100 text-[var(--color-muted)]'
                                                    }`}
                                            >
                                                {g.enabled ? <Shield size={12} /> : <ShieldOff size={12} />}
                                                {g.enabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                        </>
                    )}

                    {/* ── Students ───────────────────────────────── */}
                    {tab === 'students' && company.students && (
                        <Panel
                            title="Currently deployed"
                            icon={<Users2 size={16} />}
                            count={filteredStudents.length}
                            action={
                                <button
                                    type="button"
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-accent-soft)] px-3 text-sm font-semibold text-[var(--color-accent)] transition hover:brightness-95"
                                >
                                    <History size={15} /> View deployment history <ChevronRight size={14} />
                                </button>
                            }
                        >
                            {/* Toolbar */}
                            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] bg-slate-50/50 px-5 py-3">
                                <div className="relative min-w-[220px] flex-1">
                                    <Search
                                        size={14}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                                    />
                                    <input
                                        type="search"
                                        value={studentQuery}
                                        onChange={(e) => setStudentQuery(e.target.value)}
                                        placeholder="Search name or student no."
                                        className="h-9 w-full rounded-lg border border-[var(--color-line)] bg-white pl-9 pr-3 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
                                    />
                                </div>

                                {studentYears.length > 1 && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {['all', ...studentYears].map((y) => (
                                            <button
                                                key={y}
                                                type="button"
                                                onClick={() => setStudentYear(y)}
                                                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${studentYear === y
                                                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                                    : 'border border-[var(--color-line)] bg-white text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                                                    }`}
                                            >
                                                {y === 'all' ? 'All years' : `S.Y. ${y}`}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {company.students.length === 0 ? (
                                <EmptyState
                                    icon={<Users2 size={18} />}
                                    title="No students are currently assigned"
                                    hint="Past deployments are available under deployment history."
                                />
                            ) : filteredStudents.length === 0 ? (
                                <EmptyState icon={<Search size={18} />} title="No students match your filters" />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                                            <tr className="border-b border-[var(--color-line)]">
                                                <th className="px-5 py-2.5 font-semibold">Student</th>
                                                <th className="px-5 py-2.5 font-semibold">Student no.</th>
                                                <th className="px-5 py-2.5 font-semibold">Section / S.Y.</th>
                                                <th className="px-5 py-2.5 font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                            {filteredStudents.map(({ student, syName }) => (
                                                <tr key={student.id} className="transition hover:bg-slate-50/60">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[11px] font-bold text-[var(--color-accent)]">
                                                                {initials(`${student.first_name ?? ''} ${student.last_name ?? ''}`)}
                                                            </span>
                                                            <span className="font-medium">
                                                                {student.last_name}, {student.first_name} {student.middle_name || ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-[var(--color-muted)]">
                                                        {student.student_number}
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
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>
                    )}

                    {/* ── Supervisors ────────────────────────────── */}
                    {tab === 'supervisors' && company.supervisors && (
                        <Panel
                            title="Supervisors"
                            icon={<User2 size={16} />}
                            count={company.supervisors.length}
                            action={
                                role === 'super_admin' ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsSupervisorModalOpen(true)}
                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 text-sm font-medium text-[var(--color-ink)] transition hover:bg-slate-50"
                                    >
                                        <User2 size={15} /> Add supervisor
                                    </button>
                                ) : undefined
                            }
                        >
                            {company.supervisors.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                                            <tr className="border-b border-[var(--color-line)]">
                                                <th className="px-5 py-2.5 font-semibold">Name</th>
                                                <th className="px-5 py-2.5 font-semibold">Email</th>
                                                <th className="px-5 py-2.5 font-semibold">Position</th>
                                                <th className="px-5 py-2.5 font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                            {company.supervisors.map((s) => (
                                                <tr key={s.id} className="transition hover:bg-slate-50/60">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-50 text-[11px] font-bold text-violet-600">
                                                                {initials(s.user?.name ?? '?')}
                                                            </span>
                                                            <span className="font-medium">{s.user?.name ?? '—'}</span>
                                                        </div>
                                                    </td>
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
                                <EmptyState icon={<User2 size={18} />} title="No supervisors added yet" />
                            )}
                        </Panel>
                    )}
                </motion.div>
            </AnimatePresence>

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