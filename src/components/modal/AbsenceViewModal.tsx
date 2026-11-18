import { X, CalendarX, FileText, ExternalLink } from "lucide-react";
import type { InternDetailAbsence } from "@/lib/queries/supervisor";

type Props = {
    absence: InternDetailAbsence | null;
    studentName: string;
    onClose: () => void;
};

function fmtDate(raw: string) {
    return new Date(raw).toLocaleDateString([], {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function fmtDateTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export function AbsenceViewModal({ absence, studentName, onClose }: Props) {
    if (!absence) return null;

    const isImage =
        absence.proof_mime_type?.startsWith("image/") ||
        /\.(png|jpe?g|webp|gif)$/i.test(absence.proof_original_filename ?? "");

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-3.5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                        <CalendarX size={15} className="text-[var(--color-muted)]" />
                        Absence request
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-[var(--color-muted)] transition hover:bg-slate-100"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[11px] font-medium text-[var(--color-muted)]">Intern</p>
                            <p className="font-semibold text-[var(--color-ink)]">{studentName}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-[var(--color-muted)]">Absent on</p>
                            <p className="font-semibold text-[var(--color-ink)]">
                                {fmtDate(absence.absence_date)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-[var(--color-muted)]">Status</p>
                            <span
                                className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${absence.status === "justified"
                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                                        : "bg-amber-50 text-amber-700 ring-amber-600/20"
                                    }`}
                            >
                                {absence.status === "justified" ? "Filed" : "Awaiting justification"}
                            </span>
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-[var(--color-muted)]">Submitted</p>
                            <p className="font-semibold text-[var(--color-ink)]">
                                {fmtDateTime(absence.justification_submitted_at)}
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="text-[11px] font-medium text-[var(--color-muted)]">Reason</p>
                        <p className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[var(--color-ink)]">
                            {absence.reason || "No reason provided yet."}
                        </p>
                    </div>

                    <div>
                        <p className="text-[11px] font-medium text-[var(--color-muted)]">Proof</p>
                        {absence.proof_url ? (
                            <div className="mt-1 space-y-2">
                                {isImage && (
                                    <img
                                        src={absence.proof_url}
                                        alt="Absence proof"
                                        className="max-h-72 w-full rounded-xl border border-[var(--color-line)] object-contain"
                                    />
                                )}
                                <a
                                    href={absence.proof_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-slate-50"
                                >
                                    <FileText size={13} />
                                    {absence.proof_original_filename ?? "Open file"}
                                    <ExternalLink size={11} />
                                </a>
                            </div>
                        ) : (
                            <p className="mt-1 text-xs text-[var(--color-muted)]">No proof attached.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}