import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
    ArrowLeft,
    BookOpen,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock,
    ExternalLink,
    FileText,
    Globe,
    History,
    Search,
    UserCheck,
    Users,
    X,
    XCircle,
} from "lucide-react";
import {
    useSubmittedDocuments,
    useUpdateDocumentStatus,
    useCourseDocumentRequirements,
    useSchoolYearOptions,
    useInternDocumentProgress,
    type SubmittedDocument,
    type InternDocumentProgress,
} from "@/lib/queries/documents";
import { useCurrentSchoolYear } from "@/lib/queries/school-year";
import { DocumentPreviewModal } from "@/components/modal/DocumentPreviewModal";
import {
    DocumentHistoryModal,
    type SchoolYear,
} from "@/components/modal/DocumentHistoryModal";

// Shape of a requirement returned by GET /courses/{id}/document-requirements
type CourseRequirement = {
    id: number;
    title: string;
    created_school_year?: string | null;
    document_type?: 'common' | 'departmental' | string | null;
    course_id?: number | null;
    is_common?: boolean | number | null;
    pivot?: { course_id?: number | null; deadline_at?: string | null } | null;
};

// Common = shared by every department. Departmental = tied to one course.
function isCommonRequirement(
    req?: {
        document_type?: 'common' | 'departmental' | string | null;
        is_common?: boolean | number | null;
        course_id?: number | null;
        pivot?: { course_id?: number | null } | null;
    } | null
): boolean {
    if (!req) return false;
    if (req.document_type) return req.document_type === "common";
    if (req.is_common != null) return Boolean(req.is_common);
    if (req.pivot?.course_id != null) return false;
    if (req.course_id != null) return false;
    return true;
}

// ─── animation variants ─────────────────────────────────────────────────────
const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr?: string | null) {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
        });
    } catch { return dateStr; }
}

function getStatusChip(status?: string) {
    const s = (status ?? "pending").toLowerCase();
    if (s === "approved") return { label: "Approved", className: "bg-emerald-50 text-emerald-700" };
    if (s === "rejected") return { label: "Rejected", className: "bg-red-50 text-red-600" };
    return { label: "Pending", className: "bg-amber-50 text-amber-700" };
}

// "Alicer, Romer" -> "RA"
function getInitials(name: string) {
    return name
        .split(",")
        .map((s) => s.trim()[0] ?? "")
        .reverse()
        .join("");
}

// ─── Requirement submissions modal ───────────────────────────────────────────
interface RequirementModalProps {
    requirementTitle: string;
    docs: SubmittedDocument[];
    onClose: () => void;
    onPreview: (doc: SubmittedDocument) => void;
}

function RequirementModal({ requirementTitle, docs, onClose, onPreview }: RequirementModalProps) {
    const [search, setSearch] = useState("");
    const filtered = docs.filter((d) => {
        if (!search.trim()) return true;
        const name = `${d.student?.first_name ?? ""} ${d.student?.last_name ?? ""}`.toLowerCase();
        const num = d.student?.student_number?.toLowerCase() ?? "";
        const file = d.original_filename?.toLowerCase() ?? "";
        const q = search.toLowerCase();
        return name.includes(q) || num.includes(q) || file.includes(q);
    });

    return (
        <motion.div
            key="req-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--color-line)] bg-white shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)] mb-0.5">
                            Document Requirement
                        </p>
                        <h2 className="text-lg font-bold text-[var(--color-ink)] leading-tight">
                            {requirementTitle}
                        </h2>
                        <p className="text-sm text-[var(--color-muted)] mt-0.5">
                            {docs.length} student{docs.length !== 1 ? "s" : ""} submitted
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-0.5 rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-slate-100 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b border-[var(--color-line)]">
                    <label className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-slate-50 px-3 py-2 text-sm text-[var(--color-muted)] focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20 transition">
                        <Search size={14} />
                        <input
                            autoFocus
                            type="search"
                            placeholder="Search by student name, ID, or filename…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent outline-none placeholder:text-[var(--color-muted)] text-[var(--color-ink)] text-sm"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch("")} className="hover:text-[var(--color-ink)]">
                                <X size={12} />
                            </button>
                        )}
                    </label>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-muted)]">
                            <FileText size={32} className="opacity-30" />
                            <p className="text-sm font-medium">
                                {search ? "No submissions match your search." : "No submissions yet."}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full min-w-[560px] border-collapse text-left">
                            <thead>
                                <tr className="border-b border-[var(--color-line)] bg-slate-50/80">
                                    {["Student", "Filename", "Submitted", "Status", "Action"].map((h) => (
                                        <th key={h} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((doc) => {
                                    const name = doc.student
                                        ? `${doc.student.last_name}, ${doc.student.first_name}`
                                        : "Unknown";
                                    const chip = getStatusChip(doc.review_status);
                                    return (
                                        <tr key={doc.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-slate-50/60 transition">
                                            {/* Student */}
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700 font-semibold text-xs">
                                                        {doc.student?.first_name?.[0]}{doc.student?.last_name?.[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-[var(--color-ink)]">{name}</p>
                                                        <div className="flex items-center gap-1.5 flex-wrap text-xs text-[var(--color-muted)]">
                                                            {doc.student?.student_number && (
                                                                <span>{doc.student.student_number}</span>
                                                            )}
                                                            {doc.student?.section && (
                                                                <span>· {doc.student.section.name}</span>
                                                            )}
                                                            {(doc.student?.section?.school_year?.name || doc.student?.section?.schoolYear?.name) && (
                                                                <span className="text-amber-700 font-medium bg-amber-50 px-1.5 py-0.2 rounded">
                                                                    S.Y. {doc.student.section.school_year?.name ?? doc.student.section.schoolYear?.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Filename */}
                                            <td className="px-5 py-3">
                                                <p className="truncate text-xs text-[var(--color-muted)] max-w-[180px]" title={doc.original_filename}>
                                                    {doc.original_filename}
                                                </p>
                                            </td>
                                            {/* Date */}
                                            <td className="px-5 py-3 text-xs text-[var(--color-muted)] whitespace-nowrap">
                                                {formatDate(doc.uploaded_at)}
                                            </td>
                                            {/* Status */}
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${chip.className}`}>
                                                    {chip.label}
                                                </span>
                                            </td>
                                            {/* Action */}
                                            <td className="px-5 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => onPreview(doc)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-600 shadow-sm hover:bg-sky-50 transition whitespace-nowrap"
                                                >
                                                    <ExternalLink size={11} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Intern's approved documents modal ───────────────────────────────────────
interface InternDocsModalProps {
    intern: InternDocumentProgress;
    docs: SubmittedDocument[];
    onClose: () => void;
    onPreview: (doc: SubmittedDocument) => void;
}

function InternDocsModal({ intern, docs, onClose, onPreview }: InternDocsModalProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <motion.div
            key="intern-docs-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--color-line)] bg-white shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                            {getInitials(intern.name)}
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold leading-tight text-[var(--color-ink)]">
                                {intern.name}
                            </h2>
                            <p className="text-xs text-[var(--color-muted)]">
                                <span className="font-mono">{intern.student_number}</span>
                                {intern.section?.name && <> · {intern.section.name}</>}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-slate-100 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Summary strip */}
                <div className="flex items-center gap-2 border-b border-[var(--color-line)] bg-slate-50/70 px-6 py-2.5 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                        <CheckCircle2 size={11} /> {docs.length} approved document{docs.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[var(--color-muted)]">
                        {intern.approved_documents} / {intern.total_requirements} requirements complete
                    </span>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {docs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--color-muted)]">
                            <FileText size={32} className="opacity-30" />
                            <p className="text-sm font-medium">No approved documents yet.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {docs.map((doc) => (
                                <li
                                    key={doc.id}
                                    className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 transition hover:bg-slate-50/60"
                                >
                                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                                            {doc.document_requirement?.title ??
                                                doc.document_type?.name ??
                                                "Submitted Document"}
                                        </p>
                                        <p
                                            className="truncate text-xs text-[var(--color-muted)]"
                                            title={doc.original_filename}
                                        >
                                            {doc.original_filename}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                                            Submitted {formatDate(doc.uploaded_at)}
                                            {doc.reviewed_at && <> · Approved {formatDate(doc.reviewed_at)}</>}
                                            {doc.reviewed_by?.name && <> by {doc.reviewed_by.name}</>}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onPreview(doc)}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-600 shadow-sm transition hover:bg-sky-50"
                                    >
                                        <ExternalLink size={11} /> View
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Requirement group (Common / Departmental) ────────────────────────────────
interface RequirementGroupProps {
    title: string;
    description: string;
    icon: LucideIcon;
    iconClass: string;
    count: number;
    children: ReactNode;
}

function RequirementGroup({
    title,
    description,
    icon: Icon,
    iconClass,
    count,
    children,
}: RequirementGroupProps) {
    return (
        <motion.section variants={item} className="space-y-3">
            <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-2.5">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconClass}`}>
                    <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
                    <p className="text-xs text-[var(--color-muted)]">{description}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {count}
                </span>
            </div>
            <motion.div variants={container} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {children}
            </motion.div>
        </motion.section>
    );
}

// ─── Requirement card ─────────────────────────────────────────────────────────
interface ReqCardProps {
    title: string;
    schoolYear?: string;
    totalStudents: number;
    approved: number;
    pending: number;
    rejected: number;
    onClick: () => void;
}

function RequirementCard({ title, schoolYear, totalStudents, approved, pending, rejected, onClick }: ReqCardProps) {
    const pct = totalStudents > 0 ? Math.round((approved / totalStudents) * 100) : 0;

    return (
        <motion.button
            variants={item}
            type="button"
            onClick={onClick}
            className="group relative w-full text-left rounded-2xl border border-[var(--color-line)] bg-white/90 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur hover:border-[var(--color-accent)] hover:shadow-md transition-all duration-200 focus-visible:outline-[var(--color-accent)]"
        >
            {/* Pending indicator */}
            {pending > 0 && (
                <span
                    className="absolute -right-2 -top-2 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white shadow-md ring-2 ring-white"
                    title={`${pending} pending ${pending === 1 ? "document" : "documents"}`}
                    aria-label={`${pending} pending ${pending === 1 ? "document" : "documents"}`}
                >
                    {pending > 99 ? "99+" : pending}
                </span>
            )}

            {/* Title row */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                            <FileText size={14} />
                        </div>
                        <p className="truncate text-sm font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors">
                            {title}
                        </p>
                        {schoolYear && (
                            <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                                S.Y. {schoolYear}
                            </span>
                        )}
                    </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)] bg-[var(--color-accent-soft)] rounded-full px-2.5 py-0.5">
                    <Users size={10} /> {totalStudents}
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div
                    className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700">
                    <CheckCircle2 size={9} /> {approved} approved
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-amber-50 text-amber-700">
                    <Clock size={9} /> {pending} pending
                </span>
                {rejected > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-red-50 text-red-600">
                        <XCircle size={9} /> {rejected} rejected
                    </span>
                )}
                <span className="ml-auto text-[10px] font-medium text-[var(--color-muted)]">
                    {pct}% approved
                </span>
            </div>
        </motion.button>
    );
}

// ─── Intern progress panel ────────────────────────────────────────────────────
interface InternProgressPanelProps {
    interns: InternDocumentProgress[];
    totalRequirements: number;
    search: string;
    isLoading: boolean;
    isError: boolean;
    onSelectIntern: (intern: InternDocumentProgress) => void;
}

const PAGE_SIZES = [10, 25, 50] as const;

// 1 … 4 5 6 … 20  (always keeps first, last and the neighbours of the current page)
function pageNumbers(current: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>([1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    sorted.forEach((p, idx) => {
        if (idx > 0 && p - sorted[idx - 1] > 1) out.push("…");
        out.push(p);
    });
    return out;
}

function InternProgressPanel({
    interns,
    totalRequirements,
    search,
    isLoading,
    isError,
    onSelectIntern,
}: InternProgressPanelProps) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Back to the first page whenever the list or search changes
    useEffect(() => {
        setPage(1);
    }, [search, pageSize, interns]);

    const q = search.trim().toLowerCase();
    const matched = q
        ? interns.filter(
            (i) =>
                i.name.toLowerCase().includes(q) ||
                (i.student_number ?? "").toLowerCase().includes(q) ||
                (i.section?.name ?? "").toLowerCase().includes(q)
        )
        : interns;

    // Complete interns first; everyone else keeps the backend's name order
    const rows = [...matched].sort(
        (a, b) =>
            Number(b.is_complete) - Number(a.is_complete) ||
            b.approved_documents - a.approved_documents
    );

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-[var(--color-muted)]">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                <p className="text-sm">Loading intern progress…</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-700">
                    Couldn't load intern progress. Please try again.
                </p>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-line)] py-24 text-center">
                <Users size={36} className="text-[var(--color-line)]" />
                <p className="text-sm font-medium text-[var(--color-muted)]">
                    {search ? "No interns match your search." : "No interns found for this school year."}
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                    <thead>
                        <tr className="border-b border-[var(--color-line)] bg-slate-50/80">
                            {["Intern", "Section", "School year", "Documents approved", ""].map((h, idx) => (
                                <th
                                    key={idx}
                                    className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((i) => {
                            const pct =
                                i.total_requirements > 0
                                    ? Math.round((i.approved_documents / i.total_requirements) * 100)
                                    : 0;
                            return (
                                <tr
                                    key={i.id}
                                    tabIndex={0}
                                    onClick={() => onSelectIntern(i)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            onSelectIntern(i);
                                        }
                                    }}
                                    title="View approved documents"
                                    className="group cursor-pointer border-b border-[var(--color-line)] last:border-0 transition-colors duration-200 hover:bg-[var(--color-accent-soft)]/60 focus-visible:bg-[var(--color-accent-soft)]/60 focus-visible:outline-none"
                                >
                                    <td className="relative px-5 py-3">
                                        {/* Accent bar that grows in on hover */}
                                        <span
                                            aria-hidden
                                            className="absolute inset-y-0 left-0 w-[3px] origin-center scale-y-0 bg-[var(--color-accent)] transition-transform duration-200 group-hover:scale-y-100 group-focus-visible:scale-y-100"
                                        />
                                        <div className="flex items-center gap-2.5 transition-transform duration-200 group-hover:translate-x-1">
                                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 transition-transform duration-200 group-hover:scale-110">
                                                {getInitials(i.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)]">
                                                    {i.name}
                                                </p>
                                                <p className="font-mono text-[11px] text-[var(--color-muted)]">
                                                    {i.student_number}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3 text-sm text-[var(--color-ink)]">
                                        {i.section?.name ?? "—"}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        {i.school_year ? (
                                            <span className="inline-flex items-center rounded-md border border-amber-200/60 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                                                S.Y. {i.school_year.name}
                                                {i.school_year.semester ? ` · ${i.school_year.semester}` : ""}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex min-w-[200px] items-center gap-3">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${i.is_complete ? "bg-emerald-500" : "bg-[var(--color-accent)]"
                                                        }`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span
                                                className={`whitespace-nowrap text-xs font-semibold tabular-nums ${i.is_complete ? "text-emerald-700" : "text-[var(--color-ink)]"
                                                    }`}
                                            >
                                                {i.approved_documents} / {i.total_requirements}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="w-10 pr-4 text-right">
                                        <ChevronRight
                                            size={16}
                                            className="inline-block -translate-x-1 text-[var(--color-accent)] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] bg-slate-50/60 px-5 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                    <p>
                        Showing{" "}
                        <span className="font-semibold text-[var(--color-ink)]">
                            {start + 1}–{Math.min(start + pageSize, rows.length)}
                        </span>{" "}
                        of <span className="font-semibold text-[var(--color-ink)]">{rows.length}</span> intern
                        {rows.length !== 1 ? "s" : ""} · {totalRequirements} required document
                        {totalRequirements !== 1 ? "s" : ""}
                    </p>
                    <label className="flex items-center gap-1.5">
                        Rows
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="rounded-lg border border-[var(--color-line)] bg-white px-2 py-1 text-xs font-semibold text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
                        >
                            {PAGE_SIZES.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {totalPages > 1 && (
                    <nav className="flex items-center gap-1" aria-label="Pagination">
                        <button
                            type="button"
                            onClick={() => setPage(safePage - 1)}
                            disabled={safePage === 1}
                            className="rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Prev
                        </button>

                        {pageNumbers(safePage, totalPages).map((p, idx) =>
                            p === "…" ? (
                                <span key={`gap-${idx}`} className="px-1.5 text-xs text-[var(--color-muted)]">
                                    …
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPage(p)}
                                    aria-current={p === safePage ? "page" : undefined}
                                    className={`min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums transition ${p === safePage
                                        ? "bg-[var(--color-accent)] text-white shadow-sm"
                                        : "border border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-slate-50"
                                        }`}
                                >
                                    {p}
                                </button>
                            )
                        )}

                        <button
                            type="button"
                            onClick={() => setPage(safePage + 1)}
                            disabled={safePage === totalPages}
                            className="rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                        </button>
                    </nav>
                )}
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DepartmentDocumentsPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    // Deans and coordinators land here directly, so no "Back to Departments" link for them
    const isDean = user?.role?.name === "dean" || user?.role?.name === "coordinator";
    const updateStatus = useUpdateDocumentStatus();

    // Active school year
    const { data: currentSchoolYear } = useCurrentSchoolYear();

    // School year filter lives in the URL (?school_year_id=…), so it carries over
    // from the Documents page, survives a refresh, and works with the back button.
    // No parameter = the current school year (the backend defaults to it).
    const [searchParams, setSearchParams] = useSearchParams();
    const yearId = Number(searchParams.get("school_year_id")) || null;
    const { data: yearOptions } = useSchoolYearOptions();
    const [pickedYear, setPickedYear] = useState<SchoolYear | null>(null);
    const [showYearModal, setShowYearModal] = useState(false);

    // Active school year ID: from URL parameter if present, otherwise default to current school year
    const activeSchoolYearId = yearId ?? (currentSchoolYear?.id as number | undefined);
    const isCurrentYear =
        !currentSchoolYear ||
        !activeSchoolYearId ||
        activeSchoolYearId === currentSchoolYear.id;

    // Full school year object (for labels), resolved from the id in the URL
    const selectedYear: SchoolYear | null =
        pickedYear && pickedYear.id === activeSchoolYearId
            ? pickedYear
            : ((yearOptions?.find((sy) => sy.id === activeSchoolYearId) as unknown as
                | SchoolYear
                | undefined) ??
                (isCurrentYear ? (currentSchoolYear as unknown as SchoolYear) : null));

    // The year shown in the header badge: the resolved active school year or current school year
    const shownYear = selectedYear ?? currentSchoolYear;

    const reqQuery = useCourseDocumentRequirements(
        id ? Number(id) : undefined,
        activeSchoolYearId
    );
    const requirements: CourseRequirement[] | undefined = reqQuery.data;
    const loadingReqs = reqQuery.isLoading;

    const { data: submittedDocs, isLoading: loadingDocs, isError } = useSubmittedDocuments({
        course_id: id,
        ...(activeSchoolYearId ? { school_year_id: String(activeSchoolYearId) } : {}),
    });

    const [search, setSearch] = useState("");
    const [view, setView] = useState<"requirements" | "interns">("requirements");
    const [selectedReqId, setSelectedReqId] = useState<number | string | null>(null);
    const [selectedIntern, setSelectedIntern] = useState<InternDocumentProgress | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{
        id: number; title: string; filename?: string; fileSize?: number;
        mimeType?: string; notes?: string | null; status?: string;
        rejectionReason?: string | null; reviewedAt?: string | null; reviewedByName?: string | null;
    } | null>(null);

    // Per-intern document progress (only fetched while that view is open)
    const progressQuery = useInternDocumentProgress(id, activeSchoolYearId, view === "interns");

    // Group submitted docs by document_requirement_id
    const docsByReq = useMemo(() => {
        const map = new Map<number | string, SubmittedDocument[]>();
        (submittedDocs ?? []).forEach((doc) => {
            const key = doc.document_requirement_id ?? "uncategorized";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(doc);
        });
        return map;
    }, [submittedDocs]);

    // Approved documents of the intern whose modal is open.
    // Only one-time requirements (recurrence "none"); daily/weekly reports are left out.
    const internApprovedDocs = useMemo(() => {
        if (!selectedIntern) return [];
        return (submittedDocs ?? [])
            .filter((d) => {
                const recurrence =
                    (d.document_requirement as { recurrence?: string | null } | null | undefined)
                        ?.recurrence ?? "none";
                return (
                    (d.student?.id ?? (d as { student_id?: number }).student_id) === selectedIntern.id &&
                    d.review_status === "approved" &&
                    d.document_requirement_id != null &&
                    recurrence === "none"
                );
            })
            .sort((a, b) => (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? ""));
    }, [submittedDocs, selectedIntern]);

    // Build requirement cards: only requirements assigned to this course for the active school year,
    // plus any submitted docs that belong to those requirements (or are uncategorized).
    const requirementCards = useMemo(() => {
        const cards: Array<{
            id: number | string;
            title: string;
            schoolYear?: string;
            docs: SubmittedDocument[];
            common: boolean;
        }> = [];
        const seen = new Set<number | string>();
        const syName = shownYear?.name ?? currentSchoolYear?.name;

        // 1. Requirements assigned to this course for the active school year
        (requirements ?? []).forEach((req) => {
            seen.add(req.id);
            cards.push({
                id: req.id,
                title: req.title,
                schoolYear: (syName ?? req.created_school_year) || undefined,
                docs: docsByReq.get(req.id) ?? [],
                common: isCommonRequirement(req),
            });
        });

        // 2. Docs submitted without a linked requirement (keep them visible so nothing is hidden)
        const uncategorized = docsByReq.get("uncategorized") ?? [];
        if (uncategorized.length > 0) {
            cards.push({
                id: "uncategorized",
                title: "Uncategorized Documents",
                schoolYear: syName || undefined,
                docs: uncategorized,
                common: false,
            });
        }

        return cards;
    }, [requirements, docsByReq, shownYear, currentSchoolYear]);

    // Apply search filter on displayed cards
    const filteredCards = useMemo(() => {
        if (!search.trim()) return requirementCards;
        return requirementCards.filter((c) =>
            c.title.toLowerCase().includes(search.toLowerCase())
        );
    }, [requirementCards, search]);

    // Split into the two groups shown on the page
    const commonCards = useMemo(() => filteredCards.filter((c) => c.common), [filteredCards]);
    const departmentalCards = useMemo(() => filteredCards.filter((c) => !c.common), [filteredCards]);

    const totalSubmitted = submittedDocs?.length ?? 0;
    const totalApproved = submittedDocs?.filter((d) => d.review_status === "approved").length ?? 0;
    const totalPending = submittedDocs?.filter((d) => !d.review_status || d.review_status === "pending").length ?? 0;

    const selectedReq = filteredCards.find((c) => c.id === selectedReqId) ?? null;

    const isLoading = loadingReqs || loadingDocs;

    function applyYear(sy: SchoolYear) {
        setPickedYear(sy);
        setSearchParams({ school_year_id: String(sy.id) }, { replace: true });
        setSelectedReqId(null);
        setSelectedIntern(null);
        setSearch("");
        setShowYearModal(false);
    }

    function clearYear() {
        setPickedYear(null);
        setSearchParams({}, { replace: true });
        setSelectedReqId(null);
        setSelectedIntern(null);
        setSearch("");
    }

    // Shared by the requirement modal and the intern modal
    function openPreview(doc: SubmittedDocument) {
        const reqTitle =
            doc.document_requirement?.title ??
            doc.document_type?.name ??
            "Submitted Document";
        setPreviewDoc({
            id: doc.id,
            title: reqTitle,
            filename: doc.original_filename,
            fileSize: doc.file_size ?? undefined,
            mimeType: doc.mime_type ?? undefined,
            notes: doc.notes,
            status: doc.review_status,
            rejectionReason: doc.rejection_reason,
            reviewedAt: doc.reviewed_at,
            reviewedByName: doc.reviewed_by?.name,
        });
    }

    function renderCard(card: (typeof requirementCards)[number]) {
        const approved = card.docs.filter((d) => d.review_status === "approved").length;
        const rejected = card.docs.filter((d) => d.review_status === "rejected").length;
        const pending = card.docs.filter((d) => !d.review_status || d.review_status === "pending").length;
        return (
            <RequirementCard
                key={card.id}
                title={card.title}
                schoolYear={card.schoolYear}
                totalStudents={card.docs.length}
                approved={approved}
                pending={pending}
                rejected={rejected}
                onClick={() => setSelectedReqId(card.id)}
            />
        );
    }

    return (
        <>
            <motion.section variants={container} initial="hidden" animate="show" className="space-y-6">

                {/* ── Page header ──────────────────────────────── */}
                <motion.div variants={item} className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        {!isDean && (
                            <Link
                                to={yearId ? `/documents?school_year_id=${yearId}` : "/documents"}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] transition mb-3"
                            >
                                <ArrowLeft size={16} /> Back to Departments
                            </Link>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-3xl font-semibold tracking-tight">Document Requirements</h2>
                            {shownYear && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-2xs">
                                    <CalendarDays size={13} className="text-amber-600" />
                                    S.Y. {shownYear.name}
                                    {shownYear.semester && (
                                        <span className="font-normal text-amber-700">· {shownYear.semester}</span>
                                    )}
                                </span>
                            )}
                        </div>
                        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                            View submissions by interns for each required document in this department.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowYearModal(true)}
                            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium shadow-xs transition hover:border-[var(--color-accent)] hover:bg-slate-50 ${!isCurrentYear && selectedYear
                                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                                : "border-[var(--color-line)] bg-white text-[var(--color-ink)]"
                                }`}
                        >
                            <History size={15} className="text-[var(--color-accent)]" />
                            School Year
                            {!isCurrentYear && selectedYear && (
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
                                    S.Y. {selectedYear.name}
                                </span>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* ── Past school year filter banner ────────────────── */}
                {!isCurrentYear && selectedYear && (
                    <motion.div
                        variants={item}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                    >
                        <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                            <History size={15} className="text-amber-600" />
                            Showing S.Y. {selectedYear.name}
                            {selectedYear.semester ? ` · ${selectedYear.semester}` : ""}
                        </p>
                        <button
                            type="button"
                            onClick={clearYear}
                            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                        >
                            <X size={12} /> Clear filter
                        </button>
                    </motion.div>
                )}

                {/* ── Stat cards ───────────────────────────────── */}
                <motion.div variants={item} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {[
                        { label: "Total Submissions", value: totalSubmitted, icon: Users, color: "text-[var(--color-accent)] bg-[var(--color-accent-soft)]" },
                        { label: "Approved", value: totalApproved, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
                        { label: "Pending Review", value: totalPending, icon: Clock, color: "text-amber-600 bg-amber-50" },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <article key={label} className="flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur">
                            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm ${color}`}>
                                <Icon size={18} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold tracking-tight">{value}</p>
                                <p className="text-xs font-medium text-[var(--color-muted)]">{label}</p>
                            </div>
                        </article>
                    ))}
                </motion.div>

                {/* ── Error banner ─────────────────────────────── */}
                {isError && (
                    <motion.div variants={item} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-sm font-medium text-red-700">
                            Couldn't load documents. Please check your connection and try again.
                        </p>
                    </motion.div>
                )}

                {/* ── View toggle + search ─────────────────────── */}
                <motion.div variants={item} className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-slate-50/70 p-1">
                        {([
                            { key: "requirements", label: "Requirements", icon: FileText },
                            { key: "interns", label: "Intern progress", icon: UserCheck },
                        ] as const).map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={view === key}
                                onClick={() => {
                                    setView(key);
                                    setSearch("");
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${view === key
                                    ? "bg-white text-[var(--color-accent)] shadow-sm ring-1 ring-[var(--color-line)]"
                                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                                    }`}
                            >
                                <Icon size={13} /> {label}
                            </button>
                        ))}
                    </div>

                    <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm text-[var(--color-muted)] shadow-sm transition focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20">
                        <Search size={14} />
                        <input
                            type="search"
                            placeholder={
                                view === "interns"
                                    ? "Search by intern name, ID, or section…"
                                    : "Search document requirements…"
                            }
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch("")} className="hover:text-[var(--color-ink)]">
                                <X size={12} />
                            </button>
                        )}
                    </label>
                </motion.div>

                {/* ── Intern progress / Cards grouped: Common / Departmental ── */}
                {view === "interns" ? (
                    <motion.div variants={item}>
                        <InternProgressPanel
                            interns={progressQuery.data?.data ?? []}
                            totalRequirements={progressQuery.data?.total_requirements ?? 0}
                            search={search}
                            isLoading={progressQuery.isLoading}
                            isError={progressQuery.isError}
                            onSelectIntern={setSelectedIntern}
                        />
                    </motion.div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-24 text-[var(--color-muted)]">
                        <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                        <p className="text-sm">Loading requirements…</p>
                    </div>
                ) : filteredCards.length === 0 ? (
                    <motion.div variants={item} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-line)] py-24 text-center">
                        <BookOpen size={36} className="text-[var(--color-line)]" />
                        <p className="text-sm font-medium text-[var(--color-muted)]">
                            {search
                                ? "No requirements match your search."
                                : !isCurrentYear && selectedYear
                                    ? `No document requirements for S.Y. ${selectedYear.name}.`
                                    : "No document requirements found for this department."}
                        </p>
                        {search && (
                            <button type="button" onClick={() => setSearch("")} className="text-xs font-semibold text-[var(--color-accent)] hover:underline">
                                Clear search
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div variants={container} className="space-y-8">
                        {commonCards.length > 0 && (
                            <RequirementGroup
                                title="Common Requirements"
                                description="Required of every intern, regardless of department"
                                icon={Globe}
                                iconClass="bg-sky-50 text-sky-600"
                                count={commonCards.length}
                            >
                                {commonCards.map((card) => renderCard(card))}
                            </RequirementGroup>
                        )}

                        {departmentalCards.length > 0 && (
                            <RequirementGroup
                                title="Departmental Requirements"
                                description="Specific to this department"
                                icon={Building2}
                                iconClass="bg-violet-50 text-violet-600"
                                count={departmentalCards.length}
                            >
                                {departmentalCards.map((card) => renderCard(card))}
                            </RequirementGroup>
                        )}
                    </motion.div>
                )}
            </motion.section>

            {/* ── School year picker modal ──────────────────────── */}
            <AnimatePresence>
                {showYearModal && (
                    <DocumentHistoryModal
                        key="school-year-modal"
                        selectedId={yearId}
                        onSelect={applyYear}
                        onClose={() => setShowYearModal(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── Requirement submissions modal ─────────────────── */}
            <AnimatePresence>
                {selectedReq && (
                    <RequirementModal
                        key="req-modal"
                        requirementTitle={selectedReq.title}
                        docs={selectedReq.docs}
                        onClose={() => setSelectedReqId(null)}
                        onPreview={openPreview}
                    />
                )}
            </AnimatePresence>

            {/* ── Intern approved documents modal ───────────────── */}
            <AnimatePresence>
                {selectedIntern && (
                    <InternDocsModal
                        key="intern-docs-modal"
                        intern={selectedIntern}
                        docs={internApprovedDocs}
                        onClose={() => setSelectedIntern(null)}
                        onPreview={openPreview}
                    />
                )}
            </AnimatePresence>

            {/* ── Document preview modal ───────────────────────── */}
            <AnimatePresence>
                {previewDoc && (
                    <DocumentPreviewModal
                        key="document-preview"
                        visible={!!previewDoc}
                        onClose={() => setPreviewDoc(null)}
                        fetchUrl={`${import.meta.env.VITE_API_URL?.replace(/\/$/, "")}/student/documents/${previewDoc.id}/view`}
                        title={previewDoc.title}
                        filename={previewDoc.filename}
                        fileSize={previewDoc.fileSize}
                        mimeType={previewDoc.mimeType}
                        notes={previewDoc.notes}
                        status={previewDoc.status}
                        rejectionReason={previewDoc.rejectionReason}
                        reviewedAt={previewDoc.reviewedAt}
                        reviewedByName={previewDoc.reviewedByName}
                        isSubmittingReview={updateStatus.isPending}
                        onApprove={async () => {
                            await updateStatus.mutateAsync({ id: previewDoc.id, status: "approved" });
                            setPreviewDoc((prev) => prev ? { ...prev, status: "approved" } : prev);
                        }}
                        onReject={async (reason) => {
                            await updateStatus.mutateAsync({ id: previewDoc.id, status: "rejected", rejection_reason: reason });
                            setPreviewDoc((prev) => prev ? { ...prev, status: "rejected", rejectionReason: reason } : prev);
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}