import {
    BookOpen,
    Users,
    Clock,
    CheckCircle2,
    Layers,
    Award,
    BadgeCheck
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
    ResponsiveContainer
} from 'recharts'
import { useProgramHeadDashboard } from '@/lib/queries/dashboard'

export function ProgramHeadDashboard() {
    const { data, isLoading, error } = useProgramHeadDashboard()

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
                <p className="text-sm font-medium text-red-800">Failed to load Program Head dashboard metrics.</p>
            </div>
        )
    }

    const { course, major, overview, charts } = data

    return (
        <section className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold tracking-wide text-[var(--color-accent)] uppercase">
                        Program Head Portal
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                        Program Analytics &amp; Overview
                    </h1>
                </div>

                {course && (
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] w-fit">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                                <BookOpen size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">Course</p>
                                <p className="text-sm font-bold text-[var(--color-ink)]">{course.code} — {course.name}</p>
                            </div>
                        </div>

                        {major && (
                            <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] w-fit">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                    <BadgeCheck size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">Major Scope</p>
                                    <p className="text-sm font-bold text-[var(--color-ink)]">{major.code} — {major.name}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Program Sections</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                            <Layers size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.total_sections}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Active sections in program</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Program Students</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Users size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.total_students}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Total enrolled in program</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Placed Interns</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-[var(--color-ink)]">{overview.assigned_students}</span>
                        <span className="text-xs font-medium text-emerald-600">
                            ({overview.total_students > 0 ? Math.round((overview.assigned_students / overview.total_students) * 100) : 0}%)
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-rose-500 font-medium">{overview.unassigned_students} unassigned</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Total Rendered</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <Clock size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.total_hours_rendered} hrs</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">OJT hours completed in program</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Section Performance Bar Chart */}
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
                            <BarChart data={charts.section_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(val: any) => [`${val} hrs`, 'Total Rendered']} />
                                <Bar dataKey="total_hours" fill="#818CF8" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Placement Status Donut Chart */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Internship Placement</h3>
                            <p className="text-xs text-[var(--color-muted)]">Students assigned to companies vs unassigned</p>
                        </div>
                        <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={charts.placement_status}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {charts.placement_status.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: any) => [`${val} students`, 'Count']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex justify-center gap-6 text-xs">
                        {charts.placement_status.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-[var(--color-muted)] font-medium">{item.name}:</span>
                                <span className="font-bold text-[var(--color-ink)]">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
