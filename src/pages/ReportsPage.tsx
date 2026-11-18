import { useMemo, useState, type ReactNode } from "react";
import {
    AlertCircle,
    Award,
    CalendarX,
    ClipboardCheck,
    Eye,
    FileSpreadsheet,
    FileText,
    Loader2,
    Search,
    TrendingUp,
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
    type HoursRow,
    type ReportFilters,
    type RequirementStatus,
    type RequirementsReport,
} from "@/lib/queries/reports";
import { buildTablePDF, exportTableCSV } from "@/lib/table-export";
import { buildBulkDTRPDF, formatDuration } from "@/lib/exportDtr"; // adjust to where your DTR file lives
import { loadPdfBranding, type PdfScope } from "@/lib/pdf-branding";
import { usePdfPreview } from "@/components/modal/PdfPreviewModal";
import { useTheme } from "@/context/ThemeContext";
import OCCLOGO from "@/assets/OCC logo.webp";

/* ─────────────────────────── helpers ─────────────────────────── */

function toISODate(d: Date) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

function parseISODate(s: string): Date | null {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
}

function fmtDate(s: string | null) {
    const d = s ? parseISODate(s.slice(0, 10)) : null;
    return d
        ? d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
        : "—";
}

const thisMonth = () => {
    const now = new Date();
    return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(now) };
};

const lastMonth = () => {
    const now = new Date();
    return {
        from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
};

/* ─────────────────────────── report registry ─────────────────────────── */

type ReportKey = "dtr" | "hours" | "attendance" | "requirements" | "evaluations";

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
        description: "Days present, hours, absences, missed punch-outs.",
        icon: CalendarX,
        path: "attendance-summary",
        usesDates: true,
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
        key: "evaluations",
        group: "Evaluations",
        title: "Evaluation results",
        description: "Scores and pending evaluations.",
        icon: Award,
        path: "evaluations",
        usesDates: false,
    },
];

const GROUPS = ["Attendance", "Compliance", "Evaluations"];

/* ─────────────────────────── small UI pieces ─────────────────────────── */

const TONES = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    red: "bg-rose-50 text-rose-700 ring-rose-600/20",
    blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
    gray: "bg-slate-100 text-slate-500 ring-slate-500/10",
};

function Pill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
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

function StudentCell({ name, number }: { name: string; number: string }) {
    return (
        <div>
            <p className="font-semibold text-[var(--color-ink)]">{name}</p>
            <p className="font-mono text-[11px] text-[var(--color-muted)]">{number}</p>
        </div>
    );
}

type Col<T> = {
    header: string;
    /** Plain value, used for CSV / PDF export */
    value: (row: T) => string | number;
    /** Optional richer cell for the on-screen table */
    cell?: (row: T) => ReactNode;
};

function DataTable<T,>({ cols, rows }: { cols: Col<T>[]; rows: T[] }) {
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
                        <tr key={i} className="transition hover:bg-slate-50/70">
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

const selectClass =
    "rounded-xl border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]";

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

/* ─────────────────────────── page ─────────────────────────── */

export default function ReportsPage() {
    const { token, user } = useAuth();
    const { logoUrl } = useTheme();
    const { data: options } = useReportOptions(token);

    // PDF preview modal (Download / Print live inside it)
    const { show: showPdf, modal: pdfModal } = usePdfPreview("Report preview");
    const [building, setBuilding] = useState(false);

    const [reportKey, setReportKey] = useState<ReportKey>("dtr");
    const def = REPORTS.find((r) => r.key === reportKey)!;

    const [sectionId, setSectionId] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState(() => thisMonth().from);
    const [dateTo, setDateTo] = useState(() => thisMonth().to);

    // Bulk DTR: interns the user unticked (everyone is ticked by default)
    const [excluded, setExcluded] = useState<Set<number>>(new Set());

    const invalidRange = def.usesDates && Boolean(dateFrom && dateTo && dateFrom > dateTo);

    const filters = useMemo<ReportFilters>(
        () => ({
            section_id: sectionId || undefined,
            company_id: companyId || undefined,
            search: search.trim() || undefined,
            date_from: def.usesDates ? dateFrom || undefined : undefined,
            date_to: def.usesDates ? dateTo || undefined : undefined,
        }),
        [sectionId, companyId, search, dateFrom, dateTo, def.usesDates]
    );

    const query = useReport<{ data: unknown[]; columns?: RequirementsReport["columns"] }>(
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
        if (sec) parts.push(sec.name);
        if (comp) parts.push(comp.name);
        if (search.trim()) parts.push(`Search: ${search.trim()}`);
        return parts.join("  ·  ") || "All interns";
    }, [def.usesDates, dateFrom, dateTo, options, sectionId, companyId, search]);

    /* course / section printed under the school name in exported PDFs */
    const pdfScope = useMemo<PdfScope>(() => {
        // 1) A selected section filter wins (it carries its course code)
        const sec = options?.sections.find((s) => String(s.id) === sectionId);
        if (sec) return { course: sec.course_code, section: sec.name };

        // 2) Otherwise fall back to the logged-in user's own scope
        const role = String(user?.role?.label ?? "").toLowerCase();
        const course = user?.course?.code ?? user?.course?.name ?? null;
        const section = user?.section?.name ?? user?.section?.code ?? null;

        if (role.includes("dean")) return { course };
        if (role.includes("coordinator")) return { course, section };
        return {};
    }, [options, sectionId, user]);

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

    /** CSV downloads straight away; PDF opens the preview modal first. */
    async function exportTable(kind: "csv" | "pdf") {
        let cols: Col<any>[] = [];
        if (reportKey === "hours") cols = hoursCols;
        else if (reportKey === "attendance") cols = attendanceCols;
        else if (reportKey === "requirements") cols = requirementsCols;
        else if (reportKey === "evaluations") cols = evaluationCols;

        const table = {
            title: def.title,
            subtitle,
            headers: cols.map((c) => c.header),
            rows: rows.map((r) => cols.map((c) => c.value(r))),
            fileName: `${def.title.replace(/[^a-z0-9]+/gi, "_")}_${toISODate(new Date())}`,
        };

        if (kind === "csv") {
            exportTableCSV(table);
            return;
        }

        setBuilding(true);
        try {
            const branding = await loadPdfBranding(logoUrl || OCCLOGO, undefined, pdfScope);
            showPdf(buildTablePDF(table, branding));
        } finally {
            setBuilding(false);
        }
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

        setBuilding(true);
        try {
            const branding = await loadPdfBranding(logoUrl || OCCLOGO, undefined, pdfScope);
            // Let the spinner paint before the (synchronous) PDF build blocks the thread
            await new Promise((resolve) => setTimeout(resolve, 0));
            showPdf(buildBulkDTRPDF(selectedStudents, from && to ? { from, to } : null, branding));
        } finally {
            setBuilding(false);
        }
    }

    /* ── render ── */
    return (
        <section className="space-y-6">
            <header>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    <FileSpreadsheet size={14} />
                    <span>{user?.role?.label ?? "User"} Portal</span>
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">Reports</h1>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    Pick a report, narrow it down, then preview and export it.
                </p>
            </header>

            {/* Report picker */}
            <div className="space-y-4">
                {GROUPS.map((group) => (
                    <div key={group}>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                            {group}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {REPORTS.filter((r) => r.group === group).map((r) => {
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
                    </div>
                ))}
            </div>

            {/* Result panel */}
            <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] bg-slate-50/50 px-6 py-4">
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

                    {/* Export actions */}
                    <div className="ml-auto flex items-center gap-2">
                        {reportKey === "dtr" ? (
                            <button
                                type="button"
                                onClick={previewDtr}
                                disabled={selectedStudents.length === 0 || invalidRange || building}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {building ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                                Preview DTR PDF ({selectedStudents.length})
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => exportTable("csv")}
                                    disabled={rows.length === 0}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <FileSpreadsheet size={13} />
                                    CSV
                                </button>
                                <button
                                    type="button"
                                    onClick={() => exportTable("pdf")}
                                    disabled={rows.length === 0 || building}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {building ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                                    Preview PDF
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
                ) : reportKey === "hours" ? (
                    <DataTable cols={hoursCols} rows={rows as HoursRow[]} />
                ) : reportKey === "attendance" ? (
                    <DataTable cols={attendanceCols} rows={rows as AttendanceSummaryRow[]} />
                ) : reportKey === "requirements" ? (
                    <DataTable cols={requirementsCols} rows={rows as RequirementsReport["data"]} />
                ) : (
                    <DataTable cols={evaluationCols} rows={rows as EvaluationRow[]} />
                )}
            </div>

            {pdfModal}
        </section>
    );
}