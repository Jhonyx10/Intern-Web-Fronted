import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar } from 'lucide-react'
import { backdropVariants, panelVariants } from './ModalVariant'
import type { CompanyScheduleData, ScheduleInput } from '@/lib/queries/supervisor'

export default function AddEditScheduleModal({
    open,
    onClose,
    onSubmit,
    isLoading,
    scheduleToEdit,
}: {
    open: boolean
    onClose: () => void
    onSubmit: (input: ScheduleInput) => void
    isLoading?: boolean
    scheduleToEdit?: CompanyScheduleData | null
}) {
    const [startDate, setStartDate] = useState('')
    const [timeIn, setTimeIn] = useState('08:00')
    const [lunchBreak, setLunchBreak] = useState('12:00 - 13:00')
    const [timeOut, setTimeOut] = useState('17:00')

    useEffect(() => {
        if (scheduleToEdit) {
            setStartDate(scheduleToEdit.start_date ? scheduleToEdit.start_date.split('T')[0] : '')
            setTimeIn(scheduleToEdit.time_in ?? '08:00')
            setLunchBreak(scheduleToEdit.lunch_break ?? '')
            setTimeOut(scheduleToEdit.time_out ?? '17:00')
        } else {
            reset()
        }
    }, [scheduleToEdit, open])

    function reset() {
        setStartDate(new Date().toISOString().split('T')[0])
        setTimeIn('08:00')
        setLunchBreak('12:00 - 13:00')
        setTimeOut('17:00')
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!startDate || !timeIn || !timeOut) return
        onSubmit({
            start_date: startDate,
            time_in: timeIn,
            lunch_break: lunchBreak.trim() || null,
            time_out: timeOut,
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
                        aria-label={scheduleToEdit ? 'Edit Schedule' : 'Add Schedule'}
                        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--color-ink)] flex items-center gap-2">
                                    <Calendar size={18} className="text-[var(--color-muted)]" />
                                    {scheduleToEdit ? 'Edit Schedule' : 'Add Schedule'}
                                </h2>
                                <p className="text-xs text-[var(--color-muted)] mt-1">
                                    {scheduleToEdit ? 'Update company schedule details.' : 'Set up a new work schedule for interns.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { reset(); onClose() }}
                                aria-label="Close"
                                className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Start Date</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        required
                                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                    />
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1.5 text-sm">
                                        <span className="font-medium text-[var(--color-ink)]">Time In</span>
                                        <input
                                            type="time"
                                            value={timeIn}
                                            onChange={(e) => setTimeIn(e.target.value)}
                                            required
                                            className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1.5 text-sm">
                                        <span className="font-medium text-[var(--color-ink)]">Time Out</span>
                                        <input
                                            type="time"
                                            value={timeOut}
                                            onChange={(e) => setTimeOut(e.target.value)}
                                            required
                                            className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                        />
                                    </label>
                                </div>

                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Lunch Break</span>
                                    <input
                                        type="text"
                                        value={lunchBreak}
                                        onChange={(e) => setLunchBreak(e.target.value)}
                                        placeholder="e.g. 12:00 - 13:00 or 1 hour"
                                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                                >
                                    {isLoading ? 'Saving...' : scheduleToEdit ? 'Update Schedule' : 'Add Schedule'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
