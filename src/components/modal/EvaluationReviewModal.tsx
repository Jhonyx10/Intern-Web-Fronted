import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Star, User, Calendar, GraduationCap, Award, Building2, UserCheck } from "lucide-react";
import type { EvaluationSubmission } from "@/lib/queries/evaluation";

interface EvaluationReviewModalProps {
    isOpen: boolean;
    submission: EvaluationSubmission | null;
    templateTitle?: string;
    onClose: () => void;
}

function formatDateTime(value: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function scoreBadgeClass(score: number | null) {
    if (score === null) return "bg-slate-100 text-slate-600";
    if (score >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
}

export const EvaluationReviewModal: React.FC<EvaluationReviewModalProps> = ({
    isOpen,
    submission,
    templateTitle,
    onClose,
}) => {
    if (!submission) return null;

    const items = [...(submission.items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const responses = submission.responses ?? {};

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Modal Box */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="review-modal-title"
                        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-[var(--color-line)] bg-slate-50/70 p-6">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-1">
                                    <UserCheck size={14} />
                                    <span>Supervisor Evaluation</span>
                                </div>
                                <h2
                                    id="review-modal-title"
                                    className="text-xl font-bold tracking-tight text-[var(--color-ink)]"
                                >
                                    {submission.student?.name ?? "Student Evaluation"}
                                </h2>
                                <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-[var(--color-muted)]">
                                    {submission.student?.student_number && (
                                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-700">
                                            ID: {submission.student.student_number}
                                        </span>
                                    )}
                                    {submission.course_code && (
                                        <span className="flex items-center gap-1 rounded bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                            <GraduationCap size={13} />
                                            {submission.course_code}
                                            {submission.section_code ? ` (${submission.section_code})` : ""}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-[var(--color-muted)] transition hover:bg-slate-200/60 hover:text-[var(--color-ink)]"
                                aria-label="Close modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Metadata Banner */}
                        <div className="grid grid-cols-2 gap-4 border-b border-[var(--color-line)] bg-white p-5 sm:grid-cols-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <User size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                                        Supervisor
                                    </p>
                                    <p className="text-xs font-semibold text-[var(--color-ink)] truncate max-w-[120px]" title={submission.evaluator ?? "—"}>
                                        {submission.evaluator ?? "—"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                                        Company
                                    </p>
                                    <p className="text-xs font-semibold text-[var(--color-ink)] truncate max-w-[120px]" title={submission.company_name ?? "—"}>
                                        {submission.company_name ?? "—"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                                        Submitted
                                    </p>
                                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                                        {formatDateTime(submission.submitted_at)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <Award size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                                        Score
                                    </p>
                                    <span
                                        className={`mt-0.5 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${scoreBadgeClass(
                                            submission.computed_score
                                        )}`}
                                    >
                                        {submission.computed_score === null
                                            ? "No rating"
                                            : `${submission.computed_score}%`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Answers List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {templateTitle && (
                                <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide border-b pb-2">
                                    Template: {templateTitle}
                                </p>
                            )}

                            {items.length === 0 ? (
                                <p className="text-center text-xs text-[var(--color-muted)] py-8">
                                    No item details available for this submission.
                                </p>
                            ) : (
                                items.map((item, index) => {
                                    const rawVal = responses[item.id];
                                    const options = item.options ? JSON.parse(item.options) : null;

                                    return (
                                        <div
                                            key={item.id}
                                            className="rounded-xl border border-[var(--color-line)] bg-white p-4 space-y-2"
                                        >
                                            <p className="text-xs font-semibold text-[var(--color-ink)]">
                                                <span className="text-[var(--color-accent)] mr-1">
                                                    {index + 1}.
                                                </span>
                                                {item.label}
                                            </p>

                                            {/* Rating render */}
                                            {item.item_type === "rating" && (
                                                <div className="flex items-center gap-1.5 pt-1">
                                                    {Array.from({
                                                        length: (options?.max ?? 5) - (options?.min ?? 1) + 1,
                                                    }).map((_, i) => {
                                                        const ratingVal = (options?.min ?? 1) + i;
                                                        const isSelected = Number(rawVal) === ratingVal;
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${isSelected
                                                                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                                                                    : "bg-slate-100 text-slate-400"
                                                                    }`}
                                                            >
                                                                {ratingVal}
                                                            </div>
                                                        );
                                                    })}
                                                    <span className="ml-2 text-xs font-medium text-[var(--color-ink)]">
                                                        Selected: {rawVal ?? "—"}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Single choice render */}
                                            {item.item_type === "single_choice" && (
                                                <p className="text-xs font-medium text-[var(--color-ink)] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                                    {rawVal ? String(rawVal) : "No response"}
                                                </p>
                                            )}

                                            {/* Multiple choice render */}
                                            {item.item_type === "multiple_choice" && (
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {Array.isArray(rawVal) && rawVal.length > 0 ? (
                                                        rawVal.map((choice: string) => (
                                                            <span
                                                                key={choice}
                                                                className="rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700"
                                                            >
                                                                ✓ {choice}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-[var(--color-muted)] italic">
                                                            No options selected
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Text / Textarea render */}
                                            {(item.item_type === "text" || item.item_type === "textarea") && (
                                                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
                                                    {rawVal ? String(rawVal) : <span className="italic text-[var(--color-muted)]">No response provided</span>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-[var(--color-line)] bg-slate-50/70 p-4 text-right">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-[var(--color-line)] bg-white px-5 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-slate-100"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
