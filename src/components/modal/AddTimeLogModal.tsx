import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import type {
    SupervisorInternOption,
    ManualTimeLogInput,
} from "@/lib/queries/supervisor";

type Props = {
    open: boolean;
    interns: SupervisorInternOption[];
    isLoadingInterns: boolean;
    isSaving: boolean;
    defaultDate: string; // today, YYYY-MM-DD (also the max selectable date)
    onClose: () => void;
    onSave: (input: ManualTimeLogInput) => void;
};

const field =
    "w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20";
const label =
    "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]";

export function AddTimeLogModal({
    open,
    interns,
    isLoadingInterns,
    isSaving,
    defaultDate,
    onClose,
    onSave,
}: Props) {
    const [studentId, setStudentId] = useState("");
    const [date, setDate] = useState(defaultDate);
    const [timeIn, setTimeIn] = useState("");
    const [breakOut, setBreakOut] = useState("");
    const [breakIn, setBreakIn] = useState("");
    const [timeOut, setTimeOut] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Reset every time the modal opens
    useEffect(() => {
        if (!open) return;
        setStudentId("");
        setDate(defaultDate);
        setTimeIn("");
        setBreakOut("");
        setBreakIn("");
        setTimeOut("");
        setReason("");
        setError(null);
    }, [open, defaultDate]);

    if (!open) return null;

    function validate(): string | null {
        if (!studentId) return "Select an intern.";
        if (!date) return "Select a date.";
        if (!timeIn) return "Time in is required.";
        if ((breakOut && !breakIn) || (!breakOut && breakIn))
            return "Provide both break start and break end, or leave both empty.";
        if (breakOut && breakOut <= timeIn)
            return "Break start must be after time in.";
        if (breakOut && breakIn && breakIn <= breakOut)
            return "Break end must be after break start.";
        if (timeOut && timeOut <= timeIn) return "Time out must be after time in.";
        if (breakIn && timeOut && timeOut <= breakIn)
            return "Time out must be after break end.";
        if (!reason.trim()) return "Please give a reason for this manual entry.";
        return null;
    }

    function submit() {
        const msg = validate();
        setError(msg);
        if (msg) return;
        onSave({
            student_id: Number(studentId),
            date,
            time_in: timeIn,
            break_out: breakOut || null,
            break_in: breakIn || null,
            time_out: timeOut || null,
            reason: reason.trim(),
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Add time log"
                className="w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-[var(--color-line)] px-5 py-4">
                    <div>
                        <h3 className="text-base font-semibold text-[var(--color-ink)]">
                            Add time log
                        </h3>
                        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                            Manually record attendance, e.g. for a schedule change on a
                            non-working day.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-slate-100"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                    <div>
                        <label className={label}>Intern</label>
                        <select
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            disabled={isLoadingInterns}
                            className={field}
                        >
                            <option value="">
                                {isLoadingInterns ? "Loading interns…" : "Select an intern"}
                            </option>
                            {interns.map((i) => (
                                <option key={i.id} value={i.id}>
                                    {i.student_name}
                                    {i.student_number ? ` (${i.student_number})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={label}>Date</label>
                        <input
                            type="date"
                            value={date}
                            max={defaultDate}
                            onChange={(e) => setDate(e.target.value)}
                            className={field}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={label}>Time in *</label>
                            <input
                                type="time"
                                value={timeIn}
                                onChange={(e) => setTimeIn(e.target.value)}
                                className={field}
                            />
                        </div>
                        <div>
                            <label className={label}>Time out</label>
                            <input
                                type="time"
                                value={timeOut}
                                onChange={(e) => setTimeOut(e.target.value)}
                                className={field}
                            />
                        </div>
                        <div>
                            <label className={label}>Break start</label>
                            <input
                                type="time"
                                value={breakOut}
                                onChange={(e) => setBreakOut(e.target.value)}
                                className={field}
                            />
                        </div>
                        <div>
                            <label className={label}>Break end</label>
                            <input
                                type="time"
                                value={breakIn}
                                onChange={(e) => setBreakIn(e.target.value)}
                                className={field}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={label}>Reason *</label>
                        <textarea
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Schedule moved to Saturday"
                            className={field}
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-[var(--color-line)] px-5 py-3.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-[var(--color-line)] px-3.5 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                    >
                        {isSaving && <Loader2 size={14} className="animate-spin" />}
                        Save time log
                    </button>
                </div>
            </div>
        </div>
    );
}