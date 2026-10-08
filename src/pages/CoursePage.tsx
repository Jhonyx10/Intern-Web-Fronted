import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    X,
    UserPlus,
    PlusCircle,
    BookOpen,
} from 'lucide-react'
import {
    useCourses,
    useDeleteCourse,
    useToggleCourseActive,
} from '@/lib/queries/courses'
import { useMajors, useCreateMajor, useDeleteMajor, useUpdateMajor } from '@/lib/queries/majors'
import { useAuth } from '@/lib/auth'
import type { Program, Major } from '@/types'

// ─── animation variants ───────────────────────────────────────────────────────

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
}

// ─── Helper function to check if user is super_admin ───────────────────────────

function isSuperAdmin(userRole: any): boolean {
    return userRole?.name?.toLowerCase() === 'super_admin' || userRole?.label?.toLowerCase() === 'super_admin'
}

// ─── Helper to safely convert API values (true/false, 1/0, "1"/"0", "true"/"false") to boolean ───

function toBool(value: unknown): boolean {
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase()
        return v === '1' || v === 'true'
    }
    return value === true || value === 1
}

// ─── DeleteConfirmModal (department) ──────────────────────────────────────────

function DeleteConfirmModal({
    course,
    onClose,
}: {
    course: Program
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

// ─── DeleteMajorConfirmModal (program) ────────────────────────────────────────

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
                <h2 className="text-base font-semibold">Delete program?</h2>
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

// ─── MajorModal (add / edit program) ──────────────────────────────────────────

type MajorFormState = {
    course_id: string
    name: string
    code: string
    sort_order: string
}

function MajorModal({
    course,
    major,
    onClose,
}: {
    course?: Program
    major?: Major
    onClose: () => void
}) {
    const createMutation = useCreateMajor()
    const updateMutation = useUpdateMajor()
    const { data: courses, isLoading: coursesLoading } = useCourses()
    const overlayRef = useRef<HTMLDivElement>(null)

    const [form, setForm] = useState<MajorFormState>({
        course_id: String(major?.course_id || (course ? course.id : '')),
        name: major?.name || '',
        code: major?.code || '',
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
                        <h2 className="text-base font-semibold tracking-tight">{major ? 'Edit Program' : 'Add Program'}</h2>
                        {course && (
                            <p className="mt-0.5 max-w-[280px] truncate text-xs text-[var(--color-muted)]">
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
                            Program name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="major-name"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Bachelor of Science in Information Technology"
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
                            placeholder="e.g. BSIT"
                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--color-accent)]/30 ${errors.code
                                ? 'border-red-400 bg-red-50'
                                : 'border-[var(--color-line)] bg-white focus:border-[var(--color-accent)]'
                                }`}
                        />
                        {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
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
                            {major ? 'Save changes' : 'Create program'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )
}

// ─── ActiveToggle ─────────────────────────────────────────────────────────────

function ActiveToggle({
    active,
    busy,
    label,
    onToggle,
}: {
    active: boolean
    busy: boolean
    label: string
    onToggle: () => void
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label={label}
            disabled={busy}
            onClick={onToggle}
            className="inline-flex items-center gap-2 rounded-lg py-1 text-xs font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
            <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${active ? 'bg-[var(--color-accent)]' : 'bg-slate-300'
                    }`}
            >
                <span
                    className={`ml-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                />
            </span>
            {busy ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-muted)] border-t-transparent" />
            ) : (
                <span>{active ? 'Active' : 'Inactive'}</span>
            )}
        </button>
    )
}

// ─── DepartmentCard ───────────────────────────────────────────────────────────

function DepartmentCard({
    course,
    programs,
    canManage,
    isToggling,
    onAssignHead,
    onToggleActive,
    onDeleteDepartment,
    onAddProgram,
    onEditProgram,
    onDeleteProgram,
}: {
    course: Program
    programs: Major[]
    canManage: boolean
    isToggling: boolean
    onAssignHead: (c: Program) => void
    onToggleActive: (c: Program) => void
    onDeleteDepartment: (c: Program) => void
    onAddProgram: (c: Program) => void
    onEditProgram: (m: Major, c: Program) => void
    onDeleteProgram: (m: Major) => void
}) {
    // Safely parse is_active (handles true/false, 1/0, "1"/"0", "true"/"false")
    const isActive = toBool(course.is_active)

    return (
        <motion.article
            variants={item}
            className={`overflow-hidden rounded-2xl border border-[var(--color-line)] shadow-sm ${isActive ? 'bg-white' : 'bg-slate-50'
                }`}
        >
            {/* Header: title + code + status, Assign Head */}
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-5 py-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3
                            className={`text-base font-semibold tracking-tight ${isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]'
                                }`}
                        >
                            {course.name}
                        </h3>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isActive
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-200 text-[var(--color-muted)]'
                                }`}
                        >
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)]">({course.code})</p>
                </div>

                {canManage && (
                    <div className="flex shrink-0 items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => onAssignHead(course)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] shadow-sm transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        >
                            <UserPlus size={13} /> Assign Head
                        </button>
                        <button
                            type="button"
                            onClick={() => onDeleteDepartment(course)}
                            aria-label={`Delete ${course.name}`}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-muted)] shadow-sm transition hover:border-red-300 hover:text-red-600"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}
            </div>

            {/* Body: head + programs offered */}
            <div className="px-5 py-4">
                <p className="text-sm text-[var(--color-muted)]">
                    Head:{' '}
                    <span className="font-medium text-[var(--color-ink)]">
                        {course.dean?.name ?? '—'}
                    </span>
                </p>

                <p className="mt-4 text-sm text-[var(--color-muted)]">Programs Offered:</p>

                {programs.length === 0 ? (
                    <p className="mt-2 rounded-lg border border-dashed border-[var(--color-line)] px-3 py-3 text-xs text-[var(--color-muted)]">
                        No programs yet.
                    </p>
                ) : (
                    <ul className="mt-2 space-y-2">
                        {programs.map((m) => (
                            <li key={m.id} className="flex items-center gap-2">
                                <div className="min-w-0 flex-1 rounded-lg border border-[var(--color-line)] bg-slate-50/60 px-3 py-2 text-xs font-medium uppercase text-[var(--color-ink)]">
                                    {m.name}
                                </div>
                                {canManage && (
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onEditProgram(m, course)}
                                            aria-label={`Edit ${m.name}`}
                                            className="grid h-7 w-7 place-items-center rounded-md text-emerald-600 transition hover:bg-emerald-50"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDeleteProgram(m)}
                                            aria-label={`Delete ${m.name}`}
                                            className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-muted)] transition hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer: Active toggle + Add Program */}
            {canManage && (
                <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] px-5 py-3">
                    <ActiveToggle
                        active={isActive}
                        busy={isToggling}
                        label={isActive ? `Deactivate ${course.name}` : `Activate ${course.name}`}
                        onToggle={() => onToggleActive(course)}
                    />
                    <button
                        type="button"
                        onClick={() => onAddProgram(course)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] shadow-sm transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                        <PlusCircle size={13} /> Add Program
                    </button>
                </div>
            )}
        </motion.article>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CoursePage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { data: courses, isLoading, error } = useCourses()
    const { data: majors } = useMajors()
    const toggleActive = useToggleCourseActive()

    const [search, setSearch] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<Program | null>(null)
    const [addProgramFor, setAddProgramFor] = useState<Program | null>(null)
    const [editProgram, setEditProgram] = useState<{ major: Major; course: Program } | null>(null)
    const [deleteMajorTarget, setDeleteMajorTarget] = useState<Major | null>(null)

    const canManage = !!user && isSuperAdmin(user.role)

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return (courses ?? []).filter(
            (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
        )
    }, [courses, search])

    // Group programs (majors) by their department (course)
    const programsByCourse = useMemo(() => {
        const map = new Map<number, Major[]>()
        for (const m of majors ?? []) {
            const list = map.get(Number(m.course_id)) ?? []
            list.push(m)
            map.set(Number(m.course_id), list)
        }
        return map
    }, [majors])

    return (
        <>
            <motion.section
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                {/* ── Page header ──────────────────────────────────── */}
                <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-semibold tracking-tight">Departments</h2>
                        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                            Manage departments, their heads, and the programs they offer.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex min-w-56 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-muted)] transition focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20">
                            <Search size={14} />
                            <input
                                id="course-search"
                                type="search"
                                placeholder="Search departments…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
                            />
                        </label>

                        {canManage && (
                            <Link
                                to="/courses/add"
                                className="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium !text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                            >
                                <Plus size={15} /> Add Department
                            </Link>
                        )}
                    </div>
                </motion.div>

                {/* ── Error banner ─────────────────────────────────── */}
                {error ? (
                    <motion.div
                        variants={item}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                    >
                        <p className="text-sm font-medium text-red-700">Failed to load departments from the API.</p>
                    </motion.div>
                ) : null}

                {/* ── Department cards ─────────────────────────────── */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--color-muted)]">
                        <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                        <p className="text-sm">Loading departments…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div
                        variants={item}
                        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-line)] py-20 text-center"
                    >
                        <BookOpen size={36} className="text-[var(--color-line)]" />
                        <p className="text-sm font-medium text-[var(--color-muted)]">
                            {search ? 'No departments match your search.' : 'No departments found.'}
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
                    </motion.div>
                ) : (
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2"
                    >
                        {filtered.map((course) => (
                            <DepartmentCard
                                key={course.id}
                                course={course}
                                programs={programsByCourse.get(Number(course.id)) ?? []}
                                canManage={canManage}
                                isToggling={
                                    toggleActive.isPending &&
                                    String(toggleActive.variables) === String(course.id)
                                }
                                onAssignHead={(c) => navigate(`/courses/${c.id}`)}
                                onToggleActive={(c) => toggleActive.mutate(c.id)}
                                onDeleteDepartment={setDeleteTarget}
                                onAddProgram={setAddProgramFor}
                                onEditProgram={(major, c) => setEditProgram({ major, course: c })}
                                onDeleteProgram={setDeleteMajorTarget}
                            />
                        ))}
                    </motion.div>
                )}
            </motion.section>

            {/* ── Modals ─────────────────────────────────────────── */}
            <AnimatePresence>
                {canManage && deleteTarget !== null && (
                    <DeleteConfirmModal
                        key="delete-confirm"
                        course={deleteTarget}
                        onClose={() => setDeleteTarget(null)}
                    />
                )}
                {canManage && addProgramFor !== null && (
                    <MajorModal
                        key="add-program"
                        course={addProgramFor}
                        onClose={() => setAddProgramFor(null)}
                    />
                )}
                {canManage && editProgram !== null && (
                    <MajorModal
                        key="edit-program"
                        course={editProgram.course}
                        major={editProgram.major}
                        onClose={() => setEditProgram(null)}
                    />
                )}
                {canManage && deleteMajorTarget !== null && (
                    <DeleteMajorConfirmModal
                        key="delete-program-confirm"
                        major={deleteMajorTarget}
                        onClose={() => setDeleteMajorTarget(null)}
                    />
                )}
            </AnimatePresence>
        </>
    )
}