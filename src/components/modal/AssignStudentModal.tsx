import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search } from 'lucide-react'
import { backdropVariants, panelVariants } from './ModalVariant'
import { useStudents } from '@/lib/queries/students'

export default function AssignStudentModal({
    open,
    onClose,
    onAssign,
    isLoading,
}: {
    open: boolean
    onClose: () => void
    onAssign: (studentIds: number[]) => void
    isLoading?: boolean
}) {
    const [search, setSearch] = useState('')
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const { data: studentsData, isLoading: isLoadingStudents } = useStudents(
        1,
        { unassigned: true, perPage: 50 },
        { enabled: open },
    )

    function reset() {
        setSearch('')
        setSelectedIds([])
    }

    useEffect(() => {
        if (!open) reset()
    }, [open])

    function handleClose() {
        reset()
        onClose()
    }

    const students = studentsData?.data ?? []

    const filteredStudents = students.filter(student =>
        student.is_active &&
        (student.first_name.toLowerCase().includes(search.toLowerCase()) ||
            student.last_name.toLowerCase().includes(search.toLowerCase()) ||
            student.student_number.includes(search))
    )

    function toggleStudent(id: number) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        )
    }

    function handleSubmit() {
        if (selectedIds.length === 0 || isLoading) return
        onAssign(selectedIds)
    }

    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    variants={backdropVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    onClick={handleClose}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
                >
                    <motion.div
                        variants={panelVariants}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Assign students"
                        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--color-ink)]">Assign Students</h2>
                                <p className="text-xs text-[var(--color-muted)]">Select unassigned students to place at this company.</p>
                            </div>
                            <button type="button" onClick={handleClose} aria-label="Close" className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="border-b border-[var(--color-line)] p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={16} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search by name or ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded-xl border border-[var(--color-line)] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-[300px]">
                            {isLoadingStudents ? (
                                <div className="flex justify-center p-8">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent"></div>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="p-8 text-center text-sm text-[var(--color-muted)]">
                                    No unassigned students found.
                                </div>
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {filteredStudents.map((student) => {
                                        const checked = selectedIds.includes(student.id)
                                        return (
                                            <li key={student.id}>
                                                <label
                                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                                                        checked
                                                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                                                            : 'border-[var(--color-line)] hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleStudent(student.id)}
                                                        disabled={isLoading}
                                                        className="h-4 w-4 rounded border-[var(--color-line)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                                                            {student.last_name}, {student.first_name} {student.middle_name}
                                                        </p>
                                                        <p className="text-xs text-[var(--color-muted)]">
                                                            {student.student_number}
                                                        </p>
                                                    </div>
                                                </label>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>

                        <div className="flex items-center justify-between border-t border-[var(--color-line)] px-5 py-4">
                            <p className="text-xs text-[var(--color-muted)]">{selectedIds.length} selected</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-ink)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isLoading || selectedIds.length === 0}
                                    className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isLoading ? 'Assigning…' : 'Assign'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
