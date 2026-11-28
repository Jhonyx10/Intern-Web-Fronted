import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  X,
  Sun,
  Sunset,
  ShieldCheck,
  ImageOff,
  MessageSquare,
  UserCheck,
  Coffee,
} from "lucide-react";
import {
  useTimeLogDetails,
  type TimeLogTaskPhoto,
} from "@/lib/queries/timelogs";
import { useAuth } from "@/lib/auth";
import { FaceVerificationModal } from "@/components/modal/FaceVerificationModal";

// Task photos are served from Laravel's public storage disk
// (php artisan storage:link), which lives on the API host — not
// the frontend dev server. The API returns a resolved file_url per photo;
// fall back to building one from VITE_API_URL only if that's ever missing.
const ASSET_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api"
).replace(/\/api\/?$/, "");

function photoUrl(photo: TimeLogTaskPhoto) {
  return photo.file_url ?? `${ASSET_BASE_URL}/storage/${photo.file_path}`;
}

/* ───────────── helpers ───────────── */

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return "—";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

function minutesBetween(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.max(0, Math.round(diff / 60000));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// "facial_recognition" -> "Facial recognition"
function humanize(value: string | null | undefined) {
  if (!value) return "—";
  const text = value.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// face_match_score is a distance expressed as a fraction (e.g. "0.20"):
// the LOWER the number, the closer the match.
function describeMatchScore(raw: string | null): {
  percent: number;
  label: string;
  tone: "good" | "ok" | "poor";
} | null {
  if (raw === null) return null;
  const value = Number(raw);
  if (Number.isNaN(value)) return null;

  const percent = Math.round(value * 100);

  if (percent <= 15) return { percent, label: "Strong match", tone: "good" };
  if (percent <= 35) return { percent, label: "Likely match", tone: "ok" };
  return { percent, label: "Weak match", tone: "poor" };
}

const matchToneClasses: Record<"good" | "ok" | "poor", string> = {
  good: "bg-emerald-100 text-emerald-700",
  ok: "bg-amber-100 text-amber-700",
  poor: "bg-rose-100 text-rose-700",
};

// The task note is stored as one string like
// "[Morning] ... [Afternoon] ...". Split it back into its sessions.
function parseTaskNote(note: string | null) {
  const result = {
    morning: null as string | null,
    afternoon: null as string | null,
    general: null as string | null,
  };
  if (!note) return result;

  const parts = note.split(/\[(Morning|Afternoon)\]\s*/i);
  const leading = parts[0]?.trim();
  if (leading) result.general = leading;

  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].toLowerCase() as "morning" | "afternoon";
    const text = (parts[i + 1] ?? "").trim();
    if (text) result[key] = text;
  }
  return result;
}

type SessionKey = "morning" | "afternoon";

// Group photos by session when the API tells us which one they belong to.
function photoSession(photo: TimeLogTaskPhoto): SessionKey | null {
  const raw = String(
    (photo as any).session ?? (photo as any).period ?? ""
  ).toLowerCase();
  if (raw.startsWith("morn")) return "morning";
  if (raw.startsWith("after")) return "afternoon";
  return null;
}

/* ───────────── UI pieces ───────────── */

function PeriodChip({ value }: { value: string }) {
  const isLate = value.toLowerCase().includes("late");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${isLate ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
        }`}
    >
      {humanize(value)}
    </span>
  );
}

function PhotoStatus({ status }: { status: TimeLogTaskPhoto["status"] }) {
  const isSubmitted = status === "submitted";
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shadow-sm ${isSubmitted
          ? "bg-emerald-100 text-emerald-700"
          : "bg-white/90 text-slate-600"
        }`}
    >
      {isSubmitted ? "Submitted" : "Draft"}
    </span>
  );
}

function PhotoGrid({
  photos,
  onSelect,
}: {
  photos: TimeLogTaskPhoto[];
  onSelect: (photo: TimeLogTaskPhoto) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {photos.map((photo) => (
        <button
          key={photo.id}
          onClick={() => photoUrl(photo) && onSelect(photo)}
          disabled={!photoUrl(photo)}
          className="group relative overflow-hidden rounded-lg border border-[var(--color-line)] bg-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-default"
        >
          {photoUrl(photo) ? (
            <img
              src={photoUrl(photo)}
              alt={photo.original_filename}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition group-hover:opacity-90"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 bg-slate-50 text-[var(--color-muted)]">
              <ImageOff size={16} />
              <span className="text-[10px]">File missing</span>
            </div>
          )}
          <div className="absolute left-1.5 top-1.5">
            <PhotoStatus status={photo.status} />
          </div>
          <div className="px-2 py-1.5">
            <p className="truncate text-[11px] font-medium text-[var(--color-ink)]">
              {photo.original_filename}
            </p>
            <p className="text-[10px] text-[var(--color-muted)]">
              {formatFileSize(photo.file_size)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

type Segment = { key: string; minutes: number; className: string; label: string };

/** The whole day as one bar: morning, break, afternoon, scaled by time. */
function DayTimeline({
  segments,
  start,
  end,
  breakMinutes,
}: {
  segments: Segment[];
  start: string | null;
  end: string | null;
  breakMinutes: number | null;
}) {
  if (segments.length === 0) return null;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex h-2.5 w-full gap-1">
        {segments.map((s) => (
          <div
            key={s.key}
            title={`${s.label} · ${formatDuration(s.minutes)}`}
            style={{ flexGrow: s.minutes, flexBasis: 0 }}
            className={`rounded-full ${s.className}`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] tabular-nums text-[var(--color-muted)]">
        <span>{formatTime(start)}</span>
        {breakMinutes ? (
          <span className="inline-flex items-center gap-1">
            <Coffee size={11} /> {formatDuration(breakMinutes)} break
          </span>
        ) : null}
        <span>{formatTime(end)}</span>
      </div>
    </div>
  );
}

function SessionBlock({
  title,
  icon,
  accentClass,
  start,
  end,
  minutes,
  note,
  photos,
  onSelectPhoto,
}: {
  title: string;
  icon: React.ReactNode;
  accentClass: string;
  start: string | null;
  end: string | null;
  minutes: number | null;
  note: string | null;
  photos: TimeLogTaskPhoto[] | null; // null = photos are shown elsewhere
  onSelectPhoto: (photo: TimeLogTaskPhoto) => void;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full ${accentClass}`}
          >
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {title}
          </h3>
        </div>
        <p className="text-sm tabular-nums text-[var(--color-ink)]">
          {formatTime(start)} – {formatTime(end)}
          {minutes !== null && (
            <span className="ml-2 text-xs text-[var(--color-muted)]">
              {formatDuration(minutes)}
            </span>
          )}
        </p>
      </div>

      <div className="mt-2.5 sm:pl-[42px]">
        {note ? (
          <p className="max-w-prose text-sm leading-relaxed text-[var(--color-ink)]">
            {note}
          </p>
        ) : (
          <p className="text-xs italic text-[var(--color-muted)]">
            No task note logged for this session.
          </p>
        )}

        {photos !== null &&
          (photos.length > 0 ? (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-[var(--color-muted)]">
                Photos ({photos.length})
              </p>
              <PhotoGrid photos={photos} onSelect={onSelectPhoto} />
            </div>
          ) : (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <ImageOff size={12} /> No photos for this session
            </p>
          ))}
      </div>
    </div>
  );
}

/* ───────────── main modal ───────────── */

export const TimeLogDetails = ({
  timeLogId,
  visible,
  onClose,
}: {
  timeLogId: number | null;
  visible: boolean;
  onClose: () => void;
}) => {
  const { data, isLoading, isError, error, refetch } =
    useTimeLogDetails(timeLogId);
  const [activePhoto, setActivePhoto] = useState<TimeLogTaskPhoto | null>(
    null
  );

  // Only the section's coordinator (and super admins) may see the face photos
  const { user } = useAuth();
  const role = (user?.role?.name ?? "").toLowerCase();
  const canReviewFace = ["coordinator", "super_admin"].includes(role);
  const [faceOpen, setFaceOpen] = useState(false);

  // Closing the details modal also closes the face modal
  useEffect(() => {
    if (!visible) setFaceOpen(false);
  }, [visible]);

  // Esc: lightbox first, then the modal. The face modal handles its own Esc.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activePhoto) setActivePhoto(null);
      else if (!faceOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, activePhoto, faceOpen, onClose]);

  const notes = parseTaskNote(data?.task_note ?? null);
  const photos = data?.task_photos ?? [];
  // Only split photos per session if every photo says which session it's from.
  const canGroupPhotos =
    photos.length > 0 && photos.every((p) => photoSession(p) !== null);
  const morningPhotos = photos.filter((p) => photoSession(p) === "morning");
  const afternoonPhotos = photos.filter((p) => photoSession(p) === "afternoon");

  // Morning runs from time in to break out (or to time out if there was no break).
  const morningEnd = data?.break_out ?? data?.time_out ?? null;
  const morningMinutes = minutesBetween(data?.time_in ?? null, morningEnd);
  // Afternoon runs from break in to time out.
  const showAfternoon = Boolean(
    data?.break_in || notes.afternoon || afternoonPhotos.length > 0
  );
  const afternoonMinutes = minutesBetween(
    data?.break_in ?? null,
    data?.time_out ?? null
  );
  const breakMinutes = minutesBetween(
    data?.break_out ?? null,
    data?.break_in ?? null
  );

  const segments: Segment[] = [];
  if (morningMinutes) {
    segments.push({
      key: "morning",
      minutes: morningMinutes,
      className: "bg-amber-400",
      label: "Morning",
    });
  }
  if (breakMinutes) {
    segments.push({
      key: "break",
      minutes: breakMinutes,
      className: "bg-slate-200",
      label: "Break",
    });
  }
  if (afternoonMinutes) {
    segments.push({
      key: "afternoon",
      minutes: afternoonMinutes,
      className: "bg-orange-500",
      label: "Afternoon",
    });
  }

  const match = describeMatchScore(data?.face_match_score ?? null);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
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
              aria-label="Time log details"
              className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-paper,#FAF9F5)] shadow-2xl"
            >
              {/* Header */}
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-4">
                <div className="min-w-0">
                  <h2
                    className="truncate text-xl font-semibold text-[var(--color-ink)]"
                    style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
                  >
                    {data?.student?.name ?? "Time log"}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                    <span>{formatDate(data?.time_in ?? null)}</span>
                    {data?.session_period && (
                      <PeriodChip value={data.session_period} />
                    )}
                  </div>
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
                      Loading time log…
                    </p>
                  </div>
                )}

                {isError && (
                  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                    <AlertCircle size={20} className="text-rose-500" />
                    <p className="text-xs text-[var(--color-muted)]">
                      {error instanceof Error
                        ? error.message
                        : "Could not load this time log."}
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
                    {/* Day overview + verification */}
                    <div className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-white/70">
                      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
                        <div className="shrink-0">
                          <p
                            className="text-3xl font-semibold leading-none tabular-nums text-[var(--color-ink)]"
                            style={{
                              fontFamily: '"Source Serif 4", Georgia, serif',
                            }}
                          >
                            {formatDuration(data.duration_minutes)}
                          </p>
                          <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                            Total time rendered
                          </p>
                        </div>
                        <DayTimeline
                          segments={segments}
                          start={data.time_in}
                          end={data.time_out}
                          breakMinutes={breakMinutes}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] bg-slate-50/60 px-5 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <ShieldCheck
                            size={16}
                            className="shrink-0 text-[var(--color-muted)]"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-ink)]">
                              {humanize(data.verification_method)}
                            </p>
                            {match && (
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted)]">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${matchToneClasses[match.tone]}`}
                                >
                                  {match.label}
                                </span>
                                <span title="Lower distance means a closer match">
                                  {match.percent}% distance
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                        {canReviewFace && (
                          <button
                            type="button"
                            onClick={() => setFaceOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <UserCheck size={13} /> Review face photos
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reason the intern gave for a missed time out */}
                    {data.correction_reason && (
                      <div className="rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-3">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-sky-700">
                          <MessageSquare size={12} /> Intern's reason for the
                          correction
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink)]">
                          {data.correction_reason}
                        </p>
                      </div>
                    )}

                    {/* Note that isn't tagged to a session */}
                    {notes.general && (
                      <div className="rounded-lg border border-[var(--color-line)] bg-white/70 px-4 py-3">
                        <p className="mb-1 text-xs font-medium text-[var(--color-muted)]">
                          Task note
                        </p>
                        <p className="max-w-prose text-sm leading-relaxed text-[var(--color-ink)]">
                          {notes.general}
                        </p>
                      </div>
                    )}

                    {/* Sessions */}
                    <div className="divide-y divide-[var(--color-line)] overflow-hidden rounded-lg border border-[var(--color-line)] bg-white/70">
                      <SessionBlock
                        title="Morning"
                        icon={<Sun size={15} />}
                        accentClass="bg-amber-100 text-amber-600"
                        start={data.time_in}
                        end={morningEnd}
                        minutes={morningMinutes}
                        note={notes.morning}
                        photos={canGroupPhotos ? morningPhotos : null}
                        onSelectPhoto={setActivePhoto}
                      />

                      {showAfternoon && (
                        <SessionBlock
                          title="Afternoon"
                          icon={<Sunset size={15} />}
                          accentClass="bg-orange-100 text-orange-600"
                          start={data.break_in}
                          end={data.time_out}
                          minutes={afternoonMinutes}
                          note={notes.afternoon}
                          photos={canGroupPhotos ? afternoonPhotos : null}
                          onSelectPhoto={setActivePhoto}
                        />
                      )}

                      {/* Photos that aren't tagged to a session */}
                      {!canGroupPhotos && (
                        <div className="px-5 py-4">
                          {photos.length === 0 ? (
                            <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                              <ImageOff size={12} /> No task photos were
                              submitted for this log
                            </p>
                          ) : (
                            <>
                              <p className="mb-2 text-xs font-medium text-[var(--color-muted)]">
                                Task photos ({photos.length})
                              </p>
                              <PhotoGrid
                                photos={photos}
                                onSelect={setActivePhoto}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Photo lightbox */}
            <AnimatePresence>
              {activePhoto && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhoto(null);
                  }}
                >
                  <motion.img
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    src={photoUrl(activePhoto)}
                    alt={activePhoto.original_filename}
                    className="max-h-full max-w-full rounded-md object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => setActivePhoto(null)}
                    aria-label="Close photo"
                    className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  >
                    <X size={18} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outside the details backdrop so a click inside it can't close the details modal */}
      {canReviewFace && (
        <FaceVerificationModal
          timeLogId={timeLogId}
          visible={visible && faceOpen}
          onClose={() => setFaceOpen(false)}
        />
      )}
    </>
  );
};