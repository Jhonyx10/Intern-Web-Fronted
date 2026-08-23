import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search } from 'lucide-react'
import { backdropVariants, panelVariants } from './ModalVariant'
import { useStudents } from '@/lib/queries/students'

export default function AssignStudentModal({
    open,
    onClose,
    onAssign,
    isLoading,
    assignedStudentIds = [],
}: {
    open: boolean
    onClose: () => void
    onAssign: (studentId: number) => void
    isLoading?: boolean
    assignedStudentIds?: number[]
}) {
    const [searchUrl, setSearchUrl] = useState('')
    const { data: studentsData, isLoading: isLoadingStudents } = useStudents(1)

    function reset() {
        setSearchUrl('')
    }

    const students = studentsData?.data ?? []

    // Filter active students only, and exclude those already assigned
    const filteredStudents = students.filter(student =>
        student.is_active &&
        !assignedStudentIds.includes(student.id) &&
        (student.first_name.toLowerCase().includes(searchUrl.toLowerCase()) ||
            student.last_name.toLowerCase().includes(searchUrl.toLowerCase()) ||
            student.student_number.includes(searchUrl))
    )

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
                        aria-label="Assign a student"
                        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--color-ink)]">Assign Student</h2>
                                <p className="text-xs text-[var(--color-muted)]">Select a student to assign to this company.</p>
                            </div>
                            <button type="button" onClick={() => { reset(); onClose() }} aria-label="Close" className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]">
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
                                    value={searchUrl}
                                    onChange={(e) => setSearchUrl(e.target.value)}
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
                                    No students found.
                                </div>
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {filteredStudents.map((student) => (
                                        <li key={student.id}>
                                            <button
                                                onClick={() => {
                                                    onAssign(student.id);
                                                }}
                                                disabled={isLoading}
                                                className="flex w-full items-center justify-between rounded-xl border border-[var(--color-line)] p-3 text-left transition hover:border-[var(--color-accent)] hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                                                        {student.last_name}, {student.first_name} {student.middle_name}
                                                    </p>
                                                    <p className="text-xs text-[var(--color-muted)]">
                                                        {student.student_number}
                                                    </p>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
