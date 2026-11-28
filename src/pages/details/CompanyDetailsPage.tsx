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
import {
    useCompany,
    useAssignStudentToCompany,
    useCreateSupervisor,
    useToggleCompanyActive,
    useUpdateCompanyLocation,
    useCompanySchedules,
    useCreateCompanySchedule,
    type UpdateCompanyLocationInput,
} from '@/lib/queries/companies'
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
    Pencil,
    Clock,
    Coffee,
    FileText,
    FileSpreadsheet,
} from 'lucide-react'
import AssignStudentModal from '@/components/modal/AssignStudentModal'
import AddSupervisorModal from '@/components/modal/AddSupervisorModal'
import CompanyScheduleModal from '@/components/modal/CompanyScheduleModal'
import { DeploymentHistoryModal } from '@/components/modal/CompanyDeploymentModal'
import { useAuth } from '@/lib/auth'
import { LocationEditorMap, type LocationEdit } from '@/components/LocationEditorMap'
import { exportBlankDTRTemplateCSV, exportBlankDTRTemplatePDF } from '@/lib/exportDtr'

const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1']
const MAIN_COLOR = '#0b6e4f'

type TabKey = 'students' | 'supervisors' | 'geofences'

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
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
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
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-[var(--color-muted)]">
                {icon}
            </div>
            <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
            {hint && <p className="max-w-xs text-xs text-[var(--color-muted)]">{hint}</p>}
        </div>
    )
}

function InfoRow({ icon, children, sub }: { icon: ReactNode; children: ReactNode; sub?: ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[var(--color-muted)]">
                {icon}
            </span>
            <div className="min-w-0 pt-1 text-sm text-[var(--color-ink)]">
                {children}
                {sub && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{sub}</p>}
            </div>
        </div>
    )
}

const smallBtn =
    'inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('')
}

// "08:00:00" -> "8:00 AM"
function time12(t?: string | null) {
    const m = t?.match(/^(\d{1,2}):(\d{2})/)
    if (!m) return '—'
    const h = Number(m[1])
    return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

// "2026-11-28" -> "Nov 28, 2026" (parsed as a local date, not UTC)
function formatDate(d?: string | null) {
    if (!d) return '—'
    const [y, mo, day] = d.slice(0, 10).split('-').map(Number)
    return new Date(y, mo - 1, day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

// ── Page ──────────────────────────────────────────────────────────

export function CompanyDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const mapRef = useRef<MapboxMapHandle>(null)
    const actionsMenuRef = useRef<HTMLDivElement>(null)
    const { user } = useAuth()

    const { data: company, isLoading, error } = useCompany(id)
    const { data: schedules } = useCompanySchedules(id)
    const { mutate: assignStudent, isPending: isAssigning } = useAssignStudentToCompany()
    const { mutate: createSupervisor, isPending: isCreatingSupervisor } = useCreateSupervisor()
    const { mutate: updateLocation, isPending: isUpdatingLocation } = useUpdateCompanyLocation()
    const { mutate: saveSchedule, isPending: isSavingSchedule } = useCreateCompanySchedule()
    const toggleActive = useToggleCompanyActive()

    const [routeInfo, setRouteInfo] = useState<MapRouteInfo | null>(null)
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false)
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
    const [isEditingLocation, setIsEditingLocation] = useState(false)
    const [locationDraft, setLocationDraft] = useState<LocationEdit | null>(null)
    const [locationAddress, setLocationAddress] = useState('')
    const [locationError, setLocationError] = useState<string | null>(null)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
    const [tab, setTab] = useState<TabKey>('students')
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

    // Schedule in effect today: the newest one that has started, else the next upcoming one.
    // The API returns schedules newest start date first.
    const currentSchedule = useMemo(() => {
        const list = schedules ?? []
        const today = new Date().toLocaleDateString('en-CA') // local YYYY-MM-DD
        return list.find((s) => s.start_date.slice(0, 10) <= today) ?? list[list.length - 1] ?? null
    }, [schedules])

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
    const role = (user?.role?.name ?? '').toLowerCase()
    const canAddSupervisor = ['coordinator', 'dean'].includes(role)
    const canEditLocation = role === 'coordinator'
    const canManageSchedule = role === 'coordinator'
    const showActionsMenu = canAddSupervisor || canManageSchedule || role === 'super_admin'
    const enabledGeofences = geofences.filter((g) => g.enabled).length

    const templateCompany = {
        name: company.name,
        scheduleIn: currentSchedule?.time_in ?? null,
        scheduleOut: currentSchedule?.time_out ?? null,
    }

    const startEditingLocation = () => {
        setLocationDraft({
            latitude: hasLocation ? company.latitude! : null,
            longitude: hasLocation ? company.longitude! : null,
            polygon: (company.geofence_polygon ?? null) as GeoJSON.Polygon | null,
        })
        setLocationAddress(company.address ?? '')
        setLocationError(null)
        setIsEditingLocation(true)
    }

    const saveLocation = () => {
        if (!locationDraft || locationDraft.latitude == null || locationDraft.longitude == null) {
            setLocationError('Click the map to place the company pin.')
            return
        }
        setLocationError(null)

        const input: UpdateCompanyLocationInput = {
            address: locationAddress.trim() || null,
            latitude: locationDraft.latitude,
            longitude: locationDraft.longitude,
            geofence_polygon: locationDraft.polygon,
        }

        updateLocation(
            { companyId: company.id, input },
            { onSuccess: () => setIsEditingLocation(false) }
        )
    }

    const tabs: { key: TabKey; label: string; icon: ReactNode; count: number }[] = [
        ...(company.students
            ? [{ key: 'students' as const, label: 'Students', icon: <Users2 size={14} />, count: company.students.length }]
            : []),
        ...(company.supervisors
            ? [{ key: 'supervisors' as const, label: 'Supervisors', icon: <User2 size={14} />, count: company.supervisors.length }]
            : []),
        { key: 'geofences', label: 'Geofences', icon: <Shield size={14} />, count: geofences.length },
    ]
    const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0].key

    const stats = [
        { label: 'Deployed', value: company.students?.length ?? 0, icon: <Users2 size={14} /> },
        { label: 'Supervisors', value: company.supervisors?.length ?? 0, icon: <User2 size={14} /> },
        { label: 'Geofences on', value: `${enabledGeofences}/${geofences.length}`, icon: <Shield size={14} /> },
        { label: 'School years', value: partnerYears, icon: <Handshake size={14} /> },
    ]

    const menuItem =
        'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] transition hover:bg-slate-50'

    return (
        <section className="space-y-4 pb-10">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-slate-50"
            >
                <ArrowLeft size={14} /> Back
            </button>

            <MapTokenWarning />

            {/* ── Map-first hero: the map is the page, the identity card floats on it ── */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white">
                {isEditingLocation ? (
                    <>
                        <LocationEditorMap
                            initialPoint={hasLocation ? { latitude: company.latitude!, longitude: company.longitude! } : null}
                            initialPolygon={(company.geofence_polygon ?? null) as GeoJSON.Polygon | null}
                            onChange={setLocationDraft}
                        />
                        <div className="flex flex-wrap items-end gap-3 border-t border-[var(--color-line)] px-5 py-3">
                            <label className="min-w-[240px] flex-1 text-xs font-semibold text-[var(--color-ink)]">
                                Address
                                <input
                                    value={locationAddress}
                                    onChange={(e) => setLocationAddress(e.target.value)}
                                    className="mt-1 h-10 w-full rounded-lg border border-[var(--color-line)] bg-white px-3 text-sm font-normal outline-none transition focus:border-[var(--color-accent)]"
                                />
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditingLocation(false)}
                                    className="h-10 rounded-xl border border-[var(--color-line)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isUpdatingLocation}
                                    onClick={saveLocation}
                                    className="h-10 rounded-xl bg-[var(--color-accent)] px-4 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                                >
                                    {isUpdatingLocation ? 'Saving…' : 'Save location'}
                                </button>
                            </div>
                            {locationError && <p className="w-full text-xs font-medium text-red-600">{locationError}</p>}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="relative z-10 border-b border-[var(--color-line)] bg-white p-4 lg:absolute lg:left-3 lg:top-3 lg:w-[400px] lg:rounded-xl lg:border lg:shadow-lg">
                            <div className="flex items-start gap-3">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-base font-bold text-[var(--color-accent)]">
                                    {initials(company.name) || <Building2 size={20} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
                                            {company.name}
                                        </h1>
                                        <StatusPill active={isActive} />
                                    </div>
                                    {company.address && (
                                        <p className="mt-1 flex items-start gap-1.5 text-sm text-[var(--color-muted)]">
                                            <MapPin size={13} className="mt-0.5 shrink-0" /> {company.address}
                                        </p>
                                    )}
                                </div>

                                {showActionsMenu && (
                                    <div className="relative" ref={actionsMenuRef}>
                                        <button
                                            onClick={() => setIsActionsMenuOpen((p) => !p)}
                                            aria-label="Company actions"
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-ink)] transition hover:bg-slate-50"
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                        <AnimatePresence>
                                            {isActionsMenuOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 6 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 6 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[var(--color-line)] bg-white p-2 shadow-lg"
                                                >
                                                    {canAddSupervisor && (
                                                        <button
                                                            type="button"
                                                            className={menuItem}
                                                            onClick={() => {
                                                                setIsActionsMenuOpen(false)
                                                                setIsSupervisorModalOpen(true)
                                                            }}
                                                        >
                                                            <User2 size={16} className="text-[var(--color-muted)]" /> Add supervisor
                                                        </button>
                                                    )}
                                                    {canManageSchedule && (
                                                        <button
                                                            type="button"
                                                            className={menuItem}
                                                            onClick={() => {
                                                                setIsActionsMenuOpen(false)
                                                                setIsScheduleModalOpen(true)
                                                            }}
                                                        >
                                                            <Clock size={16} className="text-[var(--color-muted)]" />
                                                            {currentSchedule ? 'Change schedule' : 'Set schedule'}
                                                        </button>
                                                    )}
                                                    {role === 'super_admin' && (
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
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            {(activeYears.length > 0 || partnerYears > 0) && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {activeYears.length > 0 && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                            <CalendarDays size={12} /> S.Y. {activeYears.join(', ')}
                                        </span>
                                    )}
                                    {partnerYears > 0 && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-[var(--color-muted)]">
                                            <Handshake size={12} />
                                            Partner for {partnerYears} {partnerYears === 1 ? 'school year' : 'school years'}
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                                {role === 'coordinator' && (
                                    <button
                                        type="button"
                                        onClick={() => setIsAssignModalOpen(true)}
                                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-3.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
                                    >
                                        <Users2 size={15} /> Assign student
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3.5 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                                >
                                    <History size={15} /> Deployment history
                                </button>
                            </div>
                        </div>

                        <MapboxMap
                            ref={mapRef}
                            heightClassName="h-[300px] lg:h-[440px]"
                            center={company.longitude && company.latitude ? [company.longitude, company.latitude] : undefined}
                            zoom={17}
                            markers={markers}
                            polygons={polygons}
                            fitMarkers={false}
                            fitRouteBounds={false}
                            routeTo={routeTo}
                            onRouteInfo={setRouteInfo}
                        />
                    </>
                )}
            </div>

            {/* Quick stats: one slim strip instead of four tall tiles */}
            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--color-line)] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white sm:grid-cols-4 sm:divide-y-0">
                {stats.map((s) => (
                    <div key={s.label} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-[var(--color-muted)]">{s.icon}</span>
                        <p className="text-lg font-bold leading-none text-[var(--color-ink)]">{s.value}</p>
                        <p className="truncate text-xs font-medium text-[var(--color-muted)]">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                {/* ── Main column: tabbed lists ───────────────────── */}
                <div className="space-y-4">
                    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--color-line)]">
                        {tabs.map((t) => {
                            const selected = activeTab === t.key
                            return (
                                <button
                                    key={t.key}
                                    role="tab"
                                    aria-selected={selected}
                                    type="button"
                                    onClick={() => setTab(t.key)}
                                    className={`relative -mb-px inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${selected ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}
                                >
                                    {t.icon}
                                    {t.label}
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selected ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'bg-slate-100 text-[var(--color-muted)]'}`}
                                    >
                                        {t.count}
                                    </span>
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

                    {/* Students */}
                    {activeTab === 'students' && company.students && (
                        <Panel title="Currently deployed" icon={<Users2 size={16} />} count={filteredStudents.length}>
                            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] bg-slate-50/50 px-4 py-3">
                                <div className="relative min-w-[200px] flex-1">
                                    <Search
                                        size={14}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                                    />
                                    <input
                                        type="search"
                                        value={studentQuery}
                                        onChange={(e) => setStudentQuery(e.target.value)}
                                        placeholder="Search name or student no."
                                        className="h-9 w-full rounded-lg border border-[var(--color-line)] bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
                                    />
                                </div>
                                {studentYears.length > 1 && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {['all', ...studentYears].map((y) => (
                                            <button
                                                key={y}
                                                type="button"
                                                onClick={() => setStudentYear(y)}
                                                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${studentYear === y ? 'bg-[var(--color-accent)] text-white' : 'border border-[var(--color-line)] bg-white text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}
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
                                        <thead className="text-xs text-[var(--color-muted)]">
                                            <tr className="border-b border-[var(--color-line)]">
                                                <th className="px-4 py-2.5 font-semibold">Student</th>
                                                <th className="px-4 py-2.5 font-semibold">Student no.</th>
                                                <th className="px-4 py-2.5 font-semibold">Section</th>
                                                <th className="px-4 py-2.5 font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                            {filteredStudents.map(({ student, syName }) => (
                                                <tr key={student.id} className="transition hover:bg-slate-50/60">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[11px] font-bold text-[var(--color-accent)]">
                                                                {initials(`${student.first_name ?? ''} ${student.last_name ?? ''}`)}
                                                            </span>
                                                            <span className="font-medium">
                                                                {student.last_name}, {student.first_name} {student.middle_name || ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-[var(--color-muted)]">
                                                        {student.student_number}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {student.section?.name ? (
                                                            <>
                                                                <p>{student.section.name}</p>
                                                                {syName && <p className="text-xs text-[var(--color-muted)]">S.Y. {syName}</p>}
                                                            </>
                                                        ) : (
                                                            <span className="text-[var(--color-muted)]">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
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

                    {/* Supervisors */}
                    {activeTab === 'supervisors' && company.supervisors && (
                        <Panel
                            title="Supervisors"
                            icon={<User2 size={16} />}
                            count={company.supervisors.length}
                            action={
                                canAddSupervisor ? (
                                    <button type="button" onClick={() => setIsSupervisorModalOpen(true)} className={smallBtn}>
                                        <User2 size={13} /> Add supervisor
                                    </button>
                                ) : undefined
                            }
                        >
                            {company.supervisors.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-xs text-[var(--color-muted)]">
                                            <tr className="border-b border-[var(--color-line)]">
                                                <th className="px-4 py-2.5 font-semibold">Name</th>
                                                <th className="px-4 py-2.5 font-semibold">Email</th>
                                                <th className="px-4 py-2.5 font-semibold">Position</th>
                                                <th className="px-4 py-2.5 font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                            {company.supervisors.map((s) => (
                                                <tr key={s.id} className="transition hover:bg-slate-50/60">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-50 text-[11px] font-bold text-violet-600">
                                                                {initials(s.user?.name ?? '?')}
                                                            </span>
                                                            <span className="font-medium">{s.user?.name ?? '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {s.user?.email ? (
                                                            <a href={`mailto:${s.user.email}`} className="transition hover:text-[var(--color-accent)]">
                                                                {s.user.email}
                                                            </a>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-[var(--color-muted)]">{s.position_title ?? 'Not set'}</td>
                                                    <td className="px-4 py-3">
                                                        <StatusPill active={s.is_active} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={<User2 size={18} />}
                                    title="No supervisors added yet"
                                    hint={canAddSupervisor ? 'Use Add supervisor to create one.' : undefined}
                                />
                            )}
                        </Panel>
                    )}

                    {/* Geofences */}
                    {activeTab === 'geofences' && (
                        <Panel title="Geofences" icon={<MapPin size={16} />} count={geofences.length}>
                            <ul className="divide-y divide-[var(--color-line)]">
                                {geofences.map((g) => (
                                    <li key={g.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
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
                                            className={`inline-flex w-24 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${g.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-[var(--color-muted)]'}`}
                                        >
                                            {g.enabled ? <Shield size={12} /> : <ShieldOff size={12} />}
                                            {g.enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}
                </div>

                {/* ── Sidebar: reference info that is always visible ── */}
                <aside className="space-y-4 lg:sticky lg:top-4">
                    <Panel
                        title="Schedule"
                        icon={<Clock size={16} />}
                        action={
                            canManageSchedule ? (
                                <button type="button" onClick={() => setIsScheduleModalOpen(true)} className={smallBtn}>
                                    <Pencil size={13} /> {currentSchedule ? 'Change' : 'Set'}
                                </button>
                            ) : undefined
                        }
                    >
                        {currentSchedule ? (
                            <div className="space-y-3 p-4">
                                <InfoRow icon={<Clock size={14} />} sub="Official hours">
                                    <span className="font-medium">
                                        {time12(currentSchedule.time_in)} – {time12(currentSchedule.time_out)}
                                    </span>
                                </InfoRow>
                                <InfoRow icon={<Coffee size={14} />} sub="Lunch break">
                                    <span className="font-medium">
                                        {currentSchedule.break_out && currentSchedule.break_in
                                            ? `${time12(currentSchedule.break_out)} – ${time12(currentSchedule.break_in)}`
                                            : 'No break'}
                                    </span>
                                </InfoRow>
                                <InfoRow
                                    icon={<CalendarDays size={14} />}
                                    sub={`Set by ${currentSchedule.supervisor_id ? 'supervisor' : 'coordinator'}`}
                                >
                                    <span className="font-medium">Since {formatDate(currentSchedule.start_date)}</span>
                                </InfoRow>
                            </div>
                        ) : (
                            <EmptyState
                                icon={<Clock size={18} />}
                                title="No schedule set"
                                hint={
                                    canManageSchedule
                                        ? "If the company's supervisor isn't using the system, set the schedule here."
                                        : "The supervisor or coordinator hasn't set a schedule yet."
                                }
                            />
                        )}
                        <div className="space-y-2 border-t border-[var(--color-line)] bg-slate-50/50 px-4 py-3">
                            <p className="text-xs text-[var(--color-muted)]">
                                Blank DTR for interns to fill in by hand, printed with this company and schedule.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => exportBlankDTRTemplatePDF(templateCompany)} className={smallBtn}>
                                    <FileText size={13} /> PDF
                                </button>
                                <button type="button" onClick={() => exportBlankDTRTemplateCSV(templateCompany)} className={smallBtn}>
                                    <FileSpreadsheet size={13} /> CSV
                                </button>
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Contact" icon={<User2 size={16} />}>
                        {hasContact ? (
                            <div className="space-y-3 p-4">
                                {company.contact_person && <InfoRow icon={<User2 size={14} />}>{company.contact_person}</InfoRow>}
                                {company.contact_email && (
                                    <InfoRow icon={<Mail size={14} />}>
                                        <a href={`mailto:${company.contact_email}`} className="break-all transition hover:text-[var(--color-accent)]">
                                            {company.contact_email}
                                        </a>
                                    </InfoRow>
                                )}
                                {company.contact_phone && (
                                    <InfoRow icon={<Phone size={14} />}>
                                        <a href={`tel:${company.contact_phone}`} className="transition hover:text-[var(--color-accent)]">
                                            {company.contact_phone}
                                        </a>
                                    </InfoRow>
                                )}
                            </div>
                        ) : (
                            <EmptyState icon={<User2 size={18} />} title="No contact info available" />
                        )}
                    </Panel>

                    <Panel
                        title="Location"
                        icon={<MapPin size={16} />}
                        action={
                            canEditLocation && !isEditingLocation ? (
                                <button type="button" onClick={startEditingLocation} className={smallBtn}>
                                    <Pencil size={13} /> Edit
                                </button>
                            ) : undefined
                        }
                    >
                        {hasLocation ? (
                            <div className="space-y-3 p-4">
                                <InfoRow icon={<Building2 size={14} />}>
                                    <span className="font-mono text-xs">
                                        {company.latitude!.toFixed(5)}, {company.longitude!.toFixed(5)}
                                    </span>
                                </InfoRow>
                                {distanceMeters !== null && (
                                    <InfoRow
                                        icon={<Navigation size={14} />}
                                        sub={routeInfo ? `Driving, about ${formatDuration(routeInfo.durationSeconds)}` : 'Loading driving route…'}
                                    >
                                        <span className="font-medium">
                                            {routeInfo
                                                ? formatDistance(routeInfo.distanceMeters)
                                                : `${formatDistance(distanceMeters)} (straight line)`}
                                        </span>{' '}
                                        <span className="text-[var(--color-muted)]">from {OCC_NAME}</span>
                                    </InfoRow>
                                )}
                            </div>
                        ) : (
                            <EmptyState icon={<MapPin size={18} />} title="No location set" />
                        )}
                    </Panel>
                </aside>
            </div>

            <AssignStudentModal
                open={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                isLoading={isAssigning}
                onAssign={(studentIds) => {
                    assignStudent({ companyId: company.id, studentIds }, { onSuccess: () => setIsAssignModalOpen(false) })
                }}
            />
            <AddSupervisorModal
                open={isSupervisorModalOpen}
                onClose={() => setIsSupervisorModalOpen(false)}
                isLoading={isCreatingSupervisor}
                onAdd={(formData) => {
                    createSupervisor({ companyId: company.id, input: formData }, { onSuccess: () => setIsSupervisorModalOpen(false) })
                }}
            />
            {canManageSchedule && (
                <CompanyScheduleModal
                    open={isScheduleModalOpen}
                    isSaving={isSavingSchedule}
                    companyName={company.name}
                    current={currentSchedule}
                    onClose={() => setIsScheduleModalOpen(false)}
                    onSave={(input) =>
                        saveSchedule({ companyId: company.id, input }, { onSuccess: () => setIsScheduleModalOpen(false) })
                    }
                />
            )}

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