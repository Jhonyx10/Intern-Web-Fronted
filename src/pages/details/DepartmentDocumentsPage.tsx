import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileText,
    Search,
    Users,
    X,
    XCircle,
} from "lucide-react";
import {
    useSubmittedDocuments,
    useUpdateDocumentStatus,
    useCourseDocumentRequirements,
    type SubmittedDocument,
} from "@/lib/queries/documents";
import { DocumentPreviewModal } from "@/components/modal/DocumentPreviewModal";

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
                className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--color-line)] bg-white shadow-2xl overflow-hidden"
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
                                    {["Student", "Filename", "Submitted", "Status", ""].map((h) => (
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
                                                        {doc.student?.student_number && (
                                                            <p className="text-xs text-[var(--color-muted)]">{doc.student.student_number}</p>
                                                        )}
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

// ─── Requirement card ─────────────────────────────────────────────────────────
interface ReqCardProps {
    title: string;
    totalStudents: number;
    approved: number;
    pending: number;
    rejected: number;
    onClick: () => void;
}

function RequirementCard({ title, totalStudents, approved, pending, rejected, onClick }: ReqCardProps) {
    const pct = totalStudents > 0 ? Math.round((approved / totalStudents) * 100) : 0;

    return (
        <motion.button
            variants={item}
            type="button"
            onClick={onClick}
            className="group w-full text-left rounded-2xl border border-[var(--color-line)] bg-white/90 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur hover:border-[var(--color-accent)] hover:shadow-md transition-all duration-200 focus-visible:outline-[var(--color-accent)]"
        >
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                            <FileText size={14} />
                        </div>
                        <p className="truncate text-sm font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors">
                            {title}
                        </p>
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DepartmentDocumentsPage() {
    const { id } = useParams<{ id: string }>();
    const updateStatus = useUpdateDocumentStatus();

    const { data: requirements, isLoading: loadingReqs } = useCourseDocumentRequirements(id ? Number(id) : undefined);
    const { data: submittedDocs, isLoading: loadingDocs, isError } = useSubmittedDocuments({ course_id: id });

    const [search, setSearch] = useState("");
    const [selectedReqId, setSelectedReqId] = useState<number | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{
        id: number; title: string; filename?: string; fileSize?: number;
        mimeType?: string; notes?: string | null; status?: string;
        rejectionReason?: string | null; reviewedAt?: string | null; reviewedByName?: string | null;
    } | null>(null);

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

    // Build unified requirement list (from requirements endpoint + any uncategorized)
    const requirementCards = useMemo(() => {
        const cards: Array<{
            id: number | string; title: string; docs: SubmittedDocument[];
        }> = [];

        (requirements ?? []).forEach((req) => {
            cards.push({ id: req.id, title: req.title, docs: docsByReq.get(req.id) ?? [] });
        });

        // Show uncategorized docs submitted without a requirement
        const uncategorized = docsByReq.get("uncategorized") ?? [];
        if (uncategorized.length > 0) {
            cards.push({ id: "uncategorized", title: "Uncategorized Documents", docs: uncategorized });
        }

        return cards;
    }, [requirements, docsByReq]);

    // Apply search filter on displayed cards
    const filteredCards = useMemo(() => {
        if (!search.trim()) return requirementCards;
        return requirementCards.filter((c) =>
            c.title.toLowerCase().includes(search.toLowerCase())
        );
    }, [requirementCards, search]);

    const totalSubmitted = submittedDocs?.length ?? 0;
    const totalApproved = submittedDocs?.filter((d) => d.review_status === "approved").length ?? 0;
    const totalPending = submittedDocs?.filter((d) => !d.review_status || d.review_status === "pending").length ?? 0;

    const selectedReq = filteredCards.find((c) => c.id === selectedReqId) ?? null;

    const isLoading = loadingReqs || loadingDocs;

    return (
        <>
            <motion.section variants={container} initial="hidden" animate="show" className="space-y-6">

                {/* ── Page header ──────────────────────────────── */}
                <motion.div variants={item} className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Link
                            to="/documents"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] transition mb-3"
                        >
                            <ArrowLeft size={16} /> Back to Departments
                        </Link>
                        <h2 className="text-3xl font-semibold tracking-tight">Document Requirements</h2>
                        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                            View submissions by interns for each required document in this department.
                        </p>
                    </div>
                </motion.div>

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

                {/* ── Search ───────────────────────────────────── */}
                <motion.div variants={item}>
                    <label className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm text-[var(--color-muted)] focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20 transition shadow-sm">
                        <Search size={14} />
                        <input
                            type="search"
                            placeholder="Search document requirements…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent outline-none placeholder:text-[var(--color-muted)] text-[var(--color-ink)]"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch("")} className="hover:text-[var(--color-ink)]">
                                <X size={12} />
                            </button>
                        )}
                    </label>
                </motion.div>

                {/* ── Cards grid ───────────────────────────────── */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-24 text-[var(--color-muted)]">
                        <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                        <p className="text-sm">Loading requirements…</p>
                    </div>
                ) : filteredCards.length === 0 ? (
                    <motion.div variants={item} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-line)] py-24 text-center">
                        <BookOpen size={36} className="text-[var(--color-line)]" />
                        <p className="text-sm font-medium text-[var(--color-muted)]">
                            {search ? "No requirements match your search." : "No document requirements found for this department."}
                        </p>
                        {search && (
                            <button type="button" onClick={() => setSearch("")} className="text-xs font-semibold text-[var(--color-accent)] hover:underline">
                                Clear search
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div variants={container} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCards.map((card) => {
                            const approved = card.docs.filter((d) => d.review_status === "approved").length;
                            const rejected = card.docs.filter((d) => d.review_status === "rejected").length;
                            const pending = card.docs.filter((d) => !d.review_status || d.review_status === "pending").length;
                            return (
                                <RequirementCard
                                    key={card.id}
                                    title={card.title}
                                    totalStudents={card.docs.length}
                                    approved={approved}
                                    pending={pending}
                                    rejected={rejected}
                                    onClick={() => setSelectedReqId(card.id as number)}
                                />
                            );
                        })}
                    </motion.div>
                )}
            </motion.section>

            {/* ── Requirement submissions modal ─────────────────── */}
            <AnimatePresence>
                {selectedReq && (
                    <RequirementModal
                        key="req-modal"
                        requirementTitle={selectedReq.title}
                        docs={selectedReq.docs}
                        onClose={() => setSelectedReqId(null)}
                        onPreview={(doc) => {
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
                        }}
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
