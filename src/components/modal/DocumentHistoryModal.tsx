import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Check, Loader2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

export type SchoolYear = {
    id: number;
    name: string;
    semester?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_active?: boolean;
};

interface Props {
    /** Currently applied school year filter, if any */
    selectedId: number | null;
    /** Called with the school year the user clicked */
    onSelect: (schoolYear: SchoolYear) => void;
    onClose: () => void;
}

export function DocumentHistoryModal({ selectedId, onSelect, onClose }: Props) {
    const { token } = useAuth();

    const {
        data: schoolYears,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["school-years", "document-history"],
        queryFn: () => apiRequest<SchoolYear[]>("/school-years", { token }),
        enabled: Boolean(token),
    });

    // Newest first, excluding the current year and any draft/future school years
   const sortedYears = useMemo(() => {
        const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

        return (schoolYears ?? [])
            .filter((sy) => sy.end_date != null && sy.end_date < today)
            .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
    }, [schoolYears]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Select a school year"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-4">
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                            Requirements history
                        </h3>
                        <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                            Pick a school year to view its document requirements.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--color-muted)] transition hover:bg-slate-50 hover:text-[var(--color-ink)]"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* School year list */}
                <div className="min-h-[160px] flex-1 overflow-y-auto p-3">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center">
                            <Loader2
                                className="animate-spin text-[var(--color-accent)]"
                                size={24}
                            />
                        </div>
                    ) : isError ? (
                        <p className="m-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            Couldn't load school years. Please try again.
                        </p>
                    ) : sortedYears.length === 0 ? (
                        <p className="py-10 text-center text-sm text-[var(--color-muted)]">
                            No school years found.
                        </p>
                    ) : (
                        <ul className="space-y-1">
                            {sortedYears.map((sy) => {
                                const selected = sy.id === selectedId;
                                return (
                                    <li key={sy.id}>
                                        <button
                                            type="button"
                                            onClick={() => onSelect(sy)}
                                            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${selected
                                                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                                                    : "border-transparent hover:bg-slate-50"
                                                }`}
                                        >
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-[var(--color-muted)]">
                                                <CalendarDays size={16} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                                                    S.Y. {sy.name}
                                                </span>
                                                {sy.semester && (
                                                    <span className="block truncate text-xs text-[var(--color-muted)]">
                                                        {sy.semester}
                                                    </span>
                                                )}
                                            </span>
                                            {sy.is_active && (
                                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                    Current
                                                </span>
                                            )}
                                            {selected && (
                                                <Check
                                                    size={16}
                                                    className="shrink-0 text-[var(--color-accent)]"
                                                />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}