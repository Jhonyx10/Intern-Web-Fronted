import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, GraduationCap, User, CalendarDays, BadgeCheck, Plus, Eye, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AddStudentModal } from "@/components/modal/AddStudentModal";
import { useCreateStudent } from "@/lib/queries/students";
import type { Section } from "@/types";
import EditSectionModal from "@/components/modal/EditSectionModal";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";

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
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const queryClient = useQueryClient();
    const canAddStudent = user?.role?.name === 'dean' || user?.role?.name === 'coordinator';
    const canEdit = user?.role?.name === 'dean';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { data: section, isLoading, isError } = useQuery({
        queryKey: queryKeys.sections.detail(id!),
        queryFn: () => apiRequest<Section>(`/sections/${id}`, { token }),
        enabled: Boolean(token) && Boolean(id),
    });

    // Fetch courses for the edit modal
    const { data: fetchedCourses = [], isLoading: coursesLoading } = useQuery({
        queryKey: queryKeys.courses.list(),
        queryFn: () => apiRequest<{ id: number; code: string; name: string }[]>('/courses', { token }),
        enabled: Boolean(token) && isEditOpen,
        staleTime: 5 * 60 * 1000,
    });

    // Use dean's course if applicable, otherwise use all courses
    const deanCourse = user?.course
        ? [{ id: Number(user.course.id), code: user.course.code, name: user.course.name }]
        : null;
    const courses = deanCourse ?? fetchedCourses;

    // Fetch coordinators for the edit modal
    const { data: coordinators = [], isLoading: coordinatorsLoading } = useQuery({
        queryKey: queryKeys.coordinators.list(),
        queryFn: () => apiRequest<{ id: number; name: string; email: string }[]>('/coordinators', { token }),
        enabled: Boolean(token) && isEditOpen,
        staleTime: 5 * 60 * 1000,
    });

    // Edit section mutation
    const editSectionMutation = useMutation({
        mutationFn: (data: {
            name: string;
            code: string;
            course_id: number;
            course_major_id: number | null;
            coordinator_user_id: number | null;
        }) =>
            apiRequest(`/school-years/${section?.school_year_id}/sections/${id}`, {
                method: 'PUT',
                body: data,
                token,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.sections.detail(id!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.schoolYears.all });
            setIsEditOpen(false);
            toastMutationSuccess('Section updated');
        },
        onError: (err) => {
            toastMutationError(err, 'Failed to update section');
        },
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

                <div className="flex items-center gap-2">
                    {canEdit && section.is_active && (
                        <button
                            type="button"
                            onClick={() => setIsEditOpen(true)}
                            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-accent)] shadow-sm transition hover:bg-[var(--color-accent-soft)]"
                        >
                            <Pencil size={15} /> Edit Section
                        </button>
                    )}
                    {canAddStudent && (
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                        >
                            <Plus size={15} className="text-white" /> Add Student
                        </button>
                    )}
                </div>
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
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-sm">
                                {section.students.map((student) => (
                                    <tr
                                        key={student.id}
                                        onClick={() => navigate(`/students/${student.id}`)}
                                        className="hover:bg-slate-50/60 cursor-pointer transition"
                                    >
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
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/students/${student.id}`);
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

            <EditSectionModal
                open={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSave={(data) => editSectionMutation.mutate(data)}
                isLoading={editSectionMutation.isPending}
                section={
                    section
                        ? {
                            name: section.name,
                            code: section.code,
                            course_id: section.course_id,
                            course_major_id: section.course_major_id,
                            coordinator_user_id: section.coordinator_user_id,
                        }
                        : null
                }
                courses={courses}
                coordinators={coordinators}
                coursesLoading={coursesLoading}
                coordinatorsLoading={coordinatorsLoading}
            />
        </section>
    );
}
