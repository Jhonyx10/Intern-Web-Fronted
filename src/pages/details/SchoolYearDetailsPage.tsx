import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeft,
    CalendarDays,
    BookOpen,
    GraduationCap,
    FileText,
    Clock,
    ExternalLink,
    UserRound,
    Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCourses } from "@/lib/queries/courses";
import { useDocumentRequirements } from "@/lib/queries/documents";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

// ── Types ─────────────────────────────────────────────────────────

type CourseSetting = {
    course_id?: number | null;
    theme_color?: string | null;
    theme_color_hover?: string | null;
    theme_color_soft?: string | null;
    logo_url?: string | null;
    department_name?: string | null;
};

type SectionSummary = {
    id: number;
    course_id: number;
    name: string;
    code?: string | null;
    students_count: number;
};

type SchoolYearDetail = {
    id: number;
    name: string;
    semester?: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    sections: SectionSummary[];
    course_settings: CourseSetting[];
};

// ── Animation variants ────────────────────────────────────────────

const listVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
    },
};

// ── Helpers ───────────────────────────────────────────────────────

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

function semesterPill(semester?: string | null) {
    const s = (semester ?? "").toLowerCase();
    if (s.includes("summer"))
        return { pill: "bg-orange-100 text-orange-700", dot: "bg-orange-500" };
    if (s.includes("second"))
        return { pill: "bg-green-100 text-green-700", dot: "bg-green-500" };
    if (s.includes("first"))
        return { pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500" };
    return { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
}

// ── StatChip ──────────────────────────────────────────────────────

function StatChip({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    color: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-5 py-4 shadow-sm">
            <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}
            >
                <Icon size={18} />
            </div>
            <div>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                <p className="text-xs font-medium text-[var(--color-muted)]">{label}</p>
            </div>
        </div>
    );
}

// ── ProgramCard ───────────────────────────────────────────────────

function ProgramCard({
    program,
    setting,
    sections,
    studentCount,
    docRequirementCount,
    schoolYearId,
}: {
    program: {
        id: string | number;
        code: string;
        name: string;
        required_hours: number;
        is_active: boolean;
        dean?: { name: string } | null;
    };
    setting: CourseSetting | undefined;
    sections: SectionSummary[];
    studentCount: number;
    docRequirementCount: number;
    schoolYearId: string;
}) {
    const navigate = useNavigate();
    const accentColor = setting?.theme_color ?? "var(--color-accent)";
    const accentSoft = setting?.theme_color_soft ?? "var(--color-accent-soft)";

    return (
        <motion.article
            variants={cardVariants}
            style={{ "--course-accent": accentColor } as React.CSSProperties}
            className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-sm"
        >
            {/* Color header strip */}
            <div
                className="h-2 w-full shrink-0"
                style={{ backgroundColor: accentColor }}
            />

            <div className="flex flex-1 flex-col gap-4 p-5">
                {/* Logo + code + name */}
                <div className="flex items-start gap-3">
                    {setting?.logo_url ? (
                        <img
                            src={setting.logo_url}
                            alt={program.code}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                    ) : (
                        <div
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                            style={{ backgroundColor: accentSoft, color: accentColor }}
                        >
                            <BookOpen size={18} />
                        </div>
                    )}
                    <div className="min-w-0">
                        <span
                            className="inline-block rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                            style={{ backgroundColor: accentSoft, color: accentColor }}
                        >
                            {program.code}
                        </span>
                        <p className="mt-0.5 text-sm font-semibold leading-snug text-[var(--color-ink)]">
                            {program.name}
                        </p>
                    </div>
                </div>

                {/* Meta row */}
                <div className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5">
                    {program.dean?.name && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                            <UserRound size={11} className="shrink-0" />
                            <span className="truncate">{program.dean.name}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                        <Clock size={11} className="shrink-0" />
                        <span>{program.required_hours} required hours</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-[var(--color-line)] py-2.5">
                        <div className="flex items-center gap-1 text-[var(--color-muted)]">
                            <GraduationCap size={13} />
                            <span className="text-[10px] font-medium uppercase tracking-wide">
                                Students
                            </span>
                        </div>
                        <p className="text-xl font-bold" style={{ color: accentColor }}>
                            {studentCount}
                        </p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-[var(--color-line)] py-2.5">
                        <div className="flex items-center gap-1 text-[var(--color-muted)]">
                            <FileText size={13} />
                            <span className="text-[10px] font-medium uppercase tracking-wide">
                                Doc Reqs
                            </span>
                        </div>
                        <p className="text-xl font-bold text-[var(--color-ink)]">
                            {docRequirementCount}
                        </p>
                    </div>
                </div>

                {/* Students per section */}
                {sections.length > 0 ? (
                    <ul className="space-y-1 rounded-lg border border-[var(--color-line)] px-3 py-2">
                        {sections.map((sec) => (
                            <li
                                key={sec.id}
                                className="flex items-center justify-between gap-2 text-xs"
                            >
                                <span className="truncate text-[var(--color-ink)]">
                                    {sec.name}
                                    {sec.code ? ` (${sec.code})` : ""}
                                </span>
                                <span
                                    className="shrink-0 font-semibold"
                                    style={{ color: accentColor }}
                                >
                                    {sec.students_count}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-[var(--color-muted)]">
                        No sections in this school year.
                    </p>
                )}

                {/* Active badge + View button */}
                <div className="mt-auto flex items-center justify-between gap-2">
                    <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${program.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                            }`}
                    >
                        {program.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                        type="button"
                        onClick={() =>
                            navigate(`/course/details/${program.id}?school_year_id=${schoolYearId}`)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] shadow-sm transition hover:border-[var(--course-accent)] hover:text-[var(--course-accent)]"
                    >
                        <ExternalLink size={12} /> View
                    </button>
                </div>
            </div>
        </motion.article>
    );
}

// ── Main Page ─────────────────────────────────────────────────────
//
// Two modes:
//   • With an id (route param or `schoolYearId` prop) → GET /school-years/:id
//     Used by the super admin, who has multiple school years.
//   • Without an id → GET /school-years/current
//     Used by deans, opened straight from the sidenav.

export default function SchoolYearDetailsPage({
    schoolYearId,
}: {
    schoolYearId?: string;
}) {
    const params = useParams<{ id: string }>();
    const id = schoolYearId ?? params.id;
    const isCurrent = !id;
    const navigate = useNavigate();

    const { token } = useAuth();

    // Super admin: /school-years/:id (has an id)
    const byId = useQuery({
        queryKey: queryKeys.schoolYears.detail(id ?? ""),
        queryFn: () =>
            apiRequest<SchoolYearDetail>(`/school-years/${id}`, { token }),
        enabled: Boolean(token && id),
    });

    // Dean / others: /school-years/current (no id)
    const current = useQuery({
        queryKey: [...queryKeys.schoolYears.all, "current"],
        queryFn: () =>
            apiRequest<SchoolYearDetail>("/school-years/current", { token }),
        enabled: Boolean(token) && isCurrent,
        retry: false, // a 404 means "no active school year"
    });

    const {
        data: schoolYear,
        isLoading: syLoading,
        isError: syError,
    } = isCurrent ? current : byId;

    // All programs/courses
    const { data: courses = [], isLoading: coursesLoading } = useCourses();

    // Master document requirements list
    const { data: docRequirements = [] } = useDocumentRequirements();

    // Lookup: course_id → theme settings
    const settingsByCourseId = useMemo(
        () =>
            new Map<number, CourseSetting>(
                (schoolYear?.course_settings ?? []).map((s) => [
                    Number(s.course_id),
                    s,
                ])
            ),
        [schoolYear]
    );

    // Lookup: course_id → student count (sum across sections for this school year)
    const studentCountByCourseId = useMemo(() => {
        const map = new Map<number, number>();
        for (const sec of schoolYear?.sections ?? []) {
            map.set(
                sec.course_id,
                (map.get(sec.course_id) ?? 0) + sec.students_count
            );
        }
        return map;
    }, [schoolYear]);

    // Lookup: course_id → sections in this school year
    const sectionsByCourseId = useMemo(() => {
        const map = new Map<number, SectionSummary[]>();
        for (const sec of schoolYear?.sections ?? []) {
            const list = map.get(sec.course_id) ?? [];
            list.push(sec);
            map.set(sec.course_id, list);
        }
        return map;
    }, [schoolYear]);

    // The master list has no per-course assignments, so show the total active count.
    const docReqCount = docRequirements.filter((r) => r.is_active).length;

    const isLoading = syLoading || coursesLoading;

    const sem = semesterPill(schoolYear?.semester);

    const totalStudents = useMemo(
        () =>
            (schoolYear?.sections ?? []).reduce(
                (sum, sec) => sum + sec.students_count,
                0
            ),
        [schoolYear]
    );

    if (isLoading) {
        return (
            <div className="flex h-60 items-center justify-center">
                <Loader2 className="animate-spin text-[var(--color-accent)]" size={28} />
            </div>
        );
    }

    if (syError || !schoolYear) {
        // Current mode: an error (404) means no school year is marked active.
        if (isCurrent) {
            return (
                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] py-24 text-center"
                >
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                        <CalendarDays size={24} />
                    </div>
                    <h2 className="mt-5 text-lg font-semibold text-[var(--color-ink)]">
                        No Current School Year
                    </h2>
                    <p className="mt-2 max-w-sm text-sm text-[var(--color-muted)]">
                        The Super Admin has not set an active school year yet. Once they
                        do, it will show up here.
                    </p>
                </motion.section>
            );
        }

        return (
            <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                Failed to load school year details.
            </div>
        );
    }

    return (
        <section className="space-y-6">
            {/* Back (only when opened from the school year list) */}
            {!isCurrent && (
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-sm transition hover:bg-slate-50"
                >
                    <ArrowLeft size={14} /> Back
                </button>
            )}

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            >
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                            {schoolYear.name}
                        </h1>
                        {schoolYear.is_active && (
                            <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                Current
                            </span>
                        )}
                    </div>

                    {schoolYear.semester && (
                        <div
                            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${sem.pill}`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${sem.dot}`} />
                            {schoolYear.semester}
                        </div>
                    )}

                    <div className="mt-2 flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
                        <CalendarDays size={13} />
                        <span>
                            {formatDate(schoolYear.start_date)} —{" "}
                            {formatDate(schoolYear.end_date)}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Stat row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatChip
                    icon={BookOpen}
                    label="Programs"
                    value={courses.length}
                    color="text-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                />
                <StatChip
                    icon={GraduationCap}
                    label="Students"
                    value={totalStudents}
                    color="text-violet-600 bg-violet-50"
                />
                <StatChip
                    icon={FileText}
                    label="Doc Requirements"
                    value={docReqCount}
                    color="text-amber-600 bg-amber-50"
                />
            </div>

            {/* Section title */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">
                    Programs &amp; Courses
                </h2>
                <span className="text-sm text-[var(--color-muted)]">
                    {courses.length} program{courses.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Cards grid */}
            {courses.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--color-line)] py-16 text-center">
                    <BookOpen size={32} className="text-[var(--color-line)]" />
                    <p className="text-sm text-[var(--color-muted)]">No programs found.</p>
                </div>
            ) : (
                <motion.div
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    {courses.map((course) => (
                        <ProgramCard
                            key={course.id}
                            program={course}
                            setting={settingsByCourseId.get(Number(course.id))}
                            sections={sectionsByCourseId.get(Number(course.id)) ?? []}
                            studentCount={studentCountByCourseId.get(Number(course.id)) ?? 0}
                            docRequirementCount={docReqCount}
                            schoolYearId={String(schoolYear.id)}
                        />
                    ))}
                </motion.div>
            )}
        </section>
    );
}