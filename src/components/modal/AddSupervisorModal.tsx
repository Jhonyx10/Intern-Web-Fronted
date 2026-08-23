import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Briefcase } from 'lucide-react'
import { backdropVariants, panelVariants } from './ModalVariant'

export type SupervisorFormData = {
    first_name: string
    last_name: string
    email: string
    position_title: string
}

export default function AddSupervisorModal({
    open,
    onClose,
    onAdd,
    isLoading,
}: {
    open: boolean
    onClose: () => void
    onAdd: (data: SupervisorFormData) => void
    isLoading?: boolean
}) {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [position, setPosition] = useState('')

    function reset() {
        setFirstName('')
        setLastName('')
        setEmail('')
        setPosition('')
    }

    function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !position.trim()) return
        onAdd({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            position_title: position.trim()
        })
    }

    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    variants={backdropVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    onClick={() => { reset(); onClose() }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
                >
                    <motion.div
                        variants={panelVariants}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Add Supervisor"
                        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--color-ink)] flex items-center gap-2">
                                    <Briefcase size={18} className="text-[var(--color-muted)]" /> Add Supervisor
                                </h2>
                                <p className="text-xs text-[var(--color-muted)] mt-1">Create a new supervisor account.</p>
                            </div>
                            <button type="button" onClick={() => { reset(); onClose() }} aria-label="Close" className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            <form onSubmit={submit} className="flex flex-col gap-3.5">
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1.5 text-sm">
                                        <span className="font-medium text-[var(--color-ink)]">First Name</span>
                                        <input
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="e.g. John"
                                            required
                                            className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1.5 text-sm">
                                        <span className="font-medium text-[var(--color-ink)]">Last Name</span>
                                        <input
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="e.g. Doe"
                                            required
                                            className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                        />
                                    </label>
                                </div>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Email Address</span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="e.g. supervisor@company.com"
                                        required
                                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Position Title</span>
                                    <input
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value)}
                                        placeholder="e.g. Team Lead"
                                        required
                                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                                >
                                    {isLoading ? 'Processing...' : 'Add Supervisor'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
