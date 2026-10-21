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
} from "lucide-react";
import {
  useSupervisorAttendance,
  useSupervisorSchedules,
  useSupervisorProfile,
  useCreateSupervisorSchedule,
  useUpdateSupervisorSchedule,
  useDeleteSupervisorSchedule,
  type CompanyScheduleData,
  type ScheduleInput,
} from "@/lib/queries/supervisor";
import { useAuth } from "@/lib/auth";
import { useCurrentSchoolYear } from "@/lib/queries/school-year";
import AddEditScheduleModal from "@/components/modal/AddEditScheduleModal";

function fmtTime(isoOrTime: string | null) {
  if (!isoOrTime) return "—";
  if (isoOrTime.includes("T")) {
    return new Date(isoOrTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const [h, m] = isoOrTime.split(":");
  if (h !== undefined && m !== undefined) {
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m} ${ampm}`;
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

// Compares a log's time_in date against an inclusive [from, to] range,
// both given as "YYYY-MM-DD" strings from <input type="date">.
function isWithinDateRange(isoTimeIn: string | null, from: string, to: string) {
  if (!isoTimeIn) return false;
  const logDate = isoTimeIn.slice(0, 10); // "YYYY-MM-DD"
  if (from && logDate < from) return false;
  if (to && logDate > to) return false;
  return true;
}

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<CompanyScheduleData | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [range, setRange] = useState<"today" | "week" | "month" | "custom">("today");
  const [viewMode, setViewMode] = useState<"logs" | "summary">("logs");

  if (!user || user.role?.name !== "supervisor") {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle size={48} className="text-[var(--color-muted)]" />
        <div>
          <h2 className="text-xl font-semibold">Access Denied</h2>
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
        <div className="h-48 rounded-xl bg-black/5" />
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

  // Compute date boundaries for preset ranges
  const rangeFrom = useMemo(() => {
    if (range === "custom") return dateFrom;
    const now = new Date();
    if (range === "today") return now.toISOString().slice(0, 10);
    if (range === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay()); // Sunday
      return d.toISOString().slice(0, 10);
    }
    if (range === "month") {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }
    return "";
  }, [range, dateFrom]);

  const rangeTo = useMemo(() => {
    if (range === "custom") return dateTo;
    return new Date().toISOString().slice(0, 10);
  }, [range, dateTo]);

  const filtered = (logs ?? []).filter((l) => {
    const matchesSearch =
      l.student_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.student_number ?? "").includes(search);
    const matchesDate = !rangeFrom && !rangeTo
      ? true
      : isWithinDateRange(l.time_in, rangeFrom, rangeTo);
    return matchesSearch && matchesDate;
  });

  // Per-student summary grouped from filtered logs
  type StudentSummary = {
    student_id: number;
    student_name: string;
    student_number: string;
    sessions: number;
    days: number;
    total_minutes: number;
    last_seen: string | null;
  };
  const studentSummary = useMemo<StudentSummary[]>(() => {
    const map = new Map<number, StudentSummary & { days_set: Set<string> }>();
    for (const l of filtered) {
      const dateStr = l.time_in ? l.time_in.slice(0, 10) : null;
      const ex = map.get(l.student_id);
      if (ex) {
        ex.sessions += 1;
        ex.total_minutes += l.duration_minutes ?? 0;
        if (dateStr && !ex.days_set.has(dateStr)) { ex.days_set.add(dateStr); ex.days += 1; }
        if (l.time_in && (!ex.last_seen || l.time_in > ex.last_seen)) ex.last_seen = l.time_in;
      } else {
        map.set(l.student_id, {
          student_id: l.student_id,
          student_name: l.student_name,
          student_number: l.student_number ?? "",
          sessions: 1,
          days: dateStr ? 1 : 0,
          total_minutes: l.duration_minutes ?? 0,
          last_seen: l.time_in ?? null,
          days_set: new Set(dateStr ? [dateStr] : []),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.student_name.localeCompare(b.student_name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const rangePeriodLabel =
    range === "today" ? "Today"
      : range === "week" ? "This Week"
        : range === "month" ? "This Month"
          : "Custom Range";

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
      createSchedule(input, {
        onSuccess: () => {
          setIsModalOpen(false);
        },
      });
    }
  }

  function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteSchedule(id);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="text-sm font-semibold tracking-wide text-[var(--color-accent)] uppercase">
              Supervisor Portal
            </p>
            {currentSchoolYear && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                <CalendarDays size={12} className="text-amber-600" />
                S.Y. {currentSchoolYear.name}
                {currentSchoolYear.semester && (
                  <span className="font-normal text-amber-700">· {currentSchoolYear.semester}</span>
                )}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            Attendance & Work Schedule
          </h1>
        </div>

        {profile?.company && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] w-fit">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">
                Company
              </p>
              <p className="text-sm font-bold text-[var(--color-ink)]">
                {profile.company.name}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Company Schedule Section */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar size={18} className="text-[var(--color-muted)]" />
              Work Schedule
              <span className="text-sm font-normal text-[var(--color-muted)]">
                ({schedules?.length ?? 0})
              </span>
            </h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Company working hours and break schedules for interns.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingSchedule(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] shadow-sm"
          >
            <Plus size={16} /> Add Schedule
          </button>
        </div>

        {schedules && schedules.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--color-muted)]">
              <thead className="bg-slate-50/50 text-xs uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-6 py-3 font-medium">Start Date</th>
                  <th className="px-6 py-3 font-medium">Time In</th>
                  <th className="px-6 py-3 font-medium">Lunch Break</th>
                  <th className="px-6 py-3 font-medium">Time Out</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                {schedules.map((sch) => (
                  <tr
                    key={sch.id}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4 font-medium whitespace-nowrap">
                      {fmtDate(sch.start_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fmtTime(sch.time_in)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sch.lunch_break ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {sch.lunch_break}
                        </span>
                      ) : (
                        <span className="italic text-[var(--color-muted)]">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fmtTime(sch.time_out)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingSchedule(sch);
                            setIsModalOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-slate-100 hover:text-[var(--color-ink)] transition"
                          title="Edit Schedule"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(sch.id)}
                          disabled={isDeleting}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                          title="Delete Schedule"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <Calendar size={32} className="text-[var(--color-muted)]" />
            <p className="text-sm text-[var(--color-muted)]">
              No company schedule has been created yet.
            </p>
          </div>
        )}
      </div>

      {/* Attendance / Time Logs Section */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-[var(--color-line)] px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock size={18} className="text-[var(--color-muted)]" />
              Attendance Time Logs
              <span className="text-sm font-normal text-[var(--color-muted)]">({filtered.length})</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Range tabs */}
            <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-white p-1 shadow-sm">
              {(["today", "week", "month", "custom"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === r
                      ? "bg-[var(--color-accent)] text-white shadow-xs"
                      : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                    }`}
                >
                  {r === "today" ? "Today" : r === "week" ? "Week" : r === "month" ? "Month" : "Custom"}
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("logs")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewMode === "logs"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
              >
                Logs
              </button>
              <button
                type="button"
                onClick={() => setViewMode("summary")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewMode === "summary"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
              >
                By Student
              </button>
            </div>

            {/* Search */}
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
                className="rounded-xl border border-[var(--color-line)] py-2 pl-8 pr-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>

            {/* Custom date pickers */}
            {range === "custom" && (
              <div className="flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] px-2.5 py-1.5">
                <Calendar size={14} className="text-[var(--color-muted)] shrink-0" />
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
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                    aria-label="Clear date filter"
                    className="ml-0.5 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {viewMode === "summary" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--color-muted)]">
              <thead className="bg-slate-50/50 text-xs uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Days Present ({rangePeriodLabel})</th>
                  <th className="px-6 py-3 font-medium">Sessions</th>
                  <th className="px-6 py-3 font-medium">Total Hours</th>
                  <th className="px-6 py-3 font-medium">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                {studentSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-[var(--color-muted)]">
                      No records for this period.
                    </td>
                  </tr>
                ) : studentSummary.map((s) => (
                  <tr key={s.student_id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-medium">{s.student_name}</p>
                      <p className="text-xs text-[var(--color-muted)]">{s.student_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                        {s.days} {s.days === 1 ? "day" : "days"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">{s.sessions}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-700">{fmtDuration(s.total_minutes)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{s.last_seen ? fmtDate(s.last_seen) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--color-muted)]">
              <thead className="bg-slate-50/50 text-xs uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Time In</th>
                  <th className="px-6 py-3 font-medium">Break Out</th>
                  <th className="px-6 py-3 font-medium">Break In</th>
                  <th className="px-6 py-3 font-medium">Time Out</th>
                  <th className="px-6 py-3 font-medium">Duration</th>
                  <th className="px-6 py-3 font-medium">Task Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                {filtered.map((log) => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium">{log.student_name}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {log.student_number}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fmtDate(log.time_in)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fmtTime(log.time_in)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fmtTime(log.break_out)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fmtTime(log.break_in)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.time_out ? (
                        fmtTime(log.time_out)
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fmtDuration(log.duration_minutes)}
                    </td>
                    <td className="max-w-[200px] truncate px-6 py-4 text-[var(--color-muted)]">
                      {log.task_note ?? <span className="italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Clock size={36} className="text-[var(--color-muted)]" />
            <p className="text-sm text-[var(--color-muted)]">
              {search || rangeFrom
                ? "No attendance records match your filters."
                : "No attendance records found."}
            </p>
            {(search || rangeFrom) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDateFrom("");
                  setDateTo("");
                  setRange("today");
                }}
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
    </section>
  );
}
