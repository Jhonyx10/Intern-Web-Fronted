import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
    BookOpen,
    Users,
    CheckCircle2,
    Layers,
    Award,
    GraduationCap,
    ClipboardCheck,
    FileCheck,
    TrendingUp,
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
import { useDeanDashboard } from '@/lib/queries/dashboard'

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

function StatCard({
    label,
    icon: Icon,
    iconClass,
    value,
    suffix,
    caption,
    captionClass = 'text-[var(--color-muted)]',
    to,
}: {
    label: string
    icon: LucideIcon
    iconClass: string
    value: number | string
    suffix?: string
    caption: string
    captionClass?: string
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
            <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[var(--color-ink)]">{value}</span>
                {suffix && <span className="text-xs font-medium text-[var(--color-muted)]">{suffix}</span>}
            </div>
            <p className={`mt-1 text-xs ${captionClass}`}>{caption}</p>
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

function DonutCard({
    title,
    subtitle,
    icon: Icon,
    iconClass,
    data,
    centerValue,
    centerLabel,
    unit,
}: {
    title: string
    subtitle: string
    icon: LucideIcon
    iconClass: string
    data: Array<{ name: string; value: number; color: string }>
    centerValue: string
    centerLabel: string
    unit: string
}) {
    const total = data.reduce((sum, d) => sum + d.value, 0)

    return (
        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
                    <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>
                </div>
                <Icon size={18} className={iconClass} />
            </div>

            {total === 0 ? (
                <div className="flex h-56 items-center justify-center text-xs text-[var(--color-muted)]">
                    No students yet
                </div>
            ) : (
                <div className="relative h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={58}
                                outerRadius={86}
                                paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 4 : 0}
                                dataKey="value"
                            >
                                {data.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(val: any, name: any) => [`${val} ${unit}`, name]} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-[var(--color-ink)]">{centerValue}</span>
                        <span className="text-[11px] text-[var(--color-muted)]">{centerLabel}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[var(--color-muted)] font-medium">{item.name}:</span>
                        <span className="font-bold text-[var(--color-ink)]">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function DeanDashboard() {
    const { data, isLoading, error } = useDeanDashboard()

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
                <p className="text-sm font-medium text-red-800">Failed to load Dean dashboard metrics.</p>
            </div>
        )
    }

    const { course, major, overview, charts } = data
    const sections = charts.section_breakdown
    const placedPct = pct(overview.assigned_students, overview.total_students)
    const completedPct = pct(overview.completed_students, overview.total_students)

    return (
        <section className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold tracking-wide text-[var(--color-accent)] uppercase">
                        Dean Portal
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                        Academic Department Analytics
                    </h1>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    {course && (
                        <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] w-fit">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                                <BookOpen size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">Program</p>
                                <p className="text-sm font-bold text-[var(--color-ink)]">{course.code} — {course.name}</p>
                            </div>
                        </div>
                    )}
                    {major && (
                        <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] w-fit">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                <GraduationCap size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">Major</p>
                                <p className="text-sm font-bold text-[var(--color-ink)]">{major.code}</p>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Row 1: department totals */}
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    label="Active Sections"
                    icon={Layers}
                    iconClass="bg-purple-50 text-purple-600"
                    value={overview.total_sections}
                    caption="Program sections active"
                    to="/school-year-section"
                />
                <StatCard
                    label="Total Enrolled"
                    icon={Users}
                    iconClass="bg-blue-50 text-blue-600"
                    value={overview.total_students}
                    caption="Students in department"
                    to="/students"
                />
                <StatCard
                    label="Placed Interns"
                    icon={CheckCircle2}
                    iconClass="bg-emerald-50 text-emerald-600"
                    value={overview.assigned_students}
                    suffix={`(${placedPct}%)`}
                    caption={`${overview.unassigned_students} unassigned`}
                    captionClass="text-rose-500 font-medium"
                    to="/students?placement=assigned"
                />
            </div>

            {/* Row 2: how students are doing */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="OJT Completed"
                    icon={Award}
                    iconClass="bg-emerald-50 text-emerald-600"
                    value={overview.completed_students}
                    suffix={`(${completedPct}%)`}
                    caption="Reached required hours"
                    captionClass="text-emerald-600 font-medium"
                    to="/students?status=completed"
                />
                <StatCard
                    label="In Progress"
                    icon={TrendingUp}
                    iconClass="bg-amber-50 text-amber-600"
                    value={overview.in_progress_students}
                    caption={`${overview.not_started_students} not started yet`}
                    to="/students?status=ongoing"
                />
                <StatCard
                    label="Evaluated"
                    icon={ClipboardCheck}
                    iconClass="bg-indigo-50 text-indigo-600"
                    value={overview.evaluated_students}
                    suffix={`of ${overview.total_students}`}
                    caption="Submitted an evaluation"
                    to="/intern-evaluations"
                />
                <StatCard
                    label="Requirements Complete"
                    icon={FileCheck}
                    iconClass="bg-sky-50 text-sky-600"
                    value={overview.passed_requirements_students}
                    suffix={`of ${overview.total_students}`}
                    caption={
                        overview.total_required_documents > 0
                            ? `All ${overview.total_required_documents} required documents approved`
                            : 'No document requirements set'
                    }
                    to={course ? `/documents/${course.id}` : '/documents'}
                />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Section Hours Rendered</h3>
                            <p className="text-xs text-[var(--color-muted)]">Total OJT hours rendered per section</p>
                        </div>
                        <Award size={18} className="text-indigo-500" />
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sections} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Bar dataKey="total_hours" fill="#818CF8" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Student Progress by Section</h3>
                            <p className="text-xs text-[var(--color-muted)]">Completed, in progress and not started</p>
                        </div>
                        <TrendingUp size={18} className="text-amber-500" />
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sections} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(val: any, name: any) => [`${val} students`, name]} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="completed_students" name="Completed" stackId="status" fill="#10B981" />
                                <Bar dataKey="in_progress_students" name="In Progress" stackId="status" fill="#F59E0B" />
                                <Bar dataKey="not_started_students" name="Not Started" stackId="status" fill="#9CA3AF" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <DonutCard
                    title="Internship Placement"
                    subtitle="Students assigned to companies vs unassigned"
                    icon={CheckCircle2}
                    iconClass="text-emerald-500"
                    data={charts.placement_status}
                    centerValue={`${placedPct}%`}
                    centerLabel="placed"
                    unit="students"
                />

                <DonutCard
                    title="OJT Completion"
                    subtitle="Where every student stands on required hours"
                    icon={Award}
                    iconClass="text-indigo-500"
                    data={charts.completion_status}
                    centerValue={`${completedPct}%`}
                    centerLabel="completed"
                    unit="students"
                />
            </div>

            {/* Section-by-section table */}
            <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)] overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                    <div>
                        <h3 className="text-base font-semibold text-[var(--color-ink)]">Section Breakdown</h3>
                        <p className="text-xs text-[var(--color-muted)]">Placement, hours and requirements for each section</p>
                    </div>
                    <Layers size={18} className="text-purple-500" />
                </div>

                {sections.length === 0 ? (
                    <p className="px-6 pb-8 text-center text-sm text-[var(--color-muted)]">No sections found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-y border-[var(--color-line)] bg-slate-50/80 font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Section</th>
                                    <th className="px-4 py-3 text-right">Students</th>
                                    <th className="px-4 py-3 text-right">Placed</th>
                                    <th className="px-4 py-3 text-right">Hours</th>
                                    <th className="px-4 py-3 text-right">Avg / student</th>
                                    <th className="px-4 py-3 min-w-[150px]">Avg progress</th>
                                    <th className="px-4 py-3 text-right">Completed</th>
                                    <th className="px-4 py-3 text-right">Evaluated</th>
                                    <th className="px-4 py-3 text-right">Docs done</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)]">
                                {sections.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-[var(--color-ink)]">
                                                {s.name}
                                                {s.code && <span className="ml-1.5 font-normal text-[var(--color-muted)]">({s.code})</span>}
                                            </p>
                                            <p className="text-[11px] text-[var(--color-muted)]">
                                                {s.coordinator ? `Coordinator: ${s.coordinator}` : 'No coordinator assigned'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-[var(--color-ink)]">{s.student_count}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-semibold text-emerald-700">{s.assigned_students}</span>
                                            <span className="ml-1 text-[var(--color-muted)]">({pct(s.assigned_students, s.student_count)}%)</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-indigo-600">{s.total_hours}</td>
                                        <td className="px-4 py-3 text-right text-[var(--color-muted)]">{s.avg_hours}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-indigo-600"
                                                        style={{ width: `${Math.min(100, s.avg_completion_pct)}%` }}
                                                    />
                                                </div>
                                                <span className="w-10 text-right font-semibold text-[var(--color-ink)]">
                                                    {s.avg_completion_pct}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                                            {s.completed_students}/{s.student_count}
                                        </td>
                                        <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                                            {s.evaluated_students}/{s.student_count}
                                        </td>
                                        <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                                            {s.passed_requirements_students}/{s.student_count}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    )
}