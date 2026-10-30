import {
    Users,
    Building2,
    GraduationCap,
    CheckCircle2,
    FileText,
    TrendingUp
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
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

function KpiCard({
    label,
    icon: Icon,
    iconClass,
    value,
    suffix,
    suffixClass = 'text-[var(--color-muted)]',
    caption,
    captionClass = 'text-[var(--color-muted)]',
    to,
}: {
    label: string
    icon: LucideIcon
    iconClass: string
    value: number
    suffix?: string
    suffixClass?: string
    caption: string
    captionClass?: string
    to: string
}) {
    return (
        <Link
            to={to}
            className="block cursor-pointer rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
        >
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">{label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[var(--color-ink)]">{value}</span>
                {suffix && <span className={`text-xs font-medium ${suffixClass}`}>{suffix}</span>}
            </div>
            <p className={`mt-1 text-xs ${captionClass}`}>{caption}</p>
        </Link>
    )
}

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
                <KpiCard
                    label="Total Administrators"
                    icon={Users}
                    iconClass="bg-indigo-50 text-indigo-600"
                    value={overview.total_administrators}
                    caption="Admins, deans & coordinators"
                    to="/administrator"
                />
                <KpiCard
                    label="Companies"
                    icon={Building2}
                    iconClass="bg-emerald-50 text-emerald-600"
                    value={overview.total_companies}
                    suffix={`(${overview.approved_companies} approved)`}
                    suffixClass="text-emerald-600"
                    caption={`${overview.pending_companies} pending review`}
                    captionClass="text-amber-600 font-medium"
                    to="/companies"
                />
                <KpiCard
                    label="Total Students"
                    icon={GraduationCap}
                    iconClass="bg-blue-50 text-blue-600"
                    value={overview.total_students}
                    suffix={`(${overview.assigned_students} placed)`}
                    suffixClass="text-indigo-600"
                    caption={`${overview.unassigned_students} unassigned`}
                    to="/students"
                />
                <KpiCard
                    label="Pending Requests"
                    icon={FileText}
                    iconClass="bg-amber-50 text-amber-600"
                    value={overview.pending_company_requests}
                    caption="Company requests needing action"
                    to="/companies?tab=pending"
                />
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
