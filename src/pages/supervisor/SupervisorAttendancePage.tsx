import { useState, useMemo } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  X,
  Coffee,
  Users,
  Timer,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import {
  useSupervisorAttendance,
  useSupervisorSchedules,
  useSupervisorProfile,
  useCreateSupervisorSchedule,
  useUpdateSupervisorSchedule,
  useDeleteSupervisorSchedule,
  useUpdateTimeLogTimeOut,
  type CompanyScheduleData,
  type ScheduleInput,
  type SupervisorAttendanceLog,
} from "@/lib/queries/supervisor";
import { useAuth } from "@/lib/auth";
import { useCurrentSchoolYear } from "@/lib/queries/school-year";
import AddEditScheduleModal from "@/components/modal/AddEditScheduleModal";
import { UpdateTimeOutModal } from "@/components/modal/UpdateTimeOutModal";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtTime(isoOrTime: string | null) {
  if (!isoOrTime) return "—";
  if (isoOrTime.includes("T")) {
    return new Date(isoOrTime).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const [h, m] = isoOrTime.split(":");
  if (h !== undefined && m !== undefined) {
    const hour = parseInt(h, 10);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
  }
  return isoOrTime;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDuration(minutes: number | null) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Local YYYY-MM-DD (toISOString() would use UTC and shift the date near midnight)
function toLocalYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isWithinDateRange(isoTimeIn: string | null, from: string, to: string) {
  if (!isoTimeIn) return false;
  const logDate = isoTimeIn.slice(0, 10);
  if (from && logDate < from) return false;
  if (to && logDate > to) return false;
  return true;
}

function initials(name: string) {
  // Names come as "Last, First"
  const [last = "", first = ""] = name.split(",").map((s) => s.trim());
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}

const AVATAR_STYLES = [
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
  "bg-rose-50 text-rose-700",
];

function avatarStyle(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash + seed.charCodeAt(i)) % AVATAR_STYLES.length;
  return AVATAR_STYLES[hash];
}

function fmtRangeLabel(from: string, to: string) {
  const f = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  if (!from && !to) return "All dates";
  if (from && to) return from === to ? f(from) : `${f(from)} – ${f(to)}`;
  return from ? `From ${f(from)}` : `Until ${f(to)}`;
}

const card =
  "rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "custom", label: "Custom" },
] as const;

type LogState = "in_progress" | "needs_correction" | "corrected" | "completed";

function logState(log: SupervisorAttendanceLog): LogState {
  if (log.needs_correction) return log.time_out ? "needs_correction" : "in_progress";
  if (!log.time_out) return "in_progress";
  const method = (log as { verification_method?: string | null })
    .verification_method;
  if (method === "supervisor_corrected") return "corrected";
  return "completed";
}

const STATE_STYLES: Record<LogState, { label: string; cls: string }> = {
  in_progress: {
    label: "In progress",
    cls: "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  needs_correction: {
    label: "Needs correction",
    cls: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  corrected: {
    label: "Corrected",
    cls: "bg-violet-50 text-violet-700 ring-violet-600/20",
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
};

function StateBadge({ state }: { state: LogState }) {
  const s = STATE_STYLES[state];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: "blue" | "emerald" | "violet" | "amber";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className={`${card} flex items-center gap-3.5 px-5 py-4`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-muted)]">{label}</p>
        <p className="text-xl font-bold leading-tight tabular-nums text-[var(--color-ink)]">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── component ──────────────────────────────────────────────────────────────

export function SupervisorAttendancePage() {
  const { user } = useAuth();
  const { data: profile } = useSupervisorProfile();
  const { data: currentSchoolYear } = useCurrentSchoolYear();
  const {
    data: logs,
    isLoading: isLoadingLogs,
    error: errorLogs,
  } = useSupervisorAttendance();
  const {
    data: schedules,
    isLoading: isLoadingSchedules,
    error: errorSchedules,
  } = useSupervisorSchedules();

  const { mutate: createSchedule, isPending: isCreating } =
    useCreateSupervisorSchedule();
  const { mutate: updateSchedule, isPending: isUpdating } =
    useUpdateSupervisorSchedule();
  const { mutate: deleteSchedule, isPending: isDeleting } =
    useDeleteSupervisorSchedule();
  const updateTimeOut = useUpdateTimeLogTimeOut();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<CompanyScheduleData | null>(null);
  const [editingLog, setEditingLog] = useState<SupervisorAttendanceLog | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlyFix, setOnlyFix] = useState(false);
  const [range, setRange] = useState<"today" | "week" | "month" | "custom">(
    "today"
  );

  // ── All hooks must run before any early return below ──────────────────────

  const rangeFrom = useMemo(() => {
    if (range === "custom") return dateFrom;
    const now = new Date();
    if (range === "today") return toLocalYmd(now);
    if (range === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay()); // Sunday
      return toLocalYmd(d);
    }
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }, [range, dateFrom]);

  const rangeTo = useMemo(() => {
    if (range === "custom") return dateTo;
    return toLocalYmd(new Date());
  }, [range, dateTo]);

  const inRange = useMemo(
    () =>
      (logs ?? []).filter((l) => {
        const matchesSearch =
          l.student_name.toLowerCase().includes(search.toLowerCase()) ||
          (l.student_number ?? "").includes(search);
        const matchesDate =
          !rangeFrom && !rangeTo
            ? true
            : isWithinDateRange(l.time_in, rangeFrom, rangeTo);
        return matchesSearch && matchesDate;
      }),
    [logs, search, rangeFrom, rangeTo]
  );

  const fixCount = useMemo(
    () => inRange.filter((l) => l.needs_correction).length,
    [inRange]
  );

  const filtered = useMemo(
    () => (onlyFix ? inRange.filter((l) => l.needs_correction) : inRange),
    [inRange, onlyFix]
  );

  // Summary numbers for the current view
  const summary = useMemo(() => {
    const interns = new Set(filtered.map((l) => l.student_number ?? l.student_name));
    const minutes = filtered.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);
    return {
      logs: filtered.length,
      interns: interns.size,
      hours: Math.round((minutes / 60) * 10) / 10,
    };
  }, [filtered]);

  // ── Early returns ─────────────────────────────────────────────────────────

  if (!user || user.role?.name !== "supervisor") {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle size={48} className="text-[var(--color-muted)]" />
        <div>
          <h2 className="text-xl font-semibold">Access denied</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingLogs || isLoadingSchedules) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-2">
            <div className="h-3 w-32 rounded bg-black/5" />
            <div className="h-8 w-80 rounded-lg bg-black/5" />
          </div>
          <div className="h-14 w-48 rounded-2xl bg-black/5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[76px] rounded-2xl bg-black/5" />
          ))}
        </div>
        <div className="h-32 rounded-2xl bg-black/5" />
        <div className="h-72 rounded-2xl bg-black/5" />
      </div>
    );
  }

  if (errorLogs || errorSchedules) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
        <div>
          <p className="text-sm font-semibold text-red-800">
            Failed to load attendance or schedule records.
          </p>
          <p className="mt-0.5 text-xs text-red-700/80">
            Check your connection and refresh the page to try again.
          </p>
        </div>
      </div>
    );
  }

  // ── Handlers (not hooks) ──────────────────────────────────────────────────

  function handleSaveSchedule(input: ScheduleInput) {
    if (editingSchedule) {
      updateSchedule(
        { id: editingSchedule.id, input },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingSchedule(null);
          },
        }
      );
    } else {
      createSchedule(input, { onSuccess: () => setIsModalOpen(false) });
    }
  }

  function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteSchedule(id);
    }
  }

  function handleSaveTimeOut(timeOut: string, reason: string) {
    if (!editingLog) return;
    updateTimeOut.mutate(
      { logId: editingLog.id, timeOut, reason },
      { onSuccess: () => setEditingLog(null) }
    );
  }

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setOnlyFix(false);
    setRange("today");
  }

  const scheduleList = schedules ?? [];
  const today = toLocalYmd(new Date());
  const currentScheduleId = [...scheduleList]
    .filter((s) => s.start_date.slice(0, 10) <= today)
    .pop()?.id;
  const scheduledTimeOut =
    (scheduleList.find((s) => s.id === currentScheduleId) ??
      scheduleList[scheduleList.length - 1])?.time_out ?? null;

  const hasFilters = Boolean(search) || onlyFix || range !== "today";

  return (
    <section className="space-y-5 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Supervisor Portal
            </p>
            {currentSchoolYear && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                <CalendarDays size={12} className="text-amber-600" />
                S.Y. {currentSchoolYear.name}
                {currentSchoolYear.semester && (
                  <span className="font-normal text-amber-700">
                    · {currentSchoolYear.semester}
                  </span>
                )}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            Attendance & work schedule
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Review intern time logs, fix missed time outs, and manage company hours.
          </p>
        </div>

        {profile?.company && (
          <div className="flex w-fit items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Company
              </p>
              <p className="text-sm font-bold text-[var(--color-ink)]">
                {profile.company.name}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Summary (reflects the current range, search and filters) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Clock size={18} />}
          label="Time logs"
          value={summary.logs}
          tone="blue"
        />
        <StatTile
          icon={<UserCheck size={18} />}
          label="Interns"
          value={summary.interns}
          tone="emerald"
        />
        <StatTile
          icon={<Timer size={18} />}
          label="Hours rendered"
          value={
            <>
              {summary.hours}
              <span className="ml-1 text-sm font-semibold text-[var(--color-muted)]">
                hrs
              </span>
            </>
          }
          tone="violet"
        />
        <StatTile
          icon={fixCount > 0 ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          label="Need correction"
          value={fixCount}
          tone="amber"
        />
      </div>

      {/* Work schedule */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
              <Calendar size={15} className="text-[var(--color-muted)]" />
              Work schedule
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-muted)]">
                {scheduleList.length}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Company working hours and break times for interns.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingSchedule(null);
              setIsModalOpen(true);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] active:scale-[0.98]"
          >
            <Plus size={15} /> Add schedule
          </button>
        </div>

        {scheduleList.length > 0 ? (
          <ul className="divide-y divide-[var(--color-line)]">
            {scheduleList.map((sch) => {
              const isCurrent = sch.id === currentScheduleId;
              return (
                <li
                  key={sch.id}
                  className={`relative flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4 transition-colors hover:bg-slate-50/60 ${isCurrent ? "bg-emerald-50/30" : ""
                    }`}
                >
                  {isCurrent && (
                    <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                  )}

                  <div className="min-w-[150px]">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Effective
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                      {fmtDate(sch.start_date)}
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Current
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="min-w-[150px]">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Work hours
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                      <Clock size={13} className="text-[var(--color-muted)]" />
                      {fmtTime(sch.time_in)} – {fmtTime(sch.time_out)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Lunch break
                    </p>
                    {sch.lunch_break ? (
                      <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink)]">
                        <Coffee size={13} className="text-amber-600" />
                        {sch.lunch_break}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm italic text-[var(--color-muted)]">
                        None
                      </p>
                    )}
                  </div>

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSchedule(sch);
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-slate-50"
                      aria-label="Edit schedule"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sch.id)}
                      disabled={isDeleting}
                      className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Delete schedule"
                      aria-label="Delete schedule"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-inset ring-[var(--color-line)]">
              <Calendar size={20} />
            </span>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              No company schedule yet
            </p>
            <p className="max-w-xs text-xs text-[var(--color-muted)]">
              Add one so interns know their working hours.
            </p>
          </div>
        )}
      </div>

      {/* Attendance time logs */}
      <div className={`${card} min-w-0 overflow-hidden`}>
        <div className="border-b border-[var(--color-line)] px-5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                <Clock size={15} className="text-[var(--color-muted)]" />
                Attendance time logs
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-muted)]">
                  {filtered.length}
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                Showing {fmtRangeLabel(rangeFrom, rangeTo)}
              </p>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
              >
                <X size={12} /> Reset filters
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-slate-50/70 p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  aria-pressed={range === r.key}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === r.key
                    ? "bg-white text-[var(--color-accent)] shadow-sm ring-1 ring-[var(--color-line)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {range === "custom" && (
              <div className="flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-white px-2.5 py-1.5 focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20">
                <Calendar size={14} className="shrink-0 text-[var(--color-muted)]" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                  aria-label="From date"
                  className="bg-transparent text-sm text-[var(--color-ink)] outline-none"
                />
                <span className="text-xs text-[var(--color-muted)]">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  aria-label="To date"
                  className="bg-transparent text-sm text-[var(--color-ink)] outline-none"
                />
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    aria-label="Clear date filter"
                    className="ml-0.5 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                size={14}
              />
              <input
                type="text"
                placeholder="Search intern or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-xl border border-[var(--color-line)] bg-white py-2 pl-8 pr-8 text-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {fixCount > 0 && (
              <button
                type="button"
                onClick={() => setOnlyFix((v) => !v)}
                aria-pressed={onlyFix}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${onlyFix
                  ? "border-amber-300 bg-amber-100 text-amber-800"
                  : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
              >
                <AlertCircle size={13} />
                {onlyFix ? "Showing" : "Show only"} {fixCount} to fix
              </button>
            )}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-[var(--color-muted)] shadow-[0_1px_0_var(--color-line)]">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Intern</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">In</th>
                  <th className="px-3 py-2.5 font-medium">Break</th>
                  <th className="px-3 py-2.5 font-medium">Out</th>
                  <th className="px-3 py-2.5 font-medium">Duration</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                {filtered.map((log) => {
                  const state = logState(log);
                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors hover:bg-slate-50/60 ${log.needs_correction ? "bg-amber-50/30" : ""
                        }`}
                    >
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarStyle(
                              log.student_number ?? log.student_name
                            )}`}
                          >
                            {initials(log.student_name)}
                          </span>
                          <div>
                            <p className="font-medium">{log.student_name}</p>
                            <p className="font-mono text-[11px] text-[var(--color-muted)]">
                              {log.student_number}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        {fmtDate(log.time_in)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 tabular-nums">
                        {fmtTime(log.time_in)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        {log.break_out || log.break_in ? (
                          <span className="tabular-nums">
                            {fmtTime(log.break_out)} – {fmtTime(log.break_in)}
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted)]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 tabular-nums">
                        {log.time_out && !log.needs_correction ? (
                          fmtTime(log.time_out)
                        ) : (
                          <span className="text-[var(--color-muted)]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 font-semibold tabular-nums text-[var(--color-accent)]">
                        {fmtDuration(log.duration_minutes)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <StateBadge state={state} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        {log.needs_correction && (
                          <button
                            type="button"
                            onClick={() => setEditingLog(log)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50"
                          >
                            <Pencil size={11} /> Update
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-inset ring-[var(--color-line)]">
              {hasFilters ? <Search size={22} /> : <Users size={22} />}
            </span>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              {hasFilters ? "No records match your filters" : "No attendance yet today"}
            </p>
            <p className="max-w-xs text-xs text-[var(--color-muted)]">
              {hasFilters
                ? "Try a wider date range or clear the search."
                : "Logs will appear here as interns time in. Try the Week or Month view to see earlier records."}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-1 text-xs font-semibold text-[var(--color-accent)] hover:underline"
              >
                Clear all filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRange("week")}
                className="mt-1 text-xs font-semibold text-[var(--color-accent)] hover:underline"
              >
                View this week
              </button>
            )}
          </div>
        )}
      </div>

      <AddEditScheduleModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchedule(null);
        }}
        isLoading={isCreating || isUpdating}
        scheduleToEdit={editingSchedule}
        onSubmit={handleSaveSchedule}
      />

      <UpdateTimeOutModal
        log={editingLog}
        scheduledTimeOut={scheduledTimeOut}
        isSaving={updateTimeOut.isPending}
        onClose={() => setEditingLog(null)}
        onSave={handleSaveTimeOut}
      />
    </section>
  );
}