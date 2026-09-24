import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Plus,
  ChevronDown,
  CalendarDays,
  X,
  Loader2,
  Trash2,
  Eye,
  Users,
  Pencil,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { queryKeys } from "@/lib/query-keys";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import AddSectionModal from "@/components/modal/AddSectionModal";
import AddSchoolYearModal from "@/components/modal/AddSchoolYearModal";

type SectionData = {
  id: number;
  name: string;
  code: string | null;
  course_major?: { id: number; name: string } | null;
  coordinator?: { id: number; name: string } | null;
  students_count?: number;
};

type SchoolYearData = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  sections: SectionData[];
};

const listVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ── Main Page ─────────────────────────────────────────────────────

const SchoolYearSectionPage = () => {
  const { token, user } = useAuth();
  const deanCourse = user?.course
    ? [
        {
          id: Number(user.course.id),
          code: user.course.code,
          name: user.course.name,
        },
      ]
    : null;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState<number | null>(null);
  const [addSyOpen, setAddSyOpen] = useState(false);
  const [editSyTarget, setEditSyTarget] = useState<SchoolYearData | null>(null);
  const [addSectionTarget, setAddSectionTarget] =
    useState<SchoolYearData | null>(null);

  // ── Fetch school years ──────────────────────────────────────────
  const {
    data: schoolYears = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.schoolYears.list(),
    queryFn: () => apiRequest<SchoolYearData[]>("/school-years", { token }),
    enabled: Boolean(token),
  });

  // ── Fetch courses for the Add Section form ────────────────────────
  const { data: fetchedCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: () =>
      apiRequest<{ id: number; code: string; name: string }[]>("/courses", {
        token,
      }),
    enabled: Boolean(token) && addSectionTarget !== null && deanCourse === null,
    staleTime: 5 * 60 * 1000,
  });
  const courses = deanCourse ?? fetchedCourses;

  // ── Fetch coordinators for the Add Section form ──────────────────
  const { data: coordinators = [], isLoading: coordinatorsLoading } = useQuery({
    queryKey: queryKeys.coordinators.list(),
    queryFn: () =>
      apiRequest<{ id: number; name: string; email: string }[]>(
        "/coordinators",
        { token }
      ),
    enabled: Boolean(token) && addSectionTarget !== null,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-expand first active SY on load
  if (expanded === null && schoolYears.length > 0) {
    const activeSy = schoolYears.find((sy) => sy.is_active);
    if (activeSy) {
      // safe — this is the initial render guard
      setTimeout(() => setExpanded(activeSy.id), 0);
    }
  }

  // ── Add school year ─────────────────────────────────────────────
  const addSyMutation = useMutation({
    mutationFn: (data: {
      name: string;
      start_date: string;
      end_date: string;
      is_active: boolean;
    }) => apiRequest("/school-years", { method: "POST", body: data, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
      setAddSyOpen(false);
      toastMutationSuccess("School year created");
    },
    onError: (err) => {
      toastMutationError(err, "Failed to create school year");
    },
  });

  // ── Edit school year ─────────────────────────────────────────────
  const editSyMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        name: string;
        start_date: string;
        end_date: string;
        is_active: boolean;
      };
    }) =>
      apiRequest(`/school-years/${id}`, { method: "PUT", body: data, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
      setEditSyTarget(null);
      toastMutationSuccess("School year updated");
    },
    onError: (err) => {
      toastMutationError(err, "Failed to update school year");
    },
  });

  // ── Delete school year ──────────────────────────────────────────
  const deleteSyMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/school-years/${id}`, { method: "DELETE", token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
      toastMutationSuccess("School year deleted");
    },
    onError: (err) => {
      toastMutationError(err, "Failed to delete school year");
    },
  });

  // ── Add section ─────────────────────────────────────────────────
  const addSectionMutation = useMutation({
    mutationFn: ({
      syId,
      data,
    }: {
      syId: number;
      data: {
        name: string;
        code: string;
        course_id: number;
        course_major_id: number | null;
        coordinator_user_id: number | null;
      };
    }) =>
      apiRequest(`/school-years/${syId}/sections`, {
        method: "POST",
        body: data,
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
      setAddSectionTarget(null);
      toastMutationSuccess("Section added");
    },
    onError: (err) => {
      toastMutationError(err, "Failed to add section");
    },
  });

  // ── Delete section ──────────────────────────────────────────────
  const deleteSectionMutation = useMutation({
    mutationFn: ({ syId, sectionId }: { syId: number; sectionId: number }) =>
      apiRequest(`/school-years/${syId}/sections/${sectionId}`, {
        method: "DELETE",
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
      toastMutationSuccess("Section deleted");
    },
    onError: (err) => {
      toastMutationError(err, "Failed to delete section");
    },
  });

  const isProgramHead = user?.role?.name === "program_head";

  function toggle(id: number) {
    setExpanded((current) => (current === id ? null : id));
  }

  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--color-accent)] uppercase">
            Academic
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            School Year &amp; Sections
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {schoolYears.length} school year
            {schoolYears.length === 1 ? "" : "s"} on record
          </p>
        </div>

        {!isProgramHead && (
          <button
            type="button"
            onClick={() => setAddSyOpen(true)}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
          >
            <Plus size={15} className="text-white" /> Add School Year
          </button>
        )}
      </motion.div>

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
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="mt-6 flex flex-col gap-3"
        >
          {schoolYears.map((year) => {
            const isOpen = expanded === year.id;

            return (
              <motion.article
                key={year.id}
                variants={itemVariants}
                layout
                className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white/80 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggle(year.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                      <CalendarDays size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        {year.name}
                      </p>
                      <p className="truncate text-xs text-[var(--color-muted)]">
                        {year.sections.length} section
                        {year.sections.length === 1 ? "" : "s"}
                        {year.start_date && year.end_date
                          ? ` · ${year.start_date} → ${year.end_date}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                        year.is_active
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-[var(--color-muted)]",
                      ].join(" ")}
                    >
                      {year.is_active ? "Active" : "Archived"}
                    </span>

                    {!isProgramHead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditSyTarget(year);
                        }}
                        aria-label={`Edit ${year.name}`}
                        className="rounded-lg p-1 text-[var(--color-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--color-accent)]"
                      >
                        <Pencil size={14} />
                      </button>
                    )}

                    {!isProgramHead &&
                      !year.is_active &&
                      year.sections.length === 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete school year "${year.name}"?`)) {
                              deleteSyMutation.mutate(year.id);
                            }
                          }}
                          aria-label={`Delete ${year.name}`}
                          className="rounded-lg p-1 text-[var(--color-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[var(--color-muted)]"
                    >
                      <ChevronDown size={16} />
                    </motion.span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="border-t border-[var(--color-line)]"
                    >
                      {/* Section header row: label left, Add Section right */}
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                          Sections
                        </p>
                        {!isProgramHead && year.is_active && (
                          <button
                            type="button"
                            onClick={() => setAddSectionTarget(year)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--color-line)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                          >
                            <Plus size={12} /> Add Section
                          </button>
                        )}
                      </div>

                      {year.sections.length === 0 ? (
                        <p className="px-4 pb-4 text-xs text-[var(--color-muted)]">
                          No sections added for this school year yet.
                        </p>
                      ) : (
                        <div className="overflow-x-auto px-4 pb-4">
                          <table className="w-full min-w-[560px] border-collapse text-left">
                            <thead>
                              <tr className="border-b border-[var(--color-line)]">
                                <th className="py-2 pr-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                                  Section
                                </th>
                                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                                  Course Major
                                </th>
                                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                                  Coordinator
                                </th>
                                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                                  Students
                                </th>
                                <th className="py-2 pl-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {year.sections.map((section) => (
                                <tr
                                  key={section.id}
                                  className="group border-b border-[var(--color-line)] last:border-0 hover:bg-slate-50/60"
                                >
                                  <td className="py-2.5 pr-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-[var(--color-ink)]">
                                        {section.name}
                                      </span>
                                      {section.code && (
                                        <span className="text-[10px] text-[var(--color-muted)]">
                                          ({section.code})
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-xs text-[var(--color-ink)]">
                                    {section.course_major?.name ?? "—"}
                                  </td>
                                  <td className="px-3 py-2.5 text-xs text-[var(--color-ink)]">
                                    {section.coordinator?.name ?? "—"}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-ink)]">
                                      <Users
                                        size={12}
                                        className="text-[var(--color-muted)]"
                                      />
                                      {section.students_count ?? "—"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 pl-3">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          navigate(
                                            `/school-year-section/${section.id}`
                                          )
                                        }
                                        aria-label={`View ${section.name}`}
                                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2 py-1 text-[11px] font-semibold text-sky-600 shadow-sm transition hover:bg-sky-50"
                                      >
                                        <Eye size={12} /> View
                                      </button>

                                      {!isProgramHead && year.is_active && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (
                                              confirm(
                                                `Delete section "${section.name}"?`
                                              )
                                            ) {
                                              deleteSectionMutation.mutate({
                                                syId: year.id,
                                                sectionId: section.id,
                                              });
                                            }
                                          }}
                                          aria-label={`Remove ${section.name}`}
                                          className="rounded-lg p-1.5 text-[var(--color-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                                        >
                                          <X size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      {/* Empty state */}
      <AnimatePresence>
        {!isLoading && schoolYears.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] py-14 text-center"
          >
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <CalendarDays size={16} />
            </div>
            <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">
              No school years yet
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Create a school year to get started.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

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

      <AddSectionModal
        open={addSectionTarget !== null}
        onClose={() => setAddSectionTarget(null)}
        onAdd={(data) => {
          if (addSectionTarget) {
            addSectionMutation.mutate({ syId: addSectionTarget.id, data });
          }
        }}
        isLoading={addSectionMutation.isPending}
        schoolYearName={addSectionTarget?.name ?? ""}
        courses={courses}
        coordinators={coordinators}
        coursesLoading={coursesLoading}
        coordinatorsLoading={coordinatorsLoading}
      />
    </section>
  );
};

export default SchoolYearSectionPage;
