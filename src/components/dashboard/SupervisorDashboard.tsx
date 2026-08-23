import {
    Building2,
    Users,
    Calendar,
    Clock,
    TrendingUp,
    CheckCircle2
} from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import { useSupervisorDashboardData } from '@/lib/queries/dashboard'

export function SupervisorDashboard() {
    const { data, isLoading, error } = useSupervisorDashboardData()

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-20 max-w-md rounded-2xl bg-black/5" />
                <div className="grid gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map((i) => (
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
                <p className="text-sm font-medium text-red-800">Failed to load Supervisor dashboard metrics.</p>
            </div>
        )
    }

    const { company, overview, charts } = data

    return (
        <section className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold tracking-wide text-[var(--color-accent)] uppercase">
                        Supervisor Portal
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                        Company Intern Performance
                    </h1>
                </div>

                {company && (
                    <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] w-fit">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                            <Building2 size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">Company</p>
                            <p className="text-sm font-bold text-[var(--color-ink)]">{company.name}</p>
                        </div>
                    </div>
                )}
            </header>

            {/* KPI Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Assigned Interns</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Users size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.total_interns}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Active company interns</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Work Schedules</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Calendar size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.total_schedules}</p>
                    <p className="mt-1 text-xs text-emerald-600 font-medium">Configured company work hours</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Hours Logged</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <Clock size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.total_hours_logged} hrs</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Total time rendered by interns</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Intern Rendered Hours Bar Chart */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Intern Hours Progress</h3>
                            <p className="text-xs text-[var(--color-muted)]">Rendered vs required hours</p>
                        </div>
                        <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.intern_hours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(val: any) => [`${val} hrs`, 'Rendered']} />
                                <Bar dataKey="rendered" fill="#10B981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 14-Day Attendance Frequency Area Chart */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">14-Day Attendance Log Trend</h3>
                            <p className="text-xs text-[var(--color-muted)]">Daily time log punches by company interns</p>
                        </div>
                        <TrendingUp size={18} className="text-blue-500" />
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={charts.attendance_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorInternTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(val: any) => [`${val} logs`, 'Punches']} />
                                <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorInternTrend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </section>
    )
}
