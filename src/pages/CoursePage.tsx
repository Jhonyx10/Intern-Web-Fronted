import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    Clock,
    UserRound,
    CheckCircle2,
    XCircle,
    BookOpen,
    GraduationCap,
} from 'lucide-react'
import { useCourses, useDeleteCourse } from '@/lib/queries/courses'
import { useMajors, useCreateMajor, useDeleteMajor, useUpdateMajor } from '@/lib/queries/majors'
import { useUsers } from '@/lib/queries/users'
import type { Course, Major } from '@/types'

// ─── animation variants ───────────────────────────────────────────────────────

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const row = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

function DeleteConfirmModal({
    course,
    onClose,
}: {
    course: Course
    onClose: () => void
}) {
    const deleteMutation = useDeleteCourse()
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    async function handleDelete() {
        await deleteMutation.mutateAsync(course.id)
        onClose()
    }

    return (
        <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/30 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-sm rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)]"
            >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                    <Trash2 size={20} className="text-red-500" />
                </div>
                <h2 className="text-base font-semibold">Delete department?</h2>
                <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                    <strong className="font-medium text-[var(--color-ink)]">{course.name}</strong> will be
                    permanently removed. This action cannot be undone.
                </p>
                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                    >
                        {deleteMutation.isPending ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : null}
                        Delete
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ─── DeleteMajorConfirmModal ──────────────────────────────────────────────────

function DeleteMajorConfirmModal({
    major,
    onClose,
}: {
    major: Major
    onClose: () => void
}) {
    const deleteMutation = useDeleteMajor()
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    async function handleDelete() {
        await deleteMutation.mutateAsync(major.id)
        onClose()
    }

    return (
        <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/30 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-sm rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)]"
            >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                    <Trash2 size={20} className="text-red-500" />
                </div>
                <h2 className="text-base font-semibold">Delete major?</h2>
                <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                    <strong className="font-medium text-[var(--color-ink)]">{major.name}</strong> will be
                    permanently removed. This action cannot be undone.
                </p>
                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                    >
                        {deleteMutation.isPending ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : null}
                        Delete
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ─── MajorModal ───────────────────────────────────────────────────────────────

type MajorFormState = {
    course_id: string
    name: string
    code: string
    program_head_user_id: string
    sort_order: string
}

function MajorModal({
    course,
    major,
    onClose,
}: {
    course?: Course
    major?: Major
    onClose: () => void
}) {
    const createMutation = useCreateMajor()
    const updateMutation = useUpdateMajor()
    const { data: users, isLoading: usersLoading } = useUsers()
    const { data: courses, isLoading: coursesLoading } = useCourses()
    const overlayRef = useRef<HTMLDivElement>(null)

    const [form, setForm] = useState<MajorFormState>({
        course_id: String(major?.course_id || (course ? course.id : '')),
        name: major?.name || '',
        code: major?.code || '',
        program_head_user_id: major?.program_head_user_id ? String(major.program_head_user_id) : '',
        sort_order: major?.sort_order ? String(major.sort_order) : '',
    })
    const [errors, setErrors] = useState<Partial<MajorFormState & { root: string }>>({})

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    function validate() {
        const errs: typeof errors = {}
        if (!form.course_id) errs.course_id = 'Department is required.'
        if (!form.name.trim()) errs.name = 'Name is required.'
        if (!form.code.trim()) errs.code = 'Code is required.'
        return errs
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }

        try {
            const payload = {
                course_id: Number(form.course_id),
                name: form.name.trim(),
                code: form.code.trim(),
                program_head_user_id: form.program_head_user_id ? Number(form.program_head_user_id) : null,
                sort_order: form.sort_order ? Number(form.sort_order) : null,
            }
            if (major) {
                await updateMutation.mutateAsync({ id: major.id, data: payload })
            } else {
                await createMutation.mutateAsync(payload)
            }
            onClose()
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Something went wrong.'
            setErrors({ root: msg })
        }
    }

    const isBusy = major ? updateMutation.isPending : createMutation.isPending

    return (
        <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/30 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
                    <div>
                        <h2 className="text-base font-semibold tracking-tight">{major ? 'Edit Major' : 'Add Major'}</h2>
                        {course && (
                            <p className="mt-0.5 text-xs text-[var(--color-muted)] truncate max-w-[280px]">
                                {course.code} — {course.name}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-4 px-6 py-5">
                    {errors.root && (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errors.root}
                        </p>
                    )}

                    {!course && (
                        <div className="space-y-1.5">
                            <label htmlFor="major-course" className="block text-sm font-medium">
                                Department <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="major-course"
                                value={form.course_id}
                                disabled={coursesLoading}
                                onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}
                                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--color-accent)]/30 ${errors.course_id
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-[var(--color-line)] bg-white focus:border-[var(--color-accent)]'
                                    }`}
                            >
                                <option value="">
                                    {coursesLoading ? 'Loading departments…' : 'Select a department'}
                                </option>
                                {(courses ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.code} — {c.name}
                                    </option>
                                ))}
                            </select>
                            {errors.course_id && <p className="text-xs text-red-600">{errors.course_id}</p>}
                        </div>
                    )}

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label htmlFor="major-name" className="block text-sm font-medium">
                            Major name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="major-name"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Computer Science"
                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--color-accent)]/30 ${errors.name
                                ? 'border-red-400 bg-red-50'
                                : 'border-[var(--color-line)] bg-white focus:border-[var(--color-accent)]'
                                }`}
                        />
                        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                    </div>

                    {/* Code */}
                    <div className="space-y-1.5">
                        <label htmlFor="major-code" className="block text-sm font-medium">
                            Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="major-code"
                            type="text"
                            value={form.code}
                            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                            placeholder="e.g. BSCS"
                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--color-accent)]/30 ${errors.code
                                ? 'border-red-400 bg-red-50'
                                : 'border-[var(--color-line)] bg-white focus:border-[var(--color-accent)]'
                                }`}
                        />
                        {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
                    </div>

                    {/* Program Head */}
                    <div className="space-y-1.5">
                        <label htmlFor="major-program-head" className="block text-sm font-medium">
                            Program Head
                            <span className="ml-1 text-[11px] font-normal text-[var(--color-muted)]">(optional)</span>
                        </label>
                        <select
                            id="major-program-head"
                            value={form.program_head_user_id}
                            disabled={usersLoading}
                            onChange={(e) => setForm((f) => ({ ...f, program_head_user_id: e.target.value }))}
                            className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
                        >
                            <option value="">
                                {usersLoading ? 'Loading users…' : 'None'}
                            </option>
                            {(users ?? [])
                                .filter((u) => u.role?.id === 3)
                                .map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Sort Order */}
                    <div className="space-y-1.5">
                        <label htmlFor="major-sort" className="block text-sm font-medium">
                            Sort order
                            <span className="ml-1 text-[11px] font-normal text-[var(--color-muted)]">(optional)</span>
                        </label>
                        <input
                            id="major-sort"
                            type="number"
                            min={0}
                            value={form.sort_order}
                            onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                            placeholder="e.g. 1"
                            className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:bg-slate-50 hover:text-[var(--color-ink)]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isBusy}
                            className="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                        >
                            {isBusy ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : null}
                            {major ? 'Save changes' : 'Create major'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )
}

// ─── CourseRow ────────────────────────────────────────────────────────────────

function CourseRow({
    course,
    onEdit,
    onDelete,
}: {
    course: Course
    onEdit: (c: Course) => void
    onDelete: (c: Course) => void
}) {
    return (
        <motion.tr
            variants={row}
            className="group border-b border-[var(--color-line)] last:border-0"
        >
            {/* Code + Name */}
            <td className="py-3.5 pl-5 pr-4">
                <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-soft)] text-xs font-bold text-[var(--color-accent)]">
                        <BookOpen size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-ink)]">{course.name}</p>
                        <p className="font-mono text-xs text-[var(--color-muted)]">{course.code}</p>
                    </div>
                </div>
            </td>

            {/* Dean */}
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-sm text-[var(--color-ink)]">
                    <UserRound size={13} className="shrink-0 text-[var(--color-muted)]" />
                    <span className="truncate">{course.dean?.name ?? <span className="text-[var(--color-muted)]">—</span>}</span>
                </div>
            </td>

            {/* Required Hours */}
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-sm text-[var(--color-ink)]">
                    <Clock size={13} className="shrink-0 text-[var(--color-muted)]" />
                    <span>{course.required_hours} hrs</span>
                </div>
            </td>

            {/* Status */}
            <td className="px-4 py-3.5">
                <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${course.is_active
                        ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                        : 'bg-red-50 text-red-600'
                        }`}
                >
                    {course.is_active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {course.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>

            {/* Actions */}
            <td className="py-3.5 pl-4 pr-5 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => onEdit(course)}
                        aria-label={`Edit ${course.name}`}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] shadow-sm transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                        <Edit2 size={11} /> Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(course)}
                        aria-label={`Delete ${course.name}`}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] shadow-sm transition hover:border-red-300 hover:text-red-600"
                    >
                        <Trash2 size={11} /> Delete
                    </button>
                </div>
            </td>
        </motion.tr>
    )
}

// ─── MajorsTable ──────────────────────────────────────────────────────────────

function MajorsTable({
    onEdit,
    onDelete,
}: {
    onEdit: (m: Major) => void
    onDelete: (m: Major) => void
}) {
    const { data: majors, isLoading } = useMajors()

    return (
        <motion.div variants={row} className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
            <div className="border-b border-[var(--color-line)] px-5 py-3.5 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">All Majors</h3>
                <span className="text-xs text-[var(--color-muted)]">{isLoading ? 'Loading…' : `${majors?.length ?? 0} majors`}</span>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-[var(--color-muted)]">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                </div>
            ) : majors?.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <p className="text-sm font-medium text-[var(--color-muted)]">No majors found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[var(--color-line)] bg-slate-50/70">
                                <th className="py-3 pl-5 pr-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Code</th>
                                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Name</th>
                                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Department</th>
                                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Program Head</th>
                                <th className="py-3 pl-4 pr-5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(majors ?? []).map((m) => (
                                <tr key={m.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-slate-50/50 transition">
                                    <td className="py-3 pl-5 pr-4 text-sm font-medium text-[var(--color-ink)]">{m.code}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--color-ink)]">{m.name}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--color-muted)]">
                                        {m.course ? (
                                            <span className="inline-flex items-center rounded-md bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                                                {m.course.code}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-[var(--color-muted)]">
                                        {m.program_head ? (
                                            <div className="flex items-center gap-1.5">
                                                <UserRound size={11} />
                                                <span>{m.program_head.name}</span>
                                            </div>
                                        ) : '—'}
                                    </td>
                                    <td className="py-3.5 pl-4 pr-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onEdit(m)}
                                                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] shadow-sm transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                                            >
                                                <Edit2 size={11} /> Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(m)}
                                                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] shadow-sm transition hover:border-red-300 hover:text-red-600"
                                            >
                                                <Trash2 size={11} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CoursePage() {
    const navigate = useNavigate()
    const { data: courses, isLoading, error } = useCourses()

    const [search, setSearch] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)
    const [showAddMajor, setShowAddMajor] = useState(false)
    const [editMajorTarget, setEditMajorTarget] = useState<Major | null>(null)
    const [deleteMajorTarget, setDeleteMajorTarget] = useState<Major | null>(null)

    const filtered = (courses ?? []).filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    )

    const total = courses?.length ?? 0
    const active = courses?.filter((c) => c.is_active).length ?? 0
    const inactive = total - active

    return (
        <>
            <motion.section
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                {/* ── Page header ──────────────────────────────────── */}
                <motion.div variants={row} className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
                            Office of the Registrar
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Departments</h2>
                        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                            Manage course records, required hours, and assigned deans.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowAddMajor(true)}
                            className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-muted)] shadow-sm transition hover:border-violet-300 hover:text-violet-600"
                        >
                            <GraduationCap size={15} /> Add Major
                        </button>
                        <Link
                            to="/courses/add"
                            className="flex items-center !text-white gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                        >
                            <Plus size={15} /> Add Course
                        </Link>
                    </div>
                </motion.div>

                {/* ── Stat cards ───────────────────────────────────── */}
                <motion.div variants={row} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {[
                        { label: 'Total courses', value: total, icon: BookOpen, color: 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]' },
                        { label: 'Active', value: active, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                        { label: 'Inactive', value: inactive, icon: XCircle, color: 'text-red-500 bg-red-50' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <article
                            key={label}
                            className="flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur"
                        >
                            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm ${color}`}>
                                <Icon size={18} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold tracking-tight">{value}</p>
                                <p className="text-xs font-medium text-[var(--color-muted)]">{label}</p>
                            </div>
                        </article>
                    ))}
                </motion.div>

                {/* ── Error banner ─────────────────────────────────── */}
                {error ? (
                    <motion.div
                        variants={row}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                    >
                        <p className="text-sm font-medium text-red-700">Failed to load courses from the API.</p>
                    </motion.div>
                ) : null}

                {/* ── Table card ───────────────────────────────────── */}
                <motion.div
                    variants={row}
                    className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur"
                >
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
                        {/* Search */}
                        <label className="flex flex-1 min-w-48 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-muted)] focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20 transition">
                            <Search size={14} />
                            <input
                                id="course-search"
                                type="search"
                                placeholder="Search courses…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent outline-none placeholder:text-[var(--color-muted)] text-[var(--color-ink)]"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </label>

                        {/* Count */}
                        <span className="ml-auto text-xs text-[var(--color-muted)]">
                            {isLoading ? 'Loading…' : `${filtered.length} of ${total} courses`}
                        </span>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--color-muted)]">
                            <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                            <p className="text-sm">Loading courses…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                            <BookOpen size={36} className="text-[var(--color-line)]" />
                            <p className="text-sm font-medium text-[var(--color-muted)]">
                                {search ? 'No courses match your search.' : 'No courses found.'}
                            </p>
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="mt-1 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-[var(--color-line)] bg-slate-50/70">
                                        <th className="py-3 pl-5 pr-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                                            Course
                                        </th>
                                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                                            Dean
                                        </th>
                                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                                            Req. Hours
                                        </th>
                                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                                            Status
                                        </th>
                                        <th className="py-3 pl-4 pr-5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <motion.tbody variants={container} initial="hidden" animate="show">
                                    <AnimatePresence>
                                        {filtered.map((course) => (
                                            <CourseRow
                                                key={course.id}
                                                course={course}
                                                onEdit={(c) => navigate(`/courses/${c.id}`)}
                                                onDelete={setDeleteTarget}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </motion.tbody>
                            </table>
                        </div>
                    )}
                </motion.div>

                {/* ── Majors Table ─────────────────────────────────── */}
                <MajorsTable onEdit={setEditMajorTarget} onDelete={setDeleteMajorTarget} />
            </motion.section>

            {/* ── Modals ─────────────────────────────────────────── */}
            <AnimatePresence>
                {deleteTarget !== null && (
                    <DeleteConfirmModal
                        key="delete-confirm"
                        course={deleteTarget}
                        onClose={() => setDeleteTarget(null)}
                    />
                )}
                {showAddMajor && (
                    <MajorModal
                        key="add-major"
                        onClose={() => setShowAddMajor(false)}
                    />
                )}
                {editMajorTarget !== null && (
                    <MajorModal
                        key="edit-major"
                        major={editMajorTarget}
                        onClose={() => setEditMajorTarget(null)}
                    />
                )}
                {deleteMajorTarget !== null && (
                    <DeleteMajorConfirmModal
                        key="delete-major-confirm"
                        major={deleteMajorTarget}
                        onClose={() => setDeleteMajorTarget(null)}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
