import { useEffect, useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X } from 'lucide-react'
import { useAuth } from '@/lib/auth'

type AddCoordinatorModalProps = {
    open: boolean
    onClose: () => void
    onAdd: (coordinator: { name: string; email: string; password: string; course_id: number }) => void
    isLoading?: boolean
}

const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.18 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
}

const panelVariants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
    },
    exit: {
        opacity: 0,
        y: 10,
        scale: 0.98,
        transition: { duration: 0.16 },
    },
}

export function AddCoordinatorModal({ open, onClose, onAdd, isLoading }: AddCoordinatorModalProps) {
    const { user } = useAuth()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    useEffect(() => {
        if (!open) return

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [open, onClose])

    useEffect(() => {
        if (!open) {
            setName('')
            setEmail('')
            setPassword('')
        }
    }, [open])

    console.log(user)

 function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim() || !user?.course?.id) return
    onAdd({ name: name.trim(), email: email.trim(), password: password.trim(), course_id: Number(user.course.id) })
}

    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    variants={backdropVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    onClick={onClose}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
                >
                    <motion.div
                        variants={panelVariants}
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Add coordinator"
                        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--color-ink)]">Add Coordinator</h2>
                                <p className="text-xs text-[var(--color-muted)]">Invite a new coordinator to the system.</p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            <motion.form
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.18 }}
                                onSubmit={submit}
                                className="flex flex-col gap-3.5"
                            >
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Full name</span>
                                    <input
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder="e.g. John Doe"
                                        required
                                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                    />
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Email address</span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="e.g. jdoe@example.com"
                                        required
                                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                    />
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Password</span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="Min. 8 characters"
                                        required
                                        minLength={8}
                                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                                >
                                    {isLoading ? 'Adding...' : 'Add Coordinator'}
                                </button>
                            </motion.form>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
