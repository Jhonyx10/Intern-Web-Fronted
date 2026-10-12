import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    X,
    Layers,
    Search,
    Repeat,
    CalendarDays,
    FileText,
    CheckCircle2,
    XCircle,
    Calendar,
} from "lucide-react";
import type { DocumentRequirement } from "@/lib/queries/documents";
import { useTheme } from "@/context/ThemeContext";

interface CommonDocumentsModalProps {
    visible: boolean;
    onClose: () => void;
    requirements: DocumentRequirement[];
}

export function CommonDocumentsModal({
    visible,
    onClose,
    requirements,
}: CommonDocumentsModalProps) {
    const { themeColor } = useTheme();
    const [search, setSearch] = useState("");

    // Filter for common documents
    const commonRequirements = useMemo(() => {
        return requirements.filter(
            (req) => req.document_type === "common" || !req.document_type
        );
    }, [requirements]);

    const filtered = useMemo(() => {
        if (!search.trim()) return commonRequirements;
        const q = search.toLowerCase();
        return commonRequirements.filter(
            (req) =>
                req.title.toLowerCase().includes(q) ||
                (req.description && req.description.toLowerCase().includes(q))
        );
    }, [commonRequirements, search]);

    if (!visible) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--color-line)] bg-white shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                            style={{
                                backgroundColor: "var(--color-accent-soft)",
                                color: themeColor,
                            }}
                        >
                            <Layers size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-[var(--color-ink)]">
                                    Common Document Requirements
                                </h2>
                                <span
                                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                    style={{
                                        backgroundColor: "var(--color-accent-soft)",
                                        color: themeColor,
                                    }}
                                >
                                    {commonRequirements.length}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--color-muted)] mt-0.5">
                                Requirements shared across all academic departments & programs
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-slate-100 hover:text-[var(--color-ink)] transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="border-b border-[var(--color-line)] bg-slate-50/50 px-6 py-3">
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search common documents…"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[var(--color-accent)]"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* List Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                                <FileText size={22} />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">
                                {search ? "No matching common documents" : "No common documents found"}
                            </p>
                            <p className="text-xs text-slate-400 max-w-xs mt-1">
                                {search
                                    ? "Try a different search term or clear the filter."
                                    : "Common requirements will appear here once created with type 'Common'."}
                            </p>
                        </div>
                    ) : (
                        filtered.map((req) => {
                            const recurrence = req.recurrence ?? "none";
                            const createdSY = (req as any).created_school_year;
                            const anchoredCount = (req as any).anchored_school_years_count ?? 1;

                            return (
                                <div
                                    key={req.id}
                                    className="rounded-xl border border-[var(--color-line)] bg-white p-4 shadow-2xs hover:border-[var(--color-accent)] transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                                                    {req.title}
                                                </h4>

                                                {/* Status chip */}
                                                {req.is_active ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                                        <CheckCircle2 size={10} /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                                        <XCircle size={10} /> Inactive
                                                    </span>
                                                )}

                                                {/* Recurrence chip */}
                                                {recurrence === "daily" && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                                        <CalendarDays size={10} /> Daily
                                                    </span>
                                                )}
                                                {recurrence === "weekly" && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                                        <Repeat size={10} /> Weekly
                                                    </span>
                                                )}
                                                {recurrence === "none" && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                                        One-time
                                                    </span>
                                                )}
                                            </div>

                                            {req.description && (
                                                <p className="text-xs text-[var(--color-muted)] line-clamp-2 mt-1">
                                                    {req.description}
                                                </p>
                                            )}

                                            {/* Meta chips: S.Y. and Usage */}
                                            <div className="flex items-center gap-3 mt-3 text-[11px] text-[var(--color-muted)]">
                                                {createdSY && (
                                                    <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 rounded-md px-2 py-0.5">
                                                        <Calendar size={11} /> S.Y. {createdSY}
                                                    </span>
                                                )}
                                                <span>
                                                    Anchored in{" "}
                                                    <strong className="text-[var(--color-ink)]">
                                                        {anchoredCount}
                                                    </strong>{" "}
                                                    School Year{anchoredCount !== 1 ? "s" : ""}
                                                </span>
                                                <span>&bull;</span>
                                                <span>All Departments</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-[var(--color-line)] bg-slate-50/50 px-6 py-3.5">
                    <p className="text-xs text-[var(--color-muted)]">
                        Showing {filtered.length} of {commonRequirements.length} common requirements
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
