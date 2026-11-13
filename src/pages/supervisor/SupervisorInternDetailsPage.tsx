import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  GraduationCap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
  Mail,
  UserX,
  Pencil,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSupervisorInternDetail,
  useRemoveIntern,
  useUpdateTimeLogTimeOut,
  type InternDetailTimelog,
} from "@/lib/queries/supervisor";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { RemoveInternModal } from "@/components/modal/RemoveInternModal";
import { SupervisorTimeLogModal } from "@/components/modal/SupervisorTimeLogModal";
import { UpdateTimeOutModal } from "@/components/modal/UpdateTimeOutModal";

// ─── helpers ────────────────────────────────────────────────────────────────

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

// "HH:MM[:SS]" schedule strings → "8:00 AM"
function fmtTime(raw: string | null) {
  if (!raw) return "—";
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    return `${h % 12 || 12}:${match[2]} ${h >= 12 ? "PM" : "AM"}`;
  }
  return raw;
}

// ISO timestamp → "10:21 AM"
function fmtClock(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(minutes: number | null) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtDate(raw: string) {
  return new Date(raw).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtMethod(raw: string | null) {
  const text = (raw ?? "facial_recognition").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ─── time log filters ───────────────────────────────────────────────────────

const PAGE_SIZE = 5;

type LogStatus = "needs_correction" | "in_progress" | "corrected" | "completed";

const STATUS_OPTIONS: { value: "all" | LogStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "needs_correction", label: "Needs correction" },
  { value: "in_progress", label: "In progress" },
  { value: "corrected", label: "Corrected by supervisor" },
  { value: "completed", label: "Completed" },
];

function logStatus(log: InternDetailTimelog): LogStatus {
  if (log.verification_method === "auto_closed_missed_punch_out")
    return "needs_correction";
  if (!log.time_out) return "in_progress";
  if (log.needs_correction) return "needs_correction";
  if (log.verification_method === "supervisor_corrected") return "corrected";
  return "completed";
}

// ISO timestamp → local "YYYY-MM-DD" (matches <input type="date"> values)
function toLocalDateKey(iso: string) {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

type ScheduleRequest = {
  id: number;
  status: "pending" | "approved" | "rejected";
  start_date: string | null;
  time_in: string | null;
  time_out: string | null;
  hours_per_day: number | null;
  days_per_week: number | null;
  reason: string | null;
  created_at: string | null;
};

const card =
  "rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]";

const filterControl =
  "rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20";

function SectionHeader({
  icon,
  title,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
        <span className="text-[var(--color-muted)]">{icon}</span>
        {title}
      </h2>
      {meta && <span className="text-xs text-[var(--color-muted)]">{meta}</span>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="font-semibold text-[var(--color-ink)] tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ─── component ──────────────────────────────────────────────────────────────

export default function SupervisorInternDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: intern,
    isLoading,
    isError,
    refetch,
  } = useSupervisorInternDetail(id);

  const removeIntern = useRemoveIntern();
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [viewingLog, setViewingLog] = useState<InternDetailTimelog | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Time-out correction (for logs the intern forgot to close)
  const updateTimeOut = useUpdateTimeLogTimeOut();
  const [editingLog, setEditingLog] = useState<InternDetailTimelog | null>(null);

  // Time log filters + pagination.
  // These hooks must stay above the early returns below.
  const [statusFilter, setStatusFilter] = useState<"all" | LogStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const allLogs = useMemo(
    () =>
      [...(intern?.time_logs ?? [])].sort((a, b) => {
        const aTime = a.time_in ? new Date(a.time_in).getTime() : 0;
        const bTime = b.time_in ? new Date(b.time_in).getTime() : 0;
        return bTime - aTime; // descending: latest first
      }),
    [intern]
  );

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (statusFilter !== "all" && logStatus(log) !== statusFilter)
        return false;
      if (dateFrom || dateTo) {
        if (!log.time_in) return false;
        const key = toLocalDateKey(log.time_in);
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
      }
      return true;
    });
  }, [allLogs, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedLogs = filteredLogs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const hasFilters = statusFilter !== "all" || dateFrom !== "" || dateTo !== "";

  function clearFilters() {
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  if (!user || user.role?.name !== "supervisor") {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle size={40} className="text-[var(--color-muted)]" />
        <p className="text-sm text-[var(--color-muted)]">Access denied.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-accent)]" size={28} />
      </div>
    );
  }

  if (isError || !intern) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle size={36} className="text-red-400" />
        <p className="text-sm font-medium text-red-700">
          Could not load intern details.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    );
  }

  const pct = intern.required_hours
    ? Math.min(100, Math.round((intern.total_hours / intern.required_hours) * 100))
    : null;

  const fullName = [intern.first_name, intern.middle_name, intern.last_name]
    .filter(Boolean)
    .join(" ");

  const scheduleRequests: ScheduleRequest[] =
    (intern as any).schedule_requests ?? [];
  const pendingRequests = scheduleRequests.filter((r) => r.status === "pending");

  const approvedRequest = scheduleRequests
    .filter((r) => r.status === "approved")
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })[0];

  const needsCorrectionCount = intern.time_logs.filter(
    (l) => l.needs_correction
  ).length;

  async function handleUpdateStatus(
    requestId: number,
    status: "approved" | "rejected"
  ) {
    setUpdatingId(requestId);
    try {
      await apiRequest(`/supervisor/schedule-requests/${requestId}/status`, {
        method: "PATCH",
        body: { status },
        token,
      });
      toastMutationSuccess(
        status === "approved"
          ? "Schedule request approved"
          : "Schedule request rejected"
      );
      queryClient.invalidateQueries();
      refetch();
    } catch (err) {
      toastMutationError(err, "Failed to update schedule request");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleConfirmRemove(reason: string) {
    if (!intern) return;
    removeIntern.mutate(
      { studentId: intern.id, reason },
      {
        onSuccess: () => {
          setShowRemoveModal(false);
          navigate(-1);
        },
      }
    );
  }

  function handleSaveTimeOut(timeOut: string, reason: string) {
    if (!editingLog) return;
    updateTimeOut.mutate(
      { logId: editingLog.id, timeOut, reason },
      { onSuccess: () => setEditingLog(null) }
    );
  }

  // Latest scheduled end of day, offered as a shortcut in the modal
  const scheduledTimeOut =
    approvedRequest?.time_out ??
    intern.schedules[intern.schedules.length - 1]?.time_out ??
    null;

  return (
    <section className="space-y-5 pb-12">
      {/* Back + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-[var(--shadow-soft)] transition hover:bg-slate-50"
        >
          <ArrowLeft size={14} /> Back to interns
        </button>
        <button
          type="button"
          onClick={() => setShowRemoveModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 shadow-[var(--shadow-soft)] transition hover:border-rose-300 hover:bg-rose-50"
        >
          <UserX size={14} /> Remove
        </button>
      </div>

      {/* Header: identity on the left, hours progress on the right */}
      <div className={`${card} grid gap-6 p-6 lg:grid-cols-[1fr_380px] lg:items-center`}>
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${avatarStyle(
              intern.student_number
            )}`}
          >
            {intern.first_name[0]}
            {intern.last_name[0]}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-[var(--color-ink)]">
                {fullName}
              </h1>
              <span
                className={
                  intern.is_active
                    ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                    : "rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500"
                }
              >
                {intern.is_active ? "Active" : "Inactive"}
              </span>
              {pendingRequests.length > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  {pendingRequests.length} pending request
                  {pendingRequests.length !== 1 ? "s" : ""}
                </span>
              )}
              {needsCorrectionCount > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  {needsCorrectionCount} log{needsCorrectionCount !== 1 ? "s" : ""} to fix
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
              <span className="font-mono font-semibold text-[var(--color-ink)]">
                {intern.student_number}
              </span>
              {intern.section && (
                <span className="flex items-center gap-1">
                  <GraduationCap size={13} />
                  {intern.section.name}
                </span>
              )}
              {intern.email && (
                <a
                  href={`mailto:${intern.email}`}
                  className="flex items-center gap-1 transition-colors hover:text-[var(--color-accent)]"
                >
                  <Mail size={13} />
                  {intern.email}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="lg:border-l lg:border-[var(--color-line)] lg:pl-6">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              OJT hours
            </p>
            <p className="text-sm tabular-nums text-[var(--color-muted)]">
              <span className="text-2xl font-bold text-[var(--color-ink)]">
                {intern.total_hours}
              </span>
              {intern.required_hours ? ` / ${intern.required_hours} hrs` : " hrs"}
            </p>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              style={{ width: `${pct ?? 0}%` }}
              className={`h-full rounded-full transition-[width] duration-700 ${pct !== null && pct >= 100
                ? "bg-emerald-500"
                : "bg-[var(--color-accent)]"
                }`}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {pct !== null ? `${pct}% complete · ` : ""}
            {intern.time_logs.length} session
            {intern.time_logs.length !== 1 ? "s" : ""} logged
          </p>
        </div>
      </div>

      {/* Body: schedule column + time logs */}
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Left column */}
        <aside className="space-y-5 lg:col-start-1 lg:row-start-1">
          {/* Work schedule */}
          <div className={card}>
            <SectionHeader
              icon={<Calendar size={15} />}
              title="Work schedule"
              meta={
                approvedRequest ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    Approved request
                  </span>
                ) : (
                  `${intern.schedules.length} schedule${intern.schedules.length !== 1 ? "s" : ""
                  }`
                )
              }
            />
            <div className="px-5 py-3">
              {approvedRequest ? (
                <div className="divide-y divide-[var(--color-line)]">
                  <Row
                    label="Effective"
                    value={
                      approvedRequest.start_date
                        ? fmtDate(approvedRequest.start_date)
                        : "—"
                    }
                  />
                  <Row label="Time in" value={fmtTime(approvedRequest.time_in)} />
                  <Row label="Time out" value={fmtTime(approvedRequest.time_out)} />
                  <Row label="Hours per day" value={approvedRequest.hours_per_day ?? "—"} />
                  <Row label="Days per week" value={approvedRequest.days_per_week ?? "—"} />
                </div>
              ) : intern.schedules.length > 0 ? (
                <div className="space-y-4">
                  {intern.schedules.map((sch) => (
                    <div
                      key={sch.id}
                      className="divide-y divide-[var(--color-line)]"
                    >
                      <Row label="Effective" value={fmtDate(sch.start_date)} />
                      <Row label="Time in" value={fmtTime(sch.time_in)} />
                      <Row
                        label="Lunch"
                        value={sch.lunch_break ? fmtTime(sch.lunch_break) : "—"}
                      />
                      <Row label="Time out" value={fmtTime(sch.time_out)} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-xs text-[var(--color-muted)]">
                  No schedule configured yet.
                </p>
              )}
            </div>
          </div>

          {/* Schedule requests */}
          <div className={card}>
            <SectionHeader
              icon={<Send size={15} />}
              title="Schedule requests"
              meta={`${scheduleRequests.length} total`}
            />
            <div className="p-4">
              {scheduleRequests.length > 0 ? (
                <div className="space-y-3">
                  {scheduleRequests.map((req) => {
                    const isPending = req.status === "pending";
                    const isUpdating = updatingId === req.id;
                    return (
                      <div
                        key={req.id}
                        className={`rounded-xl border p-3.5 ${isPending
                          ? "border-amber-200 bg-amber-50/40"
                          : "border-[var(--color-line)] bg-slate-50/60"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs">
                            <p className="font-semibold text-[var(--color-ink)]">
                              {req.start_date ? fmtDate(req.start_date) : "—"}
                            </p>
                            {req.created_at && (
                              <p className="text-[var(--color-muted)]">
                                Requested {fmtDateTime(req.created_at)}
                              </p>
                            )}
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${req.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                              : req.status === "rejected"
                                ? "bg-red-50 text-red-600 ring-red-600/20"
                                : "bg-amber-100 text-amber-700 ring-amber-600/20"
                              }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[var(--color-ink)]">
                          {fmtTime(req.time_in)} – {fmtTime(req.time_out)}
                          <span className="text-[var(--color-muted)]">
                            {" "}
                            · {req.hours_per_day ?? "—"} hrs/day ·{" "}
                            {req.days_per_week ?? "—"} days/week
                          </span>
                        </p>
                        {req.reason && (
                          <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                            Reason: {req.reason}
                          </p>
                        )}
                        {isPending && (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(req.id, "approved")}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={13} />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(req.id, "rejected")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <XCircle size={13} />
                              )}
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-1 py-2 text-xs text-[var(--color-muted)]">
                  This intern hasn't requested a schedule change.
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Time logs */}
        <div className={`${card} min-w-0 overflow-hidden lg:col-start-2 lg:row-start-1`}>
          <SectionHeader
            icon={<Clock size={15} />}
            title="Time logs"
            meta={
              hasFilters
                ? `${filteredLogs.length} of ${allLogs.length} entries · ${intern.total_hours} hrs total`
                : `${allLogs.length} entries · ${intern.total_hours} hrs total`
            }
          />

          {allLogs.length > 0 ? (
            <>
              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3 border-b border-[var(--color-line)] bg-slate-50/40 px-5 py-3">
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-[var(--color-muted)]">
                    <Filter size={11} /> Status
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as "all" | LogStatus);
                      setPage(1);
                    }}
                    className={filterControl}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-[var(--color-muted)]">
                    From
                  </span>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className={filterControl}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-[var(--color-muted)]">
                    To
                  </span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    className={filterControl}
                  />
                </label>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
                  >
                    <X size={12} /> Clear
                  </button>
                )}
              </div>

              {filteredLogs.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/70 text-xs text-[var(--color-muted)]">
                        <tr>
                          <th className="px-5 py-2.5 font-medium">Date</th>
                          <th className="px-2.5 py-2.5 font-medium">In</th>
                          <th className="px-2.5 py-2.5 font-medium">Out</th>
                          <th className="px-2.5 py-2.5 font-medium">Duration</th>
                          <th className="px-2.5 py-2.5 font-medium">Verification</th>
                          <th className="px-5 py-2.5 text-right font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                        {pagedLogs.map((log) => (
                          <tr key={log.id} className="transition hover:bg-slate-50/60">
                            <td className="whitespace-nowrap px-5 py-3.5 font-medium">
                              {log.time_in ? fmtDate(log.time_in) : "—"}
                            </td>
                            <td className="whitespace-nowrap px-2.5 py-3.5">
                              {fmtClock(log.time_in)}
                            </td>
                            <td className="whitespace-nowrap px-2.5 py-3.5">
                              {log.time_out && !log.needs_correction ? (
                                fmtClock(log.time_out)
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                  {log.time_out ? "Needs correction" : "In progress"}
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-2.5 py-3.5 font-semibold tabular-nums text-[var(--color-accent)]">
                              {fmtDuration(log.duration_minutes)}
                            </td>
                            <td className="px-2.5 py-3.5">
                              <span className="inline-block max-w-[120px] rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium leading-tight text-slate-700">
                                {fmtMethod(log.verification_method)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5">
                              <div className="flex items-center justify-end gap-2">
                                {log.needs_correction && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingLog(log)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                                  >
                                    <Pencil size={11} /> Update
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setViewingLog(log)}
                                  title="View details"
                                  aria-label="View details"
                                  className="inline-flex items-center rounded-lg border border-[var(--color-line)] bg-white p-1.5 transition hover:bg-slate-50"
                                >
                                  <Eye size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] bg-slate-50/40 px-5 py-3">
                    <p className="text-xs text-[var(--color-muted)]">
                      Showing{" "}
                      <span className="font-semibold text-[var(--color-ink)]">
                        {(safePage - 1) * PAGE_SIZE + 1}–
                        {Math.min(safePage * PAGE_SIZE, filteredLogs.length)}
                      </span>{" "}
                      of {filteredLogs.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage(safePage - 1)}
                        disabled={safePage <= 1}
                        aria-label="Previous page"
                        className="inline-flex items-center rounded-lg border border-[var(--color-line)] bg-white p-1.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs tabular-nums text-[var(--color-muted)]">
                        Page{" "}
                        <span className="font-semibold text-[var(--color-ink)]">
                          {safePage}
                        </span>{" "}
                        of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage(safePage + 1)}
                        disabled={safePage >= totalPages}
                        aria-label="Next page"
                        className="inline-flex items-center rounded-lg border border-[var(--color-line)] bg-white p-1.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <Filter size={26} className="mb-3 text-slate-300" />
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    No logs match these filters
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-2 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Clock size={28} className="mb-3 text-slate-300" />
              <p className="text-sm font-medium text-[var(--color-ink)]">
                No time logs yet
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                This intern hasn't recorded any sessions at your company.
              </p>
            </div>
          )}
        </div>
      </div>

      <UpdateTimeOutModal
        log={editingLog}
        scheduledTimeOut={scheduledTimeOut}
        isSaving={updateTimeOut.isPending}
        onClose={() => setEditingLog(null)}
        onSave={handleSaveTimeOut}
      />

      <RemoveInternModal
        isOpen={showRemoveModal}
        isSubmitting={removeIntern.isPending}
        internName={fullName}
        onConfirm={handleConfirmRemove}
        onClose={() => setShowRemoveModal(false)}
      />
      <SupervisorTimeLogModal
        log={viewingLog}
        studentName={fullName}
        visible={Boolean(viewingLog)}
        onClose={() => setViewingLog(null)}
      />
    </section>
  );
}