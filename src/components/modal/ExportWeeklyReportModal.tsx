import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { suggestWeekNo } from '@/lib/WeeklyReportRows'
import { backdropVariants, panelVariants } from './ModalVariant'

export type WeeklyReportExportInput = {
    weekDate: Date // any date inside the chosen week
    weekNo: number
    /** When set, every week overlapping this range is exported (one section per week). */
    range?: { from: Date; to: Date }
}

type Mode = 'week' | 'range'

const inputClass =
    'rounded-xl w-full border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]'

export default function ExportWeeklyReportModal({
    open,
    onClose,
    onExport,
    isExporting,
    defaultWeekDate,
    firstLogDate,
    initialFrom,
    initialTo,
}: {
    open: boolean
    onClose: () => void
    onExport: (input: WeeklyReportExportInput) => void
    isExporting?: boolean
    defaultWeekDate: Date
    firstLogDate: Date | null
    /** Page-level date filter ("yyyy-MM-dd"). When both are set the modal opens in Date range mode. */
    initialFrom?: string
    initialTo?: string
}) {
    const [mode, setMode] = useState<Mode>('week')
    const [weekDateStr, setWeekDateStr] = useState(format(defaultWeekDate, 'yyyy-MM-dd'))
    const [weekNoOverride, setWeekNoOverride] = useState('')
    const [fromStr, setFromStr] = useState(format(defaultWeekDate, 'yyyy-MM-dd'))
    const [toStr, setToStr] = useState(format(defaultWeekDate, 'yyyy-MM-dd'))

    // Fresh defaults every time the modal opens
    useEffect(() => {
        if (!open) return
        const today = format(defaultWeekDate, 'yyyy-MM-dd')
        setWeekDateStr(today)
        setWeekNoOverride('')
        if (initialFrom && initialTo) {
            setMode('range')
            setFromStr(initialFrom)
            setToStr(initialTo)
        } else {
            setMode('week')
            setFromStr(today)
            setToStr(today)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    // ── Single week ──
    const weekDate = useMemo(() => {
        const parsed = weekDateStr ? parseISO(weekDateStr) : defaultWeekDate
        return Number.isNaN(parsed.getTime()) ? defaultWeekDate : parsed
    }, [weekDateStr, defaultWeekDate])

    const monday = startOfWeek(weekDate, { weekStartsOn: 1 })
    const friday = addDays(monday, 4)
    const rangeLabel = `${format(monday, 'MMM d')} – ${format(friday, 'MMM d, yyyy')}`

    const suggestedWeekNo = suggestWeekNo(firstLogDate, weekDate)
    const weekNo = weekNoOverride ? Number(weekNoOverride) : suggestedWeekNo

    // ── Date range ──
    const rangeFrom = fromStr ? parseISO(fromStr) : null
    const rangeTo = toStr ? parseISO(toStr) : null
    const rangeValid =
        !!rangeFrom &&
        !!rangeTo &&
        !Number.isNaN(rangeFrom.getTime()) &&
        !Number.isNaN(rangeTo.getTime()) &&
        rangeFrom.getTime() <= rangeTo.getTime()

    const rangeSummary =
        rangeValid && rangeFrom && rangeTo
            ? `${format(rangeFrom, 'MMM d, yyyy')} – ${format(rangeTo, 'MMM d, yyyy')} · weeks ${suggestWeekNo(
                firstLogDate,
                rangeFrom,
            )} to ${suggestWeekNo(firstLogDate, rangeTo)}`
            : 'Please choose a valid range (start must be before end).'

    function submit(e: React.FormEvent) {
        e.preventDefault()

        if (mode === 'range') {
            if (!rangeValid || !rangeFrom || !rangeTo) return
            onExport({
                weekDate: rangeFrom,
                weekNo: suggestWeekNo(firstLogDate, rangeFrom),
                range: { from: rangeFrom, to: rangeTo },
            })
            return
        }

        if (!weekNo || weekNo < 1) return
        onExport({ weekDate, weekNo })
    }

    const tabClass = (active: boolean) =>
        `flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active
            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
            : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
        }`

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
                                    Export one week, or every week in a date range.
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
                                {/* Mode switch */}
                                <div className="flex gap-1 rounded-xl border border-[var(--color-line)] bg-white p-1">
                                    <button
                                        type="button"
                                        onClick={() => setMode('week')}
                                        className={tabClass(mode === 'week')}
                                    >
                                        Single week
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode('range')}
                                        className={tabClass(mode === 'range')}
                                    >
                                        Date range
                                    </button>
                                </div>

                                {mode === 'week' ? (
                                    <>
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
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="flex flex-col gap-1.5 text-sm">
                                                <span className="font-medium text-[var(--color-ink)]">From</span>
                                                <input
                                                    type="date"
                                                    value={fromStr}
                                                    max={toStr || undefined}
                                                    onChange={(e) => setFromStr(e.target.value)}
                                                    required
                                                    className={inputClass}
                                                />
                                            </label>
                                            <label className="flex flex-col gap-1.5 text-sm">
                                                <span className="font-medium text-[var(--color-ink)]">To</span>
                                                <input
                                                    type="date"
                                                    value={toStr}
                                                    min={fromStr || undefined}
                                                    onChange={(e) => setToStr(e.target.value)}
                                                    required
                                                    className={inputClass}
                                                />
                                            </label>
                                        </div>
                                        <p
                                            className={`text-xs ${rangeValid ? 'text-[var(--color-muted)]' : 'text-rose-600'
                                                }`}
                                        >
                                            {rangeSummary}
                                        </p>
                                        <p className="text-xs text-[var(--color-muted)]">
                                            Each week goes on its own page. Only days inside the range are
                                            included, and weeks with no time logs are skipped.
                                        </p>
                                    </>
                                )}

                                <button
                                    type="submit"
                                    disabled={isExporting || (mode === 'range' && !rangeValid)}
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