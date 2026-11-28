import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Clock, X, Loader2 } from 'lucide-react'
import type { CompanySchedule, CompanyScheduleInput } from '@/lib/queries/companies'

type Props = {
    open: boolean
    isSaving: boolean
    companyName: string
    /** Current schedule, used to prefill the times */
    current?: CompanySchedule | null
    onSave: (input: CompanyScheduleInput) => void
    onClose: () => void
}

// "08:00:00" -> "08:00" for <input type="time">
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '')

// Local date as YYYY-MM-DD (toISOString would shift it to UTC)
const todayLocal = () => new Date().toLocaleDateString('en-CA')

export default function CompanyScheduleModal({
    open,
    isSaving,
    companyName,
    current,
    onSave,
    onClose,
}: Props) {
    const prefersReducedMotion = useReducedMotion()

    const [startDate, setStartDate] = useState(todayLocal())
    const [timeIn, setTimeIn] = useState('08:00')
    const [timeOut, setTimeOut] = useState('17:00')
    const [hasBreak, setHasBreak] = useState(true)
    const [breakOut, setBreakOut] = useState('12:00')
    const [breakIn, setBreakIn] = useState('13:00')
    const [error, setError] = useState<string | null>(null)

    // Prefill from the current schedule every time the modal opens
    useEffect(() => {
        if (!open) return
        setStartDate(todayLocal())
        setTimeIn(hhmm(current?.time_in) || '08:00')
        setTimeOut(hhmm(current?.time_out) || '17:00')
        const currentHasBreak = current ? Boolean(current.break_out && current.break_in) : true
        setHasBreak(currentHasBreak)
        setBreakOut(hhmm(current?.break_out) || '12:00')
        setBreakIn(hhmm(current?.break_in) || '13:00')
        setError(null)
    }, [open, current])

    const handleClose = () => {
        if (!isSaving) onClose()
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!startDate || !timeIn || !timeOut) {
            setError('Start date, time in and time out are required.')
            return
        }
        if (timeOut <= timeIn) {
            setError('Time out must be later than time in.')
            return
        }
        if (hasBreak && !(timeIn < breakOut && breakOut < breakIn && breakIn < timeOut)) {
            setError('The lunch break must fall between time in and time out.')
            return
        }

        setError(null)
        onSave({
            start_date: startDate,
            time_in: timeIn,
            time_out: timeOut,
            break_out: hasBreak ? breakOut : null,
            break_in: hasBreak ? breakIn : null,
        })
    }

    const inputClass =
        'mt-1 h-10 w-full rounded-lg border border-[var(--color-line)] bg-white px-3 text-sm font-normal text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] disabled:opacity-50'

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        className="absolute inset-0 bg-black/40"
                        onClick={handleClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
                    />

                    <motion.form
                        onSubmit={handleSubmit}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="company-schedule-title"
                        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
                        initial={{ opacity: 0, scale: 0.97, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 4 }}
                        transition={
                            prefersReducedMotion
                                ? { duration: 0 }
                                : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                        }
                    >
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSaving}
                            aria-label="Close"
                            className="absolute right-4 top-4 rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--color-ink)] disabled:opacity-40"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
                            <Clock size={17} className="text-[var(--color-accent)]" />
                        </div>

                        <h3
                            id="company-schedule-title"
                            className="mt-4 text-base font-semibold text-[var(--color-ink)]"
                        >
                            Set company schedule
                        </h3>
                        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                            Official hours for interns at <span className="font-medium text-[var(--color-ink)]">{companyName}</span>.
                            Use this when the company's supervisor isn't using the system.
                        </p>

                        <div className="mt-5 space-y-4">
                            <label className="block text-xs font-semibold text-[var(--color-ink)]">
                                Effective from
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    disabled={isSaving}
                                    className={inputClass}
                                    required
                                />
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="block text-xs font-semibold text-[var(--color-ink)]">
                                    Time in
                                    <input
                                        type="time"
                                        value={timeIn}
                                        onChange={(e) => setTimeIn(e.target.value)}
                                        disabled={isSaving}
                                        className={inputClass}
                                        required
                                    />
                                </label>
                                <label className="block text-xs font-semibold text-[var(--color-ink)]">
                                    Time out
                                    <input
                                        type="time"
                                        value={timeOut}
                                        onChange={(e) => setTimeOut(e.target.value)}
                                        disabled={isSaving}
                                        className={inputClass}
                                        required
                                    />
                                </label>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                                <input
                                    type="checkbox"
                                    checked={hasBreak}
                                    onChange={(e) => setHasBreak(e.target.checked)}
                                    disabled={isSaving}
                                    className="h-4 w-4 rounded border-[var(--color-line)] accent-[var(--color-accent)]"
                                />
                                Has a lunch break
                            </label>

                            {hasBreak && (
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-xs font-semibold text-[var(--color-ink)]">
                                        Break out
                                        <input
                                            type="time"
                                            value={breakOut}
                                            onChange={(e) => setBreakOut(e.target.value)}
                                            disabled={isSaving}
                                            className={inputClass}
                                            required
                                        />
                                    </label>
                                    <label className="block text-xs font-semibold text-[var(--color-ink)]">
                                        Break in
                                        <input
                                            type="time"
                                            value={breakIn}
                                            onChange={(e) => setBreakIn(e.target.value)}
                                            disabled={isSaving}
                                            className={inputClass}
                                            required
                                        />
                                    </label>
                                </div>
                            )}

                            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSaving}
                                className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-slate-50 disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    'Save schedule'
                                )}
                            </button>
                        </div>
                    </motion.form>
                </div>
            )}
        </AnimatePresence>
    )
}