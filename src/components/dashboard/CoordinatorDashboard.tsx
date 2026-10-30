import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
    Users,
    CheckCircle2,
    Clock,
    FileText,
    TrendingUp
} from 'lucide-react'
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import { useCoordinatorDashboard } from '@/lib/queries/dashboard'

// One colour per section, reused by the card breakdowns and the bar chart
const SECTION_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EC4899', '#0EA5E9']
const ASSIGNED_COLOR = '#6366F1'
const UNASSIGNED_COLOR = '#F59E0B'

type SectionRow = { label: string; value: number; color: string }

function KpiCard({
    label,
    icon: Icon,
    iconClass,
    value,
    caption,
    captionClass = 'text-[var(--color-muted)]',
    perSection,
    to,
}: {
    label: string
    icon: LucideIcon
    iconClass: string
    value: number
    caption: string
    captionClass?: string
    perSection?: SectionRow[]
    to?: string
}) {
    const baseClass =
        'block rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5'

    const content = (
        <>
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">{label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}>
                    <Icon size={18} />
                </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{value}</p>
            <p className={`mt-1 text-xs ${captionClass}`}>{caption}</p>

            {perSection && perSection.length > 1 && (
                <div className="mt-3 space-y-1.5 border-t border-[var(--color-line)] pt-3">
                    {perSection.map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
                            <span className="flex min-w-0 items-center gap-1.5 text-[var(--color-muted)]">
                                <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: row.color }}
                                />
                                <span className="truncate">{row.label}</span>
                            </span>
                            <span className="font-bold text-[var(--color-ink)]">{row.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </>
    )

    if (to) {
        return (
            <Link
                to={to}
                className={`${baseClass} cursor-pointer hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]`}
            >
                {content}
            </Link>
        )
    }

    return <div className={baseClass}>{content}</div>
}

export function CoordinatorDashboard() {
    const { data, isLoading, error } = useCoordinatorDashboard()

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-20 max-w-md rounded-2xl bg-black/5" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 rounded-2xl bg-black/5" />
                    ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="h-80 rounded-2xl bg-black/5" />
                    <div className="h-80 rounded-2xl bg-black/5" />
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">Failed to load Coordinator dashboard metrics.</p>
            </div>
        )
    }

    const { sections, overview } = data

    const sectionLabel = (s: { name: string; code: string }) => `${s.name} (${s.code})`
    const colorOf = (index: number) => SECTION_COLORS[index % SECTION_COLORS.length]

    const rowsFor = (pick: (s: (typeof sections)[number]) => number): SectionRow[] =>
        sections.map((s, i) => ({ label: sectionLabel(s), value: pick(s), color: colorOf(i) }))

    // Hours progress: one group of bars per progress bucket, one bar per section
    const bucketLabels = sections[0]?.progress_buckets.map((b) => b.label) ?? []
    const progressData = bucketLabels.map((label, i) => ({
        label,
        ...Object.fromEntries(sections.map((s) => [`s${s.id}`, s.progress_buckets[i]?.count ?? 0])),
    }))

    return (
        <section className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold tracking-wide text-[var(--color-accent)] uppercase">
                        Coordinator Portal
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                        Section OJT Progress Dashboard
                    </h1>
                </div>

                {sections.length > 0 && (
                    <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] w-fit">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                            <Users size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">
                                Assigned Section{sections.length > 1 ? 's' : ''}
                            </p>
                            <p className="text-sm font-bold text-[var(--color-ink)]">
                                {sections.map(sectionLabel).join(' · ')}
                            </p>
                        </div>
                    </div>
                )}
            </header>

            {/* KPI Metric Cards: combined total, with a per-section breakdown */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    label="Section Interns"
                    icon={Users}
                    iconClass="bg-blue-50 text-blue-600"
                    value={overview.total_students}
                    caption="Students assigned to section"
                    perSection={rowsFor((s) => s.total_students)}
                    to="/coordinator/my-section"
                />
                <KpiCard
                    label="Placed Interns"
                    icon={CheckCircle2}
                    iconClass="bg-emerald-50 text-emerald-600"
                    value={overview.assigned_students}
                    caption="Assigned to partner companies"
                    captionClass="text-emerald-600 font-medium"
                    perSection={rowsFor((s) => s.assigned_students)}
                    to="/students?placement=assigned"
                />
                <KpiCard
                    label="Unassigned Interns"
                    icon={Clock}
                    iconClass="bg-amber-50 text-amber-600"
                    value={overview.unassigned_students}
                    caption="Needing company placement"
                    captionClass="text-amber-600 font-medium"
                    perSection={rowsFor((s) => s.unassigned_students)}
                    to="/students?placement=unassigned"
                />
                <KpiCard
                    label="Company Requests"
                    icon={FileText}
                    iconClass="bg-purple-50 text-purple-600"
                    value={overview.pending_company_requests}
                    caption="Pending approval requests"
                    to="/companies/map/add"
                />
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Hours progress, grouped by how far along students are */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Student Hours Progress</h3>
                            <p className="text-xs text-[var(--color-muted)]">
                                Students by share of required OJT hours completed
                            </p>
                        </div>
                        <TrendingUp size={18} className="text-indigo-500" />
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={progressData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(val: any, name: any) => [`${val} students`, name]} />
                                {sections.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                                {sections.map((s, i) => (
                                    <Bar
                                        key={s.id}
                                        dataKey={`s${s.id}`}
                                        name={sectionLabel(s)}
                                        fill={colorOf(i)}
                                        radius={[6, 6, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Placement ratio: one donut per section */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Company Placement Ratio</h3>
                            <p className="text-xs text-[var(--color-muted)]">Placed vs unplaced students, per section</p>
                        </div>
                        <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>

                    <div className={`grid gap-4 ${sections.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                        {sections.map((s) => {
                            const pieData = [
                                { name: 'Assigned', value: s.assigned_students, color: ASSIGNED_COLOR },
                                { name: 'Unassigned', value: s.unassigned_students, color: UNASSIGNED_COLOR },
                            ]
                            const placedPct = s.total_students > 0
                                ? Math.round((s.assigned_students / s.total_students) * 100)
                                : 0

                            return (
                                <div key={s.id} className="rounded-xl border border-[var(--color-line)] p-4">
                                    <p className="truncate text-center text-sm font-semibold text-[var(--color-ink)]">
                                        {sectionLabel(s)}
                                    </p>

                                    {s.total_students === 0 ? (
                                        <div className="flex h-44 items-center justify-center text-xs text-[var(--color-muted)]">
                                            No students yet
                                        </div>
                                    ) : (
                                        <div className="relative h-44 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={44}
                                                        outerRadius={66}
                                                        paddingAngle={s.assigned_students > 0 && s.unassigned_students > 0 ? 4 : 0}
                                                        dataKey="value"
                                                    >
                                                        {pieData.map((entry) => (
                                                            <Cell key={entry.name} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(val: any, name: any) => [`${val} students`, name]} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-lg font-bold text-[var(--color-ink)]">{placedPct}%</span>
                                                <span className="text-[10px] text-[var(--color-muted)]">placed</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-2 flex justify-center gap-4 text-xs">
                                        {pieData.map((item) => (
                                            <div key={item.name} className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-[var(--color-muted)]">{item.name}:</span>
                                                <span className="font-bold text-[var(--color-ink)]">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}