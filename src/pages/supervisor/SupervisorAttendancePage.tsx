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

const card =
  "rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "custom", label: "Custom" },
] as const;

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
      <div className="space-y-6 animate-pulse">
        <div className="h-20 max-w-sm rounded-xl bg-black/5" />
        <div className="h-24 rounded-xl bg-black/5" />
        <div className="h-64 rounded-xl bg-black/5" />
      </div>
    );
  }

  if (errorLogs || errorSchedules) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">
          Failed to load attendance or schedule records.
        </p>
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

  function handleSaveTimeOut(timeOut: string) {
    if (!editingLog) return;
    updateTimeOut.mutate(
      { logId: editingLog.id, timeOut },
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
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]">
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
        </div>

        {profile?.company && (
          <div className="flex w-fit items-center gap-2.5 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)]">Company</p>
              <p className="text-sm font-bold text-[var(--color-ink)]">
                {profile.company.name}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Work schedule: one compact row per schedule */}
      <div className={card}>
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
              <Calendar size={15} className="text-[var(--color-muted)]" />
              Work schedule
              <span className="font-normal text-[var(--color-muted)]">
                ({scheduleList.length})
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
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
          >
            <Plus size={15} /> Add schedule
          </button>
        </div>

        {scheduleList.length > 0 ? (
          <ul className="divide-y divide-[var(--color-line)]">
            {scheduleList.map((sch) => (
              <li
                key={sch.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 transition-colors hover:bg-slate-50/60"
              >
                <div className="min-w-[150px]">
                  <p className="text-xs text-[var(--color-muted)]">Effective</p>
                  <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                    {fmtDate(sch.start_date)}
                    {sch.id === currentScheduleId && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        Current
                      </span>
                    )}
                  </p>
                </div>

                <div className="min-w-[150px]">
                  <p className="text-xs text-[var(--color-muted)]">Work hours</p>
                  <p className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                    {fmtTime(sch.time_in)} – {fmtTime(sch.time_out)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[var(--color-muted)]">Lunch break</p>
                  {sch.lunch_break ? (
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink)]">
                      <Coffee size={13} className="text-amber-600" />
                      {sch.lunch_break}
                    </p>
                  ) : (
                    <p className="text-sm italic text-[var(--color-muted)]">None</p>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSchedule(sch);
                      setIsModalOpen(true);
                    }}
                    className="rounded-lg p-2 text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
                    title="Edit schedule"
                    aria-label="Edit schedule"
                  >
                    <Pencil size={15} />
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
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3 px-5 py-6 text-sm text-[var(--color-muted)]">
            <Calendar size={20} className="text-slate-300" />
            No company schedule yet. Add one so interns know their hours.
          </div>
        )}
      </div>

      {/* Attendance time logs */}
      <div className={`${card} min-w-0 overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--color-line)] px-5 py-3.5 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Clock size={15} className="text-[var(--color-muted)]" />
            Attendance time logs
            <span className="font-normal text-[var(--color-muted)]">
              ({filtered.length})
            </span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-white p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === r.key
                      ? "bg-[var(--color-accent)] text-white shadow-sm"
                      : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {range === "custom" && (
              <div className="flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] px-2.5 py-1.5">
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
                placeholder="Search intern..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-44 rounded-xl border border-[var(--color-line)] py-2 pl-8 pr-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
              />
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
                {fixCount} to fix
              </button>
            )}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 text-xs text-[var(--color-muted)]">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Intern</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">In</th>
                  <th className="px-3 py-2.5 font-medium">Break</th>
                  <th className="px-3 py-2.5 font-medium">Out</th>
                  <th className="px-3 py-2.5 font-medium">Duration</th>
                  <th className="px-3 py-2.5 font-medium">Task note</th>
                  <th className="px-5 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                {filtered.map((log) => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="font-medium">{log.student_name}</p>
                      <p className="font-mono text-xs text-[var(--color-muted)]">
                        {log.student_number}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5">
                      {fmtDate(log.time_in)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5">
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
                    <td className="whitespace-nowrap px-3 py-3.5">
                      {log.time_out && !log.needs_correction ? (
                        fmtTime(log.time_out)
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          {log.time_out ? "Needs correction" : "In progress"}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 font-semibold tabular-nums text-[var(--color-accent)]">
                      {fmtDuration(log.duration_minutes)}
                    </td>
                    <td
                      className="max-w-[220px] truncate px-3 py-3.5 text-[var(--color-muted)]"
                      title={log.task_note ?? undefined}
                    >
                      {log.task_note ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      {log.needs_correction && (
                        <button
                          type="button"
                          onClick={() => setEditingLog(log)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                          <Pencil size={11} /> Update
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <Clock size={30} className="text-slate-300" />
            <p className="text-sm text-[var(--color-muted)]">
              {hasFilters
                ? "No attendance records match your filters."
                : "No attendance records for today yet."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
              >
                Clear all filters
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