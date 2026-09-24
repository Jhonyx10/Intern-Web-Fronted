import { AlertCircle, Clock, Building2, Eye } from "lucide-react";
import {
  useSupervisorInterns,
  useSupervisorProfile,
  useSupervisorSchedules,
  type SupervisorIntern,
} from "@/lib/queries/supervisor";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

const AVATAR_STYLES = [
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
  "bg-rose-50 text-rose-700",
];

function initialsFor(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function avatarStyle(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash + seed.charCodeAt(i)) % AVATAR_STYLES.length;
  return AVATAR_STYLES[hash];
}

function fmtScheduleTime(raw: string | null | undefined) {
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

function fmtScheduleDate(raw: string | null | undefined) {
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SupervisorInternsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useSupervisorProfile();
  const { data: interns, isLoading, error } = useSupervisorInterns();
  const { data: companySchedules } = useSupervisorSchedules();

  // Company-wide fallback schedule when an intern has no approved
  // individual request — most recent by start_date.
  const fallbackSchedule = companySchedules?.length
    ? [...companySchedules].sort(
        (a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )[0]
    : null;

  if (!user || user.role?.name !== "supervisor") {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle size={40} className="text-[var(--color-muted)]" />
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-ink)]">
            Access denied
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 max-w-md rounded-lg bg-black/5" />
        <div className="h-12 rounded-lg bg-black/5" />
        <div className="h-72 rounded-xl bg-black/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
        <div>
          <p className="text-sm font-medium text-red-800">
            Couldn't load your interns
          </p>
          <p className="mt-0.5 text-sm text-red-700/80">
            Check your connection and try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  const list = interns ?? [];
  const activeCount = list.filter((i) => i.is_active).length;
  const withTarget = list.filter((i) => i.required_hours);
  const avgCompletion = withTarget.length
    ? Math.round(
        (withTarget.reduce(
          (sum, i) => sum + Math.min(1, i.total_hours / i.required_hours!),
          0
        ) /
          withTarget.length) *
          100
      )
    : null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[var(--color-ink)]">
            My interns
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Students currently placed with your company, and their hour progress
            toward completion.
          </p>
        </div>

        {profile?.company && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <Building2 size={16} />
            <span className="font-medium text-[var(--color-ink)]">
              {profile.company.name}
            </span>
          </div>
        )}
      </header>

      {/* Stats strip */}
      <div className="flex flex-wrap divide-x divide-[var(--color-line)] overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">
        <div className="flex-1 min-w-[140px] px-5 py-4">
          <p className="text-2xl font-semibold text-[var(--color-ink)]">
            {list.length}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Total interns
          </p>
        </div>
        <div className="flex-1 min-w-[140px] px-5 py-4">
          <p className="text-2xl font-semibold text-[var(--color-ink)]">
            {activeCount}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Currently active
          </p>
        </div>
        <div className="flex-1 min-w-[140px] px-5 py-4">
          <p className="text-2xl font-semibold text-[var(--color-ink)]">
            {avgCompletion !== null ? `${avgCompletion}%` : "—"}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Avg. hours completed
          </p>
        </div>
      </div>

      {/* Roster */}
      <div className="rounded-xl border border-[var(--color-line)] bg-white">
        {list.length > 0 ? (
          <>
            {/* Table — desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-xs text-[var(--color-muted)]">
                    <th className="px-6 py-3 font-medium">Student</th>
                    <th className="px-6 py-3 font-medium">Section</th>
                    <th className="px-6 py-3 font-medium">Hours progress</th>
                    <th className="px-6 py-3 font-medium">Start Date</th>
                    <th className="px-6 py-3 font-medium">Time In</th>
                    <th className="px-6 py-3 font-medium">Time Out</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {list.map((intern) => {
                    const pct = intern.required_hours
                      ? Math.min(
                          100,
                          Math.round(
                            (intern.total_hours / intern.required_hours) * 100
                          )
                        )
                      : null;
                    // Prefer the intern's own approved request; fall back
                    // to the company-wide schedule if they don't have one.
                    const sched = intern.approved_schedule ?? fallbackSchedule;
                    const isFallback =
                      !intern.approved_schedule && !!fallbackSchedule;

                    return (
                      <tr
                        key={intern.id}
                        className="transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarStyle(
                                intern.student_number
                              )}`}
                            >
                              {initialsFor(intern.first_name, intern.last_name)}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--color-ink)]">
                                {intern.last_name}, {intern.first_name}{" "}
                                {intern.middle_name ?? ""}
                              </p>
                              <p className="text-xs text-[var(--color-muted)]">
                                {intern.student_number}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[var(--color-muted)]">
                          {intern.section?.name ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          {pct !== null ? (
                            <div className="flex items-center gap-2.5">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-[var(--color-accent)]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-[var(--color-muted)] tabular-nums">
                                {intern.total_hours}/{intern.required_hours} hrs
                              </span>
                            </div>
                          ) : (
                            <span className="text-[var(--color-muted)]">
                              {intern.total_hours} hrs
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span
                            className={
                              isFallback
                                ? "text-[var(--color-muted)]"
                                : "text-[var(--color-ink)]"
                            }
                          >
                            {fmtScheduleDate(sched?.start_date)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span
                            className={
                              isFallback
                                ? "text-[var(--color-muted)]"
                                : "text-[var(--color-ink)]"
                            }
                          >
                            {fmtScheduleTime(sched?.time_in)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span
                            className={
                              isFallback
                                ? "text-[var(--color-muted)]"
                                : "text-[var(--color-ink)]"
                            }
                          >
                            {fmtScheduleTime(sched?.time_out)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {intern.is_active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right w-px whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/supervisor/interns/${intern.id}`)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-sky-600 transition-colors hover:border-sky-300 hover:bg-sky-50"
                          >
                            <Eye size={13} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards — mobile */}
            <div className="divide-y divide-[var(--color-line)] md:hidden">
              {list.map((intern) => {
                const pct = intern.required_hours
                  ? Math.min(
                      100,
                      Math.round(
                        (intern.total_hours / intern.required_hours) * 100
                      )
                    )
                  : null;
                const sched = intern.approved_schedule ?? fallbackSchedule;

                return (
                  <div key={intern.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarStyle(
                          intern.student_number
                        )}`}
                      >
                        {initialsFor(intern.first_name, intern.last_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--color-ink)]">
                          {intern.last_name}, {intern.first_name}
                        </p>
                        <p className="text-xs text-[var(--color-muted)]">
                          {intern.student_number} ·{" "}
                          {intern.section?.name ?? "—"}
                        </p>
                      </div>
                      {intern.is_active ? (
                        <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2.5">
                      {pct !== null ? (
                        <>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[var(--color-accent)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--color-muted)] tabular-nums">
                            {intern.total_hours}/{intern.required_hours} hrs
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">
                          {intern.total_hours} hrs logged
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                      <Clock size={12} />
                      {fmtScheduleDate(sched?.start_date)} ·{" "}
                      {fmtScheduleTime(sched?.time_in)} –{" "}
                      {fmtScheduleTime(sched?.time_out)}
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/supervisor/interns/${intern.id}`)
                        }
                        className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--color-line)] py-1.5 text-xs font-medium text-sky-600 transition-colors hover:border-sky-300 hover:bg-sky-50"
                      >
                        <Eye size={13} /> View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-14 text-center">
            <Clock size={32} className="text-[var(--color-muted)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)]">
                No interns assigned yet
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Once students are placed with your company, they'll appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
