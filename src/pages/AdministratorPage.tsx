import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    Shield,
    UserRound,
    Mail,
    CheckCircle2,
    XCircle,
    ChevronDown,
    Eye,
    EyeOff,
} from 'lucide-react'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/lib/queries/users'
import { useRoles } from '@/lib/queries/roles'
import type { User } from '@/types'

// ─── animation variants ───────────────────────────────────────────────────────

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const row = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
}

// ─── role colour mapping ──────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
    admin:
        'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
    coordinator:
        'bg-violet-50 text-violet-700',
    student:
        'bg-sky-50 text-sky-700',
    dean:
        'bg-amber-50 text-amber-700',
}

function roleBadgeClass(roleName?: string) {
    if (!roleName) return 'bg-slate-100 text-slate-500'
    return ROLE_STYLES[roleName.toLowerCase()] ?? 'bg-slate-100 text-slate-500'
}

// ─── UserFormModal ────────────────────────────────────────────────────────────

type FormState = {
    name: string
    email: string
    password: string
    role_id: string
    is_active: boolean
}

function UserFormModal({
    user,
    onClose,
}: {
    user: User | null
    onClose: () => void
}) {
    const createMutation = useCreateUser()
    const updateMutation = useUpdateUser()
    const { data: roles, isLoading: rolesLoading } = useRoles()
    const isBusy = createMutation.isPending || updateMutation.isPending
    const administrators = roles?.filter((role) => role.id === 2 || role.id === 3)
    const [form, setForm] = useState<FormState>({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        role_id: user?.role?.id != null ? String(user.role.id) : '',
        is_active: user?.is_active ?? true,
    })
    const [showPassword, setShowPassword] = useState(false)
    const [errors, setErrors] = useState<Partial<FormState & { root: string }>>({})

    const overlayRef = useRef<HTMLDivElement>(null)

    // close on overlay click
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    function validate() {
        const errs: typeof errors = {}
        if (!form.name.trim()) errs.name = 'Name is required.'
        if (!form.email.trim()) errs.email = 'Email is required.'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email.'
        if (!user && !form.password.trim()) errs.password = 'Password is required.'
        else if (!user && form.password.length < 8) errs.password = 'Password must be at least 8 characters.'
        if (!form.role_id) errs.role_id = 'Role is required.'
        return errs
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }

        const { password, ...rest } = form
        const payload = user
            ? { ...rest, role_id: Number(rest.role_id) }
            : { ...form, role_id: Number(form.role_id), password }

        try {
            if (user) {
                await updateMutation.mutateAsync({ id: user.id, data: payload })
            } else {
                await createMutation.mutateAsync(payload)
            }
            onClose()
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Something went wrong.'
            setErrors({ root: msg })
        }
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
                className="w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
                    <h2 className="text-base font-semibold tracking-tight">
                        {user ? 'Edit user' : 'Add new user'}
                    </h2>
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

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label htmlFor="user-name" className="block text-sm font-medium">
                            Full name
                        </label>
                        <input
                            id="user-name"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Maria Santos"
                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--color-accent)]/30 ${errors.name
                                ? 'border-red-400 bg-red-50'
                                : 'border-[var(--color-line)] bg-white focus:border-[var(--color-accent)]'
                                }`}
                        />
                        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label htmlFor="user-email" className="block text-sm font-medium">
                            Email address
                        </label>
                        <input
                            id="user-email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="e.g. m.santos@occ.edu.ph"
                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--color-accent)]/30 ${errors.email
                                ? 'border-red-400 bg-red-50'
                                : 'border-[var(--color-line)] bg-white focus:border-[var(--color-accent)]'
                                }`}
                        />
                        {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                    </div>

                    {/* Password — create only */}
                    {!user && (
                        <div className="space-y-1.5">
                            <label htmlFor="user-password" className="block text-sm font-medium">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="user-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                    placeholder="Min. 8 characters"
                                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-[var(--color-accent)]/30 ${errors.password
                                        ? 'border-red-400 bg-red-50'
                                        : 'border-[var(--color-line)] bg-white focus:border-[var(--color-accent)]'
                                        }`}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
                        </div>
                    )}

                    {/* Role */}
                    <div className="space-y-1.5">
                        <label htmlFor="user-role" className="block text-sm font-medium">
                            Role
                        </label>
                        <select
                            id="user-role"
                            value={form.role_id}
                            disabled={rolesLoading}
                            onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--color-accent)]/30 ${errors.role_id
                                ? 'border-red-400 bg-red-50'
                                : 'border-[var(--color-line)] bg-white focus:border-[var(--color-accent)]'
                                }`}
                        >
                            <option value="">
                                {rolesLoading ? 'Loading roles…' : 'Select a role…'}
                            </option>
                            {administrators?.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        {errors.role_id && <p className="text-xs text-red-600">{errors.role_id}</p>}
                    </div>
                    {/* Status toggle */}
                    <div className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-slate-50/80 px-4 py-3">
                        <div>
                            <p className="text-sm font-medium">Account status</p>
                            <p className="text-xs text-[var(--color-muted)]">
                                {form.is_active ? 'User can sign in' : 'User is disabled'}
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={form.is_active}
                            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                            className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${form.is_active ? 'bg-[var(--color-accent)]' : 'bg-slate-300'
                                }`}
                        >
                            <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${form.is_active ? 'left-5.5 translate-x-0.5' : 'left-0.5'
                                    }`}
                            />
                        </button>
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
                            {user ? 'Save changes' : 'Create user'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    )
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

function DeleteConfirmModal({
    user,
    onClose,
}: {
    user: User
    onClose: () => void
}) {
    const deleteMutation = useDeleteUser()
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    async function handleDelete() {
        await deleteMutation.mutateAsync(user.id)
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
                <h2 className="text-base font-semibold">Delete user?</h2>
                <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                    <strong className="font-medium text-[var(--color-ink)]">{user.name}</strong> will be
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

// ─── UserRow ──────────────────────────────────────────────────────────────────

function UserRow({
    user,
    onEdit,
    onDelete,
}: {
    user: User
    onEdit: (u: User) => void
    onDelete: (u: User) => void
}) {
    const initials = user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')

    return (
        <motion.tr
            variants={row}
            className="group border-b border-[var(--color-line)] last:border-0"
        >
            {/* Avatar + name */}
            <td className="py-3.5 pl-5 pr-4">
                <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-soft)] text-xs font-bold text-[var(--color-accent)]">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-ink)]">{user.name}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-[var(--color-muted)]">
                            <Mail size={11} />
                            {user.email}
                        </p>
                    </div>
                </div>
            </td>

            {/* Role */}
            <td className="px-4 py-3.5">
                <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass(
                        user.role?.name,
                    )}`}
                >
                    <Shield size={10} />
                    {user.role?.label ?? 'No role'}
                </span>
            </td>

            {/* Status */}
            <td className="px-4 py-3.5">
                <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${user.is_active
                        ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                        : 'bg-red-50 text-red-600'
                        }`}
                >
                    {user.is_active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>

            {/* Actions */}
            <td className="py-3.5 pl-4 pr-5 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 transition group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={() => onEdit(user)}
                        aria-label={`Edit ${user.name}`}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] shadow-sm transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                        <Edit2 size={11} /> Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(user)}
                        aria-label={`Delete ${user.name}`}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] shadow-sm transition hover:border-red-300 hover:text-red-600"
                    >
                        <Trash2 size={11} /> Delete
                    </button>
                </div>
            </td>
        </motion.tr>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const ALLOWED_ROLE_IDS = [2, 3]

export default function AdministratorPage() {
    const { data: users, isLoading, error } = useUsers()
    const { data: allRoles } = useRoles()
    const roleOptions = (allRoles ?? []).filter((r) => ALLOWED_ROLE_IDS.includes(r.id))

    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [roleOpen, setRoleOpen] = useState(false)
    const roleRef = useRef<HTMLDivElement>(null)

    const [editTarget, setEditTarget] = useState<User | null | 'new'>(null)
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

    // Close role dropdown on outside click
    useEffect(() => {
        if (!roleOpen) return
        function handler(e: MouseEvent) {
            if (!roleRef.current?.contains(e.target as Node)) setRoleOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [roleOpen])

    const adminUsers = (users ?? []).filter((u) => u.role && ALLOWED_ROLE_IDS.includes(u.role.id))

    const filtered = adminUsers.filter((u) => {
        const matchesSearch =
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        const matchesRole =
            roleFilter === 'all' ||
            String(u.role?.id) === roleFilter
        return matchesSearch && matchesRole
    })

    // Stats
    const total = adminUsers.length
    const active = adminUsers.filter((u) => u.is_active).length
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
                            User Management
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Administrators</h2>
                        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                            Manage system accounts, roles, and access permissions.
                        </p>
                    </div>
                    <button
                        type="button"
                        id="add-user-btn"
                        onClick={() => setEditTarget('new')}
                        className="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                    >
                        <Plus size={15} /> Add new user
                    </button>
                </motion.div>

                {/* ── Stat cards ───────────────────────────────────── */}
                <motion.div variants={row} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {[
                        { label: 'Total users', value: total, icon: UserRound, color: 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]' },
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
                        <p className="text-sm font-medium text-red-700">Failed to load users from the API.</p>
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
                                id="user-search"
                                type="search"
                                placeholder="Search users…"
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

                        {/* Role filter dropdown */}
                        <div ref={roleRef} className="relative">
                            <button
                                type="button"
                                id="role-filter-btn"
                                onClick={() => setRoleOpen((o) => !o)}
                                className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                            >
                                <Shield size={13} />
                                {roleFilter === 'all' ? 'All roles' : (roleOptions.find((r) => String(r.id) === roleFilter)?.label ?? 'All roles')}
                                <ChevronDown size={13} className={`transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {roleOpen && (
                                    <motion.ul
                                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                        transition={{ duration: 0.14 }}
                                        className="absolute right-0 z-10 mt-1.5 w-44 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white py-1 shadow-[var(--shadow-soft)]"
                                        role="listbox"
                                    >
                                        <li>
                                            <button
                                                type="button"
                                                role="option"
                                                aria-selected={roleFilter === 'all'}
                                                onClick={() => { setRoleFilter('all'); setRoleOpen(false) }}
                                                className={`w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${roleFilter === 'all'
                                                    ? 'font-semibold text-[var(--color-accent)]'
                                                    : 'text-[var(--color-ink)]'
                                                    }`}
                                            >
                                                All roles
                                            </button>
                                        </li>
                                        {roleOptions.map((role) => (
                                            <li key={role.id}>
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={roleFilter === String(role.id)}
                                                    onClick={() => { setRoleFilter(String(role.id)); setRoleOpen(false) }}
                                                    className={`w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${roleFilter === String(role.id)
                                                        ? 'font-semibold text-[var(--color-accent)]'
                                                        : 'text-[var(--color-ink)]'
                                                        }`}
                                                >
                                                    {role.label}
                                                </button>
                                            </li>
                                        ))}
                                    </motion.ul>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Count */}
                        <span className="ml-auto text-xs text-[var(--color-muted)]">
                            {isLoading ? 'Loading…' : `${filtered.length} of ${total} users`}
                        </span>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--color-muted)]">
                            <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                            <p className="text-sm">Loading users…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                            <UserRound size={36} className="text-[var(--color-line)]" />
                            <p className="text-sm font-medium text-[var(--color-muted)]">
                                {search || roleFilter !== 'all' ? 'No users match your filters.' : 'No users found.'}
                            </p>
                            {(search || roleFilter !== 'all') && (
                                <button
                                    type="button"
                                    onClick={() => { setSearch(''); setRoleFilter('all') }}
                                    className="mt-1 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-[var(--color-line)] bg-slate-50/70">
                                        <th className="py-3 pl-5 pr-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                                            Administrator
                                        </th>
                                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                                            Role
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
                                        {filtered.map((user) => (
                                            <UserRow
                                                key={user.id}
                                                user={user}
                                                onEdit={setEditTarget}
                                                onDelete={setDeleteTarget}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </motion.tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </motion.section>

            {/* ── Modals (portalled via AnimatePresence) ───── */}
            <AnimatePresence>
                {editTarget !== null && (
                    <UserFormModal
                        key="user-form"
                        user={editTarget === 'new' ? null : editTarget}
                        onClose={() => setEditTarget(null)}
                    />
                )}
                {deleteTarget !== null && (
                    <DeleteConfirmModal
                        key="delete-confirm"
                        user={deleteTarget}
                        onClose={() => setDeleteTarget(null)}
                    />
                )}
            </AnimatePresence>
        </>
    )
}