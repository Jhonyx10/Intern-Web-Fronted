import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Clock, Loader2, X, Zap } from "lucide-react";

type EditableLog = {
    id: number;
    time_in: string | null;
    break_out: string | null;
    break_in: string | null;
    time_out: string | null;
    needs_correction?: boolean;
};

export type TimeLogEditInput = {
    time_in: string; // HH:mm
    break_out: string | null;
    break_in: string | null;
    time_out: string | null;
    reason: string;
};

type Props = {
    log: EditableLog | null;
    /** Scheduled end of day, e.g. "17:00:00". Offered as a one-tap shortcut. */
    scheduledTimeOut?: string | null;
    isSaving?: boolean;
    onClose: () => void;
    /** Receives every time as "HH:mm" (or null when empty) and the supervisor's reason. */
    onSave: (input: TimeLogEditInput) => void;
};

type FieldKey = "time_in" | "break_out" | "break_in" | "time_out";


function fmtDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function hhmmToLabel(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ISO string -> local "HH:mm" for <input type="time">
function toHm(iso: string | null | undefined) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function TimeField({
    label,
    value,
    onChange,
    onEnter,
    invalid,
    required,
    autoFocus,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    onEnter: () => void;
    invalid?: boolean;
    required?: boolean;
    autoFocus?: boolean;
    disabled?: boolean;
}) {
    return (
        <label
            className={`rounded-xl border px-4 py-3 transition-colors focus-within:ring-2 ${invalid
                ? "border-red-300 bg-red-50/50 focus-within:ring-red-200"
                : "border-[var(--color-line)] bg-white focus-within:border-[var(--color-accent)] focus-within:ring-[var(--color-accent)]/20"
                }`}
        >
            <span className="text-xs text-[var(--color-muted)]">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </span>
            <input
                type="time"
                autoFocus={autoFocus}
                disabled={disabled}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onEnter();
                }}
                className="mt-0.5 block w-full bg-transparent text-lg font-semibold tabular-nums text-[var(--color-ink)] outline-none disabled:opacity-60"
            />
        </label>
    );
}

export function UpdateTimeOutModal({
    log,
    scheduledTimeOut,
    isSaving = false,
    onClose,
    onSave,
}: Props) {
    const reduce = useReducedMotion();
    const [timeIn, setTimeIn] = useState("");
    const [breakOut, setBreakOut] = useState("");
    const [breakIn, setBreakIn] = useState("");
    const [timeOut, setTimeOut] = useState("");
    const [reason, setReason] = useState("");

    // Keep the last log around so the content doesn't vanish during the exit animation.
    const [lastLog, setLastLog] = useState<EditableLog | null>(log);
    useEffect(() => {
        if (log) {
            setLastLog(log);
            setTimeIn(toHm(log.time_in));
            setBreakOut(toHm(log.break_out));
            setBreakIn(toHm(log.break_in));
            // An auto-closed log holds a placeholder time out, so start empty
            setTimeOut(log.needs_correction ? "" : toHm(log.time_out));
            setReason("");
        }
    }, [log?.id]);
    const data = log ?? lastLog;
    const needsTimeOut = Boolean(data?.needs_correction);

    // Close on Escape
    useEffect(() => {
        if (!log) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isSaving) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [log, isSaving, onClose]);

    // Same ordering rules as the API: in < break out < break in < out
    const check = useMemo(() => {
        if (!timeIn) {
            return {
                error: { field: "time_in" as FieldKey, message: "Time in is required." },
                net: null as number | null,
                brk: 0,
            };
        }

        let error: { field: FieldKey; message: string } | null = null;

        if ((breakOut && !breakIn) || (!breakOut && breakIn)) {
            error = {
                field: breakOut ? "break_in" : "break_out",
                message: "Enter both break out and break in, or leave both empty.",
            };
        } else if (breakOut && breakOut <= timeIn) {
            error = {
                field: "break_out",
                message: `Break out must be after the time in (${hhmmToLabel(timeIn)}).`,
            };
        } else if (breakOut && breakIn && breakIn <= breakOut) {
            error = {
                field: "break_in",
                message: `Break in must be after the break out (${hhmmToLabel(breakOut)}).`,
            };
        } else if (timeOut && timeOut <= (breakIn || breakOut || timeIn)) {
            error = {
                field: "time_out",
                message: breakIn
                    ? `Time out must be after the break in (${hhmmToLabel(breakIn)}).`
                    : `Time out must be after the time in (${hhmmToLabel(timeIn)}).`,
            };
        }

        if (error || !timeOut) return { error, net: null, brk: 0 };

        const mins = (hm: string) => {
            const [h, m] = hm.split(":").map(Number);
            return h * 60 + m;
        };
        const brk = breakOut && breakIn ? mins(breakIn) - mins(breakOut) : 0;
        const net = Math.max(0, mins(timeOut) - mins(timeIn) - brk);
        return { error: null, net, brk };
    }, [timeIn, breakOut, breakIn, timeOut]);

    const scheduled = scheduledTimeOut ? scheduledTimeOut.slice(0, 5) : null;
    const canSave =
        !check.error &&
        Boolean(timeIn) &&
        (!needsTimeOut || Boolean(timeOut)) &&
        reason.trim().length > 0 &&
        !isSaving;
    const logDate = data?.time_in ? new Date(data.time_in) : null;

    function submit() {
        if (!canSave) return;
        onSave({
            time_in: timeIn,
            break_out: breakOut || null,
            break_in: breakIn || null,
            time_out: timeOut || null,
            reason: reason.trim(),
        });
    }

    const spring = reduce
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 420, damping: 32 };

    return (
        <AnimatePresence>
            {log && logDate && (
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
                        aria-labelledby="update-timelog-title"
                        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
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
                                    id="update-timelog-title"
                                    className="text-base font-semibold text-[var(--color-ink)]"
                                >
                                    Update time log
                                </h3>
                                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                                    {logDate.toLocaleDateString([], {
                                        weekday: "long",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                    . Fix any time that was missed or recorded wrong.
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

                        {/* Time fields */}
                        <div className="mt-5 grid grid-cols-2 gap-3 px-6">
                            <TimeField
                                label="Time in"
                                required
                                autoFocus={!needsTimeOut}
                                value={timeIn}
                                onChange={setTimeIn}
                                onEnter={submit}
                                disabled={isSaving}
                                invalid={check.error?.field === "time_in"}
                            />
                            <TimeField
                                label="Time out"
                                required={needsTimeOut}
                                autoFocus={needsTimeOut}
                                value={timeOut}
                                onChange={setTimeOut}
                                onEnter={submit}
                                disabled={isSaving}
                                invalid={check.error?.field === "time_out"}
                            />
                            <TimeField
                                label="Break out"
                                value={breakOut}
                                onChange={setBreakOut}
                                onEnter={submit}
                                disabled={isSaving}
                                invalid={check.error?.field === "break_out"}
                            />
                            <TimeField
                                label="Break in"
                                value={breakIn}
                                onChange={setBreakIn}
                                onEnter={submit}
                                disabled={isSaving}
                                invalid={check.error?.field === "break_in"}
                            />
                        </div>

                        {/* Shortcuts */}
                        <div className="flex flex-wrap items-center gap-2 px-6 pt-3">
                            {scheduled && timeOut !== scheduled && (
                                <button
                                    type="button"
                                    onClick={() => setTimeOut(scheduled)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                                >
                                    <Zap size={12} />
                                    Use scheduled end, {hhmmToLabel(scheduled)}
                                </button>
                            )}
                            {(breakOut || breakIn) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBreakOut("");
                                        setBreakIn("");
                                    }}
                                    className="rounded-full px-3 py-1 text-xs font-medium text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
                                >
                                    Clear break
                                </button>
                            )}
                        </div>

                        {/* Live result / validation */}
                        <div className="min-h-[68px] px-6 pt-4">
                            <AnimatePresence mode="wait" initial={false}>
                                {!check.error && check.net !== null && (
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
                                            {check.brk > 0 && (
                                                <p className="text-xs text-emerald-700/70">
                                                    after {fmtDuration(check.brk)} break
                                                </p>
                                            )}
                                        </div>
                                        <motion.p
                                            key={check.net}
                                            initial={{ scale: reduce ? 1 : 1.12 }}
                                            animate={{ scale: 1 }}
                                            transition={spring}
                                            className="text-xl font-bold tabular-nums text-emerald-800"
                                        >
                                            {fmtDuration(check.net)}
                                        </motion.p>
                                    </motion.div>
                                )}
                                {check.error && (
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
                                        {check.error.message}
                                    </motion.div>
                                )}
                                {!check.error && check.net === null && (
                                    <motion.p
                                        key="hint"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="px-1 text-xs text-[var(--color-muted)]"
                                    >
                                        {needsTimeOut
                                            ? "Enter the actual time out. The time worked is calculated once you do."
                                            : "The time worked is calculated once there is a time out."}
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
                                    placeholder="e.g. Intern forgot to break out; confirmed 12:00 PM."
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
                                onClick={submit}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving && <Loader2 size={14} className="animate-spin" />}
                                {isSaving ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}