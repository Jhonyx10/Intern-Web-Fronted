import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    AlertCircle,
    Award,
    BarChart3,
    Building2,
    CalendarCheck,
    CalendarX,
    Camera,
    ClipboardCheck,
    Clock,
    Download,
    FileSpreadsheet,
    FileText,
    FileWarning,
    GraduationCap,
    Hourglass,
    Loader2,
    LogOut,
    MapPin,
    Pencil,
    Search,
    Send,
    ShieldCheck,
    TrendingUp,
    UserMinus,
    Users,
    UserX,
    X,
    type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
    useReport,
    useReportOptions,
    type AttendanceSummaryRow,
    type DtrStudent,
    type EvaluationRow,
    type AbsenteeRow,
    type CompletionRow,
    type FaceScoreRow,
    type FollowUpRow,
    type GeofenceRow,
    type MissedPunchOutRow,
    type NearingRow,
    type PunctualityRow,
    type SectionSummaryRow,
    type WeekStatus,
    type WeeklyReport,
    type HoursRow,
    type ManualLogRow,
    type PlacementRow,
    type ReportFilters,
    type ScheduleRequestRow,
    type UnassignedRow,
    type VerificationRow,
    type WorkloadRow,
    type RequirementStatus,
    type RequirementsReport,
} from "@/lib/queries/reports";
import { buildTablePDF, exportTableCSV, type ExportTable } from "@/lib/table-export";
import { buildBulkDTRPDF, formatDuration } from "@/lib/exportDtr";
import { loadPdfBranding, type PdfScope } from "@/lib/pdf-branding";
import { usePdfPreview } from "@/components/modal/PdfPreviewModal";
import { useTheme } from "@/context/ThemeContext";
import OCCLOGO from "@/assets/OCC logo.webp";

/* ─────────────────────────── helpers ─────────────────────────── */

export function toISODate(d: Date) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

function parseISODate(s: string): Date | null {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
}

export function fmtDate(s: string | null) {
    const d = s ? parseISODate(s.slice(0, 10)) : null;
    return d
        ? d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
        : "—";
}

/** "HH:MM[:SS]" schedule string -> "8:00 AM" */
function fmt12(t: string | null) {
    const m = t?.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return "—";
    const h = Number(m[1]);
    return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}

/** ISO timestamp -> "10:21 AM" */
function fmtClock(iso: string | null) {
    return iso
        ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "—";
}

/** seconds -> "1m 44s" */
function fmtSeconds(s: number | null) {
    if (s == null) return "—";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

/** ISO timestamp -> local calendar date, as "Nov 17, 2026" */
function fmtDay(iso: string | null) {
    return iso
        ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
        : "—";
}

export const thisMonth = () => {
    const now = new Date();
    return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(now) };
};

export const lastMonth = () => {
    const now = new Date();
    return {
        from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
};

/* ─────────────────────────── report registry ─────────────────────────── */

type ReportKey =
    | "dtr"
    | "hours"
    | "attendance"
    | "requirements"
    | "evaluations"
    | "placements"
    | "unassigned"
    | "workload"
    | "schedules"
    | "verification"
    | "manual"
    | "face"
    | "completion"
    | "nearing"
    | "weekly"
    | "followups"
    | "absentees"
    | "punctuality"
    | "missed"
    | "geofence"
    | "sections";

type ReportDef = {
    key: ReportKey;
    group: string;
    title: string;
    description: string;
    icon: LucideIcon;
    path: string;
    usesDates: boolean;
};

const REPORTS: ReportDef[] = [
    {
        key: "sections",
        group: "Summary",
        title: "Department & section summary",
        description: "Completion, absences, lateness and documents per section.",
        icon: BarChart3,
        path: "section-summary",
        usesDates: true,
    },
    {
        key: "dtr",
        group: "Attendance",
        title: "Daily Time Record",
        description: "Print DTRs for many interns in one PDF.",
        icon: FileText,
        path: "dtr",
        usesDates: true,
    },
    {
        key: "hours",
        group: "Attendance",
        title: "Hours progress",
        description: "Rendered vs. required hours per intern.",
        icon: TrendingUp,
        path: "hours-progress",
        usesDates: false,
    },
    {
        key: "attendance",
        group: "Attendance",
        title: "Attendance & absences",
        description: "Days present, hours, absences, late logs, missed punch-outs.",
        icon: CalendarX,
        path: "attendance-summary",
        usesDates: true,
    },
    {
        key: "punctuality",
        group: "Attendance",
        title: "Punctuality",
        description: "Early, on-time and late logs per intern.",
        icon: Clock,
        path: "punctuality",
        usesDates: true,
    },
    {
        key: "missed",
        group: "Attendance",
        title: "Missed punch-outs",
        description: "Open or auto-closed logs that need action.",
        icon: LogOut,
        path: "missed-punch-outs",
        usesDates: false,
    },
    {
        key: "requirements",
        group: "Compliance",
        title: "Requirements matrix",
        description: "Document status for every intern at a glance.",
        icon: ClipboardCheck,
        path: "requirements",
        usesDates: false,
    },
    {
        key: "weekly",
        group: "Compliance",
        title: "Weekly report submissions",
        description: "Who submitted, who is missing, week by week.",
        icon: CalendarCheck,
        path: "weekly-submissions",
        usesDates: true,
    },
    {
        key: "followups",
        group: "Compliance",
        title: "Document follow-ups",
        description: "Rejected and missing documents to chase.",
        icon: FileWarning,
        path: "document-followups",
        usesDates: false,
    },
    {
        key: "absentees",
        group: "Compliance",
        title: "Frequent absentees",
        description: "Interns with many absences in the period.",
        icon: UserX,
        path: "frequent-absentees",
        usesDates: true,
    },
    {
        key: "evaluations",
        group: "Evaluations",
        title: "Evaluation results",
        description: "Scores and pending evaluations.",
        icon: Award,
        path: "evaluations",
        usesDates: false,
    },
    {
        key: "completion",
        group: "Completion",
        title: "Completion & clearance",
        description: "Interns who finished their hours, and what blocks clearance.",
        icon: GraduationCap,
        path: "completion",
        usesDates: false,
    },
    {
        key: "nearing",
        group: "Completion",
        title: "Nearing completion",
        description: "10% or less of the required hours left.",
        icon: Hourglass,
        path: "nearing-completion",
        usesDates: false,
    },
    {
        key: "placements",
        group: "Placements",
        title: "Intern distribution",
        description: "Interns and supervisors per company.",
        icon: Building2,
        path: "placements",
        usesDates: false,
    },
    {
        key: "unassigned",
        group: "Placements",
        title: "Unassigned & removed interns",
        description: "Interns with no active placement, and why.",
        icon: UserMinus,
        path: "unassigned",
        usesDates: false,
    },
    {
        key: "workload",
        group: "Placements",
        title: "Supervisor workload",
        description: "Interns and pending work per supervisor.",
        icon: Users,
        path: "supervisor-workload",
        usesDates: false,
    },
    {
        key: "schedules",
        group: "Placements",
        title: "Schedule requests",
        description: "Requests by status, with decision time.",
        icon: Send,
        path: "schedule-requests",
        usesDates: true,
    },
    {
        key: "verification",
        group: "Audit",
        title: "Verification methods",
        description: "Face-verified vs. manual or corrected logs.",
        icon: ShieldCheck,
        path: "verification",
        usesDates: true,
    },
    {
        key: "manual",
        group: "Audit",
        title: "Manual & corrected logs",
        description: "Supervisor-created, corrected and auto-closed logs.",
        icon: Pencil,
        path: "manual-logs",
        usesDates: true,
    },
    {
        key: "face",
        group: "Audit",
        title: "Face match scores",
        description: "Punches that only just passed the face check.",
        icon: Camera,
        path: "face-scores",
        usesDates: true,
    },
    {
        key: "geofence",
        group: "Audit",
        title: "Geofence excursions",
        description: "Times an intern left the company area, and for how long.",
        icon: MapPin,
        path: "geofence",
        usesDates: true,
    },
];

export type ReportGroup =
    | "Summary"
    | "Attendance"
    | "Compliance"
    | "Evaluations"
    | "Completion"
    | "Placements"
    | "Audit";

/** Heading and blurb shown at the top of each category page */
const GROUP_META: Record<ReportGroup, { title: string; description: string }> = {
    Summary: {
        title: "Summary Reports",
        description: "Department and section totals. Preview and export.",
    },
    Attendance: {
        title: "Attendance Reports",
        description: "Pick a report, narrow it down, then preview and export it.",
    },
    Compliance: {
        title: "Compliance Reports",
        description: "Documents, weekly submissions and absences. Preview and export.",
    },
    Evaluations: {
        title: "Evaluation Reports",
        description: "Evaluation scores and pending evaluations. Preview and export.",
    },
    Completion: {
        title: "Completion Reports",
        description: "Who finished their hours and who is close. Preview and export.",
    },
    Placements: {
        title: "Placement Reports",
        description: "Company distribution, supervisors and schedule requests. Preview and export.",
    },
    Audit: {
        title: "Audit Reports",
        description: "Verification, manual logs, face scores and geofence excursions.",
    },
};

/* ─────────────────────────── small UI pieces ─────────────────────────── */

const TONES = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    red: "bg-rose-50 text-rose-700 ring-rose-600/20",
    blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
    gray: "bg-slate-100 text-slate-500 ring-slate-500/10",
};

export function Pill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone]}`}
        >
            {children}
        </span>
    );
}

const HOURS_STATUS = {
    completed: { label: "Completed", tone: "green" },
    in_progress: { label: "In progress", tone: "blue" },
    not_started: { label: "Not started", tone: "gray" },
} as const;

const REQ_STATUS: Record<RequirementStatus, { label: string; tone: keyof typeof TONES }> = {
    approved: { label: "Approved", tone: "green" },
    uploaded: { label: "Uploaded", tone: "blue" },
    rejected: { label: "Rejected", tone: "red" },
    pending: { label: "Pending", tone: "amber" },
    "n/a": { label: "—", tone: "gray" },
};

const EVAL_STATUS = {
    submitted: { label: "Submitted", tone: "green" },
    pending: { label: "Pending", tone: "amber" },
    none: { label: "Not assigned", tone: "gray" },
} as const;

export function StudentCell({ name, number }: { name: string; number: string }) {
    return (
        <div>
            <p className="font-semibold text-[var(--color-ink)]">{name}</p>
            <p className="font-mono text-[11px] text-[var(--color-muted)]">{number}</p>
        </div>
    );
}

export type Col<T> = {
    header: string;
    /** Plain value, used for CSV / PDF export */
    value: (row: T) => string | number;
    /** Optional richer cell for the on-screen table */
    cell?: (row: T) => ReactNode;
};

export function DataTable<T,>({
    cols,
    rows,
    rowClass,
}: {
    cols: Col<T>[];
    rows: T[];
    /** Extra classes per row, e.g. to highlight a totals row */
    rowClass?: (row: T) => string;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--color-muted)]">
                <thead className="border-b border-[var(--color-line)] bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
                    <tr>
                        {cols.map((c) => (
                            <th key={c.header} className="whitespace-nowrap px-5 py-3">
                                {c.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                    {rows.map((r, i) => (
                        <tr key={i} className={`transition hover:bg-slate-50/70 ${rowClass?.(r) ?? ""}`}>
                            {cols.map((c) => (
                                <td key={c.header} className="whitespace-nowrap px-5 py-3">
                                    {c.cell ? c.cell(r) : c.value(r)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Shows exactly what will be in the CSV file, with a Download button. */
export function CsvPreviewModal({ table, onClose }: { table: ExportTable | null; onClose: () => void }) {
    useEffect(() => {
        if (!table) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [table, onClose]);

    if (!table) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-900">CSV preview</h2>
                        <p className="truncate text-xs text-slate-500">
                            {table.fileName}.csv · {table.rows.length} rows
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => exportTableCSV(table)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                        >
                            <Download className="h-3.5 w-3.5" /> Download
                        </button>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
                            <tr>
                                {table.headers.map((h) => (
                                    <th key={h} className="whitespace-nowrap border-b px-4 py-2.5">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-800">
                            {table.rows.map((r, i) => (
                                <tr key={i}>
                                    {r.map((c, j) => (
                                        <td key={j} className="whitespace-nowrap px-4 py-2">
                                            {c}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export const selectClass =
    "rounded-xl border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]";

export const outlineBtn =
    "inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export const solidBtn =
    "inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/* ─────────────────────────── column definitions ─────────────────────────── */

const hoursCols: Col<HoursRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    { header: "Company", value: (r) => r.company ?? "—" },
    { header: "Required (hrs)", value: (r) => r.required_hours ?? "—" },
    { header: "Rendered (hrs)", value: (r) => r.rendered_hours },
    { header: "Remaining (hrs)", value: (r) => r.remaining_hours ?? "—" },
    {
        header: "Progress",
        value: (r) => `${r.percent}%`,
        cell: (r) => (
            <div className="flex min-w-[110px] items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                    <div
                        style={{ width: `${r.percent}%` }}
                        className={`h-full rounded-full ${r.percent >= 100 ? "bg-emerald-500" : "bg-[var(--color-accent)]"}`}
                    />
                </div>
                <span className="font-semibold tabular-nums">{r.percent}%</span>
            </div>
        ),
    },
    { header: "Last log", value: (r) => fmtDate(r.last_log_at) },
    {
        header: "Status",
        value: (r) => HOURS_STATUS[r.status].label,
        cell: (r) => <Pill tone={HOURS_STATUS[r.status].tone}>{HOURS_STATUS[r.status].label}</Pill>,
    },
];

const attendanceCols: Col<AttendanceSummaryRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    { header: "Company", value: (r) => r.company ?? "—" },
    { header: "Days present", value: (r) => r.days_present },
    { header: "Total time", value: (r) => formatDuration(r.total_minutes) },
    { header: "Absences filed", value: (r) => r.absences_filed },
    {
        header: "Awaiting justification",
        value: (r) => r.absences_awaiting,
        cell: (r) =>
            r.absences_awaiting > 0 ? <Pill tone="amber">{r.absences_awaiting}</Pill> : 0,
    },
    {
        header: "Missed punch-outs",
        value: (r) => r.missed_punch_outs,
        cell: (r) => (r.missed_punch_outs > 0 ? <Pill tone="red">{r.missed_punch_outs}</Pill> : 0),
    },
    {
        header: "Late logs",
        value: (r) => r.late_logs,
        cell: (r) => (r.late_logs > 0 ? <Pill tone="amber">{r.late_logs}</Pill> : 0),
    },
];

const evaluationCols: Col<EvaluationRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    { header: "Company", value: (r) => r.company ?? "—" },
    { header: "Evaluation", value: (r) => r.evaluation ?? "—" },
    {
        header: "Status",
        value: (r) => EVAL_STATUS[r.status]?.label ?? r.status,
        cell: (r) => (
            <Pill tone={EVAL_STATUS[r.status]?.tone ?? "gray"}>
                {EVAL_STATUS[r.status]?.label ?? r.status}
            </Pill>
        ),
    },
    { header: "Score", value: (r) => r.computed_score ?? "—" },
    { header: "Submitted", value: (r) => fmtDate(r.submitted_at) },
];

/* ── Placements ── */

const placementCols: Col<PlacementRow>[] = [
    {
        header: "Company",
        value: (r) => r.company,
        cell: (r) => <span className="font-semibold">{r.company}</span>,
    },
    { header: "Address", value: (r) => r.address ?? "—" },
    { header: "Active interns", value: (r) => r.active_interns },
    { header: "Removed / ended", value: (r) => r.inactive_interns },
    { header: "Supervisors", value: (r) => r.supervisors || "—" },
];

const UNASSIGNED_STATUS = {
    unassigned: { label: "Never placed", tone: "amber" },
    removed: { label: "Removed", tone: "red" },
    ended: { label: "Placement ended", tone: "gray" },
} as const;

const unassignedCols: Col<UnassignedRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    {
        header: "Status",
        value: (r) => UNASSIGNED_STATUS[r.status].label,
        cell: (r) => (
            <Pill tone={UNASSIGNED_STATUS[r.status].tone}>{UNASSIGNED_STATUS[r.status].label}</Pill>
        ),
    },
    { header: "Last company", value: (r) => r.last_company ?? "—" },
    {
        header: "Reason",
        value: (r) => r.reason ?? "—",
        cell: (r) => (
            <span className="block max-w-[260px] truncate" title={r.reason ?? undefined}>
                {r.reason ?? "—"}
            </span>
        ),
    },
    { header: "Date", value: (r) => fmtDate(r.date) },
];

const workloadCols: Col<WorkloadRow>[] = [
    {
        header: "Supervisor",
        value: (r) => r.supervisor ?? "—",
        cell: (r) => (
            <div>
                <p className="font-semibold text-[var(--color-ink)]">{r.supervisor ?? "—"}</p>
                <p className="text-[11px] text-[var(--color-muted)]">{r.email ?? ""}</p>
            </div>
        ),
    },
    { header: "Company", value: (r) => r.company ?? "—" },
    { header: "Position", value: (r) => r.position_title ?? "—" },
    { header: "Directly assigned", value: (r) => r.assigned_interns },
    { header: "Company interns", value: (r) => r.company_interns },
    {
        header: "Pending schedule requests",
        value: (r) => r.pending_schedules,
        cell: (r) => (r.pending_schedules > 0 ? <Pill tone="amber">{r.pending_schedules}</Pill> : 0),
    },
    {
        header: "Logs to fix",
        value: (r) => r.logs_to_fix,
        cell: (r) => (r.logs_to_fix > 0 ? <Pill tone="red">{r.logs_to_fix}</Pill> : 0),
    },
];

const SCHEDULE_STATUS = {
    approved: { label: "Approved", tone: "green" },
    rejected: { label: "Rejected", tone: "red" },
    pending: { label: "Pending", tone: "amber" },
} as const;

const scheduleCols: Col<ScheduleRequestRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Company", value: (r) => r.company ?? "—" },
    { header: "Requested", value: (r) => fmtDate(r.requested_at) },
    { header: "Start date", value: (r) => fmtDate(r.start_date) },
    { header: "Time", value: (r) => `${fmt12(r.time_in)} – ${fmt12(r.time_out)}` },
    { header: "Hrs/day", value: (r) => r.hours_per_day ?? "—" },
    { header: "Days/week", value: (r) => r.days_per_week ?? "—" },
    {
        header: "Reason",
        value: (r) => r.reason ?? "—",
        cell: (r) => (
            <span className="block max-w-[220px] truncate" title={r.reason ?? undefined}>
                {r.reason ?? "—"}
            </span>
        ),
    },
    {
        header: "Status",
        value: (r) => SCHEDULE_STATUS[r.status]?.label ?? r.status,
        cell: (r) => (
            <Pill tone={SCHEDULE_STATUS[r.status]?.tone ?? "gray"}>
                {SCHEDULE_STATUS[r.status]?.label ?? r.status}
            </Pill>
        ),
    },
    {
        header: "Decision time",
        value: (r) => (r.turnaround_days != null ? `${r.turnaround_days} days` : "—"),
    },
];

/* ── Audit ── */

const verificationCols: Col<VerificationRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    { header: "Total logs", value: (r) => r.total_logs },
    { header: "Face verified", value: (r) => r.face_verified },
    { header: "Supervisor created", value: (r) => r.supervisor_created },
    { header: "Supervisor corrected", value: (r) => r.supervisor_corrected },
    { header: "Auto-closed", value: (r) => r.auto_closed },
    { header: "Other", value: (r) => r.other },
    {
        header: "Face verified %",
        value: (r) => `${r.face_percent}%`,
        cell: (r) => (
            <Pill tone={r.face_percent >= 90 ? "green" : r.face_percent >= 60 ? "amber" : "red"}>
                {r.face_percent}%
            </Pill>
        ),
    },
];

const MANUAL_TYPE = {
    supervisor_created: { label: "Supervisor created", tone: "blue" },
    supervisor_corrected: { label: "Supervisor corrected", tone: "amber" },
    auto_closed_missed_punch_out: { label: "Auto-closed", tone: "red" },
} as const;

const manualCols: Col<ManualLogRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Company", value: (r) => r.company ?? "—" },
    { header: "Date", value: (r) => fmtDay(r.time_in) },
    { header: "In", value: (r) => fmtClock(r.time_in) },
    { header: "Out", value: (r) => fmtClock(r.time_out) },
    {
        header: "Duration",
        value: (r) => (r.duration_minutes != null ? formatDuration(r.duration_minutes) : "—"),
    },
    {
        header: "Type",
        value: (r) => MANUAL_TYPE[r.type]?.label ?? r.type,
        cell: (r) => (
            <Pill tone={MANUAL_TYPE[r.type]?.tone ?? "gray"}>{MANUAL_TYPE[r.type]?.label ?? r.type}</Pill>
        ),
    },
    {
        header: "Reason",
        value: (r) => r.reason ?? "—",
        cell: (r) => (
            <span className="block max-w-[260px] truncate" title={r.reason ?? undefined}>
                {r.reason ?? "—"}
            </span>
        ),
    },
];

const faceCols: Col<FaceScoreRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Date", value: (r) => fmtDay(r.time_in) },
    { header: "Time", value: (r) => fmtClock(r.time_in) },
    { header: "Score (lower is better)", value: (r) => r.score },
    { header: "Limit", value: (r) => r.limit },
    { header: "Margin", value: (r) => r.margin },
    {
        header: "% of limit",
        value: (r) => `${r.closeness}%`,
        cell: (r) => (
            <Pill tone={r.closeness >= 95 ? "red" : r.closeness >= 88 ? "amber" : "blue"}>
                {r.closeness}%
            </Pill>
        ),
    },
];

const EXCURSION_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
    completed: { label: "Returned", tone: "green" },
    ongoing: { label: "Still outside", tone: "red" },
    open: { label: "Still outside", tone: "red" },
};

const geofenceCols: Col<GeofenceRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Company", value: (r) => r.company ?? "—" },
    { header: "Date", value: (r) => fmtDay(r.exit_at) },
    { header: "Left at", value: (r) => fmtClock(r.exit_at) },
    { header: "Returned at", value: (r) => fmtClock(r.return_at) },
    {
        header: "Time outside",
        value: (r) => fmtSeconds(r.duration_seconds),
        cell: (r) => (
            <Pill tone={(r.duration_seconds ?? 0) >= 900 ? "red" : (r.duration_seconds ?? 0) >= 300 ? "amber" : "blue"}>
                {fmtSeconds(r.duration_seconds)}
            </Pill>
        ),
    },
    { header: "Max distance", value: (r) => (r.max_distance_m != null ? `${r.max_distance_m} m` : "—") },
    {
        header: "Status",
        value: (r) => EXCURSION_STATUS[r.status]?.label ?? r.status,
        cell: (r) => (
            <Pill tone={EXCURSION_STATUS[r.status]?.tone ?? "gray"}>
                {EXCURSION_STATUS[r.status]?.label ?? r.status}
            </Pill>
        ),
    },
    {
        header: "Reason",
        value: (r) => r.reason ?? "—",
        cell: (r) => (
            <span className="block max-w-[260px] truncate" title={r.reason ?? undefined}>
                {r.reason ?? "—"}
            </span>
        ),
    },
];

/* ── Completion ── */

const completionCols: Col<CompletionRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    { header: "Company", value: (r) => r.company ?? "—" },
    { header: "Required (hrs)", value: (r) => r.required_hours },
    { header: "Rendered (hrs)", value: (r) => r.rendered_hours },
    { header: "Completed on", value: (r) => fmtDate(r.completed_on) },
    { header: "Documents approved", value: (r) => `${r.docs_approved}/${r.docs_total}` },
    { header: "Evaluations pending", value: (r) => r.evaluations_pending },
    {
        header: "Clearance",
        value: (r) => (r.clearance_ready ? "Ready" : "Not ready"),
        cell: (r) =>
            r.clearance_ready ? <Pill tone="green">Ready</Pill> : <Pill tone="amber">Not ready</Pill>,
    },
    {
        header: "Blockers",
        value: (r) => r.blockers || "—",
        cell: (r) => (
            <span className="block max-w-[260px] truncate" title={r.blockers || undefined}>
                {r.blockers || "—"}
            </span>
        ),
    },
];

const nearingCols: Col<NearingRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    { header: "Company", value: (r) => r.company ?? "—" },
    { header: "Required (hrs)", value: (r) => r.required_hours },
    { header: "Rendered (hrs)", value: (r) => r.rendered_hours },
    { header: "Remaining (hrs)", value: (r) => r.remaining_hours },
    {
        header: "Progress",
        value: (r) => `${r.percent}%`,
        cell: (r) => (
            <div className="flex min-w-[110px] items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                    <div
                        style={{ width: `${r.percent}%` }}
                        className="h-full rounded-full bg-[var(--color-accent)]"
                    />
                </div>
                <span className="font-semibold tabular-nums">{r.percent}%</span>
            </div>
        ),
    },
    { header: "Avg hrs/day (30 days)", value: (r) => r.avg_hours_per_day ?? "—" },
    { header: "Est. finish", value: (r) => fmtDate(r.est_finish) },
    { header: "Last log", value: (r) => fmtDate(r.last_log_at) },
];

/* ── Compliance ── */

const WEEK_STATUS: Record<WeekStatus, { label: string; tone: keyof typeof TONES }> = {
    approved: { label: "Approved", tone: "green" },
    uploaded: { label: "Submitted", tone: "blue" },
    rejected: { label: "Rejected", tone: "amber" },
    missing: { label: "Missing", tone: "red" },
    upcoming: { label: "—", tone: "gray" },
};

const FOLLOWUP_ISSUE = {
    missing: { label: "Missing", tone: "red" },
    rejected: { label: "Rejected", tone: "amber" },
} as const;

const followUpCols: Col<FollowUpRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    { header: "Requirement", value: (r) => r.requirement ?? "—" },
    { header: "Type", value: (r) => (r.schedule === "weekly" ? "Weekly" : "One-time") },
    { header: "Week of", value: (r) => (r.period ? fmtDate(r.period) : "—") },
    {
        header: "Issue",
        value: (r) => FOLLOWUP_ISSUE[r.issue].label,
        cell: (r) => <Pill tone={FOLLOWUP_ISSUE[r.issue].tone}>{FOLLOWUP_ISSUE[r.issue].label}</Pill>,
    },
    {
        header: "Reason",
        value: (r) => r.reason ?? "—",
        cell: (r) => (
            <span className="block max-w-[260px] truncate" title={r.reason ?? undefined}>
                {r.reason ?? "—"}
            </span>
        ),
    },
    { header: "Last upload", value: (r) => fmtDay(r.uploaded_at) },
];

const absenteeCols: Col<AbsenteeRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    { header: "Company", value: (r) => r.company ?? "—" },
    {
        header: "Absences",
        value: (r) => r.total_absences,
        cell: (r) => <Pill tone={r.total_absences >= 5 ? "red" : "amber"}>{r.total_absences}</Pill>,
    },
    { header: "Filed", value: (r) => r.filed },
    { header: "With proof", value: (r) => r.filed_with_proof },
    {
        header: "Awaiting justification",
        value: (r) => r.awaiting,
        cell: (r) => (r.awaiting > 0 ? <Pill tone="amber">{r.awaiting}</Pill> : 0),
    },
    { header: "Dates", value: (r) => r.dates },
];

/* ── Punctuality, missed punch-outs, section summary ── */

const punctualityCols: Col<PunctualityRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    { header: "Total logs", value: (r) => r.total_logs },
    { header: "Early", value: (r) => r.early },
    { header: "On time", value: (r) => r.on_time },
    {
        header: "Late",
        value: (r) => r.late,
        cell: (r) => (r.late > 0 ? <Pill tone="amber">{r.late}</Pill> : 0),
    },
    { header: "Unrecorded", value: (r) => r.unrecorded },
    {
        header: "Late %",
        value: (r) => `${r.late_percent}%`,
        cell: (r) => (
            <Pill tone={r.late_percent >= 30 ? "red" : r.late_percent >= 10 ? "amber" : "green"}>
                {r.late_percent}%
            </Pill>
        ),
    },
];

const MISSED_STATUS = {
    open: { label: "Still open", tone: "red" },
    no_reason: { label: "Auto-closed · no reason", tone: "amber" },
    reason_filed: { label: "Auto-closed · reason filed", tone: "blue" },
    corrected: { label: "Corrected", tone: "green" },
} as const;

const missedCols: Col<MissedPunchOutRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Company", value: (r) => r.company ?? "—" },
    { header: "Date", value: (r) => fmtDay(r.time_in) },
    { header: "In", value: (r) => fmtClock(r.time_in) },
    { header: "Out", value: (r) => fmtClock(r.time_out) },
    {
        header: "Status",
        value: (r) => MISSED_STATUS[r.status]?.label ?? r.status,
        cell: (r) => (
            <Pill tone={MISSED_STATUS[r.status]?.tone ?? "gray"}>
                {MISSED_STATUS[r.status]?.label ?? r.status}
            </Pill>
        ),
    },
    { header: "Days waiting", value: (r) => r.days_waiting ?? "—" },
    {
        header: "Reason",
        value: (r) => r.reason ?? "—",
        cell: (r) => (
            <span className="block max-w-[220px] truncate" title={r.reason ?? undefined}>
                {r.reason ?? "—"}
            </span>
        ),
    },
    {
        header: "System note",
        value: (r) => r.system_note ?? "—",
        cell: (r) => (
            <span className="block max-w-[220px] truncate" title={r.system_note ?? undefined}>
                {r.system_note ?? "—"}
            </span>
        ),
    },
];

const pct = (v: number | null) => (v == null ? "—" : `${v}%`);

const sectionCols: Col<SectionSummaryRow>[] = [
    { header: "Course", value: (r) => r.course_code ?? "—" },
    { header: "Section", value: (r) => r.section },
    { header: "Coordinator", value: (r) => r.coordinator ?? "—" },
    { header: "Interns", value: (r) => r.interns },
    { header: "Placed", value: (r) => r.placed },
    { header: "Completed", value: (r) => r.completed },
    { header: "Completion rate", value: (r) => pct(r.completion_rate) },
    { header: "Avg progress", value: (r) => pct(r.avg_progress) },
    { header: "Absences", value: (r) => r.absences },
    { header: "Absence rate", value: (r) => pct(r.absence_rate) },
    { header: "Late rate", value: (r) => pct(r.late_rate) },
    { header: "Docs compliance", value: (r) => pct(r.docs_compliance) },
];

/**
 * Columns for every table report except the requirements matrix and the weekly
 * report (their columns come from the data).
 * Must stay BELOW every *Cols definition above, because it reads them at load time.
 */
const TABLE_COLS: Partial<Record<ReportKey, Col<any>[]>> = {
    hours: hoursCols,
    attendance: attendanceCols,
    evaluations: evaluationCols,
    placements: placementCols,
    unassigned: unassignedCols,
    workload: workloadCols,
    schedules: scheduleCols,
    verification: verificationCols,
    manual: manualCols,
    face: faceCols,
    completion: completionCols,
    nearing: nearingCols,
    followups: followUpCols,
    absentees: absenteeCols,
    punctuality: punctualityCols,
    missed: missedCols,
    geofence: geofenceCols,
    sections: sectionCols,
};

/* ─────────────────────────── page ─────────────────────────── */

export default function ReportsCategoryPage({ group }: { group: ReportGroup }) {
    const { token, user } = useAuth();
    const { logoUrl } = useTheme();
    const { show, modal } = usePdfPreview("Report preview");
    const [csvPreview, setCsvPreview] = useState<ExportTable | null>(null);
    const [courseId, setCourseId] = useState("");
    const { data: options } = useReportOptions(token, { course_id: courseId || undefined });

    // Only the reports that belong to this page's category
    const groupReports = useMemo(() => REPORTS.filter((r) => r.group === group), [group]);
    const [reportKey, setReportKey] = useState<ReportKey>(groupReports[0].key);
    const def = REPORTS.find((r) => r.key === reportKey)!;

    const [sectionId, setSectionId] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState(() => thisMonth().from);
    const [dateTo, setDateTo] = useState(() => thisMonth().to);
    const [minAbsences, setMinAbsences] = useState("3");
    const [missedView, setMissedView] = useState<"open" | "all">("open");

    // Bulk DTR: interns the user unticked (everyone is ticked by default)
    const [excluded, setExcluded] = useState<Set<number>>(new Set());

    const invalidRange = def.usesDates && Boolean(dateFrom && dateTo && dateFrom > dateTo);

    const filters = useMemo<ReportFilters>(
        () => ({
            min: reportKey === "absentees" ? minAbsences : undefined,
            status: reportKey === "missed" && missedView === "all" ? "all" : undefined,
            course_id: courseId || undefined,
            section_id: sectionId || undefined,
            company_id: companyId || undefined,
            search: search.trim() || undefined,
            date_from: def.usesDates ? dateFrom || undefined : undefined,
            date_to: def.usesDates ? dateTo || undefined : undefined,
        }),
        [
            reportKey,
            minAbsences,
            missedView,
            courseId,
            sectionId,
            companyId,
            search,
            dateFrom,
            dateTo,
            def.usesDates,
        ]
    );

    const query = useReport<{ data: unknown[]; columns?: { id: number | string; title: string }[] }>(
        def.path,
        filters,
        token,
        !invalidRange
    );

    const rows = (query.data?.data ?? []) as unknown[];

    /* subtitle used in exported files */
    const subtitle = useMemo(() => {
        const parts: string[] = [];
        if (def.usesDates && dateFrom && dateTo) parts.push(`${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`);
        const sec = options?.sections.find((s) => String(s.id) === sectionId);
        const comp = options?.companies.find((c) => String(c.id) === companyId);
        // Coordinator and super admin exports already print course/section under the school name
        if (options?.scope_type === "dean" && sec) parts.push(sec.name);
        if (comp) parts.push(comp.name);
        if (reportKey === "missed" && missedView === "all") parts.push("Including corrected");
        if (search.trim()) parts.push(`Search: ${search.trim()}`);
        return parts.join("  ·  ") || "All interns";
    }, [
        def.usesDates,
        dateFrom,
        dateTo,
        options,
        sectionId,
        companyId,
        search,
        reportKey,
        missedView,
    ]);

    /* Course / section printed under the school name on PDFs */
    const pdfScope = useMemo<PdfScope>(() => {
        const sec = options?.sections.find((s) => String(s.id) === sectionId);
        const course = options?.courses?.find((c) => String(c.id) === courseId);

        switch (options?.scope_type) {
            case "coordinator": {
                // Course + section: the chosen section, otherwise every section they handle
                const sections = options.sections;
                const courses = [...new Set(sections.map((x) => x.course_code).filter(Boolean))];
                return {
                    course: courses.join(", ") || null,
                    section: sec ? sec.name : sections.map((x) => x.name).join(", ") || null,
                };
            }
            case "dean":
                // Course only
                return { course: options.course_code, section: null };
            default:
                // Super admin: whatever the filters are set to
                return {
                    course: course?.code ?? sec?.course_code ?? null,
                    section: sec?.name ?? null,
                };
        }
    }, [options, courseId, sectionId]);

    /* columns for the active table report */
    const requirementsCols = useMemo<Col<RequirementsReport["data"][number]>[]>(() => {
        const dynamic: Col<RequirementsReport["data"][number]>[] = (query.data?.columns ?? []).map(
            (c) => ({
                header: c.title,
                value: (r) => REQ_STATUS[r.statuses[String(c.id)] ?? "n/a"].label,
                cell: (r) => {
                    const s = REQ_STATUS[r.statuses[String(c.id)] ?? "n/a"];
                    return s.label === "—" ? "—" : <Pill tone={s.tone}>{s.label}</Pill>;
                },
            })
        );

        return [
            {
                header: "Student",
                value: (r) => `${r.student_name} (${r.student_number})`,
                cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
            },
            { header: "Section", value: (r) => r.section ?? "—" },
            ...dynamic,
            { header: "Approved", value: (r) => `${r.approved}/${r.required}` },
        ];
    }, [query.data?.columns]);

    const weeklyCols = useMemo<Col<WeeklyReport["data"][number]>[]>(() => {
        const dynamic: Col<WeeklyReport["data"][number]>[] = (query.data?.columns ?? []).map((c) => ({
            header: c.title,
            value: (r) => WEEK_STATUS[r.weeks[String(c.id)] ?? "upcoming"].label,
            cell: (r) => {
                const w = WEEK_STATUS[r.weeks[String(c.id)] ?? "upcoming"];
                return w.label === "—" ? "—" : <Pill tone={w.tone}>{w.label}</Pill>;
            },
        }));

        return [
            {
                header: "Student",
                value: (r) => `${r.student_name} (${r.student_number})`,
                cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
            },
            { header: "Section", value: (r) => r.section ?? "—" },
            ...dynamic,
            { header: "Submitted", value: (r) => `${r.submitted}/${r.expected}` },
        ];
    }, [query.data?.columns]);

    // Columns of whichever table report is selected
    const activeCols: Col<any>[] =
        reportKey === "requirements"
            ? requirementsCols
            : reportKey === "weekly"
                ? weeklyCols
                : (TABLE_COLS[reportKey] ?? []);

    /* table reports: both buttons open a preview first */
    function buildTable(): ExportTable {
        const cols = activeCols;
        return {
            title: def.title,
            subtitle,
            headers: cols.map((c) => c.header),
            rows: rows.map((r) => cols.map((c) => c.value(r))),
            fileName: `${def.title.replace(/[^a-z0-9]+/gi, "_")}_${toISODate(new Date())}`,
        };
    }

    const previewCsv = () => setCsvPreview(buildTable());

    async function previewTable() {
        const branding = await loadPdfBranding(logoUrl || OCCLOGO, undefined, pdfScope);
        show(buildTablePDF(buildTable(), branding));
    }

    /* bulk DTR */
    const dtrStudents = (reportKey === "dtr" ? rows : []) as DtrStudent[];
    const selectedStudents = dtrStudents.filter((s) => !excluded.has(s.id));
    const allSelected = dtrStudents.length > 0 && selectedStudents.length === dtrStudents.length;

    function toggleStudent(id: number) {
        setExcluded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleAll() {
        setExcluded(allSelected ? new Set(dtrStudents.map((s) => s.id)) : new Set());
    }

    async function previewDtr() {
        const from = parseISODate(dateFrom);
        const to = parseISODate(dateTo);
        const branding = await loadPdfBranding(logoUrl || OCCLOGO, undefined, pdfScope);
        show(buildBulkDTRPDF(selectedStudents, from && to ? { from, to } : null, branding));
    }

    /* ── render ── */
    return (
        <section className="space-y-6">
            <header>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    <FileSpreadsheet size={14} />
                    <span>{user?.role?.label ?? "User"} Portal</span>
                    {options?.scope && (
                        <span className="rounded-full bg-[var(--color-accent)]/10 px-2.5 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-[var(--color-accent)]">
                            {options.scope}
                        </span>
                    )}
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">
                    {GROUP_META[group].title}
                </h1>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">{GROUP_META[group].description}</p>
            </header>

            {/* Report picker: only this category's reports, hidden when there is just one */}
            {groupReports.length > 1 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groupReports.map((r) => {
                        const Icon = r.icon;
                        const active = r.key === reportKey;
                        return (
                            <button
                                key={r.key}
                                type="button"
                                onClick={() => setReportKey(r.key)}
                                className={`flex items-start gap-3 rounded-2xl border p-4 text-left shadow-[var(--shadow-soft)] transition ${active
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 ring-1 ring-[var(--color-accent)]"
                                    : "border-[var(--color-line)] bg-white hover:bg-slate-50"
                                    }`}
                            >
                                <span
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-[var(--color-accent)] text-white" : "bg-slate-100 text-slate-600"
                                        }`}
                                >
                                    <Icon size={18} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-[var(--color-ink)]">
                                        {r.title}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                                        {r.description}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Result panel */}
            <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] bg-slate-50/50 px-6 py-4">
                    {/* Super admin only: everyone else is fixed to their own course / sections */}
                    {options?.can_filter_course && (
                        <select
                            value={courseId}
                            onChange={(e) => {
                                setCourseId(e.target.value);
                                // sections and companies belong to a course, so reset them
                                setSectionId("");
                                setCompanyId("");
                            }}
                            className={selectClass}
                        >
                            <option value="">All departments</option>
                            {options.courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.code} · {c.name}
                                </option>
                            ))}
                        </select>
                    )}

                    <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={selectClass}>
                        <option value="">All sections</option>
                        {options?.sections.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.course_code ? `${s.course_code} · ` : ""}
                                {s.name}
                            </option>
                        ))}
                    </select>

                    <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={selectClass}>
                        <option value="">All companies</option>
                        {options?.companies.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    {def.usesDates && (
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-white p-1 shadow-sm">
                                {[
                                    { label: "This month", get: thisMonth },
                                    { label: "Last month", get: lastMonth },
                                ].map((p) => (
                                    <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => {
                                            const r = p.get();
                                            setDateFrom(r.from);
                                            setDateTo(r.to);
                                        }}
                                        className="rounded-lg px-3 py-1 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-white px-3 py-1 text-xs">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    max={dateTo || undefined}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="bg-transparent text-xs text-[var(--color-ink)] outline-none"
                                    aria-label="Date from"
                                />
                                <span className="text-slate-400">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    min={dateFrom || undefined}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="bg-transparent text-xs text-[var(--color-ink)] outline-none"
                                    aria-label="Date to"
                                />
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                        <input
                            type="text"
                            placeholder="Search student or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-52 rounded-xl border border-[var(--color-line)] bg-white py-1.5 pl-8 pr-8 text-xs outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                aria-label="Clear search"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {reportKey === "absentees" && (
                        <select
                            value={minAbsences}
                            onChange={(e) => setMinAbsences(e.target.value)}
                            className={selectClass}
                            aria-label="Minimum absences"
                        >
                            {["1", "2", "3", "5"].map((n) => (
                                <option key={n} value={n}>
                                    {n}+ absences
                                </option>
                            ))}
                        </select>
                    )}


                    {reportKey === "missed" && (
                        <select
                            value={missedView}
                            onChange={(e) => setMissedView(e.target.value as "open" | "all")}
                            className={selectClass}
                            aria-label="Missed punch-out view"
                        >
                            <option value="open">Needs action</option>
                            <option value="all">Include corrected</option>
                        </select>
                    )}

                    {/* Export actions: every button opens a preview with its own Download */}
                    <div className="ml-auto flex items-center gap-2">
                        {reportKey === "dtr" ? (
                            <button
                                type="button"
                                onClick={previewDtr}
                                disabled={selectedStudents.length === 0 || invalidRange}
                                className={solidBtn}
                            >
                                <FileText size={13} />
                                Export DTR PDF ({selectedStudents.length})
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={previewCsv}
                                    disabled={rows.length === 0}
                                    className={outlineBtn}
                                >
                                    <FileSpreadsheet size={13} />
                                    CSV
                                </button>
                                <button
                                    type="button"
                                    onClick={previewTable}
                                    disabled={rows.length === 0}
                                    className={solidBtn}
                                >
                                    <FileText size={13} />
                                    PDF
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Title row */}
                <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-3">
                    <h2 className="text-base font-semibold text-[var(--color-ink)]">{def.title}</h2>
                    <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {rows.length}
                    </span>
                    <span className="ml-2 truncate text-xs text-[var(--color-muted)]">{subtitle}</span>
                </div>

                {/* Body */}
                {invalidRange ? (
                    <div className="p-12 text-center text-xs font-medium text-rose-600">
                        The start date must be on or before the end date.
                    </div>
                ) : query.isLoading ? (
                    <div className="flex items-center justify-center gap-2 p-12 text-xs text-[var(--color-muted)]">
                        <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" />
                        Loading report...
                    </div>
                ) : query.isError ? (
                    <div className="p-12 text-center">
                        <AlertCircle size={28} className="mx-auto mb-2 text-rose-500" />
                        <p className="text-xs font-medium text-slate-700">Failed to load this report.</p>
                        <button
                            type="button"
                            onClick={() => query.refetch()}
                            className="mt-2 text-xs font-medium text-[var(--color-accent)] underline"
                        >
                            Try again
                        </button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-[var(--color-ink)]">No data for these filters</p>
                        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                            Try a different date range, section, or company.
                        </p>
                    </div>
                ) : reportKey === "dtr" ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[var(--color-muted)]">
                            <thead className="border-b border-[var(--color-line)] bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
                                <tr>
                                    <th className="w-10 px-5 py-3">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleAll}
                                            aria-label="Select all interns"
                                        />
                                    </th>
                                    <th className="px-5 py-3">Student</th>
                                    <th className="px-5 py-3">Section</th>
                                    <th className="px-5 py-3">Company</th>
                                    <th className="px-5 py-3">Days logged</th>
                                    <th className="px-5 py-3">Total time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                {dtrStudents.map((s) => {
                                    const days = new Set(
                                        s.time_logs.map((l) => (l.time_in ?? "").slice(0, 10)).filter(Boolean)
                                    ).size;
                                    const minutes = s.time_logs.reduce((n, l) => n + (l.duration_minutes ?? 0), 0);
                                    return (
                                        <tr key={s.id} className="transition hover:bg-slate-50/70">
                                            <td className="px-5 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={!excluded.has(s.id)}
                                                    onChange={() => toggleStudent(s.id)}
                                                    aria-label={`Include ${s.first_name} ${s.last_name}`}
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                <StudentCell
                                                    name={[s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ")}
                                                    number={s.student_number}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3">
                                                {s.course_code && (
                                                    <span className="mr-1.5 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                                        {s.course_code}
                                                    </span>
                                                )}
                                                {s.section ?? "—"}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3">{s.companies[0]?.name ?? "—"}</td>
                                            <td className="px-5 py-3 font-semibold">{days}</td>
                                            <td className="px-5 py-3 font-semibold text-emerald-700">
                                                {formatDuration(minutes)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <DataTable
                        cols={activeCols}
                        rows={rows as any[]}
                        rowClass={
                            reportKey === "sections"
                                ? (r: SectionSummaryRow) => (r.is_total ? "bg-slate-50 font-semibold" : "")
                                : undefined
                        }
                    />
                )}
            </div>

            {modal}
            <CsvPreviewModal table={csvPreview} onClose={() => setCsvPreview(null)} />
        </section>
    );
}