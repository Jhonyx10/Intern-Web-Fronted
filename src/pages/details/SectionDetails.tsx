import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useParams } from "react-router-dom";
import { Loader2, GraduationCap, User, CalendarDays, BadgeCheck, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AddStudentModal } from "@/components/modal/AddStudentModal";
import { useCreateStudent } from "@/lib/queries/students";
import type { Section } from "@/types";

function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default function SectionDetailsPage() {
    const { id } = useParams();
    const { token } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: section, isLoading, isError } = useQuery({
        queryKey: queryKeys.sections.detail(id!),
        queryFn: () => apiRequest<Section>(`/sections/${id}`, { token }),
        enabled: Boolean(token) && Boolean(id),
    });

    const createStudent = useCreateStudent();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-[var(--color-accent)]" size={24} />
            </div>
        );
    }

    if (isError || !section) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-red-500">Failed to load section details</p>
            </div>
        );
    }

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
                            {section.name}
                        </h1>
                        {section.code && (
                            <span className="rounded-md border border-[var(--color-line)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)]">
                                {section.code}
                            </span>
                        )}
                        <span
                            className={[
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                                section.is_active
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-slate-100 text-[var(--color-muted)]",
                            ].join(" ")}
                        >
                            {section.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {section.students.length} student{section.students.length === 1 ? "" : "s"} in this section
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                >
                    <Plus size={15} className="text-white" /> Add Student
                </button>
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
                        <GraduationCap size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                            Course
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
                            {section.course ? `${section.course.code}` : "—"}
                        </p>
                        <p className="truncate text-xs text-[var(--color-muted)]">
                            {section.course?.name ?? "No course assigned"}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white/80 p-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                        <BadgeCheck size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                            Major
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
                            {section.course_major?.name ?? "No major"}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white/80 p-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                        <User size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                            Coordinator
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
                            {section.coordinator?.name ?? "Unassigned"}
                        </p>
                        {section.coordinator?.email && (
                            <p className="truncate text-xs text-[var(--color-muted)]">{section.coordinator.email}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white/80 p-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                        <CalendarDays size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                            School year
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
                            {section.school_year?.name ?? "—"}
                        </p>
                        <p className="truncate text-xs text-[var(--color-muted)]">
                            {formatDate(section.school_year?.start_date ?? null)} →{" "}
                            {formatDate(section.school_year?.end_date ?? null)}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Students */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6"
            >
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">Students</h2>

                {section.students.length === 0 ? (
                    <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] py-12 text-center">
                        <p className="text-sm font-medium text-[var(--color-ink)]">No students yet</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                            Students assigned to this section will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white/80">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[var(--color-line)] bg-slate-50/60 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                                    <th className="px-4 py-3">Student No.</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-sm">
                                {section.students.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-50/60">
                                        <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted)]">
                                            {student.student_number}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
                                            {student.last_name}, {student.first_name}
                                            {student.middle_name ? ` ${student.middle_name}` : ""}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={[
                                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                                    student.is_active
                                                        ? "bg-emerald-50 text-emerald-600"
                                                        : "bg-slate-100 text-[var(--color-muted)]",
                                                ].join(" ")}
                                            >
                                                {student.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>

            <AddStudentModal
                open={isModalOpen}
                sectionId={id!}
                onClose={() => setIsModalOpen(false)}
                onAddSingle={(student) => {
                    createStudent.mutate({
                        student_number: student.student_number,
                        first_name: student.first_name,
                        middle_name: student.middle_name,
                        last_name: student.last_name,
                        section_id: Number(student.section) || 0,
                        is_active: true,
                    });
                }}
            />
        </section>
    );
}