import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Clock, Loader2, X, Zap } from "lucide-react";

type EditableLog = {
    id: number;
    time_in: string | null;
    break_out: string | null;
    break_in: string | null;
};

type Props = {
    log: EditableLog | null;
    /** Scheduled end of day, e.g. "17:00:00". Offered as a one-tap shortcut. */
    scheduledTimeOut?: string | null;
    isSaving?: boolean;
    onClose: () => void;
    /** Receives the time as "HH:mm" and the supervisor's reason. */
    onSave: (timeOut: string, reason: string) => void;
};

function fmtClock(d: Date) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function hhmmToLabel(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function UpdateTimeOutModal({
    log,
    scheduledTimeOut,
    isSaving = false,
    onClose,
    onSave,
}: Props) {
    const reduce = useReducedMotion();
    const [value, setValue] = useState("");
    const [reason, setReason] = useState("");

    // Keep the last log around so the content doesn't vanish during the exit animation.
    const [lastLog, setLastLog] = useState<EditableLog | null>(log);
    useEffect(() => {
        if (log) {
            setLastLog(log);
            setValue("");
            setReason("");
        }
    }, [log?.id]);
    const data = log ?? lastLog;

    // Close on Escape
    useEffect(() => {
        if (!log) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isSaving) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [log, isSaving, onClose]);

    const result = useMemo(() => {
        if (!data?.time_in || !value) return null;
        const [h, m] = value.split(":").map(Number);
        const timeIn = new Date(data.time_in);
        const out = new Date(timeIn);
        out.setHours(h, m, 0, 0);

        const gross = Math.round((out.getTime() - timeIn.getTime()) / 60000);
        const brk =
            data.break_out && data.break_in
                ? Math.max(
                    0,
                    Math.round(
                        (new Date(data.break_in).getTime() -
                            new Date(data.break_out).getTime()) /
                        60000
                    )
                )
                : 0;

        return { valid: gross > 0, net: Math.max(0, gross - brk), brk };
    }, [data, value]);

    const scheduled = scheduledTimeOut ? scheduledTimeOut.slice(0, 5) : null;
    const canSave =
        Boolean(result?.valid) && reason.trim().length > 0 && !isSaving;
    const timeIn = data?.time_in ? new Date(data.time_in) : null;

    const spring = reduce
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 420, damping: 32 };

    return (
        <AnimatePresence>
            {log && timeIn && (
                <motion.div
                    key="backdrop"
                    className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.18 }}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget && !isSaving) onClose();
                    }}
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="update-timeout-title"
                        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97 }}
                        transition={spring}
                    >
                        {/* Header */}
                        <div className="flex items-start gap-3 px-6 pt-6">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-600/20">
                                <Clock size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3
                                    id="update-timeout-title"
                                    className="text-base font-semibold text-[var(--color-ink)]"
                                >
                                    Update time out
                                </h3>
                                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                                    {timeIn.toLocaleDateString([], {
                                        weekday: "long",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                    . Enter when the intern actually left.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                aria-label="Close"
                                className="rounded-lg p-1.5 text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)] disabled:opacity-50"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Time in → time out */}
                        <div className="mt-5 grid grid-cols-2 gap-3 px-6">
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <p className="text-xs text-[var(--color-muted)]">Timed in</p>
                                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--color-ink)]">
                                    {fmtClock(timeIn)}
                                </p>
                            </div>
                            <label
                                className={`rounded-xl border px-4 py-3 transition-colors focus-within:ring-2 ${result && !result.valid
                                    ? "border-red-300 bg-red-50/50 focus-within:ring-red-200"
                                    : "border-[var(--color-line)] bg-white focus-within:border-[var(--color-accent)] focus-within:ring-[var(--color-accent)]/20"
                                    }`}
                            >
                                <span className="text-xs text-[var(--color-muted)]">
                                    Time out
                                </span>
                                <input
                                    type="time"
                                    autoFocus
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && canSave)
                                            onSave(value, reason.trim());
                                    }}
                                    className="mt-0.5 block w-full bg-transparent text-lg font-semibold tabular-nums text-[var(--color-ink)] outline-none"
                                />
                            </label>
                        </div>

                        {/* Shortcut */}
                        {scheduled && value !== scheduled && (
                            <div className="px-6 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setValue(scheduled)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                                >
                                    <Zap size={12} />
                                    Use scheduled end, {hhmmToLabel(scheduled)}
                                </button>
                            </div>
                        )}

                        {/* Live result / validation */}
                        <div className="min-h-[68px] px-6 pt-4">
                            <AnimatePresence mode="wait" initial={false}>
                                {result && result.valid && (
                                    <motion.div
                                        key="ok"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: reduce ? 0 : 0.15 }}
                                        className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-inset ring-emerald-600/15"
                                    >
                                        <div>
                                            <p className="text-xs text-emerald-700">Time worked</p>
                                            {result.brk > 0 && (
                                                <p className="text-xs text-emerald-700/70">
                                                    after {fmtDuration(result.brk)} break
                                                </p>
                                            )}
                                        </div>
                                        <motion.p
                                            key={result.net}
                                            initial={{ scale: reduce ? 1 : 1.12 }}
                                            animate={{ scale: 1 }}
                                            transition={spring}
                                            className="text-xl font-bold tabular-nums text-emerald-800"
                                        >
                                            {fmtDuration(result.net)}
                                        </motion.p>
                                    </motion.div>
                                )}
                                {result && !result.valid && (
                                    <motion.div
                                        key="err"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: reduce ? 0 : 0.15 }}
                                        role="alert"
                                        className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/15"
                                    >
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                        Time out must be after {fmtClock(timeIn)} on the same day.
                                    </motion.div>
                                )}
                                {!result && (
                                    <motion.p
                                        key="hint"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="px-1 text-xs text-[var(--color-muted)]"
                                    >
                                        The time worked is calculated once you pick a time out.
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Reason for the correction */}
                        <div className="px-6 pt-2">
                            <label className="block">
                                <span className="text-xs font-medium text-[var(--color-muted)]">
                                    Reason for correction{" "}
                                    <span className="text-red-500">*</span>
                                </span>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    maxLength={1000}
                                    rows={3}
                                    disabled={isSaving}
                                    placeholder="e.g. Intern forgot to time out; confirmed left at 5:00 PM."
                                    className="mt-1 block w-full resize-none rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 disabled:opacity-60"
                                />
                            </label>
                        </div>

                        {/* Footer */}
                        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--color-line)] bg-slate-50/60 px-6 py-4">
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={onClose}
                                className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-slate-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!canSave}
                                onClick={() => onSave(value, reason.trim())}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving && <Loader2 size={14} className="animate-spin" />}
                                {isSaving ? "Saving…" : "Save time out"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}