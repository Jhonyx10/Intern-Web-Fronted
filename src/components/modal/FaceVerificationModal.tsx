import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Loader2,
    AlertCircle,
    ImageOff,
    ShieldCheck,
    ShieldX,
    UserCheck,
    ScanFace,
    Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useFaceReview, useSubmitFaceReview } from "@/lib/queries/timelogs";

const API_BASE = (
    import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

type Session = "time_in" | "time_out";
type ReviewStatus = "verified" | "rejected" | null;

/** One punch as returned by TimeLogFaceReviewController@show (`punches.time_in` / `punches.time_out`). */
type PunchData = {
    id: number;
    session: Session;
    has_photo: boolean;
    face_match_score: number | null;
    review: {
        status: ReviewStatus;
        note: string | null;
        verified_by: string | null;
        verified_at: string | null;
    };
} | null;

/**
 * The photos live on a private disk, so an <img src> can't send the Bearer
 * token. Fetch the bytes with the token and show them through an object URL.
 */
function useAuthedImage(path: string | null) {
    const { token } = useAuth();
    const [state, setState] = useState<{
        url: string | null;
        loading: boolean;
        failed: boolean;
    }>({ url: null, loading: false, failed: false });

    useEffect(() => {
        if (!path || !token) {
            setState({ url: null, loading: false, failed: false });
            return;
        }

        let objectUrl: string | null = null;
        let cancelled = false;
        setState({ url: null, loading: true, failed: false });

        fetch(`${API_BASE}${path}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "image/*" },
        })
            .then((res) => {
                if (!res.ok) throw new Error(String(res.status));
                return res.blob();
            })
            .then((blob) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setState({ url: objectUrl, loading: false, failed: false });
            })
            .catch(() => {
                if (!cancelled) setState({ url: null, loading: false, failed: true });
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [path, token]);

    return state;
}

/* ───────────── helpers ───────────── */

function formatDateTime(value: string | null | undefined) {
    if (!value) return "—";
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

// The score is a distance, so lower is better
function describeMatchScore(raw: number | null | undefined) {
    if (raw === null || raw === undefined || Number.isNaN(raw)) return null;
    const percent = Math.round(raw * 100);
    if (percent <= 15)
        return { percent, label: "Strong match", cls: "bg-emerald-100 text-emerald-700" };
    if (percent <= 35)
        return { percent, label: "Likely match", cls: "bg-amber-100 text-amber-700" };
    return { percent, label: "Weak match", cls: "bg-rose-100 text-rose-700" };
}

const STATUS_BADGE: Record<
    "verified" | "rejected" | "pending",
    { label: string; cls: string }
> = {
    verified: { label: "Confirmed", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Not the student", cls: "bg-rose-100 text-rose-700" },
    pending: { label: "Not reviewed", cls: "bg-slate-100 text-slate-600" },
};

/* ───────────── UI pieces ───────────── */

function ImageBox({
    title,
    path,
    missingText,
}: {
    title: string;
    /** null = no photo was saved */
    path: string | null;
    missingText: string;
}) {
    const { url, loading, failed } = useAuthedImage(path);

    return (
        <div className="flex aspect-[4/5] max-h-[44vh] w-full items-center justify-center bg-slate-100">
            {loading ? (
                <Loader2
                    size={18}
                    className="animate-spin text-[var(--color-muted)]"
                />
            ) : url ? (
                <img src={url} alt={title} className="h-full w-full object-contain" />
            ) : (
                <div className="flex flex-col items-center gap-1.5 px-4 text-center text-[var(--color-muted)]">
                    <ImageOff size={18} />
                    <p className="text-xs">
                        {failed ? "Could not load this photo." : missingText}
                    </p>
                </div>
            )}
        </div>
    );
}

/** The enrolled (reference) face, shown beside each punch for comparison. */
function EnrolledCard({ path }: { path: string | null }) {
    return (
        <figure className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-white/70">
            <figcaption className="flex min-h-[41px] items-center gap-2 border-b border-[var(--color-line)] px-3.5 py-2">
                <ScanFace size={14} className="text-[var(--color-muted)]" />
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                    Enrolled face
                </span>
            </figcaption>
            <ImageBox
                title="Enrolled face"
                path={path}
                missingText="No enrollment photo on file."
            />
            <p className="border-t border-[var(--color-line)] px-3.5 py-2.5 text-xs text-[var(--color-muted)]">
                Reference photo to compare against.
            </p>
        </figure>
    );
}

/** One punch photo with its own match score, status and decision buttons. */
function PunchCard({
    title,
    timeLabel,
    path,
    punch,
    rejecting,
    note,
    onNote,
    onStartReject,
    onCancelReject,
    onVerify,
    onReject,
    pending,
}: {
    title: string;
    timeLabel: string;
    path: string | null;
    punch: PunchData;
    rejecting: boolean;
    note: string;
    onNote: (v: string) => void;
    onStartReject: () => void;
    onCancelReject: () => void;
    onVerify: () => void;
    onReject: () => void;
    pending: boolean;
}) {
    const match = describeMatchScore(punch?.face_match_score);
    const status = punch?.review.status ?? null;
    const badge = STATUS_BADGE[status ?? "pending"];
    const canReview = Boolean(punch?.has_photo);

    return (
        <figure className="flex flex-col overflow-hidden rounded-lg border border-[var(--color-line)] bg-white/70">
            <figcaption className="flex min-h-[41px] items-center justify-between gap-2 border-b border-[var(--color-line)] px-3.5 py-2">
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                    {title}
                </span>
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}
                >
                    {badge.label}
                </span>
            </figcaption>

            <ImageBox
                title={title}
                path={path}
                missingText={`No ${title.toLowerCase()} was saved for this log.`}
            />

            <div className="space-y-2.5 border-t border-[var(--color-line)] px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-muted)]">
                    <Clock size={12} />
                    <span>{timeLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <ShieldCheck size={14} className="text-[var(--color-muted)]" />
                    {match ? (
                        <>
                            <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${match.cls}`}
                            >
                                {match.label}
                            </span>
                            <span
                                className="text-xs text-[var(--color-muted)]"
                                title="Lower distance means a closer match"
                            >
                                {match.percent}% distance
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-[var(--color-muted)]">
                            No score recorded
                        </span>
                    )}
                </div>

                {/* Existing decision */}
                {status && (
                    <div
                        className={`rounded-md border px-2.5 py-2 text-xs ${status === "verified"
                                ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                                : "border-rose-200 bg-rose-50/70 text-rose-800"
                            }`}
                    >
                        <p className="flex items-center gap-1.5 font-semibold">
                            {status === "verified" ? (
                                <UserCheck size={13} />
                            ) : (
                                <ShieldX size={13} />
                            )}
                            {status === "verified"
                                ? "Confirmed as the student"
                                : "Marked as not the student"}
                        </p>
                        {(punch?.review.verified_by || punch?.review.verified_at) && (
                            <p className="mt-0.5 opacity-80">
                                {punch?.review.verified_by
                                    ? `By ${punch.review.verified_by}`
                                    : ""}
                                {punch?.review.verified_by && punch?.review.verified_at
                                    ? " · "
                                    : ""}
                                {formatDateTime(punch?.review.verified_at)}
                            </p>
                        )}
                        {punch?.review.note && (
                            <p className="mt-1 whitespace-pre-wrap">{punch.review.note}</p>
                        )}
                    </div>
                )}

                {/* Decision */}
                {canReview ? (
                    rejecting ? (
                        <div className="space-y-2">
                            <textarea
                                value={note}
                                onChange={(e) => onNote(e.target.value)}
                                rows={2}
                                maxLength={500}
                                autoFocus
                                placeholder="What looks wrong? (required)"
                                className="w-full resize-none rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onCancelReject}
                                    className="h-9 flex-1 rounded-lg border border-[var(--color-line)] bg-white px-3 text-xs font-semibold text-[var(--color-ink)] hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={pending || note.trim().length < 3}
                                    onClick={onReject}
                                    className="h-9 flex-1 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                                >
                                    {pending ? "Saving…" : "Confirm"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onStartReject}
                                disabled={pending}
                                className="h-9 flex-1 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                                Not the student
                            </button>
                            <button
                                type="button"
                                disabled={pending}
                                onClick={onVerify}
                                className="h-9 flex-1 rounded-lg bg-[var(--color-accent)] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                            >
                                {pending
                                    ? "Saving…"
                                    : status === "verified"
                                        ? "Confirm again"
                                        : "It's the student"}
                            </button>
                        </div>
                    )
                ) : (
                    <p className="text-xs text-[var(--color-muted)]">
                        No photo to review for this punch.
                    </p>
                )}
            </div>
        </figure>
    );
}

export const FaceVerificationModal = ({
    timeLogId,
    visible,
    onClose,
}: {
    timeLogId: number | null;
    visible: boolean;
    onClose: () => void;
}) => {
    const { data, isLoading, isError, error, refetch } = useFaceReview(
        timeLogId,
        visible
    );
    const submit = useSubmitFaceReview(timeLogId);

    // Only one punch can be in "reject" mode at a time
    const [rejectSession, setRejectSession] = useState<Session | null>(null);
    const [note, setNote] = useState("");

    // Start clean for every time log
    useEffect(() => {
        setRejectSession(null);
        setNote("");
    }, [timeLogId, visible]);

    // Esc closes this modal only
    useEffect(() => {
        if (!visible) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [visible, onClose]);

    const punchIn: PunchData = data?.punches?.time_in ?? null;
    const punchOut: PunchData = data?.punches?.time_out ?? null;

    const pathFor = (type: "in" | "out", punch: PunchData) =>
        timeLogId !== null && punch?.has_photo
            ? `/time-logs/${timeLogId}/photo/${type}`
            : null;

    const enrolledPath =
        timeLogId !== null && data?.has_enrolled_photo
            ? `/time-logs/${timeLogId}/enrolled-photo`
            : null;

    const noPhotosAtAll =
        !data?.has_enrolled_photo && !punchIn?.has_photo && !punchOut?.has_photo;

    const pendingSession: Session | null = submit.isPending
        ? ((submit.variables as { session?: Session } | undefined)?.session ?? null)
        : null;

    const verify = (session: Session) =>
        submit.mutate({ session, status: "verified" });

    const reject = (session: Session) =>
        submit.mutate(
            { session, status: "rejected", note: note.trim() },
            {
                onSuccess: () => {
                    setRejectSession(null);
                    setNote("");
                },
            }
        );

    const overall = data?.review_status as ReviewStatus | undefined;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 8 }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Face verification"
                        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-paper,#FAF9F5)] shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-4">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h2
                                        className="truncate text-xl font-semibold text-[var(--color-ink)]"
                                        style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
                                    >
                                        {data ? data.student.name : "Face verification"}
                                    </h2>
                                    {data && (
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[overall ?? "pending"].cls
                                                }`}
                                        >
                                            {STATUS_BADGE[overall ?? "pending"].label}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-[var(--color-muted)]">
                                    {data
                                        ? `${data.student.student_number
                                            ? `${data.student.student_number} · `
                                            : ""
                                        }Compare the enrolled face with the time in and time out photos`
                                        : "Compare the enrolled face with the punch photos"}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="shrink-0 rounded-md p-1.5 text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {isLoading && (
                                <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                                    <Loader2
                                        size={20}
                                        className="animate-spin text-[var(--color-muted)]"
                                    />
                                    <p className="text-xs text-[var(--color-muted)]">
                                        Loading photos…
                                    </p>
                                </div>
                            )}

                            {isError && (
                                <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                                    <AlertCircle size={20} className="text-rose-500" />
                                    <p className="text-xs text-[var(--color-muted)]">
                                        {error instanceof Error
                                            ? error.message
                                            : "Could not load the face photos."}
                                    </p>
                                    <button
                                        onClick={() => refetch()}
                                        className="text-xs font-medium text-[var(--color-ink)] underline"
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}

                            {data && !isLoading && !isError && (
                                <div className="space-y-4 px-6 py-5">
                                    {noPhotosAtAll ? (
                                        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--color-line)] bg-white/50 px-6 py-10 text-center">
                                            <ScanFace
                                                size={22}
                                                className="text-[var(--color-muted)]"
                                            />
                                            <p className="text-sm font-medium text-[var(--color-ink)]">
                                                No photos to compare
                                            </p>
                                            <p className="max-w-sm text-xs leading-relaxed text-[var(--color-muted)]">
                                                This student has no enrollment photo, and no punch
                                                photo was saved for this log. Photos are only kept for
                                                punches made after this feature was added.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                            <EnrolledCard path={enrolledPath} />

                                            <PunchCard
                                                title="Time in photo"
                                                timeLabel={formatDateTime(data.time_in)}
                                                path={pathFor("in", punchIn)}
                                                punch={punchIn}
                                                rejecting={rejectSession === "time_in"}
                                                note={note}
                                                onNote={setNote}
                                                onStartReject={() => {
                                                    setRejectSession("time_in");
                                                    setNote("");
                                                }}
                                                onCancelReject={() => {
                                                    setRejectSession(null);
                                                    setNote("");
                                                }}
                                                onVerify={() => verify("time_in")}
                                                onReject={() => reject("time_in")}
                                                pending={pendingSession === "time_in"}
                                            />

                                            <PunchCard
                                                title="Time out photo"
                                                timeLabel={
                                                    data.time_out
                                                        ? formatDateTime(data.time_out)
                                                        : "Not timed out yet"
                                                }
                                                path={pathFor("out", punchOut)}
                                                punch={punchOut}
                                                rejecting={rejectSession === "time_out"}
                                                note={note}
                                                onNote={setNote}
                                                onStartReject={() => {
                                                    setRejectSession("time_out");
                                                    setNote("");
                                                }}
                                                onCancelReject={() => {
                                                    setRejectSession(null);
                                                    setNote("");
                                                }}
                                                onVerify={() => verify("time_out")}
                                                onReject={() => reject("time_out")}
                                                pending={pendingSession === "time_out"}
                                            />
                                        </div>
                                    )}

                                    {submit.isError && (
                                        <p className="text-xs text-rose-600">
                                            {submit.error instanceof Error
                                                ? submit.error.message
                                                : "Could not save your decision. Try again."}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};