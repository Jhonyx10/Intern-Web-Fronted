import { useMemo, useState } from "react";
import { AlertCircle, FileSpreadsheet, FileText, Loader2, Search, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/context/ThemeContext";
import {
    useSupervisorInternAttendanceReport,
    useSupervisorProfile,
    type SupervisorInternAttendanceRow,
} from "@/lib/queries/supervisor";
import { buildTablePDF, type ExportTable } from "@/lib/table-export";
import { loadPdfBranding } from "@/lib/pdf-branding";
import { usePdfPreview } from "@/components/modal/PdfPreviewModal";
import OCCLOGO from "@/assets/OCC logo.webp";
import {
    CsvPreviewModal,
    DataTable,
    Pill,
    StudentCell,
    fmtDate,
    lastMonth,
    outlineBtn,
    solidBtn,
    thisMonth,
    toISODate,
    type Col,
} from "@/pages/ReportsCategoryPage";

/* ── Columns ── */

const columns: Col<SupervisorInternAttendanceRow>[] = [
    {
        header: "Student",
        value: (r) => `${r.student_name} (${r.student_number})`,
        cell: (r) => <StudentCell name={r.student_name} number={r.student_number} />,
    },
    { header: "Section", value: (r) => r.section ?? "—" },
    { header: "Days present", value: (r) => r.days_present },
    { header: "Total logs", value: (r) => r.total_logs },
    {
        header: "Late logs",
        value: (r) => r.late_logs,
        cell: (r) => (r.late_logs > 0 ? <Pill tone="amber">{r.late_logs}</Pill> : 0),
    },
    {
        header: "Late %",
        value: (r) => (r.total_logs > 0 ? `${r.late_percent}%` : "—"),
        cell: (r) =>
            r.total_logs > 0 ? (
                <Pill tone={r.late_percent >= 30 ? "red" : r.late_percent >= 10 ? "amber" : "green"}>
                    {r.late_percent}%
                </Pill>
            ) : (
                "—"
            ),
    },
    {
        header: "Absences",
        value: (r) => r.absences,
        cell: (r) =>
            r.absences > 0 ? <Pill tone={r.absences >= 3 ? "red" : "amber"}>{r.absences}</Pill> : 0,
    },
    { header: "Justified", value: (r) => r.justified },
    {
        header: "Awaiting justification",
        value: (r) => r.awaiting,
        cell: (r) => (r.awaiting > 0 ? <Pill tone="amber">{r.awaiting}</Pill> : 0),
    },
    {
        header: "Late dates",
        value: (r) => r.late_dates || "—",
        cell: (r) => (
            <span className="block max-w-[220px] truncate" title={r.late_dates || undefined}>
                {r.late_dates || "—"}
            </span>
        ),
    },
    {
        header: "Absence dates",
        value: (r) => r.absence_dates || "—",
        cell: (r) => (
            <span className="block max-w-[220px] truncate" title={r.absence_dates || undefined}>
                {r.absence_dates || "—"}
            </span>
        ),
    },
];

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-ink)]">{value}</p>
        </div>
    );
}

/* ── Page ── */

export function SupervisorReportsPage() {
    const { user } = useAuth();
    const { logoUrl } = useTheme();
    const { data: profile } = useSupervisorProfile();
    const { show, modal } = usePdfPreview("Report preview");
    const [csvPreview, setCsvPreview] = useState<ExportTable | null>(null);

    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState(() => thisMonth().from);
    const [dateTo, setDateTo] = useState(() => thisMonth().to);

    const invalidRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

    const filters = useMemo(
        () => ({
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            search: search.trim() || undefined,
        }),
        [dateFrom, dateTo, search]
    );

    const query = useSupervisorInternAttendanceReport(filters, !invalidRange);
    const rows = query.data ?? [];

    const totals = useMemo(
        () => ({
            interns: rows.length,
            late: rows.reduce((n, r) => n + r.late_logs, 0),
            absences: rows.reduce((n, r) => n + r.absences, 0),
        }),
        [rows]
    );

    /* subtitle used in exported files */
    const subtitle = useMemo(() => {
        const parts: string[] = [];
        if (profile?.company?.name) parts.push(profile.company.name);
        if (dateFrom && dateTo) parts.push(`${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`);
        if (search.trim()) parts.push(`Search: ${search.trim()}`);
        return parts.join("  ·  ") || "All interns";
    }, [profile, dateFrom, dateTo, search]);

    function buildTable(): ExportTable {
        return {
            title: "Intern late logs & absences",
            subtitle,
            headers: columns.map((c) => c.header),
            rows: rows.map((r) => columns.map((c) => c.value(r))),
            fileName: `Intern_late_and_absences_${toISODate(new Date())}`,
        };
    }

    const previewCsv = () => setCsvPreview(buildTable());

    async function previewPdf() {
        const branding = await loadPdfBranding(logoUrl || OCCLOGO);
        show(buildTablePDF(buildTable(), branding));
    }

    return (
        <section className="space-y-6">
            <header>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    <FileSpreadsheet size={14} />
                    <span>{user?.role?.label ?? "Supervisor"} Portal</span>
                    {profile?.company?.name && (
                        <span className="rounded-full bg-[var(--color-accent)]/10 px-2.5 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-[var(--color-accent)]">
                            {profile.company.name}
                        </span>
                    )}
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">Intern Reports</h1>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    Late logs and absences of the interns placed at your company. Preview and export.
                </p>
            </header>

            <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Interns" value={totals.interns} />
                <StatCard label="Late logs" value={totals.late} />
                <StatCard label="Absences" value={totals.absences} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] bg-slate-50/50 px-6 py-4">
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

                    {/* Export actions: both open a preview with their own Download */}
                    <div className="ml-auto flex items-center gap-2">
                        <button type="button" onClick={previewCsv} disabled={rows.length === 0} className={outlineBtn}>
                            <FileSpreadsheet size={13} />
                            CSV
                        </button>
                        <button type="button" onClick={previewPdf} disabled={rows.length === 0} className={solidBtn}>
                            <FileText size={13} />
                            PDF
                        </button>
                    </div>
                </div>

                {/* Title row */}
                <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-6 py-3">
                    <h2 className="text-base font-semibold text-[var(--color-ink)]">Intern late logs &amp; absences</h2>
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
                        <p className="text-sm font-semibold text-[var(--color-ink)]">No interns for these filters</p>
                        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                            Only interns with an active placement at your company are listed.
                        </p>
                    </div>
                ) : (
                    <DataTable cols={columns} rows={rows} />
                )}
            </div>

            {modal}
            <CsvPreviewModal table={csvPreview} onClose={() => setCsvPreview(null)} />
        </section>
    );
}

export default SupervisorReportsPage;