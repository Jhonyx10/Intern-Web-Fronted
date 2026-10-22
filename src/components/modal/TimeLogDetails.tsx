import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  X,
  Clock,
  Sun,
  Sunset,
  ShieldCheck,
  ImageOff,
  FileText,
} from "lucide-react";
import {
  useTimeLogDetails,
  type TimeLogTaskPhoto,
} from "@/lib/queries/timelogs";

// Task photos are served from Laravel's public storage disk
// (php artisan storage:link), which lives on the API host — not
// the frontend dev server. The API now returns a resolved file_url
// per photo (via Storage::url() on the backend); fall back to
// building one from VITE_API_URL only if that's ever missing.
const ASSET_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api"
).replace(/\/api\/?$/, "");

function photoUrl(photo: TimeLogTaskPhoto) {
  return photo.file_url ?? `${ASSET_BASE_URL}/storage/${photo.file_path}`;
}

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

// face_match_score is a distance/dissimilarity score expressed as a
// fraction (e.g. "0.20"): the LOWER the number, the closer the match.
// Convert to a percentage for display and attach a qualitative label
// so "20%" doesn't read as "20% confident" (the opposite of the truth).
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
  // parts: [leading text, "Morning", text, "Afternoon", text, ...]
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

function StatusBadge({ status }: { status: TimeLogTaskPhoto["status"] }) {
  const isSubmitted = status === "submitted";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
        isSubmitted
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {isSubmitted ? "Submitted" : "Draft"}
    </span>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-[var(--color-muted)]">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-[var(--color-muted)]">{label}</p>
        <p className="text-sm font-medium text-[var(--color-ink)]">{value}</p>
      </div>
    </div>
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo) => (
        <button
          key={photo.id}
          onClick={() => photoUrl(photo) && onSelect(photo)}
          disabled={!photoUrl(photo)}
          className="group relative overflow-hidden rounded-md border border-[var(--color-line)] bg-white text-left disabled:cursor-default"
        >
          {photoUrl(photo) ? (
            <img
              src={photoUrl(photo)}
              alt={photo.original_filename}
              loading="lazy"
              className="h-28 w-full object-cover transition group-hover:opacity-90"
            />
          ) : (
            <div className="flex h-28 w-full flex-col items-center justify-center gap-1 bg-slate-50 text-[var(--color-muted)]">
              <ImageOff size={16} />
              <span className="text-[10px]">File missing</span>
            </div>
          )}
          <div className="absolute left-1.5 top-1.5">
            <StatusBadge status={photo.status} />
          </div>
          <div className="border-t border-[var(--color-line)] px-2 py-1.5">
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

function SessionCard({
  title,
  icon,
  accentClass,
  startLabel,
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
  startLabel: string;
  start: string | null;
  end: string | null;
  minutes: number | null;
  note: string | null;
  photos: TimeLogTaskPhoto[] | null; // null = photos are shown elsewhere
  onSelectPhoto: (photo: TimeLogTaskPhoto) => void;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-[var(--color-line)] bg-white/60">
      {/* Session header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${accentClass}`}
          >
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
          <span>
            {startLabel}{" "}
            <span className="font-medium text-[var(--color-ink)]">
              {formatTime(start)}
            </span>
            {" → "}
            <span className="font-medium text-[var(--color-ink)]">
              {formatTime(end)}
            </span>
          </span>
          {minutes !== null && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {formatDuration(minutes)}
            </span>
          )}
        </div>
      </div>

      {/* Task note */}
      <div className="px-4 py-3">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-muted)]">
          <FileText size={12} /> Task Note
        </p>
        {note ? (
          <p className="text-sm leading-relaxed text-[var(--color-ink)]">
            {note}
          </p>
        ) : (
          <p className="text-xs italic text-[var(--color-muted)]">
            No task note logged for this session.
          </p>
        )}
      </div>

      {/* Photos for this session */}
      {photos !== null && (
        <div className="border-t border-[var(--color-line)] px-4 py-3">
          <p className="mb-2 text-[11px] font-medium text-[var(--color-muted)]">
            Photos ({photos.length})
          </p>
          {photos.length === 0 ? (
            <p className="text-xs italic text-[var(--color-muted)]">
              No photos submitted for this session.
            </p>
          ) : (
            <PhotoGrid photos={photos} onSelect={onSelectPhoto} />
          )}
        </div>
      )}
    </section>
  );
}

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

  return (
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
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-paper,#FAF9F5)]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-[var(--color-line)] px-6 py-4">
              <div className="min-w-0">
                <h2
                  className="text-base font-semibold text-[var(--color-ink)]"
                  style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
                >
                  Time Log Details
                </h2>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  {data?.student?.name ?? formatDate(data?.time_in ?? null)}
                  {data?.student?.name
                    ? ` · ${formatDate(data?.time_in ?? null)}`
                    : ""}
                  {data?.session_period ? ` · ${data.session_period}` : ""}
                </p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded p-1 text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
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
                <div className="space-y-4 px-6 py-4">
                  {/* Summary */}
                  <div className="grid grid-cols-1 gap-4 rounded-md border border-[var(--color-line)] bg-white/60 px-4 py-3 sm:grid-cols-2">
                    <StatRow
                      icon={<Clock size={14} />}
                      label="Total Duration"
                      value={formatDuration(data.duration_minutes)}
                    />
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 text-[var(--color-muted)]">
                        <ShieldCheck size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-[var(--color-muted)]">
                          Verification
                        </p>
                        <p className="break-words text-sm font-medium text-[var(--color-ink)]">
                          {data.verification_method ?? "—"}
                        </p>
                        {(() => {
                          const match = describeMatchScore(
                            data.face_match_score
                          );
                          if (!match) return null;
                          return (
                            <span
                              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                matchToneClasses[match.tone]
                              }`}
                              title="Face match distance — lower is better"
                            >
                              {match.label} ({match.percent}%)
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Note that isn't tagged to a session */}
                  {notes.general && (
                    <div className="rounded-md border border-[var(--color-line)] bg-white/60 px-4 py-3">
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-muted)]">
                        <FileText size={12} /> Task Note
                      </p>
                      <p className="text-sm leading-relaxed text-[var(--color-ink)]">
                        {notes.general}
                      </p>
                    </div>
                  )}

                  {/* Morning session */}
                  <SessionCard
                    title="Morning"
                    icon={<Sun size={14} />}
                    accentClass="bg-amber-100 text-amber-600"
                    startLabel="Time In"
                    start={data.time_in}
                    end={morningEnd}
                    minutes={morningMinutes}
                    note={notes.morning}
                    photos={canGroupPhotos ? morningPhotos : null}
                    onSelectPhoto={setActivePhoto}
                  />

                  {/* Afternoon session */}
                  {showAfternoon && (
                    <SessionCard
                      title="Afternoon"
                      icon={<Sunset size={14} />}
                      accentClass="bg-orange-100 text-orange-600"
                      startLabel="Time In"
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
                    <section className="rounded-md border border-[var(--color-line)] bg-white/60 px-4 py-3">
                      <p className="mb-3 text-[11px] font-medium text-[var(--color-muted)]">
                        Task Photos ({photos.length})
                      </p>
                      {photos.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <ImageOff
                            size={18}
                            className="text-[var(--color-muted)]"
                          />
                          <p className="text-xs text-[var(--color-muted)]">
                            No task photos were submitted for this log.
                          </p>
                        </div>
                      ) : (
                        <PhotoGrid photos={photos} onSelect={setActivePhoto} />
                      )}
                    </section>
                  )}
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
  );
};