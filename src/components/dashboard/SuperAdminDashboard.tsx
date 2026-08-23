import {
    Users,
    Building2,
    GraduationCap,
    CheckCircle2,
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
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import { useSuperAdminDashboard } from '@/lib/queries/dashboard'

export function SuperAdminDashboard() {
    const { data, isLoading, error } = useSuperAdminDashboard()

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
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
                <p className="text-sm font-medium text-red-800">Failed to load dashboard metrics.</p>
            </div>
        )
    }

    const { overview, charts } = data

    return (
        <section className="space-y-8">
            <header className="flex flex-col gap-1">
                <p className="text-sm font-semibold tracking-wide text-[var(--color-accent)] uppercase">
                    Super Admin Portal
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                    System Analytics & Overview
                </h1>
            </header>

            {/* KPI Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Total Users</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Users size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.total_users}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Registered accounts</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Companies</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Building2 size={18} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-[var(--color-ink)]">{overview.total_companies}</span>
                        <span className="text-xs font-medium text-emerald-600">({overview.approved_companies} approved)</span>
                    </div>
                    <p className="mt-1 text-xs text-amber-600 font-medium">{overview.pending_companies} pending review</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Total Students</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <GraduationCap size={18} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-[var(--color-ink)]">{overview.total_students}</span>
                        <span className="text-xs font-medium text-indigo-600">({overview.assigned_students} placed)</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{overview.unassigned_students} unassigned</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Pending Requests</p>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <FileText size={18} />
                        </div>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[var(--color-ink)]">{overview.pending_company_requests}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Company requests needing action</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Company Status Donut Chart */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">Company Approval Status</h3>
                            <p className="text-xs text-[var(--color-muted)]">Approved vs pending partner companies</p>
                        </div>
                        <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={charts.company_status}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {charts.company_status.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: any) => [`${val} companies`, 'Count']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex justify-center gap-6 text-xs">
                        {charts.company_status.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-[var(--color-muted)] font-medium">{item.name}:</span>
                                <span className="font-bold text-[var(--color-ink)]">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* User Roles Breakdown Bar Chart */}
                <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--color-ink)]">User Roles Breakdown</h3>
                            <p className="text-xs text-[var(--color-muted)]">Count of active accounts by role</p>
                        </div>
                        <Users size={18} className="text-indigo-500" />
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.roles_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(val: any) => [`${val} users`, 'Count']} />
                                <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 14-Day System Attendance Trend */}
            <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-[var(--color-ink)]">14-Day Attendance Activity Trend</h3>
                        <p className="text-xs text-[var(--color-muted)]">Daily time log punches across the platform</p>
                    </div>
                    <TrendingUp size={18} className="text-blue-500" />
                </div>

                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={charts.daily_logs_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(val: any) => [`${val} punches`, 'Logs']} />
                            <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </section>
    )
}
