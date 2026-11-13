import type { ReactNode } from 'react'
import {
    Building2,
    Users,
    Calendar,
    Clock,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    BarChart3,
    Activity,
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
    Area,
} from 'recharts'
import { useSupervisorDashboardData } from '@/lib/queries/dashboard'

const panel =
    'rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]'

function greeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
}

function truncate(label: string, max = 10) {
    return label && label.length > max ? `${label.slice(0, max)}…` : label
}

function KpiCard({
    label,
    value,
    hint,
    icon,
    tone,
}: {
    label: string
    value: ReactNode
    hint: string
    icon: ReactNode
    tone: 'blue' | 'emerald' | 'amber'
}) {
    const tones = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
    }
    return (
        <div className={`${panel} p-5 transition hover:-translate-y-0.5 hover:shadow-md`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                        {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold tabular-nums leading-none text-[var(--color-ink)]">
                        {value}
                    </p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
                    {icon}
                </div>
            </div>
            <p className="mt-3 text-xs text-[var(--color-muted)]">{hint}</p>
        </div>
    )
}

function ChartCard({
    title,
    subtitle,
    icon,
    footer,
    children,
}: {
    title: string
    subtitle: string
    icon: ReactNode
    footer?: ReactNode
    children: ReactNode
}) {
    return (
        <div className={`${panel} flex flex-col`}>
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-6 py-4">
                <div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">{subtitle}</p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-[var(--color-muted)]">
                    {icon}
                </span>
            </div>
            <div className="flex-1 px-4 pb-2 pt-5">{children}</div>
            {footer && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--color-line)] bg-slate-50/60 px-6 py-3">
                    {footer}
                </div>
            )}
        </div>
    )
}

function FooterStat({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
            <p className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">{value}</p>
        </div>
    )
}

function EmptyChart({ icon, message }: { icon: ReactNode; message: string }) {
    return (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-inset ring-[var(--color-line)]">
                {icon}
            </span>
            <p className="max-w-[220px] text-xs text-[var(--color-muted)]">{message}</p>
        </div>
    )
}

function ChartTooltip({
    active,
    payload,
    label,
    unit,
    seriesLabel,
}: {
    active?: boolean
    payload?: any[]
    label?: string
    unit: string
    seriesLabel: string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 shadow-lg">
            <p className="text-[11px] font-medium text-[var(--color-muted)]">{label}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--color-ink)]">
                {payload[0].value} {unit}
            </p>
            <p className="text-[10px] text-[var(--color-muted)]">{seriesLabel}</p>
        </div>
    )
}

export function SupervisorDashboard() {
    const { data, isLoading, error } = useSupervisorDashboardData()

    if (isLoading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2">
                        <div className="h-3 w-32 rounded bg-black/5" />
                        <div className="h-8 w-72 rounded-lg bg-black/5" />
                    </div>
                    <div className="h-14 w-48 rounded-2xl bg-black/5" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-[124px] rounded-2xl bg-black/5" />
                    ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="h-[400px] rounded-2xl bg-black/5" />
                    <div className="h-[400px] rounded-2xl bg-black/5" />
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                <div>
                    <p className="text-sm font-semibold text-red-800">
                        Failed to load Supervisor dashboard metrics.
                    </p>
                    <p className="mt-0.5 text-xs text-red-700/80">
                        Check your connection and refresh the page to try again.
                    </p>
                </div>
            </div>
        )
    }

    const { company, overview, charts } = data

    // Derived summaries (computed from the data already returned)
    const internHours: any[] = charts.intern_hours ?? []
    const attendanceTrend: any[] = charts.attendance_trend ?? []
    const hasRequired = internHours.some((d) => d.required != null)

    const avgHours =
        internHours.length > 0
            ? Math.round(
                (internHours.reduce((sum, d) => sum + Number(d.rendered ?? 0), 0) / internHours.length) * 10
            ) / 10
            : 0
    const topIntern = internHours.reduce<any | null>(
        (best, d) => (!best || Number(d.rendered) > Number(best.rendered) ? d : best),
        null
    )

    const totalPunches = attendanceTrend.reduce((sum, d) => sum + Number(d.count ?? 0), 0)
    const peakDay = attendanceTrend.reduce<any | null>(
        (best, d) => (!best || Number(d.count) > Number(best.count) ? d : best),
        null
    )

    return (
        <section className="space-y-8">
            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
                        Supervisor Portal
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                        {greeting()}
                    </h1>
                    <p className="text-sm text-[var(--color-muted)]">
                        Here’s how your company’s interns are doing.
                    </p>
                </div>

                {company && (
                    <div className="flex w-fit items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                            <Building2 size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                                Company
                            </p>
                            <p className="text-sm font-bold text-[var(--color-ink)]">{company.name}</p>
                        </div>
                    </div>
                )}
            </header>

            {/* KPI Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard
                    label="Assigned Interns"
                    value={overview.total_interns}
                    hint="Active company interns"
                    icon={<Users size={18} />}
                    tone="blue"
                />
                <KpiCard
                    label="Work Schedules"
                    value={overview.total_schedules}
                    hint="Configured company work hours"
                    icon={<Calendar size={18} />}
                    tone="emerald"
                />
                <KpiCard
                    label="Hours Logged"
                    value={
                        <>
                            {overview.total_hours_logged}
                            <span className="ml-1 text-base font-semibold text-[var(--color-muted)]">hrs</span>
                        </>
                    }
                    hint="Total time rendered by interns"
                    icon={<Clock size={18} />}
                    tone="amber"
                />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard
                    title="Intern Hours Progress"
                    subtitle={hasRequired ? 'Rendered vs required hours' : 'Hours rendered per intern'}
                    icon={<CheckCircle2 size={16} className="text-emerald-500" />}
                    footer={
                        internHours.length > 0 ? (
                            <>
                                <FooterStat label="Avg per intern" value={`${avgHours} hrs`} />
                                {topIntern && (
                                    <FooterStat
                                        label="Most hours"
                                        value={`${truncate(String(topIntern.name), 16)} · ${topIntern.rendered} hrs`}
                                    />
                                )}
                            </>
                        ) : undefined
                    }
                >
                    {internHours.length === 0 ? (
                        <EmptyChart
                            icon={<BarChart3 size={20} />}
                            message="No hours have been rendered yet. Intern progress will show up here."
                        />
                    ) : (
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={internHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 10, fill: '#6B7280' }}
                                        tickFormatter={(v) => truncate(String(v))}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#6B7280' }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                                        content={<ChartTooltip unit="hrs" seriesLabel="Rendered" />}
                                    />
                                    {hasRequired && (
                                        <Bar dataKey="required" fill="#E5E7EB" radius={[6, 6, 0, 0]} />
                                    )}
                                    <Bar dataKey="rendered" fill="#10B981" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </ChartCard>

                <ChartCard
                    title="14-Day Attendance Log Trend"
                    subtitle="Daily time log punches by company interns"
                    icon={<TrendingUp size={16} className="text-blue-500" />}
                    footer={
                        attendanceTrend.length > 0 ? (
                            <>
                                <FooterStat label="Total punches" value={totalPunches} />
                                {peakDay && Number(peakDay.count) > 0 && (
                                    <FooterStat
                                        label="Busiest day"
                                        value={`${peakDay.date} · ${peakDay.count}`}
                                    />
                                )}
                            </>
                        ) : undefined
                    }
                >
                    {attendanceTrend.length === 0 ? (
                        <EmptyChart
                            icon={<Activity size={20} />}
                            message="No attendance activity in the last 14 days."
                        />
                    ) : (
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorInternTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: '#6B7280' }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11, fill: '#6B7280' }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: '#93C5FD', strokeDasharray: '3 3' }}
                                        content={<ChartTooltip unit="logs" seriesLabel="Punches" />}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorInternTrend)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </ChartCard>
            </div>
        </section>
    )
}