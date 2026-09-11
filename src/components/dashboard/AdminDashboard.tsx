import {
    Users,
    CheckCircle2,
    Layers,
    TrendingUp,
    Hourglass,
    CircleDashed,
    GraduationCap
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
import { useAdminDashboard } from '@/lib/queries/dashboard'

export function AdminDashboard() {
    const { data, isLoading, error } = useAdminDashboard()

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-20 max-w-md rounded-2xl bg-black/5" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 rounded-2xl bg-black/5" />
                    ))}
                </div>
                <div className="h-64 rounded-2xl bg-black/5" />
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
                <p className="text-sm font-medium text-red-800">Failed to load Administrator's dashboard metrics.</p>
            </div>
        )
    }

    const { overview, courses, charts } = data

    return (
        <section className="space-y-8">
            <header className="flex flex-col gap-1">
                <p className="text-sm font-semibold tracking-wide text-[var(--color-accent)] uppercase">
                    Administrator's Portal
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                    Program Analytics &amp; Overview
                </h1>
                <p className="text-sm text-[var(--color-muted)]">
                    Oversight across {overview.total_courses} course{overview.total_courses !== 1 ? 's' : ''}
                </p>
            </header>

            {/* System-wide KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Total Students</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Users size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.total_students}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                        Across {overview.total_sections} sections
                    </p>
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
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Internship Progress</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.overall_internship_percentage}%</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {overview.total_rendered_hours} / {overview.total_required_hours} hrs rendered
                    </p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Completion Status</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                            <Hourglass size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.completed_students}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {overview.in_progress_students} in progress · {overview.not_started_students} not started
                    </p>
                </div>
            </div>

            {/* Per-course table */}
            <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-[var(--color-ink)]">Course Breakdown</h3>
                        <p className="text-xs text-[var(--color-muted)]">Placement and internship progress per course</p>
                    </div>
                    <GraduationCap size={18} className="text-indigo-500" />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-line)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                                <th className="py-2 pr-4">Course</th>
                                <th className="py-2 pr-4 text-right">Sections</th>
                                <th className="py-2 pr-4 text-right">Enrolled</th>
                                <th className="py-2 pr-4 text-right">Assigned</th>
                                <th className="py-2 pr-4 text-right">Unassigned</th>
                                <th className="py-2 pr-4 text-right">Completed</th>
                                <th className="py-2 pr-4 text-right">In Progress</th>
                                <th className="py-2 pr-4 text-right">Not Started</th>
                                <th className="py-2 pr-4 text-right">Hours (rendered / required)</th>
                                <th className="py-2 text-right">Internship %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.map((c) => (
                                <tr key={c.id} className="border-b border-[var(--color-line)] last:border-0">
                                    <td className="py-3 pr-4">
                                        <p className="font-semibold text-[var(--color-ink)]">{c.code}</p>
                                        <p className="text-xs text-[var(--color-muted)]">{c.name}</p>
                                    </td>
                                    <td className="py-3 pr-4 text-right text-[var(--color-ink)]">{c.total_sections}</td>
                                    <td className="py-3 pr-4 text-right text-[var(--color-ink)]">{c.total_students}</td>
                                    <td className="py-3 pr-4 text-right font-medium text-emerald-600">{c.assigned_students}</td>
                                    <td className="py-3 pr-4 text-right font-medium text-rose-500">{c.unassigned_students}</td>
                                    <td className="py-3 pr-4 text-right text-[var(--color-ink)]">{c.completed_students}</td>
                                    <td className="py-3 pr-4 text-right text-[var(--color-ink)]">{c.in_progress_students}</td>
                                    <td className="py-3 pr-4 text-right text-[var(--color-ink)]">{c.not_started_students}</td>
                                    <td className="py-3 pr-4 text-right text-[var(--color-ink)]">
                                        {c.total_rendered_hours} / {c.total_required_hours}
                                    </td>
                                    <td className="py-3 text-right">
                                        <span className="inline-flex items-center rounded-full bg-[var(--color-accent-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-accent)]">
                                            {c.internship_percentage}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Enrollment per course */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Enrollment by Course</h3>
                            <p className="text-xs text-[var(--color-muted)]">Total students enrolled per course</p>
                        </div>
                        <Layers size={18} className="text-indigo-500" />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.enrollment_by_course} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(val: any) => [`${val} students`, 'Enrolled']} />
                                <Bar dataKey="value" fill="#818CF8" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Placement per course (stacked) */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Placement by Course</h3>
                            <p className="text-xs text-[var(--color-muted)]">Assigned vs unassigned students per course</p>
                        </div>
                        <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.placement_by_course} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="assigned" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="unassigned" stackId="a" fill="#EF4444" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Internship progress % per course */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Internship Progress by Course</h3>
                            <p className="text-xs text-[var(--color-muted)]">Rendered hours as % of required hours</p>
                        </div>
                        <TrendingUp size={18} className="text-amber-500" />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.internship_progress_by_course} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                                <Tooltip formatter={(val: any) => [`${val}%`, 'Progress']} />
                                <Bar dataKey="percentage" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Completion status per course (stacked) */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Status by Course</h3>
                            <p className="text-xs text-[var(--color-muted)]">Completed vs in progress vs not started</p>
                        </div>
                        <CircleDashed size={18} className="text-gray-500" />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.status_by_course} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="completed" stackId="s" fill="#10B981" />
                                <Bar dataKey="in_progress" stackId="s" fill="#F59E0B" />
                                <Bar dataKey="not_started" stackId="s" fill="#6B7280" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* System-wide pies */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Overall Placement</h3>
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
                                        <Cell key={`ps-${index}`} fill={entry.color} />
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

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">Overall Completion</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={charts.completion_status}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {charts.completion_status.map((entry, index) => (
                                        <Cell key={`cs-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: any) => [`${val} students`, 'Count']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 text-xs">
                        {charts.completion_status.map((item) => (
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