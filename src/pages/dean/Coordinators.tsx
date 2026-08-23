import { useMemo, useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Plus, Search, Mail, Users, MoreVertical, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AddCoordinatorModal } from '@/components/modal/AddCoordinatorModal'

type CoordinatorStatus = 'active' | 'invited'

type Coordinator = {
    id: string
    name: string
    email: string
    department: string
    internsAssigned: number
    status: CoordinatorStatus
}



const listVariants = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.055, delayChildren: 0.05 },
    },
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
    },
    exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.16 } },
}

function initialsOf(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

const CoordinatorsPage = () => {
    const [query, setQuery] = useState('')
    const { token } = useAuth()

    const { data: coordinators = [], isLoading, isError } = useQuery({
        queryKey: queryKeys.coordinators.list(),
        queryFn: () => apiRequest<Coordinator[]>('/coordinators', { token }),
        enabled: Boolean(token),
    })

    const [addOpen, setAddOpen] = useState(false)
    const queryClient = useQueryClient()

    const addMutation = useMutation({
        mutationFn: (data: { name: string; email: string; password: string; course_id?: number }) =>
            apiRequest('/coordinators', { method: 'POST', body: data, token }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.coordinators.all })
            setAddOpen(false)
        },
        onError: (error) => {
            console.error('Failed to add coordinator:', error)
            alert('Failed to add coordinator. Please try again.')
        },
    })

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return coordinators
        return coordinators.filter((c) =>
            [c.name, c.email, c.department].some((field) => field?.toLowerCase().includes(q))
        )
    }, [query, coordinators])

    return (
        <section>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
            >
                <div>
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--color-accent)] uppercase">
                        Directory
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                        Coordinators
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {coordinators.length} coordinators overseeing student internships
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="inline-flex w-fit items-center !text-white gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                >
                    <Plus size={15} className="text-white" /> Add Coordinator
                </button>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="relative mt-6 max-w-sm"
            >
                <Search
                    size={15}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-muted)]"
                />
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    type="text"
                    placeholder="Search by name, department, program…"
                    className="w-full rounded-xl border border-[var(--color-line)] bg-white/80 py-2.5 pr-3 pl-9 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                />
            </motion.div>

            <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
                {isLoading ? (
                    <div className="col-span-full flex h-32 items-center justify-center">
                        <Loader2 className="animate-spin text-[var(--color-accent)]" size={24} />
                    </div>
                ) : isError ? (
                    <div className="col-span-full py-10 text-center text-sm text-red-500">Failed to load coordinators</div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filtered.map((coordinator) => (
                            <motion.article
                                key={coordinator.id}
                                layout
                                variants={itemVariants}
                                initial="hidden"
                                animate="show"
                                exit="exit"
                                whileHover={{ y: -3 }}
                                className="group relative rounded-xl border border-[var(--color-line)] bg-white/80 p-4 shadow-sm transition-colors hover:border-[var(--color-accent)]/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-accent-soft)] text-xs font-semibold text-[var(--color-accent)]">
                                            {initialsOf(coordinator.name)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                                                {coordinator.name}
                                            </p>
                                            <p className="truncate text-xs text-[var(--color-muted)]">{coordinator.department}</p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        aria-label={`More actions for ${coordinator.name}`}
                                        className="shrink-0 rounded-lg p-1.5 text-[var(--color-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-50 hover:text-[var(--color-ink)]"
                                    >
                                        <MoreVertical size={15} />
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-col gap-1.5 border-t border-[var(--color-line)] pt-3">
                                    <p className="flex items-center gap-2 truncate text-xs text-[var(--color-muted)]">
                                        <Mail size={13} className="shrink-0" />
                                        {coordinator.email}
                                    </p>
                                    <p className="flex items-center gap-2 truncate text-xs text-[var(--color-muted)]">
                                        <Users size={13} className="shrink-0" />
                                        {coordinator.internsAssigned === 0
                                            ? 'No interns assigned yet'
                                            : `${coordinator.internsAssigned} intern${coordinator.internsAssigned === 1 ? '' : 's'} assigned`}
                                    </p>
                                </div>

                                <span
                                    className={[
                                        'absolute top-4 right-4 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                                        coordinator.status === 'active'
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-amber-50 text-amber-600',
                                    ].join(' ')}
                                >
                                    {coordinator.status === 'active' ? 'Active' : 'Invited'}
                                </span>
                            </motion.article>
                        ))}
                    </AnimatePresence>
                )}
            </motion.div>

            <AnimatePresence>
                {!isLoading && filtered.length === 0 ? (
                    <motion.div
                        key="empty-state"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.24 }}
                        className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] py-14 text-center"
                    >
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                            <Search size={16} />
                        </div>
                        <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">No coordinators found</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                            Try a different name, department, or program.
                        </p>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <AddCoordinatorModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onAdd={(data) => addMutation.mutate(data)}
                isLoading={addMutation.isPending}
            />
        </section>
    )
}

export default CoordinatorsPage
