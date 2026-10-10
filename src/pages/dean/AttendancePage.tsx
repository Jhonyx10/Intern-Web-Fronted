import { useState } from "react";
import {
    Clock,
    Calendar,
    Search,
    CheckCircle2,
    AlertCircle,
    Eye,
    Users,
    Timer,
    X,
} from "lucide-react";
import { useAttendanceMonitoring } from "@/lib/queries/attendance";
import { TimeLogDetails } from "@/components/modal/TimeLogDetails";
import { useAuth } from "@/lib/auth";

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

export default function AttendancePage() {
    const { token, user } = useAuth();
    const [range, setRange] = useState<"today" | "week" | "month" | "custom">("today");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedTimeLogId, setSelectedTimeLogId] = useState<number | null>(null);

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

    return (
        <section className="space-y-6">
            {/* Top Banner */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                        <Clock size={14} />
                        <span>{userRoleLabel} Portal</span>
                    </div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">
                        Interns Attendance Monitoring
                    </h1>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        Track daily, weekly, and monthly attendance time logs and verification records.
                    </p>
                </div>

                {/* Quick Range Tabs */}
                <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-white p-1 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setRange("today")}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${range === "today"
                            ? "bg-[var(--color-accent)] text-white shadow-xs"
                            : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                            }`}
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={() => setRange("week")}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${range === "week"
                            ? "bg-[var(--color-accent)] text-white shadow-xs"
                            : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                            }`}
                    >
                        This Week
                    </button>
                    <button
                        type="button"
                        onClick={() => setRange("month")}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${range === "month"
                            ? "bg-[var(--color-accent)] text-white shadow-xs"
                            : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                            }`}
                    >
                        This Month
                    </button>
                    <button
                        type="button"
                        onClick={() => setRange("custom")}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${range === "custom"
                            ? "bg-[var(--color-accent)] text-white shadow-xs"
                            : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                            }`}
                    >
                        Custom
                    </button>
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
                            Attendance Time Logs
                        </h2>
                        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {totalLogs}
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
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[var(--color-muted)]">
                            <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-600 border-b border-[var(--color-line)]">
                                <tr>
                                    <th className="px-6 py-3">Student</th>
                                    <th className="px-6 py-3">Dept & Section</th>
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

            {/* Time Log Details Modal Integration */}
            <TimeLogDetails
                timeLogId={selectedTimeLogId}
                visible={Boolean(selectedTimeLogId)}
                onClose={() => setSelectedTimeLogId(null)}
            />
        </section>
    );
}
