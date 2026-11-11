import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ClipboardList, Eye, X } from "lucide-react";
import type { EvaluationHistoryYear } from "@/lib/queries/evaluation";

export function EvaluationYearTemplatesModal({
    year,
    onClose,
    onPreview,
    onViewSubmissions,
}: {
    year: EvaluationHistoryYear | null;
    onClose: () => void;
    onPreview: (templateId: number) => void;
    onViewSubmissions?: (templateId: number, schoolYear: string) => void;
}) {
    return (
        <AnimatePresence>
            {year && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between border-b border-[var(--color-line)] px-6 py-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                                    Templates used
                                </p>
                                <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-[var(--color-ink)]">
                                    <CalendarDays size={18} className="text-[var(--color-accent)]" />
                                    S.Y. {year.name}
                                    {year.semester && (
                                        <span className="text-sm font-normal text-[var(--color-muted)]">· {year.semester}</span>
                                    )}
                                </h2>
                            </div>
                            <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 divide-y divide-[var(--color-line)] overflow-y-auto">
                            {year.templates.map((t) => (
                                <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-[var(--color-ink)]">{t.title}</p>
                                        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                                            {t.items_count} item{t.items_count === 1 ? "" : "s"} · {t.assigned_count} assigned ·{" "}
                                            <span className="text-emerald-700">{t.submitted_count} submitted</span> ·{" "}
                                            <span className="text-amber-700">{t.pending_count} pending</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onPreview(t.id)}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 text-xs font-semibold text-[var(--color-ink)] hover:bg-slate-50"
                                        >
                                            <Eye size={13} /> Preview
                                        </button>
                                        {onViewSubmissions && (
                                            <button
                                                type="button"
                                                onClick={() => onViewSubmissions(t.id, year.name)}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 text-xs font-semibold text-[var(--color-ink)] hover:bg-slate-50"
                                            >
                                                <ClipboardList size={13} /> Submissions
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}