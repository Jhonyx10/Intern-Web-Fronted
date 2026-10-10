import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Star, User, Calendar, Loader2, AlertCircle } from "lucide-react";
import { useEvaluationTemplate } from "@/lib/queries/evaluation";
import { useTheme } from "@/context/ThemeContext";

type ItemType =
    | "rating"
    | "single_choice"
    | "multiple_choice"
    | "text"
    | "textarea";

interface RatingOptions {
    min: number;
    max: number;
}

interface ChoiceOptions {
    choices: string[];
}

const parseOptions = (
    raw: string | null
): RatingOptions | ChoiceOptions | null => {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const typeLabel: Record<ItemType, string> = {
    rating: "Rating scale",
    single_choice: "Single choice",
    multiple_choice: "Multiple choice",
    text: "Short text",
    textarea: "Paragraph",
};

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

interface EvaluationPreviewModalProps {
    isOpen: boolean;
    templateId: number | string | null;
    onClose: () => void;
}

export const EvaluationPreviewModal: React.FC<EvaluationPreviewModalProps> = ({
    isOpen,
    templateId,
    onClose,
}) => {
    const {
        data: template,
        isLoading,
        isError,
        error,
    } = useEvaluationTemplate(templateId ?? undefined);

    const { themeColor } = useTheme();

    const sortedItems = useMemo(
        () =>
            [...(template?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        [template?.items]
    );

    if (!isOpen || !templateId) return null;

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
                        aria-labelledby="preview-modal-title"
                        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-[var(--color-line)] bg-slate-50/70 p-6">
                            <div className="pr-6">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2
                                        id="preview-modal-title"
                                        className="text-lg font-bold text-gray-900 truncate"
                                    >
                                        {template?.title ?? "Evaluation Questionnaire Preview"}
                                    </h2>
                                    {template && (
                                        <span
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${template.is_active
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-gray-100 text-gray-500"
                                                }`}
                                        >
                                            {template.is_active ? "Active" : "Inactive"}
                                        </span>
                                    )}
                                </div>

                                {template && (
                                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                        {template.creator?.name && (
                                            <span className="flex items-center gap-1">
                                                <User className="w-3.5 h-3.5 text-indigo-500" />
                                                {template.creator.name}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Created {formatDate(template.created_at)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-slate-200/60 hover:text-gray-700"
                                aria-label="Close modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
                                    <span className="text-xs">Loading template preview…</span>
                                </div>
                            ) : isError || !template ? (
                                <div className="p-6 text-center bg-rose-50 border border-dashed border-rose-200 rounded-xl">
                                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-rose-700">
                                        Couldn't load template preview.
                                    </p>
                                    <p className="text-[11px] text-rose-400 mt-0.5">
                                        {(error as any)?.response?.data?.message ||
                                            "An error occurred while fetching the template."}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {template.description && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 text-xs text-gray-600 leading-relaxed">
                                            {template.description}
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide border-b pb-2">
                                            Questions ({sortedItems.length})
                                        </h3>

                                        {sortedItems.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic py-4 text-center">
                                                This template has no questions yet.
                                            </p>
                                        ) : (
                                            <ol className="divide-y divide-gray-100">
                                                {sortedItems.map((item, index) => {
                                                    const options = parseOptions(item.options);
                                                    const ratingOptions =
                                                        item.item_type === "rating"
                                                            ? (options as RatingOptions | null)
                                                            : null;
                                                    const choiceOptions =
                                                        item.item_type === "single_choice" ||
                                                            item.item_type === "multiple_choice"
                                                            ? (options as ChoiceOptions | null)
                                                            : null;
                                                    const isRating = item.item_type === "rating";
                                                    const isChoice =
                                                        item.item_type === "single_choice" ||
                                                        item.item_type === "multiple_choice";

                                                    return (
                                                        <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                                                            <div
                                                                className={
                                                                    isRating || isChoice
                                                                        ? "flex items-start justify-between gap-6"
                                                                        : ""
                                                                }
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-semibold text-gray-900 leading-snug">
                                                                        {index + 1}. {item.label}
                                                                        {Boolean(item.is_required) && (
                                                                            <span className="text-rose-500"> *</span>
                                                                        )}
                                                                    </p>
                                                                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-1">
                                                                        {typeLabel[item.item_type]}
                                                                    </p>
                                                                </div>

                                                                {isRating && (
                                                                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                                                        {Array.from(
                                                                            {
                                                                                length:
                                                                                    (ratingOptions?.max ?? 5) -
                                                                                    (ratingOptions?.min ?? 1) +
                                                                                    1,
                                                                            },
                                                                            (_, i) => (
                                                                                <Star
                                                                                    key={i}
                                                                                    className="w-3.5 h-3.5"
                                                                                    style={{ color: themeColor }}
                                                                                    fill={themeColor}
                                                                                />
                                                                            )
                                                                        )}
                                                                        <span className="text-[11px] text-gray-400 ml-1 font-mono">
                                                                            {ratingOptions?.min ?? 1}–{ratingOptions?.max ?? 5}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {isChoice && (
                                                                    <ul className="space-y-1 text-xs text-gray-600 shrink-0 text-right">
                                                                        {(choiceOptions?.choices ?? []).map((choice, ci) => (
                                                                            <li
                                                                                key={ci}
                                                                                className="flex items-center justify-end gap-1.5 text-xs"
                                                                            >
                                                                                {choice}
                                                                                <span style={{ color: themeColor }}>
                                                                                    {item.item_type === "single_choice" ? "○" : "☐"}
                                                                                </span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>

                                                            {item.item_type === "text" && (
                                                                <div className="h-9 mt-2 bg-gray-50 border border-gray-200 rounded-lg w-full max-w-sm" />
                                                            )}

                                                            {item.item_type === "textarea" && (
                                                                <div className="h-20 mt-2 bg-gray-50 border border-gray-200 rounded-lg w-full" />
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ol>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-[var(--color-line)] bg-slate-50/70 p-4 text-right">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-[var(--color-line)] bg-white px-5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-slate-100"
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
