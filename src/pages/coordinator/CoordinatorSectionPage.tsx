import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { sectionQueries } from "@/lib/queries/section";
import { useAuth } from "@/lib/auth";
import { Users2, AlertCircle, Eye, BookOpen, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SendEvaluationModal } from "@/components/modal/SendEvaluationModal";
import {
  useEvaluationTemplates,
  useBulkAssignEvaluations,
} from "@/lib/queries/evaluation";

const AVATAR_STYLES = [
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
  "bg-rose-50 text-rose-700",
];

function initialsFor(first?: string, last?: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function avatarStyle(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash + seed.charCodeAt(i)) % AVATAR_STYLES.length;
  return AVATAR_STYLES[hash];
}

export function CoordinatorSectionPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    null
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
   const [showConfirm, setShowConfirm] = useState(false);
  const tabRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
  } | null>(null);

  const {
    data: sections,
    isLoading,
    error,
  } = useQuery({
    ...sectionQueries.coordinatorSections(token!),
    enabled: Boolean(user && token && user.role?.name === "coordinator"),
  });

const { mutate: bulkAssign, isPending } = useBulkAssignEvaluations(token);
  const { data: templates = [] } = useEvaluationTemplates(token);
  
  useEffect(() => {
    if (sections && sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  // Track the active tab's position/width so the pill can slide to it
  useLayoutEffect(() => {
    if (selectedSectionId == null) return;
    const el = tabRefs.current.get(selectedSectionId);
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [selectedSectionId, sections]);

  if (!user || user.role?.name !== "coordinator") {
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

  async function handleConfirmSend() {
    if (!selectedTemplateId || !currentSection) return;

    bulkAssign(
      {
        template_id: selectedTemplateId,
        course_id: currentSection.course_id, // assuming your section object has course_id
        coordinator_id: user.id, // passing the logged-in coordinator's ID
      },
      {
        onSuccess: (data) => {
          console.log(`Successfully assigned evaluations to students.`);
          setShowConfirm(false);
        },
        onError: (err) => {
          console.error("Failed to bulk assign evaluation", err);
        },
      }
    );
  }

  const totalStudentsAcrossAllSections = sections
    ? sections.reduce((acc, sec) => acc + (sec.students?.length ?? 0), 0)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 max-w-md rounded-lg bg-black/5" />
        <div className="h-11 max-w-xl rounded-xl bg-black/5" />
        <div className="h-72 rounded-xl bg-black/5" />
      </div>
    );
  }

  if (error || !sections) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
        <div>
          <p className="text-sm font-medium text-red-800">
            Couldn't load your sections
          </p>
          <p className="mt-0.5 text-sm text-red-700/80">
            Check your connection and try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <Users2 size={40} className="text-[var(--color-muted)]" />
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-ink)]">
            No sections assigned
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Once you're assigned as a section coordinator, they'll show up here.
          </p>
        </div>
      </div>
    );
  }

  const currentSection =
    sections.find((s) => s.id === selectedSectionId) || sections[0];
  const students = currentSection.students ?? [];
  const activeCount = students.filter((s) => s.is_active).length;
  const unassignedCount = students.filter(
    (s) => !s.companies || s.companies.length === 0
  ).length;

  return (
    <section className="space-y-6">
      {/* Scoped keyframes for the one deliberate transition: the content panel on section switch */}
      <style>{`
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .panel-enter {
          animation: panelIn 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .panel-enter { animation: none; }
        }
      `}</style>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[var(--color-ink)]">
            Section management
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Your coordinated sections, and the students enrolled in each.
          </p>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Send size={14} />
          Send evaluation
        </button>
      </header>

      {/* Section switcher with sliding indicator */}
      <div className="relative flex gap-1 overflow-x-auto border-b border-[var(--color-line)] pb-0">
        {indicator && (
          <div
            className="absolute bottom-0 h-full rounded-t-lg bg-[var(--color-accent-soft)] transition-all duration-300 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
        )}
        {sections.map((sec) => {
          const isActive = currentSection.id === sec.id;
          return (
            <button
              key={sec.id}
              ref={(el) => {
                if (el) tabRefs.current.set(sec.id, el);
                else tabRefs.current.delete(sec.id);
              }}
              onClick={() => setSelectedSectionId(sec.id)}
              className={`relative z-10 flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <BookOpen size={15} />
              {sec.name} {sec.code ? `(${sec.code})` : ""}
              {isActive && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-[var(--color-accent)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content panel — remounts (and animates in) on section switch via key */}
      <div key={currentSection.id} className="panel-enter space-y-6">
        {/* Stats strip */}
        <div className="flex flex-wrap divide-x divide-[var(--color-line)] overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">
          <div className="flex-1 min-w-[140px] px-5 py-4">
            <p className="text-2xl font-semibold text-[var(--color-ink)]">
              {students.length}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Total students
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
              {unassignedCount}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Awaiting company
            </p>
          </div>
        </div>

        {/* Roster */}
        <div className="rounded-xl border border-[var(--color-line)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">
                {currentSection.name}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                {currentSection.school_year?.name || "N/A"} ·{" "}
                {currentSection.course?.name || "N/A"}
              </p>
            </div>
          </div>

          {students.length > 0 ? (
            <>
              {/* Table — desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-line)] text-xs text-[var(--color-muted)]">
                      <th className="px-6 py-3 font-medium">Student</th>
                      <th className="px-6 py-3 font-medium">
                        Assigned company
                      </th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {students.map((student) => (
                      <tr
                        key={student.id}
                        className="transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarStyle(
                                student.student_number
                              )}`}
                            >
                              {initialsFor(
                                student.first_name,
                                student.last_name
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--color-ink)]">
                                {student.last_name}, {student.first_name}{" "}
                                {student.middle_name ?? ""}
                              </p>
                              <p className="text-xs text-[var(--color-muted)]">
                                {student.student_number}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {student.companies && student.companies.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {student.companies.map((c) => (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center rounded-md bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-medium text-[var(--color-accent)] ring-1 ring-inset ring-[var(--color-accent)]/20"
                                >
                                  {c.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm italic text-[var(--color-muted)]">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {student.is_active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/students/${student.id}`);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent-soft)]"
                          >
                            <Eye size={13} /> View details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards — mobile */}
              <div className="divide-y divide-[var(--color-line)] md:hidden">
                {students.map((student) => (
                  <div key={student.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarStyle(
                          student.student_number
                        )}`}
                      >
                        {initialsFor(student.first_name, student.last_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--color-ink)]">
                          {student.last_name}, {student.first_name}
                        </p>
                        <p className="text-xs text-[var(--color-muted)]">
                          {student.student_number}
                        </p>
                      </div>
                      {student.is_active ? (
                        <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {student.companies && student.companies.length > 0 ? (
                        student.companies.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center rounded-md bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-medium text-[var(--color-accent)] ring-1 ring-inset ring-[var(--color-accent)]/20"
                          >
                            {c.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-[var(--color-muted)]">
                          Unassigned
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/students/${student.id}`)}
                      className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-[var(--color-line)] py-1.5 text-xs font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent-soft)]"
                    >
                      <Eye size={13} /> View details
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-14 text-center text-sm text-[var(--color-muted)]">
              No students are currently enrolled in this section.
            </div>
          )}
        </div>
      </div>
      <SendEvaluationModal
        isOpen={showConfirm}
        isSending={isPending}
        sectionCount={sections.length}
        totalStudentCount={totalStudentsAcrossAllSections}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={setSelectedTemplateId}
        onConfirm={handleConfirmSend}
        onClose={() => setShowConfirm(false)}
      />
    </section>
  );
}
