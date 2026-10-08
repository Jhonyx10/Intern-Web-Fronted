import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Plus,
  Search,
  Loader2,
  Pencil,
  Settings,
  ExternalLink,
  CalendarDays,
  CopyPlus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { queryKeys } from "@/lib/query-keys";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import AddSchoolYearModal from "@/components/modal/AddSchoolYearModal";
import SchoolYearSettingsModal from "@/components/modal/SchoolYearSettingsModal";

type SchoolYearData = {
  id: number;
  name: string; // e.g. "2025-2026"
  semester?: string | null; // e.g. "First Semester" | "Second Semester" | "Summer Semester"
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

type SchoolYearPayload = {
  name: string;
  semester: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// Semester pill colors (summer = orange, second = green, first = blue)
function semesterStyle(semester?: string | null) {
  const s = (semester ?? "").toLowerCase();
  if (s.includes("summer"))
    return { pill: "bg-orange-50 text-orange-700", dot: "bg-orange-600" };
  if (s.includes("second"))
    return { pill: "bg-green-50 text-green-700", dot: "bg-green-600" };
  if (s.includes("first"))
    return { pill: "bg-blue-50 text-blue-700", dot: "bg-blue-600" };
  return { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Status ────────────────────────────────────────────────────────
//   Current = marked active by the super admin (only one at a time)
//   Ongoing = not current, but today is inside the internship period
//   Draft   = not current, and not started yet (or no dates set)
//   Ended   = not current, and the internship period has passed

type YearStatus = "current" | "ongoing" | "draft" | "ended";

// Local date as YYYY-MM-DD (toISOString would shift the day for UTC+8)
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getYearStatus(year: {
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}): YearStatus {
  if (year.is_active) return "current";
  if (!year.start_date || !year.end_date) return "draft";

  const today = todayLocal();
  if (today < year.start_date.slice(0, 10)) return "draft";
  if (today > year.end_date.slice(0, 10)) return "ended";
  return "ongoing";
}

const STATUS_BADGE: Record<
  YearStatus,
  { label: string; className: string; dot: string }
> = {
  current: {
    label: "Current",
    className: "bg-green-500 text-white",
    dot: "bg-white",
  },
  ongoing: {
    label: "Ongoing",
    className: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  draft: {
    label: "Draft",
    className: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  ended: {
    label: "Ended",
    className: "bg-slate-200 text-slate-600",
    dot: "bg-slate-400",
  },
};

// "2025-2026" -> "2026-2027"
function shiftName(name: string) {
  return name.replace(/\d{4}/g, (y) => String(Number(y) + 1));
}

// "2025-06-15" -> "2026-06-15" (string-based, so no timezone surprises)
function shiftDate(value: string | null) {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  const newYear = y + 1;
  const isLeap =
    (newYear % 4 === 0 && newYear % 100 !== 0) || newYear % 400 === 0;
  // Feb 29 -> Feb 28 when the next year isn't a leap year
  const day = m === 2 && d === 29 && !isLeap ? 28 : d;
  return `${newYear}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Card ──────────────────────────────────────────────────────────

const SchoolYearCard = ({
  year,
  canManage,
  onEdit,
  onSettings,
  onOpen,
  onNextYear,
  isCreatingNext,
}: {
  year: SchoolYearData;
  canManage: boolean;
  onEdit: () => void;
  onSettings: () => void;
  onOpen: () => void;
  onNextYear: () => void;
  isCreatingNext: boolean;
}) => {
  const sem = semesterStyle(year.semester);
  const status = getYearStatus(year);
  const badge = STATUS_BADGE[status];

  return (
    <motion.article
      variants={itemVariants}
      className={`flex flex-col rounded-2xl border border-[var(--color-line)] p-5 shadow-sm ${
        year.is_active ? "bg-white" : "bg-slate-50"
      }`}
    >
      {/* Title + status badge */}
      <div className="flex items-start justify-between gap-2">
        <h2
          className={`text-xl font-bold tracking-tight ${
            year.is_active
              ? "text-[var(--color-ink)]"
              : "text-[var(--color-muted)]"
          }`}
        >
          {year.name}
        </h2>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </span>
      </div>

      {/* Semester pill */}
      {year.semester && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${sem.pill}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${sem.dot}`} />
          {year.semester}
        </div>
      )}

      {/* Internship period */}
      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5">
        <p className="text-xs text-[var(--color-muted)]">Internship Period</p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--color-ink)]">
          {formatDate(year.start_date)} - {formatDate(year.end_date)}
        </p>
      </div>

      {/* Actions — pushed to the bottom so cards in a row align */}
      <div className="mt-auto pt-6">
        {canManage && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-slate-50"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={onSettings}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-slate-50"
            >
              <Settings size={14} /> Settings
            </button>
            <button
              type="button"
              onClick={onNextYear}
              disabled={isCreatingNext}
              className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreatingNext ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CopyPlus size={14} />
              )}
              Create {shiftName(year.name)}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onOpen}
          className={`${canManage ? "mt-2" : ""} inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]`}
        >
          <ExternalLink size={14} /> Open
        </button>
      </div>
    </motion.article>
  );
};

// ── Main Page ─────────────────────────────────────────────────────

const SchoolYearPage = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Accept both spellings so it works regardless of what RoleSeeder created.
  // Once you know the real role name, replace this with a single check.
  const roleName = user?.role?.name;
  const canManage = roleName === "superadmin" || roleName === "super_admin";

  const [search, setSearch] = useState("");
  const [addSyOpen, setAddSyOpen] = useState(false);
  const [editSyTarget, setEditSyTarget] = useState<SchoolYearData | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<SchoolYearData | null>(
    null
  );

  const {
    data: schoolYears = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.schoolYears.list(),
    queryFn: () => apiRequest<SchoolYearData[]>("/school-years", { token }),
    enabled: Boolean(token),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schoolYears;
    return schoolYears.filter(
      (sy) =>
        sy.name.toLowerCase().includes(q) ||
        (sy.semester ?? "").toLowerCase().includes(q) ||
        STATUS_BADGE[getYearStatus(sy)].label.toLowerCase().includes(q)
    );
  }, [schoolYears, search]);

  const addSyMutation = useMutation({
    mutationFn: (data: SchoolYearPayload) =>
      apiRequest("/school-years", { method: "POST", body: data, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
      setAddSyOpen(false);
      toastMutationSuccess("School year created");
    },
    onError: (err) => toastMutationError(err, "Failed to create school year"),
  });

  const editSyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SchoolYearPayload }) =>
      apiRequest(`/school-years/${id}`, { method: "PUT", body: data, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
      setEditSyTarget(null);
      toastMutationSuccess("School year updated");
    },
    onError: (err) => toastMutationError(err, "Failed to update school year"),
  });

  // Status change from the settings modal. The update endpoint requires the
  // semester, so the full record is sent along with the new is_active value.
  const statusMutation = useMutation({
    mutationFn: ({
      year,
      isActive,
    }: {
      year: SchoolYearData;
      isActive: boolean;
    }) =>
      apiRequest(`/school-years/${year.id}`, {
        method: "PUT",
        body: {
          name: year.name,
          semester: year.semester ?? "",
          start_date: year.start_date,
          end_date: year.end_date,
          is_active: isActive,
        } satisfies SchoolYearPayload,
        token,
      }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
      setSettingsTarget(null);
      toastMutationSuccess(
        isActive ? "School year set as current" : "School year set as inactive"
      );
    },
    onError: (err) =>
      toastMutationError(err, "Failed to update school year status"),
  });

  // "School year +1": duplicate a year with name and dates shifted forward by one year.
  const nextYearMutation = useMutation({
    mutationFn: (year: SchoolYearData) => {
      const payload: SchoolYearPayload = {
        name: shiftName(year.name),
        semester: year.semester ?? "",
        start_date: shiftDate(year.start_date),
        end_date: shiftDate(year.end_date),
        is_active: false, // new year starts as a draft; set it as current later
      };
      return apiRequest("/school-years", {
        method: "POST",
        body: payload,
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
      toastMutationSuccess("Next school year created");
    },
    onError: (err) =>
      toastMutationError(err, "Failed to create next school year"),
  });

  const handleNextYear = (year: SchoolYearData) => {
    const newName = shiftName(year.name);
    const exists = schoolYears.some(
      (sy) =>
        sy.name === newName && (sy.semester ?? "") === (year.semester ?? "")
    );
    if (exists) {
      toastMutationError(
        new Error("Already exists"),
        `${newName} already exists`
      );
      return;
    }
    if (
      window.confirm(
        `Create ${newName} (${year.semester ?? "no semester"}) from ${year.name}?`
      )
    ) {
      nextYearMutation.mutate(year);
    }
  };

  return (
    <section>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            School Years
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Manage academic year and internship periods
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search school years..."
              className="w-full rounded-lg border border-[var(--color-line)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] sm:w-64"
            />
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => setAddSyOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
            >
              <Plus size={15} /> Add School Year
            </button>
          )}
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="mt-10 flex items-center justify-center">
          <Loader2
            className="animate-spin text-[var(--color-accent)]"
            size={24}
          />
        </div>
      ) : isError ? (
        <div className="mt-10 text-center text-sm text-red-500">
          Failed to load school years.
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] py-14 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <CalendarDays size={16} />
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">
            {search ? "No matching school years" : "No school years yet"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {search
              ? "Try a different search."
              : "Add a school year to get started."}
          </p>
        </div>
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((year) => (
            <SchoolYearCard
              key={year.id}
              year={year}
              canManage={canManage}
              onEdit={() => setEditSyTarget(year)}
              onSettings={() => setSettingsTarget(year)}
              onOpen={() => navigate(`/school-year/${year.id}`)}
              onNextYear={() => handleNextYear(year)}
              isCreatingNext={
                nextYearMutation.isPending &&
                nextYearMutation.variables?.id === year.id
              }
            />
          ))}
        </motion.div>
      )}

      {/* Modals */}
      <AddSchoolYearModal
        open={addSyOpen}
        onClose={() => setAddSyOpen(false)}
        onAdd={(data) => addSyMutation.mutate(data)}
        isLoading={addSyMutation.isPending}
      />

      <AddSchoolYearModal
        open={editSyTarget !== null}
        onClose={() => setEditSyTarget(null)}
        onAdd={(data) => {
          if (editSyTarget) {
            editSyMutation.mutate({ id: editSyTarget.id, data });
          }
        }}
        isLoading={editSyMutation.isPending}
        initialData={editSyTarget ?? undefined}
      />

      <SchoolYearSettingsModal
        open={settingsTarget !== null}
        onClose={() => setSettingsTarget(null)}
        year={settingsTarget}
        onSave={(isActive) => {
          if (settingsTarget) {
            statusMutation.mutate({ year: settingsTarget, isActive });
          }
        }}
        isLoading={statusMutation.isPending}
      />
    </section>
  );
};

export default SchoolYearPage;