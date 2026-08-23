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
    ResponsiveContainer
} from 'recharts'
import { useCoordinatorDashboard } from '@/lib/queries/dashboard'

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

    const { section, overview, charts } = data

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

                {section && (
                    <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] w-fit">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                            <Users size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">Assigned Section</p>
                            <p className="text-sm font-bold text-[var(--color-ink)]">{section.name}</p>
                        </div>
                    </div>
                )}
            </header>

            {/* KPI Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Section Interns</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Users size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.total_students}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Students assigned to section</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Placed Interns</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.assigned_students}</p>
                    <p className="mt-1 text-xs text-emerald-600 font-medium">Assigned to partner companies</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Unassigned Interns</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <Clock size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.unassigned_students}</p>
                    <p className="mt-1 text-xs text-amber-600 font-medium">Needing company placement</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Company Requests</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                            <FileText size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.pending_company_requests}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Pending approval requests</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Student Progress Bar Chart */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Student Hours Progress</h3>
                            <p className="text-xs text-[var(--color-muted)]">Rendered vs required OJT hours</p>
                        </div>
                        <TrendingUp size={18} className="text-indigo-500" />
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={charts.student_progress}
                                margin={{ top: 10, right: 10, left: 30, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(val: any) => [`${val} hrs`, 'Rendered']} />
                                <Bar dataKey="rendered" fill="#6366F1" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Placement Status Donut Chart */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Company Placement Ratio</h3>
                            <p className="text-xs text-[var(--color-muted)]">Placed vs unplaced section students</p>
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
