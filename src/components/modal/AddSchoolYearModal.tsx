import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { backdropVariants, panelVariants } from './ModalVariant'

export default function AddSchoolYearModal({
    open,
    onClose,
    onAdd,
    isLoading,
}: {
    open: boolean
    onClose: () => void
    onAdd: (data: { name: string; start_date: string; end_date: string; is_active: boolean }) => void
    isLoading?: boolean
}) {
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isActive, setIsActive] = useState(true)

    function reset() {
        setName('')
        setStartDate('')
        setEndDate('')
        setIsActive(true)
    }

    function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) return
        onAdd({ name: name.trim(), start_date: startDate, end_date: endDate, is_active: isActive })
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
                        aria-label="Add school year"
                        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--color-ink)]">Add School Year</h2>
                                <p className="text-xs text-[var(--color-muted)]">Create a new academic school year.</p>
                            </div>
                            <button type="button" onClick={() => { reset(); onClose() }} aria-label="Close" className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            <form onSubmit={submit} className="flex flex-col gap-3.5">
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Name</span>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. 2025 - 2026"
                                        required
                                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                    />
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1.5 text-sm">
                                        <span className="font-medium text-[var(--color-ink)]">Start date</span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1.5 text-sm">
                                        <span className="font-medium text-[var(--color-ink)]">End date</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                        />
                                    </label>
                                </div>

                                <label className="flex items-center gap-2.5 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="h-4 w-4 rounded border-[var(--color-line)] text-[var(--color-accent)] accent-[var(--color-accent)]"
                                    />
                                    <span className="font-medium text-[var(--color-ink)]">Set as active school year</span>
                                </label>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                                >
                                    {isLoading ? 'Creating...' : 'Create School Year'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
