import { useState, useMemo } from "react";
import {
    Clock,
    Calendar,
    CalendarDays,
    Search,
    CheckCircle2,
    AlertCircle,
    Eye,
    Users,
    Timer,
    X,
    ChevronRight,
} from "lucide-react";
import { useAttendanceMonitoring, type AttendanceRecord } from "@/lib/queries/attendance";
import { TimeLogDetails } from "@/components/modal/TimeLogDetails";
import { useAuth } from "@/lib/auth";
import { useCurrentSchoolYear } from "@/lib/queries/school-year";

/* ─────────────────────────── helpers ─────────────────────────── */

function fmtTime(isoOrTime: string | null) {
    if (!isoOrTime) return "—";
    if (isoOrTime.includes("T")) {
        return new Date(isoOrTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    const [h, m] = isoOrTime.split(":");
    if (h !== undefined && m !== undefined) {
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${m} ${ampm}`;
    }
    return isoOrTime;
}

function fmtDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function fmtDuration(minutes: number | null) {
    if (minutes == null) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* ─────────── date helpers for modal range filtering ─────────── */

type ModalTab = "today" | "week" | "month" | "last_month" | "custom";

function startOfDay(d: Date) {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
}

function endOfDay(d: Date) {
    const c = new Date(d);
    c.setHours(23, 59, 59, 999);
    return c;
}

function startOfWeek(d: Date) {
    const c = startOfDay(d);
    c.setDate(c.getDate() - c.getDay()); // Sunday
    return c;
}

function startOfMonth(d: Date) {
    const c = startOfDay(d);
    c.setDate(1);
    return c;
}

/** Local YYYY-MM-DD (avoids the UTC shift you get from toISOString). */
function toISODate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD input value as a local date. */
function parseISODate(s: string): Date | null {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function getBounds(
    tab: ModalTab,
    customFrom: string,
    customTo: string
): { from: Date | null; to: Date | null } {
    const now = new Date();
    switch (tab) {
        case "today":
            return { from: startOfDay(now), to: endOfDay(now) };
        case "week":
            return { from: startOfWeek(now), to: endOfDay(now) };
        case "month":
            return { from: startOfMonth(now), to: endOfDay(now) };
        case "last_month": {
            const from = startOfMonth(now);
            from.setMonth(from.getMonth() - 1);
            const to = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
            return { from, to: endOfDay(to) };
        }
        case "custom": {
            const f = parseISODate(customFrom);
            const t = parseISODate(customTo);
            return { from: f ? startOfDay(f) : null, to: t ? endOfDay(t) : null };
        }
    }
}

const TAB_LABELS: Record<ModalTab, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    last_month: "Last Month",
    custom: "Custom",
};

/* ───────────────── StudentAttendanceModal ───────────────── */

type StudentSummary = {
    student_id: number;
    student_name: string;
    student_number: string;
    course_code: string;
    section_code: string;
    sessions: number;
    days: number;
    days_set: Set<string>;
    total_minutes: number;
    last_seen: string | null;
};

interface StudentAttendanceModalProps {
    student: StudentSummary;
    onClose: () => void;
    onViewRecord: (id: number) => void;
}

function StudentAttendanceModal({
    student,
    onClose,
    onViewRecord,
}: StudentAttendanceModalProps) {
    const { token } = useAuth();
    const [tab, setTab] = useState<ModalTab>("month");

    // Custom range defaults: first of this month → today
    const [customFrom, setCustomFrom] = useState(() => toISODate(startOfMonth(new Date())));
    const [customTo, setCustomTo] = useState(() => toISODate(new Date()));

    const { from, to } = useMemo(
        () => getBounds(tab, customFrom, customTo),
        [tab, customFrom, customTo]
    );

    const invalidRange = tab === "custom" && from && to && from > to;

    // The modal fetches its own data, so it is no longer limited by the
    // parent page's range (e.g. parent on "Today" can still show last month).
    const { data: fetched, isLoading, isError, refetch } = useAttendanceMonitoring(
        {
            range: "custom",
            search: student.student_number,
            date_from: from ? toISODate(from) : undefined,
            date_to: to ? toISODate(to) : undefined,
        },
        token
    );

    const filtered = useMemo(() => {
        if (invalidRange) return [];
        return (fetched ?? [])
            .filter((l) => l.student_id === student.student_id)
            .filter((l) => {
                const ref = l.time_in ?? l.time_out;
                if (!ref) return false;
                const t = new Date(ref);
                if (from && t < from) return false;
                if (to && t > to) return false;
                return true;
            })
            .sort((a, b) => {
                const ta = new Date(a.time_in ?? a.time_out ?? 0).getTime();
                const tb = new Date(b.time_in ?? b.time_out ?? 0).getTime();
                return tb - ta; // newest first
            });
    }, [fetched, student.student_id, from, to, invalidRange]);

    // Stats reflect the selected range, not the parent page's range
    const stats = useMemo(() => {
        const days = new Set<string>();
        let minutes = 0;
        for (const l of filtered) {
            if (l.time_in) days.add(toISODate(new Date(l.time_in)));
            minutes += l.duration_minutes ?? 0;
        }
        return { sessions: filtered.length, days: days.size, minutes };
    }, [filtered]);

    const rangeSubtitle =
        tab === "custom"
            ? from && to
                ? `${fmtDate(from.toISOString())} – ${fmtDate(to.toISOString())}`
                : "Pick a start and end date"
            : TAB_LABELS[tab];

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Panel */}
            <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--color-line)] bg-white shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-start gap-4 border-b border-[var(--color-line)] px-6 py-5 bg-slate-50/60">
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-accent)] mb-0.5">
                            Attendance History
                        </p>
                        <h2 className="text-lg font-bold text-[var(--color-ink)] truncate">
                            {student.student_name}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                            <span className="font-mono">{student.student_number}</span>
                            <span className="text-slate-300">·</span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                {student.course_code}
                            </span>
                            <span>{student.section_code}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 divide-x divide-[var(--color-line)] border-b border-[var(--color-line)] bg-white">
                    {[
                        { label: "Total Sessions", value: stats.sessions },
                        { label: "Distinct Days", value: stats.days },
                        { label: "Total Hours", value: fmtDuration(stats.minutes) },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col items-center py-3 px-4">
                            <span className="text-lg font-bold text-[var(--color-ink)]">{value}</span>
                            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                                {label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Tab bar */}
                <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-line)] bg-slate-50/50 px-6 py-2.5">
                    {(Object.keys(TAB_LABELS) as ModalTab[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${tab === t
                                ? "bg-[var(--color-accent)] text-white shadow-sm"
                                : "text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-slate-100"
                                }`}
                        >
                            {TAB_LABELS[t]}
                        </button>
                    ))}
                    <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* Custom date range inputs */}
                {tab === "custom" && (
                    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] bg-white px-6 py-3">
                        <Calendar size={13} className="text-[var(--color-muted)] shrink-0" />
                        <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                            From
                            <input
                                type="date"
                                value={customFrom}
                                max={customTo || undefined}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="rounded-lg border border-[var(--color-line)] bg-white px-2 py-1 text-xs text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                            />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                            To
                            <input
                                type="date"
                                value={customTo}
                                min={customFrom || undefined}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="rounded-lg border border-[var(--color-line)] bg-white px-2 py-1 text-xs text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                            />
                        </label>
                        {invalidRange && (
                            <span className="text-[11px] font-medium text-rose-600">
                                Start date must be on or before the end date.
                            </span>
                        )}
                    </div>
                )}

                {/* Table */}
                <div className="overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="p-12 text-center text-xs text-[var(--color-muted)] animate-pulse">
                            Loading attendance records...
                        </div>
                    ) : isError ? (
                        <div className="p-12 text-center">
                            <AlertCircle size={28} className="mx-auto text-rose-500 mb-2" />
                            <p className="text-xs font-medium text-slate-700">Failed to load attendance logs.</p>
                            <button
                                type="button"
                                onClick={() => refetch()}
                                className="mt-2 text-xs text-[var(--color-accent)] underline font-medium"
                            >
                                Try again
                            </button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                            <Clock size={32} className="text-slate-300 mb-2" />
                            <p className="text-sm font-semibold text-[var(--color-ink)]">
                                No records for {rangeSubtitle}
                            </p>
                            <p className="text-xs text-[var(--color-muted)] mt-0.5">
                                Try switching to a broader time range.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs text-[var(--color-muted)]">
                            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase font-semibold text-slate-500 border-b border-[var(--color-line)]">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Time In</th>
                                    <th className="px-6 py-3">Break</th>
                                    <th className="px-6 py-3">Time Out</th>
                                    <th className="px-6 py-3">Duration</th>
                                    <th className="px-6 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                {filtered.map((log) => (
                                    <tr key={log.id} className="transition hover:bg-slate-50/70">
                                        <td className="px-6 py-3.5 whitespace-nowrap font-medium">
                                            {fmtDate(log.time_in)}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-800">
                                            {fmtTime(log.time_in)}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-[11px]">
                                            {log.break_out ? (
                                                <span>
                                                    {fmtTime(log.break_out)} – {fmtTime(log.break_in)}
                                                </span>
                                            ) : (
                                                <span className="italic text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            {log.time_out ? (
                                                <span className="font-medium text-slate-800">
                                                    {fmtTime(log.time_out)}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                                    In Progress
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap font-semibold text-emerald-700">
                                            {fmtDuration(log.duration_minutes)}
                                        </td>
                                        <td className="px-6 py-3.5 text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => onViewRecord(log.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink)] shadow-2xs transition hover:bg-slate-100 hover:text-[var(--color-accent)]"
                                            >
                                                <Eye size={12} />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────── Main Page ─────────────────────────── */

export default function AttendancePage() {
    const { token, user } = useAuth();
    const { data: currentSchoolYear } = useCurrentSchoolYear();
    const [range, setRange] = useState<"today" | "week" | "month" | "custom">("today");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedTimeLogId, setSelectedTimeLogId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<"logs" | "summary">("logs");
    const [selectedSummaryStudent, setSelectedSummaryStudent] = useState<StudentSummary | null>(null);

    const isCustomRange = range === "custom";

    const { data: logs, isLoading, isError, refetch } = useAttendanceMonitoring(
        {
            range,
            search: search.trim() || undefined,
            date_from: isCustomRange ? dateFrom || undefined : undefined,
            date_to: isCustomRange ? dateTo || undefined : undefined,
        },
        token
    );

    const totalLogs = logs?.length ?? 0;
    const completedLogs = logs?.filter((l) => l.time_out !== null).length ?? 0;
    const inProgressLogs = logs?.filter((l) => l.time_in !== null && l.time_out === null).length ?? 0;

    const userRoleLabel = user?.role?.label ?? "User";

    // Per-student summary — one row per student, most recent session highlighted
    const studentSummary = useMemo<StudentSummary[]>(() => {
        const map = new Map<number, StudentSummary>();
        for (const l of logs ?? []) {
            const existing = map.get(l.student_id);
            const dateStr = l.time_in ? l.time_in.slice(0, 10) : null;
            if (existing) {
                existing.sessions += 1;
                existing.total_minutes += l.duration_minutes ?? 0;
                if (dateStr && !existing.days_set.has(dateStr)) {
                    existing.days_set.add(dateStr);
                    existing.days += 1;
                }
                if (l.time_in && (!existing.last_seen || l.time_in > existing.last_seen)) {
                    existing.last_seen = l.time_in;
                }
            } else {
                const entry: StudentSummary = {
                    student_id: l.student_id,
                    student_name: l.student_name,
                    student_number: l.student_number,
                    course_code: l.course_code,
                    section_code: l.section_code,
                    sessions: 1,
                    days: dateStr ? 1 : 0,
                    days_set: new Set(dateStr ? [dateStr] : []),
                    total_minutes: l.duration_minutes ?? 0,
                    last_seen: l.time_in ?? null,
                };
                map.set(l.student_id, entry);
            }
        }
        return Array.from(map.values()).sort((a, b) =>
            a.student_name.localeCompare(b.student_name)
        );
    }, [logs]);

    // Most recent log per student (for the summary row's "last session" preview)
    const latestLogByStudent = useMemo(() => {
        const m = new Map<number, AttendanceRecord>();
        for (const l of logs ?? []) {
            const existing = m.get(l.student_id);
            if (!existing || (l.time_in && (!existing.time_in || l.time_in > existing.time_in))) {
                m.set(l.student_id, l);
            }
        }
        return m;
    }, [logs]);

    const rangePeriodLabel =
        range === "today" ? "Today"
            : range === "week" ? "This Week"
                : range === "month" ? "This Month"
                    : "Custom Range";

    return (
        <section className="space-y-6">
            {/* Top Banner */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                            <Clock size={14} />
                            <span>{userRoleLabel} Portal</span>
                        </div>
                        {currentSchoolYear && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                                <CalendarDays size={12} className="text-amber-600" />
                                S.Y. {currentSchoolYear.name}
                                {currentSchoolYear.semester && (
                                    <span className="font-normal text-amber-700">· {currentSchoolYear.semester}</span>
                                )}
                            </span>
                        )}
                    </div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">
                        Interns Attendance Monitoring
                    </h1>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        Track daily, weekly, and monthly attendance time logs and verification records.
                    </p>
                </div>

                {/* Quick Range Tabs + View Mode Toggle */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-white p-1 shadow-sm">
                        {(["today", "week", "month", "custom"] as const).map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setRange(r)}
                                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${range === r
                                    ? "bg-[var(--color-accent)] text-white shadow-xs"
                                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                                    }`}
                            >
                                {r === "today" ? "Today" : r === "week" ? "This Week" : r === "month" ? "This Month" : "Custom"}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-white p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setViewMode("logs")}
                            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${viewMode === "logs"
                                ? "bg-slate-700 text-white shadow-xs"
                                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                                }`}
                        >
                            Logs
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("summary")}
                            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${viewMode === "summary"
                                ? "bg-slate-700 text-white shadow-xs"
                                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                                }`}
                        >
                            By Student
                        </button>
                    </div>
                </div>
            </header>

            {/* Summary Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-[var(--shadow-soft)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                            Total Logs
                        </p>
                        <p className="text-xl font-bold text-[var(--color-ink)]">{totalLogs}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-[var(--shadow-soft)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Timer size={20} />
                    </div>
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                            In Progress
                        </p>
                        <p className="text-xl font-bold text-amber-700">{inProgressLogs}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-[var(--shadow-soft)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                            Completed
                        </p>
                        <p className="text-xl font-bold text-emerald-700">{completedLogs}</p>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)] overflow-hidden">
                {/* Table Filters & Toolbar */}
                <div className="flex flex-col gap-3 border-b border-[var(--color-line)] bg-slate-50/50 px-6 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-[var(--color-ink)]">
                            {viewMode === "summary" ? "Students — By Student" : "Attendance Time Logs"}
                        </h2>
                        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {viewMode === "summary" ? studentSummary.length : totalLogs}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <Search
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                            />
                            <input
                                type="text"
                                placeholder="Search student or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-56 rounded-xl border border-[var(--color-line)] bg-white py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Custom Date Inputs if Range = Custom */}
                        {isCustomRange && (
                            <div className="flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-white px-3 py-1 text-xs">
                                <Calendar size={13} className="text-[var(--color-muted)] shrink-0" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="bg-transparent text-xs text-[var(--color-ink)] outline-none"
                                    aria-label="Date From"
                                />
                                <span className="text-slate-400">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="bg-transparent text-xs text-[var(--color-ink)] outline-none"
                                    aria-label="Date To"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Table Content */}
                {isLoading ? (
                    <div className="p-12 text-center text-xs text-[var(--color-muted)] animate-pulse">
                        Loading attendance records...
                    </div>
                ) : isError ? (
                    <div className="p-12 text-center">
                        <AlertCircle size={28} className="mx-auto text-rose-500 mb-2" />
                        <p className="text-xs font-medium text-slate-700">Failed to load attendance logs.</p>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="mt-2 text-xs text-[var(--color-accent)] underline font-medium"
                        >
                            Try again
                        </button>
                    </div>
                ) : !logs || logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Clock size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-[var(--color-ink)]">No attendance records found</p>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                            No interns have logged attendance for the selected time range or search filter.
                        </p>
                    </div>
                ) : viewMode === "summary" ? (
                    /* ── By Student view ── */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[var(--color-muted)]">
                            <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-600 border-b border-[var(--color-line)]">
                                <tr>
                                    <th className="px-6 py-3">Student</th>
                                    <th className="px-6 py-3">Dept &amp; Section</th>
                                    <th className="px-6 py-3">Days Present ({rangePeriodLabel})</th>
                                    <th className="px-6 py-3">Sessions</th>
                                    <th className="px-6 py-3">Total Hours</th>
                                    <th className="px-6 py-3">Last Session</th>
                                    <th className="px-6 py-3 text-center">Attendance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                {studentSummary.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-xs text-[var(--color-muted)]">
                                            No records for this period.
                                        </td>
                                    </tr>
                                ) : studentSummary.map((s) => {
                                    const latest = latestLogByStudent.get(s.student_id);
                                    return (
                                        <tr key={s.student_id} className="transition hover:bg-slate-50/70">
                                            <td className="px-6 py-3.5">
                                                <p className="font-semibold text-xs text-[var(--color-ink)]">{s.student_name}</p>
                                                <p className="font-mono text-[11px] text-[var(--color-muted)]">{s.student_number}</p>
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{s.course_code}</span>
                                                    <span className="text-[11px] text-[var(--color-muted)]">{s.section_code}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                                                    {s.days} {s.days === 1 ? "day" : "days"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 font-semibold text-[var(--color-ink)]">{s.sessions}</td>
                                            <td className="px-6 py-3.5 font-semibold text-emerald-700">{fmtDuration(s.total_minutes)}</td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                {latest ? (
                                                    <div>
                                                        <p className="font-medium text-[var(--color-ink)] text-[11px]">{fmtDate(latest.time_in)}</p>
                                                        <p className="text-[10px] text-[var(--color-muted)]">
                                                            {fmtTime(latest.time_in)}
                                                            {latest.time_out ? ` – ${fmtTime(latest.time_out)}` : (
                                                                <span className="ml-1 text-amber-600 font-semibold">In Progress</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                ) : "—"}
                                            </td>
                                            <td className="px-6 py-3.5 text-center whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSummaryStudent(s)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-3 py-1 text-[11px] font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-accent)] hover:text-white"
                                                >
                                                    <Eye size={12} />
                                                    View Attendance
                                                    <ChevronRight size={11} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* ── Logs view ── */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[var(--color-muted)]">
                            <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-600 border-b border-[var(--color-line)]">
                                <tr>
                                    <th className="px-6 py-3">Student</th>
                                    <th className="px-6 py-3">Dept &amp; Section</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Time In</th>
                                    <th className="px-6 py-3">Break Out / In</th>
                                    <th className="px-6 py-3">Time Out</th>
                                    <th className="px-6 py-3">Duration</th>
                                    <th className="px-6 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                {logs.map((record) => (
                                    <tr key={record.id} className="transition hover:bg-slate-50/70">
                                        <td className="px-6 py-3.5">
                                            <p className="font-semibold text-xs text-[var(--color-ink)]">
                                                {record.student_name}
                                            </p>
                                            <p className="font-mono text-[11px] text-[var(--color-muted)]">
                                                {record.student_number}
                                            </p>
                                        </td>

                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                                    {record.course_code}
                                                </span>
                                                <span className="text-[11px] text-[var(--color-muted)]">
                                                    {record.section_code}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-3.5 whitespace-nowrap font-medium">
                                            {fmtDate(record.time_in)}
                                        </td>

                                        <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-800">
                                            {fmtTime(record.time_in)}
                                        </td>

                                        <td className="px-6 py-3.5 whitespace-nowrap text-[11px]">
                                            {record.break_out ? (
                                                <span>
                                                    {fmtTime(record.break_out)} - {fmtTime(record.break_in)}
                                                </span>
                                            ) : (
                                                <span className="italic text-slate-400">—</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-3.5 whitespace-nowrap font-medium">
                                            {record.time_out ? (
                                                <span className="text-slate-800">{fmtTime(record.time_out)}</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                                    In Progress
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-3.5 whitespace-nowrap font-semibold">
                                            {fmtDuration(record.duration_minutes)}
                                        </td>

                                        <td className="px-6 py-3.5 text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTimeLogId(record.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink)] shadow-2xs transition hover:bg-slate-100 hover:text-[var(--color-accent)]"
                                            >
                                                <Eye size={13} />
                                                View Record
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Time Log Details Modal */}
            <TimeLogDetails
                timeLogId={selectedTimeLogId}
                visible={Boolean(selectedTimeLogId)}
                onClose={() => setSelectedTimeLogId(null)}
            />

            {/* Student Attendance Detail Modal */}
            {selectedSummaryStudent && (
                <StudentAttendanceModal
                    student={selectedSummaryStudent}
                    onClose={() => setSelectedSummaryStudent(null)}
                    onViewRecord={(id) => {
                        setSelectedSummaryStudent(null);
                        setSelectedTimeLogId(id);
                    }}
                />
            )}
        </section>
    );
}