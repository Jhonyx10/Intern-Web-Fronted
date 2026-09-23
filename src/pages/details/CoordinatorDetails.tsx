import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Mail, BookOpen, Layers, GraduationCap, Building2, Eye } from 'lucide-react'
import { useAuth } from '@/lib/auth'

type SectionData = {
    id: number
    name: string
    code: string | null
    course: { id: number; code: string; name: string } | null
    school_year: { id: number; name: string; is_active: boolean } | null
    students_count: number
    is_active: boolean
}

type CoordinatorDetails = {
    id: number
    name: string
    email: string
    is_active: boolean
    course: { id: number; code: string; name: string } | null
    sections: SectionData[]
}

const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
}

export default function CoordinatorDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { token } = useAuth()

    const { data: coordinator, isLoading, isError } = useQuery({
        queryKey: queryKeys.coordinators.detail(id!),
        queryFn: () => apiRequest<CoordinatorDetails>(`/coordinators/${id}`, { token }),
        enabled: Boolean(token) && Boolean(id),
    })

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-[var(--color-accent)]" size={24} />
            </div>
        )
    }

    if (isError || !coordinator) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-red-500">Failed to load coordinator details</p>
            </div>
        )
    }

    const totalStudents = coordinator.sections.reduce((acc, sec) => acc + sec.students_count, 0)

    function initialsOf(name: string) {
        return name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('')
    }

    return (
        <section className="pb-10">
            {/* Header */}
            <div className="mb-4 flex justify-end">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)] hover:cursor-pointer"
                >
                    <ArrowLeft size={15} /> Back
                </button>
            </div>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-4"
            >
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--color-accent-soft)] text-xl font-bold text-[var(--color-accent)]">
                    {initialsOf(coordinator.name)}
                </div>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] flex items-center gap-2">
                        {coordinator.name}
                        <span
                            className={[
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                                coordinator.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-[var(--color-muted)]',
                            ].join(' ')}
                        >
                            {coordinator.is_active ? 'Active' : 'Archived'}
                        </span>
                    </h1>
                    <div className="mt-1 flex items-center gap-3 text-sm text-[var(--color-muted)]">
                        <span className="flex items-center gap-1.5"><Mail size={14} /> {coordinator.email}</span>
                        {coordinator.course && (
                            <span className="flex items-center gap-1.5"><Building2 size={14} /> {coordinator.course.code}</span>
                        )}
                    </div>
                </div>
            </motion.div>
            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
                <div className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white/80 p-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                        <Layers size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                            Assigned Sections
                        </p>
                        <p className="mt-0.5 text-lg font-bold text-[var(--color-ink)]">
                            {coordinator.sections.length}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white/80 p-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                        <GraduationCap size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                            Total Students
                        </p>
                        <p className="mt-0.5 text-lg font-bold text-[var(--color-ink)]">
                            {totalStudents}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white/80 p-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                        <BookOpen size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                            Base Department
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
                            {coordinator.course?.name ?? '—'}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Sections Table */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-[var(--color-ink)]">Handled Sections</h2>
                </div>

                {coordinator.sections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] py-12 text-center">
                        <p className="text-sm font-medium text-[var(--color-ink)]">No sections handled</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                            This coordinator is not currently handling any active or inactive sections.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white/80">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-[var(--color-line)] bg-slate-50/60 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                                    <th className="px-4 py-3">Section</th>
                                    <th className="px-4 py-3">Course</th>
                                    <th className="px-4 py-3">School Year</th>
                                    <th className="px-4 py-3">Students</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right w-px whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <motion.tbody variants={listVariants} initial="hidden" animate="show" className="divide-y divide-[var(--color-line)] text-sm">
                                {coordinator.sections.map((section) => (
                                    <motion.tr
                                        key={section.id}
                                        variants={itemVariants}
                                        className="hover:bg-slate-50/60 transition"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-[var(--color-ink)]">{section.name}</p>
                                            {section.code && (
                                                <p className="text-xs text-[var(--color-muted)]">{section.code}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-[var(--color-ink)]">
                                            {section.course ? `${section.course.code}` : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {section.school_year ? (
                                                <div>
                                                    <p className="text-[var(--color-ink)]">{section.school_year.name}</p>
                                                    {section.school_year.is_active && (
                                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded px-1.5 py-0.5">Active</span>
                                                    )}
                                                </div>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 bg-slate-100 rounded-md px-2 py-1 text-xs font-semibold">
                                                <GraduationCap size={13} className="text-[var(--color-muted)]" />
                                                {section.students_count}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={[
                                                    'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                                                    section.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-[var(--color-muted)]',
                                                ].join(' ')}
                                            >
                                                {section.is_active ? 'Active' : 'Archived'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right w-px whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/school-year-section/${section.id}`)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-xs font-semibold text-sky-600 shadow-sm transition hover:bg-sky-50"
                                            >
                                                <Eye size={12} /> View
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </motion.tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </section>
    )
}
