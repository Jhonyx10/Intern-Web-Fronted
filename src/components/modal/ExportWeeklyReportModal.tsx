import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { suggestWeekNo } from '@/lib/WeeklyReportRows'
import { backdropVariants, panelVariants } from './ModalVariant'

export type WeeklyReportExportInput = {
    weekDate: Date // any date inside the chosen week
    weekNo: number
    notedByName: string
    notedByPosition: string
}

const inputClass =
    'rounded-xl w-full border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]'

export default function ExportWeeklyReportModal({
    open,
    onClose,
    onExport,
    isExporting,
    defaultWeekDate,
    firstLogDate,
    defaultNotedByName,
    defaultNotedByPosition,
}: {
    open: boolean
    onClose: () => void
    onExport: (input: WeeklyReportExportInput) => void
    isExporting?: boolean
    defaultWeekDate: Date
    firstLogDate: Date | null
    defaultNotedByName: string
    defaultNotedByPosition: string
}) {
    const [weekDateStr, setWeekDateStr] = useState(format(defaultWeekDate, 'yyyy-MM-dd'))
    const [weekNoOverride, setWeekNoOverride] = useState('')
    const [notedByName, setNotedByName] = useState(defaultNotedByName)
    const [notedByPosition, setNotedByPosition] = useState(defaultNotedByPosition)

    // Fresh defaults every time the modal opens
    useEffect(() => {
        if (!open) return
        setWeekDateStr(format(defaultWeekDate, 'yyyy-MM-dd'))
        setWeekNoOverride('')
        setNotedByName(defaultNotedByName)
        setNotedByPosition(defaultNotedByPosition)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const weekDate = useMemo(() => {
        const parsed = weekDateStr ? parseISO(weekDateStr) : defaultWeekDate
        return Number.isNaN(parsed.getTime()) ? defaultWeekDate : parsed
    }, [weekDateStr, defaultWeekDate])

    const monday = startOfWeek(weekDate, { weekStartsOn: 1 })
    const friday = addDays(monday, 4)
    const rangeLabel = `${format(monday, 'MMM d')} – ${format(friday, 'MMM d, yyyy')}`

    const suggestedWeekNo = suggestWeekNo(firstLogDate, weekDate)
    const weekNo = weekNoOverride ? Number(weekNoOverride) : suggestedWeekNo

    function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!weekNo || weekNo < 1) return
        onExport({
            weekDate,
            weekNo,
            notedByName: notedByName.trim(),
            notedByPosition: notedByPosition.trim(),
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
                    onClick={onClose}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
                >
                    <motion.div
                        variants={panelVariants}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Export weekly report"
                        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--color-ink)]">
                                    Export Weekly Report
                                </h2>
                                <p className="text-xs text-[var(--color-muted)]">
                                    Pick the week to include in the PDF.
                                </p>
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
                            <form onSubmit={submit} className="flex flex-col gap-3.5">
                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">
                                        Any date in the week
                                    </span>
                                    <input
                                        type="date"
                                        value={weekDateStr}
                                        onChange={(e) => setWeekDateStr(e.target.value)}
                                        required
                                        className={inputClass}
                                    />
                                    <span className="text-xs text-[var(--color-muted)]">
                                        Covers {rangeLabel}
                                    </span>
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Week no.</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={weekNoOverride}
                                        onChange={(e) => setWeekNoOverride(e.target.value)}
                                        placeholder={String(suggestedWeekNo)}
                                        className={inputClass}
                                    />
                                    <span className="text-xs text-[var(--color-muted)]">
                                        Leave blank to use week {suggestedWeekNo} (counted from the first time log).
                                    </span>
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Noted by</span>
                                    <input
                                        value={notedByName}
                                        onChange={(e) => setNotedByName(e.target.value)}
                                        placeholder="Supervisor name"
                                        className={inputClass}
                                    />
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Position</span>
                                    <input
                                        value={notedByPosition}
                                        onChange={(e) => setNotedByPosition(e.target.value)}
                                        placeholder="e.g. Senior Developer"
                                        className={inputClass}
                                    />
                                </label>

                                <button
                                    type="submit"
                                    disabled={isExporting}
                                    className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                                >
                                    {isExporting ? 'Generating…' : 'Export PDF'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}