import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  X,
  Layers,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useDocumentRequirements,
  useCourseDocumentRequirements,
  useDepartmentRequirements,
  useCourseThemes,
} from "@/lib/queries/documents";
import { useCourses } from "@/lib/queries/courses";
import { useCurrentSchoolYear } from "@/lib/queries/school-year";
import { CreateRequirementModal } from "@/components/modal/CreateRequirementModal";
import { AssignRequirementsModal } from "@/components/modal/AssignRequirementsModal";
import { CommonDocumentsModal } from "@/components/modal/CommonDocumentsModal";
import { DepartmentRequirementCards } from "@/components/cards/DepartmentRequirementCard";
import type { Program } from "@/types";

// ─── animation variants ─────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};
const row = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function DocumentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role?.name === "super_admin";
  const isDean = user?.role?.name === "dean" || user?.role?.name === "coordinator";
  const courseId = user?.course?.id as number | undefined;

  // Deans only ever have one department — redirect straight to its details page.
  useEffect(() => {
    if (isDean && courseId) {
      navigate(`/documents/${courseId}`, { replace: true });
    }
  }, [isDean, courseId, navigate]);

  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommonModal, setShowCommonModal] = useState(false);
  // Super admin: the department whose requirements are being assigned
  const [assignCourseId, setAssignCourseId] = useState<number | null>(null);

  const { data: currentSchoolYear } = useCurrentSchoolYear();
  const { data: courses } = useCourses();

  const courseIds = useMemo(
    () => (courses ?? []).map((c) => Number(c.id)),
    [courses]
  );

  const deptResults = useDepartmentRequirements(isSuperAdmin ? courseIds : []);
  const { data: themes } = useCourseThemes(isSuperAdmin);

  const { data: allRequirements, isError: errorAll } = useDocumentRequirements();

  const deanQuery = useCourseDocumentRequirements(isDean ? courseId : undefined);
  const courseRequirements = deanQuery.data;
  const errorCourse = deanQuery.isError;

  const deanCourse =
    (courses ?? []).find((c) => Number(c.id) === Number(courseId)) ??
    (user?.course as Program | undefined);

  const { data: assignTarget } = useCourseDocumentRequirements(
    isSuperAdmin ? assignCourseId ?? undefined : undefined
  );

  const requirements: { is_active: boolean }[] | undefined = isDean
    ? courseRequirements
    : allRequirements;
  const isErrorRequirements = isDean ? errorCourse : errorAll;

  const totalRequirements = requirements?.length ?? 0;
  const activeRequirements = requirements?.filter((r) => r.is_active).length ?? 0;
  const inactiveRequirements = totalRequirements - activeRequirements;

  const commonRequirementsCount = useMemo(
    () =>
      (allRequirements ?? []).filter(
        (r) => r.document_type === "common" || !r.document_type
      ).length,
    [allRequirements]
  );

  if (isDean && courseId) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-accent)]" size={28} />
      </div>
    );
  }

  if (isDean && !courseId) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] py-24 text-center"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <FolderOpen size={24} />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-[var(--color-ink)]">
          No Department Assigned
        </h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          Your account is not linked to a department yet. Please contact a
          Super Admin to have your course assigned.
        </p>
      </motion.section>
    );
  }

  return (
    <>
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* ── Page header ──────────────────────────────────── */}
        <motion.div
          variants={row}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
                Document Management
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
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              {isDean ? "Your Program Requirements" : "Document Requirements"}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              {isDean
                ? "Documents your students are required to submit, and when they're due."
                : "Manage document types and requirements, and assign them to departments."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin && (
              <>
                <select
                  value=""
                  onChange={(e) =>
                    e.target.value && setAssignCourseId(Number(e.target.value))
                  }
                  aria-label="Assign requirements to a department"
                  className="cursor-pointer rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--color-muted)] shadow-sm outline-none transition hover:border-[var(--color-accent)]"
                >
                  <option value="">Assign to department…</option>
                  {courses?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                >
                  <Plus size={15} /> New Requirement
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* ── Dean read-only notice ────────────────────────── */}
        {isDean && (
          <motion.div
            variants={row}
            className="rounded-xl border border-[var(--color-line)] bg-slate-50 px-4 py-3 text-sm text-[var(--color-muted)]"
          >
            These requirements and deadlines are set by the Super Admin for
            your department.
          </motion.div>
        )}

        {/* ── Stat cards ───────────────────────────────────── */}
        <motion.div
          variants={row}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          {[
            {
              label: isDean ? "Assigned" : "Total requirements",
              value: totalRequirements,
              icon: FileText,
              color: "text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
            },
            {
              label: "Active",
              value: activeRequirements,
              icon: BookOpen,
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              label: "Inactive",
              value: inactiveRequirements,
              icon: X,
              color: "text-red-500 bg-red-50",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <article
              key={label}
              className="flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur"
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm ${color}`}
              >
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                <p className="text-xs font-medium text-[var(--color-muted)]">
                  {label}
                </p>
              </div>
            </article>
          ))}
        </motion.div>

        {/* ── Error banner ─────────────────────────────────── */}
        {isErrorRequirements && (
          <motion.div
            variants={row}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          >
            <p className="text-sm font-medium text-red-700">
              Couldn't load documents. Please check your network connection and
              try again.
            </p>
          </motion.div>
        )}

        {/* ── Super admin: department cards ────────────────── */}
        {isSuperAdmin && (
          <motion.div variants={row} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-[220px] max-w-md flex-1 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm text-[var(--color-muted)] transition focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20">
                <Search size={14} />
                <input
                  type="search"
                  placeholder="Search departments…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  >
                    <X size={12} />
                  </button>
                )}
              </label>

              <button
                type="button"
                onClick={() => setShowCommonModal(true)}
                className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm font-medium text-[var(--color-ink)] shadow-xs transition hover:border-[var(--color-accent)] hover:bg-slate-50"
              >
                <Layers size={15} className="text-[var(--color-accent)]" />
                Common Documents
                <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
                  {commonRequirementsCount}
                </span>
              </button>
            </div>

            {courses && (
              <DepartmentRequirementCards
                courses={courses}
                results={deptResults}
                themes={themes}
                search={search}
                schoolYear={currentSchoolYear?.name}
                onManage={setAssignCourseId}
              />
            )}
          </motion.div>
        )}

        {/* Dean: a single read-only card for their own department */}
        {isDean && deanCourse && (
          <DepartmentRequirementCards
            courses={[deanCourse]}
            results={[deanQuery]}
            schoolYear={currentSchoolYear?.name}
          />
        )}
      </motion.section>

      {/* ── Modals ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showCommonModal && (
          <CommonDocumentsModal
            key="common-documents-modal"
            visible={showCommonModal}
            onClose={() => setShowCommonModal(false)}
            requirements={allRequirements ?? []}
          />
        )}
        {isSuperAdmin && showCreateModal && (
          <CreateRequirementModal
            key="create-requirement"
            visible={showCreateModal}
            onClose={() => setShowCreateModal(false)}
          />
        )}
        {isSuperAdmin && assignCourseId !== null && assignTarget && (
          <AssignRequirementsModal
            key={`assign-requirements-${assignCourseId}`}
            visible
            onClose={() => setAssignCourseId(null)}
            courseId={assignCourseId}
            courseName={courses?.find((c) => Number(c.id) === assignCourseId)?.name}
            masterList={allRequirements ?? []}
            currentIds={assignTarget.map((r) => r.id)}
            currentDeadline={assignTarget[0]?.pivot?.deadline_at?.slice(0, 10)}
          />
        )}
      </AnimatePresence>
    </>
  );
}