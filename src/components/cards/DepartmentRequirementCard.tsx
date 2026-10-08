import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, SlidersHorizontal } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { Program } from "@/types";
import type {
  CourseTheme,
  DocumentRequirement,
} from "@/lib/queries/documents";
import { resolveThemeColors } from "@/context/ThemeContext";

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// Used when a course has no saved settings yet
const DEFAULT_COLOR = "var(--color-accent)";
const DEFAULT_SOFT = "var(--color-accent-soft)";

export function DepartmentRequirementCards({
  courses,
  results,
  themes = [],
  search = "",
  onManage,
}: {
  courses: Program[];
  /** One query result per course, in the same order as `courses`. */
  results: UseQueryResult<DocumentRequirement[], Error>[];
  /** Per-course name, colors and logo from the settings table. */
  themes?: CourseTheme[];
  search?: string;
  /** Opens the assign modal for a department. Omit to hide the button (read-only). */
  onManage?: (courseId: number) => void;
}) {
  const q = search.trim().toLowerCase();
  const themeByCourse = new Map(themes.map((t) => [Number(t.course_id), t]));

  const items = courses
    .map((course, index) => {
      const theme = themeByCourse.get(Number(course.id));
      return {
        course,
        theme,
        query: results[index],
        // Prefer the department's saved display name, fall back to the course name
        displayName: theme?.department_name?.trim() || course.name,
      };
    })
    .filter(({ course, displayName }) =>
      !q
        ? true
        : displayName.toLowerCase().includes(q) ||
        course.name.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q)
    );

  return (
    <motion.section variants={cardVariants} className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-line)] py-10 text-center text-sm text-[var(--color-muted)]">
          {q ? "No departments match your search." : "No departments found."}
        </div>
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {items.map(({ course, theme, query, displayName }) => {
            // Themed only when the course has a saved color; otherwise app default
            const resolved = theme?.theme_color
              ? resolveThemeColors(theme)
              : null;
            const color = resolved?.color ?? DEFAULT_COLOR;
            const soft = resolved?.soft ?? DEFAULT_SOFT;

            const requirements = query?.data ?? [];
            const isLoading = !query || query.isLoading;

            return (
              <motion.article
                key={course.id}
                variants={cardVariants}
                className="relative overflow-hidden rounded-2xl border border-t-4 border-[var(--color-line)] bg-white shadow-sm transition hover:shadow-md group"
                style={{ borderTopColor: color }}
              >
                <Link to={`/documents/${course.id}`} className="absolute inset-0 z-10">
                  <span className="sr-only">View {displayName} document details</span>
                </Link>

                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {theme?.logo_url ? (
                      <img
                        src={theme.logo_url}
                        alt={`${displayName} logo`}
                        className="h-9 w-9 shrink-0 rounded-lg object-contain"
                      />
                    ) : (
                      <div
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                        style={{ backgroundColor: soft, color }}
                      >
                        <FileText size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4
                        className="truncate text-sm font-semibold text-[var(--color-ink)] transition group-hover:text-[var(--color-accent)]"
                        title={displayName}
                      >
                        {displayName}
                      </h4>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        {course.code} &middot; {isLoading ? "…" : requirements.length} Requirements
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 relative z-20">
                    {onManage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onManage(Number(course.id));
                        }}
                        aria-label={`Assign requirements to ${displayName}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm transition hover:brightness-95"
                        style={{ borderColor: color, color }}
                      >
                        <SlidersHorizontal size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}
    </motion.section>
  );
}