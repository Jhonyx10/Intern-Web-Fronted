import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { backdropVariants, panelVariants } from './ModalVariant'
import type { CourseMajorOption, CourseOption, CoordinatorOption } from './AddSectionModal'

type SectionSnapshot = {
    name: string
    code: string | null
    course_id: number
    course_major_id: number | null
    coordinator_user_id: number | null
}

export default function EditSectionModal({
    open,
    onClose,
    onSave,
    isLoading,
    section,
    courses,
    coordinators,
    coursesLoading,
    coordinatorsLoading,
}: {
    open: boolean
    onClose: () => void
    onSave: (data: {
        name: string
        code: string
        course_id: number
        course_major_id: number | null
        coordinator_user_id: number | null
    }) => void
    isLoading?: boolean
    section: SectionSnapshot | null
    courses: CourseOption[]
    coordinators: CoordinatorOption[]
    coursesLoading?: boolean
    coordinatorsLoading?: boolean
}) {
    const { token, user } = useAuth()
    const deanCourseId = user?.course?.id != null ? String(user.course.id) : ''

    const [name, setName] = useState('')
    const [code, setCode] = useState('')
    const [courseId, setCourseId] = useState('')
    const [courseMajorId, setCourseMajorId] = useState('')
    const [coordinatorId, setCoordinatorId] = useState('')

    // Populate fields when the modal opens with existing section data
    useEffect(() => {
        if (open && section) {
            setName(section.name)
            setCode(section.code ?? '')
            setCourseId(String(section.course_id))
            setCourseMajorId(section.course_major_id ? String(section.course_major_id) : '')
            setCoordinatorId(section.coordinator_user_id ? String(section.coordinator_user_id) : '')
        }
    }, [open, section])

    const { data: majors = [], isLoading: majorsLoading } = useQuery({
        queryKey: queryKeys.majors.list(courseId || undefined),
        queryFn: () => apiRequest<CourseMajorOption[]>(`/majors?course_id=${courseId}`, { token }),
        enabled: Boolean(token) && Boolean(courseId),
    })

    function reset() {
        setName('')
        setCode('')
        setCourseId('')
        setCourseMajorId('')
        setCoordinatorId('')
    }

    function handleClose() {
        reset()
        onClose()
    }

    function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || !courseId) return
        onSave({
            name: name.trim(),
            code: code.trim(),
            course_id: Number(courseId),
            course_major_id: courseMajorId ? Number(courseMajorId) : null,
            coordinator_user_id: coordinatorId ? Number(coordinatorId) : null,
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
                    onClick={handleClose}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
                >
                    <motion.div
                        variants={panelVariants}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Edit section"
                        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--color-ink)]">Edit Section</h2>
                                <p className="text-xs text-[var(--color-muted)]">Update section details.</p>
                            </div>
                            <button type="button" onClick={handleClose} aria-label="Close" className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            <form onSubmit={submit} className="flex flex-col gap-3.5">
                                <div className='grid grid-cols-2 gap-3'>
                                    <label className="flex flex-col gap-1.5 text-sm">
                                        <span className="font-medium text-[var(--color-ink)]">Section name</span>
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. BSCS 4A"
                                            required
                                            className="rounded-xl w-full border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                        />
                                    </label>

                                    <label className="flex flex-col gap-1.5 text-sm">
                                        <span className="font-medium text-[var(--color-ink)]">
                                            Code <span className="font-normal text-[var(--color-muted)]">(optional)</span>
                                        </span>
                                        <input
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            placeholder="e.g. CS4A"
                                            className="rounded-xl w-full border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                        />
                                    </label>
                                </div>

                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">Course</span>
                                    <select
                                        value={courseId}
                                        onChange={(e) => {
                                            setCourseId(e.target.value)
                                            setCourseMajorId('')
                                        }}
                                        required
                                        disabled={coursesLoading || Boolean(deanCourseId)}
                                        className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)] disabled:opacity-50"
                                    >
                                        <option value="" disabled>
                                            {coursesLoading ? 'Loading courses…' : 'Select a course'}
                                        </option>
                                        {courses.map((course) => (
                                            <option key={course.id} value={course.id}>
                                                {course.code} — {course.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <AnimatePresence initial={false}>
                                    {courseId && (majorsLoading || majors.length > 0) ? (
                                        <motion.label
                                            key="major"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex flex-col gap-1.5 overflow-hidden text-sm"
                                        >
                                            <span className="font-medium text-[var(--color-ink)]">Major</span>
                                            <select
                                                value={courseMajorId}
                                                onChange={(e) => setCourseMajorId(e.target.value)}
                                                disabled={majorsLoading}
                                                className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)] disabled:opacity-50"
                                            >
                                                <option value="">{majorsLoading ? 'Loading majors…' : 'No major'}</option>
                                                {majors.map((major) => (
                                                    <option key={major.id} value={major.id}>
                                                        {major.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </motion.label>
                                    ) : null}
                                </AnimatePresence>

                                <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium text-[var(--color-ink)]">
                                        Coordinator <span className="font-normal text-[var(--color-muted)]">(optional)</span>
                                    </span>
                                    <select
                                        value={coordinatorId}
                                        onChange={(e) => setCoordinatorId(e.target.value)}
                                        disabled={coordinatorsLoading}
                                        className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)] disabled:opacity-50"
                                    >
                                        <option value="">
                                            {coordinatorsLoading ? 'Loading coordinators…' : 'Unassigned'}
                                        </option>
                                        {coordinators.map((coordinator) => (
                                            <option key={coordinator.id} value={coordinator.id}>
                                                {coordinator.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                                >
                                    {isLoading ? 'Saving…' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
