import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2,
  GraduationCap,
  User,
  BadgeCheck,
  Clock,
  Layers,
  Plus,
  Eye,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Course } from "@/types";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CourseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isProgramHead = user?.role?.name === "program_head";

  const {
    data: course,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.courses.detail(id!),
    queryFn: () => apiRequest<Course>(`/courses/${id}`, { token }),
    enabled: Boolean(token) && Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2
          className="animate-spin text-[var(--color-accent)]"
          size={24}
        />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Failed to load course details</p>
      </div>
    );
  }

  const totalStudents = course.sections.reduce(
    (sum, section) => sum + section.students.length,
    0
  );

  return (
    <section className="pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--color-accent)] uppercase">
            Details
          </p>
          <div className="mt-1 flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              {course.name}
            </h1>
            {course.code && (
              <span className="rounded-md border border-[var(--color-line)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)]">
                {course.code}
              </span>
            )}
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                course.is_active
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-[var(--color-muted)]",
              ].join(" ")}
            >
              {course.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {course.sections.length} section
            {course.sections.length === 1 ? "" : "s"} · {totalStudents} student
            {totalStudents === 1 ? "" : "s"} total
          </p>
        </div>

        {!isProgramHead && (
          <button
            type="button"
            onClick={() => navigate(`/sections/new?course_id=${id}`)}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
          >
            <Plus size={15} className="text-white" /> Add Section
          </button>
        )}
      </motion.div>

      {/* Info cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white/80 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <BadgeCheck size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Course code
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
              {course.code ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white/80 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <Clock size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Required hours
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
              {course.required_hours ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white/80 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <User size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Dean
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
              {course.dean?.name ?? "Unassigned"}
            </p>
            {course.dean?.email && (
              <p className="truncate text-xs text-[var(--color-muted)]">
                {course.dean.email}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white/80 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <GraduationCap size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Program head
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
              {course.program_head?.name ?? "Unassigned"}
            </p>
            {course.program_head?.email && (
              <p className="truncate text-xs text-[var(--color-muted)]">
                {course.program_head.email}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Majors */}
      {course.majors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            Majors
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {course.majors.map((major) => (
              <span
                key={major.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--color-ink)]"
              >
                <Layers size={12} className="text-[var(--color-accent)]" />
                {major.name}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sections */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6"
      >
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          Sections
        </h2>

        {course.sections.length === 0 ? (
          <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] py-12 text-center">
            <p className="text-sm font-medium text-[var(--color-ink)]">
              No sections yet
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Sections under this course will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white/80">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--color-line)] bg-slate-50/60 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Coordinator</th>
                  <th className="px-4 py-3">School year</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)] text-sm">
                {course.sections.map((section) => (
                  <tr
                    key={section.id}
                    onClick={() => navigate(`/sections/${section.id}`)}
                    className="hover:bg-slate-50/60 cursor-pointer transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-ink)]">
                          {section.name}
                        </span>
                        {section.code && (
                          <span className="rounded-md border border-[var(--color-line)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
                            {section.code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">
                      {section.coordinator?.name ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">
                      {section.school_year ? (
                        <>
                          {section.school_year.name}
                          <span className="block text-xs">
                            {formatDate(section.school_year.start_date)} →{" "}
                            {formatDate(section.school_year.end_date)}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">
                      {section.students.length}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          section.is_active
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-[var(--color-muted)]",
                        ].join(" ")}
                      >
                        {section.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/school-year-section/${section.id}`);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)] shadow-2xs hover:bg-[var(--color-accent-soft)] transition"
                      >
                        <Eye size={13} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </section>
  );
}
