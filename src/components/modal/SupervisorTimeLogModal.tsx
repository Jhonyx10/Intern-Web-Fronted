import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  Sun,
  Sunset,
  ShieldCheck,
  ImageOff,
  FileText,
  AlertCircle,
} from "lucide-react";
import type {
  InternDetailTimelog,
  InternDetailTaskPhoto,
} from "@/lib/queries/supervisor";

// Task photos come from Laravel's public disk. The API returns a resolved
// file_url per photo; fall back to building one from VITE_API_URL if missing.
const ASSET_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api"
).replace(/\/api\/?$/, "");

function photoUrl(photo: InternDetailTaskPhoto) {
  if (photo.file_url) return photo.file_url;
  if (photo.file_path) return `${ASSET_BASE_URL}/storage/${photo.file_path}`;
  return null;
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
  if (minutes === null || minutes === undefined) return "—";
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

function formatFileSize(bytes: number | null) {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// face_match_score is a distance: the LOWER the number, the closer the match.
function describeMatchScore(raw: string | number | null | undefined): {
  percent: number;
  label: string;
  tone: "good" | "ok" | "poor";
} | null {
  if (raw === null || raw === undefined || raw === "") return null;
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

// The task note is stored as one string like "[Morning] ... [Afternoon] ...".
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

// Group photos by session only when the API says which one they belong to.
function photoSession(photo: InternDetailTaskPhoto): SessionKey | null {
  const raw = String(
    (photo as any).session ?? (photo as any).period ?? ""
  ).toLowerCase();
  if (raw.startsWith("morn")) return "morning";
  if (raw.startsWith("after")) return "afternoon";
  return null;
}

function StatusBadge({ status }: { status: InternDetailTaskPhoto["status"] }) {
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
  photos: InternDetailTaskPhoto[];
  onSelect: (photo: InternDetailTaskPhoto) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo) => {
        const url = photoUrl(photo);
        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => url && onSelect(photo)}
            disabled={!url}
            className="group relative overflow-hidden rounded-md border border-[var(--color-line)] bg-white text-left disabled:cursor-default"
          >
            {url ? (
              <img
                src={url}
                alt={photo.original_filename ?? "Task photo"}
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
                {photo.original_filename ?? "Photo"}
              </p>
              <p className="text-[10px] text-[var(--color-muted)]">
                {formatFileSize(photo.file_size)}
              </p>
            </div>
          </button>
        );
      })}
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
  photos: InternDetailTaskPhoto[] | null; // null = photos are shown elsewhere
  onSelectPhoto: (photo: InternDetailTaskPhoto) => void;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-[var(--color-line)] bg-white/60">
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

export const SupervisorTimeLogModal = ({
  log,
  studentName,
  visible,
  onClose,
}: {
  log: InternDetailTimelog | null;
  studentName?: string;
  visible: boolean;
  onClose: () => void;
}) => {
  // Keep the last log around so the content doesn't vanish during the exit animation.
  const lastLog = useRef<InternDetailTimelog | null>(null);
  if (log) lastLog.current = log;
  const data = log ?? lastLog.current;

  const [activePhoto, setActivePhoto] = useState<InternDetailTaskPhoto | null>(
    null
  );

  const notes = parseTaskNote(data?.task_note ?? null);
  const photos = data?.task_photos ?? [];
  const canGroupPhotos =
    photos.length > 0 && photos.every((p) => photoSession(p) !== null);
  const morningPhotos = photos.filter((p) => photoSession(p) === "morning");
  const afternoonPhotos = photos.filter((p) => photoSession(p) === "afternoon");

  // An auto-closed log has a placeholder 00:00 time out, so don't use it for session math.
  const timeOutForMath = data?.needs_correction ? null : data?.time_out ?? null;

  const morningEnd = data?.break_out ?? timeOutForMath;
  const morningMinutes = minutesBetween(data?.time_in ?? null, morningEnd);
  const showAfternoon = Boolean(
    data?.break_in || notes.afternoon || afternoonPhotos.length > 0
  );
  const afternoonMinutes = minutesBetween(
    data?.break_in ?? null,
    timeOutForMath
  );

  function handleClose() {
    setActivePhoto(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {visible && data && (
        <motion.div
          key="timelog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={handleClose}
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
                  {studentName ? `${studentName} · ` : ""}
                  {formatDate(data.time_in)}
                  {data.session_period ? ` · ${data.session_period}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="shrink-0 rounded p-1 text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-6 py-4">
                {data.needs_correction && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>
                      The intern forgot to time out, so this log was closed
                      automatically. Use Update to enter the actual time out.
                    </p>
                  </div>
                )}

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
                        const match = describeMatchScore(data.face_match_score);
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
                    end={timeOutForMath}
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
            </div>
          </motion.div>

          {/* Photo lightbox */}
          <AnimatePresence>
            {activePhoto && (
              <motion.div
                key="timelog-lightbox"
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
                  src={photoUrl(activePhoto) ?? undefined}
                  alt={activePhoto.original_filename ?? "Task photo"}
                  className="max-h-full max-w-full rounded-md object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
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