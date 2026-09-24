import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  ArrowUpRight,
  UserX,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSupervisorInternDetail,
  useRemoveIntern,
} from "@/lib/queries/supervisor";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { RemoveInternModal } from "@/components/modal/RemoveInternModal";

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

function fmtTime(raw: string | null) {
  if (!raw) return "—";
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m} ${ampm}`;
  }
  return raw;
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

// A schedule change requested by the intern (from the mobile app),
// awaiting supervisor approval.
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

  const [updatingId, setUpdatingId] = useState<number | null>(null);

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
        <Loader2
          className="animate-spin text-[var(--color-accent)]"
          size={28}
        />
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
          <ArrowLeft size={14} /> Go Back
        </button>
      </div>
    );
  }

  const pct = intern.required_hours
    ? Math.min(
        100,
        Math.round((intern.total_hours / intern.required_hours) * 100)
      )
    : null;

  const fullName = [intern.first_name, intern.middle_name, intern.last_name]
    .filter(Boolean)
    .join(" ");

  const scheduleRequests: ScheduleRequest[] =
    (intern as any).schedule_requests ?? [];
  const pendingRequests = scheduleRequests.filter(
    (r) => r.status === "pending"
  );

  const approvedRequest = scheduleRequests
    .filter((r) => r.status === "approved")
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })[0];

  const pendingEvaluation = intern.ojt_evaluations?.find(
    (e) => e.status === "pending"
  );

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

  return (
    <section className="space-y-6 pb-12">
      {/* Back button + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-[var(--shadow-soft)] transition hover:bg-slate-50"
        >
          <ArrowLeft size={14} /> Back to Interns
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              pendingEvaluation &&
              navigate(
                `/supervisor/interns/${intern.id}/evaluations/${pendingEvaluation.id}`
              )
            }
            disabled={!pendingEvaluation}
            className="relative inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-[var(--shadow-soft)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--color-line)] disabled:hover:text-[var(--color-ink)]"
          >
            Evaluate
            <ArrowUpRight size={14} />
            {pendingEvaluation && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                !
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowRemoveModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 shadow-[var(--shadow-soft)] transition hover:border-rose-300 hover:bg-rose-50"
          >
            <UserX size={14} /> Remove
          </button>
        </div>
      </div>

      {/* Profile card — avatar, progress bar, and schedule */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-5"
      >
        {/* Avatar + name row */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold shadow-inner ${avatarStyle(
              intern.student_number
            )}`}
          >
            {intern.first_name[0]}
            {intern.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--color-ink)]">
                {fullName}
              </h1>
              <span
                className={[
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  intern.is_active
                    ? "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/20"
                    : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {intern.is_active ? "Active" : "Inactive"}
              </span>
              {pendingRequests.length > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  {pendingRequests.length} pending request
                  {pendingRequests.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted)]">
              <span className="font-mono font-semibold text-[var(--color-ink)]">
                {intern.student_number}
              </span>
              {intern.section && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <GraduationCap size={13} />
                    {intern.section.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="border-t border-[var(--color-line)] pt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-[var(--color-ink)]">
              OJT Hours Progress
            </span>
            <span className="font-bold text-[var(--color-accent)] tabular-nums">
              {intern.total_hours}
              {intern.required_hours
                ? ` / ${intern.required_hours} hrs`
                : " hrs logged"}
              {pct !== null && ` (${pct}%)`}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: pct !== null ? `${pct}%` : "0%" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={[
                "h-full rounded-full",
                pct !== null && pct >= 100
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-[var(--color-accent)] to-indigo-500",
              ].join(" ")}
            />
          </div>
          {/* Stat pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="rounded-lg bg-slate-50 border border-[var(--color-line)] px-3 py-1.5 text-center">
              <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide">
                Logged
              </p>
              <p className="text-sm font-bold text-[var(--color-ink)]">
                {intern.total_hours} hrs
              </p>
            </div>
            {intern.required_hours && (
              <div className="rounded-lg bg-slate-50 border border-[var(--color-line)] px-3 py-1.5 text-center">
                <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide">
                  Required
                </p>
                <p className="text-sm font-bold text-[var(--color-ink)]">
                  {intern.required_hours} hrs
                </p>
              </div>
            )}
            {pct !== null && (
              <div className="rounded-lg bg-slate-50 border border-[var(--color-line)] px-3 py-1.5 text-center">
                <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide">
                  Completion
                </p>
                <p
                  className={[
                    "text-sm font-bold",
                    pct >= 100
                      ? "text-emerald-600"
                      : "text-[var(--color-accent)]",
                  ].join(" ")}
                >
                  {pct}%
                </p>
              </div>
            )}
            <div className="rounded-lg bg-slate-50 border border-[var(--color-line)] px-3 py-1.5 text-center">
              <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide">
                Sessions
              </p>
              <p className="text-sm font-bold text-[var(--color-ink)]">
                {intern.time_logs.length}
              </p>
            </div>
          </div>
        </div>

        {/* Work Schedule — inside the profile card */}
        <div className="border-t border-[var(--color-line)] pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
              <Calendar size={15} className="text-[var(--color-muted)]" />
              Work Schedule
            </h2>
            {approvedRequest ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 ring-1 ring-inset ring-emerald-600/20">
                From approved request
              </span>
            ) : (
              <span className="text-xs text-[var(--color-muted)]">
                {intern.schedules.length} schedule
                {intern.schedules.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {approvedRequest ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Effective
                </span>
                <span className="font-bold text-[var(--color-ink)]">
                  {approvedRequest.start_date
                    ? fmtDate(approvedRequest.start_date)
                    : "—"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase">
                    In
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-emerald-800">
                    {fmtTime(approvedRequest.time_in)}
                  </p>
                </div>
                <div className="rounded-lg bg-rose-50 p-2">
                  <p className="text-[10px] font-semibold text-rose-600 uppercase">
                    Out
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-rose-800">
                    {fmtTime(approvedRequest.time_out)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-100 p-2">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase">
                    Hrs/Day
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-800">
                    {approvedRequest.hours_per_day ?? "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-100 p-2">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase">
                    Days/Wk
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-800">
                    {approvedRequest.days_per_week ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : intern.schedules.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {intern.schedules.map((sch) => (
                <div
                  key={sch.id}
                  className="rounded-xl border border-[var(--color-line)] bg-slate-50/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      Effective
                    </span>
                    <span className="font-bold text-[var(--color-ink)]">
                      {fmtDate(sch.start_date)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase">
                        In
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-emerald-800">
                        {fmtTime(sch.time_in)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2">
                      <p className="text-[10px] font-semibold text-amber-600 uppercase">
                        Lunch
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-amber-800">
                        {sch.lunch_break ? fmtTime(sch.lunch_break) : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-rose-50 p-2">
                      <p className="text-[10px] font-semibold text-rose-600 uppercase">
                        Out
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-rose-800">
                        {fmtTime(sch.time_out)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-line)] px-4 py-3 text-xs text-[var(--color-muted)]">
              <Calendar size={16} className="text-slate-300 shrink-0" />
              No schedule configured yet.
            </div>
          )}
        </div>

        {/* Schedule Requests — intern-submitted requests awaiting approval */}
        <div className="border-t border-[var(--color-line)] pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
              <Send size={15} className="text-[var(--color-muted)]" />
              Schedule Requests
            </h2>
            <span className="text-xs text-[var(--color-muted)]">
              {scheduleRequests.length} total
            </span>
          </div>

          {scheduleRequests.length > 0 ? (
            <div className="space-y-3">
              {scheduleRequests.map((req) => {
                const isPending = req.status === "pending";
                const isUpdating = updatingId === req.id;
                return (
                  <div
                    key={req.id}
                    className={[
                      "rounded-xl border p-4",
                      isPending
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-[var(--color-line)] bg-slate-50/60",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-semibold text-[var(--color-ink)]">
                        {req.start_date ? fmtDate(req.start_date) : "—"}
                        {req.created_at && (
                          <span className="ml-2 font-normal text-[var(--color-muted)]">
                            · requested {fmtDateTime(req.created_at)}
                          </span>
                        )}
                      </span>
                      <span
                        className={[
                          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          req.status === "approved"
                            ? "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/20"
                            : req.status === "rejected"
                            ? "bg-red-50 text-red-600 ring-1 ring-inset ring-red-600/20"
                            : "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20",
                        ].join(" ")}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                          Time In
                        </p>
                        <p className="font-semibold text-[var(--color-ink)]">
                          {fmtTime(req.time_in)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                          Time Out
                        </p>
                        <p className="font-semibold text-[var(--color-ink)]">
                          {fmtTime(req.time_out)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                          Hours/Day
                        </p>
                        <p className="font-semibold text-[var(--color-ink)]">
                          {req.hours_per_day ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                          Days/Week
                        </p>
                        <p className="font-semibold text-[var(--color-ink)]">
                          {req.days_per_week ?? "—"}
                        </p>
                      </div>
                    </div>

                    {req.reason && (
                      <p className="mt-3 text-xs text-[var(--color-muted)]">
                        <span className="font-semibold text-[var(--color-ink)]">
                          Reason:{" "}
                        </span>
                        {req.reason}
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
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-line)] px-4 py-3 text-xs text-[var(--color-muted)]">
              <Send size={16} className="text-slate-300 shrink-0" />
              No schedule requests submitted yet.
            </div>
          )}
        </div>
      </motion.div>

      {/* Time Logs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Clock size={15} className="text-[var(--color-muted)]" />
            Time Logs
          </h2>
          <span className="text-xs text-[var(--color-muted)]">
            {intern.time_logs.length} entries · {intern.total_hours} hrs total
          </span>
        </div>

        {intern.time_logs.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--color-line)] bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  <tr>
                    <th className="px-5 py-3">Date &amp; Time In</th>
                    <th className="px-5 py-3">Time Out</th>
                    <th className="px-5 py-3">Duration</th>
                    <th className="px-5 py-3">Verification</th>
                    <th className="px-5 py-3">Task Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {intern.time_logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 transition"
                    >
                      <td className="px-5 py-3 font-medium text-[var(--color-ink)] whitespace-nowrap">
                        {fmtDateTime(log.time_in)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {log.time_out ? (
                          <span className="text-[var(--color-ink)]">
                            {fmtDateTime(log.time_out)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-bold text-indigo-600 tabular-nums whitespace-nowrap">
                        {fmtDuration(log.duration_minutes)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 capitalize">
                          {log.verification_method ?? "Facial Match"}
                        </span>
                      </td>
                      <td className="max-w-[180px] truncate px-5 py-3 text-xs text-[var(--color-muted)]">
                        {log.task_note ?? <span className="italic">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] py-12 text-center">
            <Clock size={28} className="text-slate-300 mb-3" />
            <p className="text-sm font-medium text-[var(--color-ink)]">
              No time logs yet
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              This intern hasn't recorded any sessions at your company.
            </p>
          </div>
        )}
      </motion.div>

      <RemoveInternModal
        isOpen={showRemoveModal}
        isSubmitting={removeIntern.isPending}
        internName={fullName}
        onConfirm={handleConfirmRemove}
        onClose={() => setShowRemoveModal(false)}
      />
    </section>
  );
}
