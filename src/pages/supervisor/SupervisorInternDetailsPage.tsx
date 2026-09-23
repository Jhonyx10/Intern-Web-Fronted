import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    ArrowLeft,
    Calendar,
    Clock,
    GraduationCap,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import { useSupervisorInternDetail } from '@/lib/queries/supervisor'
import { useAuth } from '@/lib/auth'

// ─── helpers ────────────────────────────────────────────────────────────────

const AVATAR_STYLES = [
    'bg-emerald-50 text-emerald-700',
    'bg-amber-50 text-amber-700',
    'bg-sky-50 text-sky-700',
    'bg-violet-50 text-violet-700',
    'bg-rose-50 text-rose-700',
]

function avatarStyle(seed: string) {
    let hash = 0
    for (let i = 0; i < seed.length; i++)
        hash = (hash + seed.charCodeAt(i)) % AVATAR_STYLES.length
    return AVATAR_STYLES[hash]
}

function fmtTime(raw: string | null) {
    if (!raw) return '—'
    const match = raw.match(/^(\d{1,2}):(\d{2})/)
    if (match) {
        const h = parseInt(match[1], 10)
        const m = match[2]
        const ampm = h >= 12 ? 'PM' : 'AM'
        return `${h % 12 || 12}:${m} ${ampm}`
    }
    return raw
}

function fmtDateTime(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function fmtDuration(minutes: number | null) {
    if (minutes == null) return '—'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(raw: string) {
    return new Date(raw).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

// ─── component ──────────────────────────────────────────────────────────────

export default function SupervisorInternDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const { data: intern, isLoading, isError } = useSupervisorInternDetail(id)

    if (!user || user.role?.name !== 'supervisor') {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <AlertCircle size={40} className="text-[var(--color-muted)]" />
                <p className="text-sm text-[var(--color-muted)]">Access denied.</p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="animate-spin text-[var(--color-accent)]" size={28} />
            </div>
        )
    }

    if (isError || !intern) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <AlertCircle size={36} className="text-red-400" />
                <p className="text-sm font-medium text-red-700">Could not load intern details.</p>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft size={14} /> Go Back
                </button>
            </div>
        )
    }

    const pct = intern.required_hours
        ? Math.min(100, Math.round((intern.total_hours / intern.required_hours) * 100))
        : null

    const fullName = [intern.first_name, intern.middle_name, intern.last_name]
        .filter(Boolean)
        .join(' ')

    return (
        <section className="space-y-6 pb-12">
            {/* Back button */}
            <div>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-[var(--shadow-soft)] transition hover:bg-slate-50"
                >
                    <ArrowLeft size={14} /> Back to Interns
                </button>
            </div>

            {/* Profile card — avatar, progress bar, and schedule */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-5"
            >
                {/* Avatar + name row */}
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div
                        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold shadow-inner ${avatarStyle(intern.student_number)}`}
                    >
                        {intern.first_name[0]}{intern.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold text-[var(--color-ink)]">{fullName}</h1>
                            <span
                                className={[
                                    'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                    intern.is_active
                                        ? 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/20'
                                        : 'bg-slate-100 text-slate-500',
                                ].join(' ')}
                            >
                                {intern.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted)]">
                            <span className="font-mono font-semibold text-[var(--color-ink)]">
                                {intern.student_number}
                            </span>
                            {intern.section && (
                                <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                        <GraduationCap size={13} />
                                        {intern.section.name}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="border-t border-[var(--color-line)] pt-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-[var(--color-ink)]">OJT Hours Progress</span>
                        <span className="font-bold text-[var(--color-accent)] tabular-nums">
                            {intern.total_hours}{intern.required_hours ? ` / ${intern.required_hours} hrs` : ' hrs logged'}
                            {pct !== null && ` (${pct}%)`}
                        </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: pct !== null ? `${pct}%` : '0%' }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            className={[
                                'h-full rounded-full',
                                pct !== null && pct >= 100
                                    ? 'bg-emerald-500'
                                    : 'bg-gradient-to-r from-[var(--color-accent)] to-indigo-500',
                            ].join(' ')}
                        />
                    </div>
                    {/* Stat pills */}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <div className="rounded-lg bg-slate-50 border border-[var(--color-line)] px-3 py-1.5 text-center">
                            <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide">Logged</p>
                            <p className="text-sm font-bold text-[var(--color-ink)]">{intern.total_hours} hrs</p>
                        </div>
                        {intern.required_hours && (
                            <div className="rounded-lg bg-slate-50 border border-[var(--color-line)] px-3 py-1.5 text-center">
                                <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide">Required</p>
                                <p className="text-sm font-bold text-[var(--color-ink)]">{intern.required_hours} hrs</p>
                            </div>
                        )}
                        {pct !== null && (
                            <div className="rounded-lg bg-slate-50 border border-[var(--color-line)] px-3 py-1.5 text-center">
                                <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide">Completion</p>
                                <p className={['text-sm font-bold', pct >= 100 ? 'text-emerald-600' : 'text-[var(--color-accent)]'].join(' ')}>
                                    {pct}%
                                </p>
                            </div>
                        )}
                        <div className="rounded-lg bg-slate-50 border border-[var(--color-line)] px-3 py-1.5 text-center">
                            <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide">Sessions</p>
                            <p className="text-sm font-bold text-[var(--color-ink)]">{intern.time_logs.length}</p>
                        </div>
                    </div>
                </div>

                {/* Work Schedule — inside the profile card */}
                <div className="border-t border-[var(--color-line)] pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                            <Calendar size={15} className="text-[var(--color-muted)]" />
                            Work Schedule
                        </h2>
                        <span className="text-xs text-[var(--color-muted)]">
                            {intern.schedules.length} schedule{intern.schedules.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {intern.schedules.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {intern.schedules.map((sch) => (
                                <div
                                    key={sch.id}
                                    className="rounded-xl border border-[var(--color-line)] bg-slate-50/60 p-4 space-y-3"
                                >
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Effective</span>
                                        <span className="font-bold text-[var(--color-ink)]">{fmtDate(sch.start_date)}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-lg bg-emerald-50 p-2">
                                            <p className="text-[10px] font-semibold text-emerald-600 uppercase">In</p>
                                            <p className="mt-0.5 text-xs font-bold text-emerald-800">{fmtTime(sch.time_in)}</p>
                                        </div>
                                        <div className="rounded-lg bg-amber-50 p-2">
                                            <p className="text-[10px] font-semibold text-amber-600 uppercase">Lunch</p>
                                            <p className="mt-0.5 text-xs font-bold text-amber-800">
                                                {sch.lunch_break ? fmtTime(sch.lunch_break) : '—'}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-rose-50 p-2">
                                            <p className="text-[10px] font-semibold text-rose-600 uppercase">Out</p>
                                            <p className="mt-0.5 text-xs font-bold text-rose-800">{fmtTime(sch.time_out)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-line)] px-4 py-3 text-xs text-[var(--color-muted)]">
                            <Calendar size={16} className="text-slate-300 shrink-0" />
                            No schedule configured yet.
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Time Logs */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
            >
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                        <Clock size={15} className="text-[var(--color-muted)]" />
                        Time Logs
                    </h2>
                    <span className="text-xs text-[var(--color-muted)]">
                        {intern.time_logs.length} entries · {intern.total_hours} hrs total
                    </span>
                </div>

                {intern.time_logs.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-[var(--color-line)] bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                                    <tr>
                                        <th className="px-5 py-3">Date &amp; Time In</th>
                                        <th className="px-5 py-3">Time Out</th>
                                        <th className="px-5 py-3">Duration</th>
                                        <th className="px-5 py-3">Verification</th>
                                        <th className="px-5 py-3">Task Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-line)]">
                                    {intern.time_logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/60 transition">
                                            <td className="px-5 py-3 font-medium text-[var(--color-ink)] whitespace-nowrap">
                                                {fmtDateTime(log.time_in)}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {log.time_out ? (
                                                    <span className="text-[var(--color-ink)]">{fmtDateTime(log.time_out)}</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                                        In Progress
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 font-bold text-indigo-600 tabular-nums whitespace-nowrap">
                                                {fmtDuration(log.duration_minutes)}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 capitalize">
                                                    {log.verification_method ?? 'Facial Match'}
                                                </span>
                                            </td>
                                            <td className="max-w-[180px] truncate px-5 py-3 text-xs text-[var(--color-muted)]">
                                                {log.task_note ?? <span className="italic">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] py-12 text-center">
                        <Clock size={28} className="text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-[var(--color-ink)]">No time logs yet</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                            This intern hasn't recorded any sessions at your company.
                        </p>
                    </div>
                )}
            </motion.div>
        </section>
    )
}
