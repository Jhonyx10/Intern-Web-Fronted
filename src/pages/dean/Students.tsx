import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Search, Building2, Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useStudents } from '@/lib/queries/students'
import { useCompanies } from '@/lib/queries/companies'
import { useCourses } from '@/lib/queries/courses'
import { useSchoolYears } from '@/lib/queries/school-year'
import { useAuth } from '@/lib/auth'
import type { Student } from '@/types'

type InternshipStatus = 'pending' | 'ongoing' | 'completed'

type StudentListItem = Student & {
    section?: {
        id: number
        name: string
        course_id?: number
        course?: { id: number; name: string }
        school_year?: { id: number; name: string } | null
        schoolYear?: { id: number; name: string } | null
    } | null
    course?: { id: number; name: string } | null
    company?: { id: number; name: string } | null
    status?: InternshipStatus
    hours_completed?: number
    hours_required?: number
}

const STATUS_LABEL: Record<InternshipStatus, string> = {
    pending: 'For Deployment',
    ongoing: 'On Internship',
    completed: 'Completed',
}

const STATUS_STYLE: Record<InternshipStatus, string> = {
    pending: 'bg-amber-50 text-amber-600',
    ongoing: 'bg-sky-50 text-sky-600',
    completed: 'bg-emerald-50 text-emerald-600',
}

const FILTERS: Array<{ key: InternshipStatus | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'For Deployment' },
    { key: 'ongoing', label: 'On Internship' },
    { key: 'completed', label: 'Completed' },
]

const selectClass =
    'rounded-lg border border-[var(--color-line)] bg-white/80 px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]'

const listVariants: Variants = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.045, delayChildren: 0.05 },
    },
}

const rowVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
    },
    exit: { opacity: 0, y: -6, transition: { duration: 0.14 } },
}

function fullNameOf(student: StudentListItem) {
    return [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')
}

function initialsOf(student: StudentListItem) {
    return [student.first_name, student.last_name]
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

const toArray = (value: any): any[] => (Array.isArray(value) ? value : value?.data ?? [])

const StudentsPage = () => {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [page, setPage] = useState(1)
    const [query, setQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<InternshipStatus | 'all'>('all')
    const [companyFilter, setCompanyFilter] = useState<string>('all')
    const [departmentFilter, setDepartmentFilter] = useState<string>('all')
    // null = not initialised yet (waiting for school years to load)
    const [schoolYearFilter, setSchoolYearFilter] = useState<string | null>(null)
    const schoolYearValue = schoolYearFilter ?? 'all'

    // Debounce the search box so we don't hit the API on every keystroke
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedQuery(query.trim())
            setPage(1)
        }, 350)
        return () => clearTimeout(t)
    }, [query])

    const { data: schoolYearsData, isError: schoolYearsError } = useSchoolYears()
    const { data: companiesData } = useCompanies()
    const { data: coursesData } = useCourses()

    // Default the school year filter to the current school year, once
    useEffect(() => {
        if (schoolYearFilter !== null) return
        if (schoolYearsError) {
            setSchoolYearFilter('all')
            return
        }
        if (!schoolYearsData) return

        const list = toArray(schoolYearsData)
        const current =
            list.find((sy: any) => sy.is_current || sy.is_active) ??
            [...list].sort((a: any, b: any) => b.id - a.id)[0]

        setSchoolYearFilter(current ? String(current.id) : 'all')
    }, [schoolYearFilter, schoolYearsData, schoolYearsError])

    // All filters are sent to the server; changing any of them refetches.
    const filters = useMemo(
        () => ({
            search: debouncedQuery || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter,
            company_id: companyFilter === 'all' ? undefined : companyFilter,
            course_id: departmentFilter === 'all' ? undefined : departmentFilter,
            school_year_id: schoolYearValue === 'all' ? undefined : schoolYearValue,
        }),
        [debouncedQuery, statusFilter, companyFilter, departmentFilter, schoolYearValue],
    )

    // Wait for the default school year so we don't fetch everything first
    const schoolYearReady = schoolYearFilter !== null
    const {
        data: paginatedData,
        isLoading: studentsLoading,
        isError,
        isFetching,
    } = useStudents(page, filters, { enabled: schoolYearReady })
    const isLoading = studentsLoading || !schoolYearReady

    const students = useMemo(() => {
        if (!paginatedData) return [] as StudentListItem[]
        return toArray(paginatedData) as StudentListItem[]
    }, [paginatedData])

    const totalStudents = paginatedData && 'total' in paginatedData ? paginatedData.total : students.length
    const currentPage = paginatedData && 'current_page' in paginatedData ? paginatedData.current_page : page
    const lastPage = paginatedData && 'last_page' in paginatedData ? paginatedData.last_page : 1

    const companyOptions = useMemo(
        () => [
            { key: 'all', label: 'All companies' },
            ...toArray(companiesData).map((c: any) => ({ key: String(c.id), label: c.name })),
        ],
        [companiesData],
    )

    const departmentOptions = useMemo(
        () => [
            { key: 'all', label: 'All departments' },
            ...toArray(coursesData).map((c: any) => ({ key: String(c.id), label: c.name })),
        ],
        [coursesData],
    )

    const schoolYearOptions = useMemo(
        () => [
            { key: 'all', label: 'All school years' },
            ...toArray(schoolYearsData).map((sy: any) => ({ key: String(sy.id), label: sy.name })),
        ],
        [schoolYearsData],
    )

    // Changing a filter always returns to page 1
    const onFilterChange = <T,>(setter: (v: T) => void) => (value: T) => {
        setter(value)
        setPage(1)
    }

    return (
        <section>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
            >
                <div>
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--color-accent)] uppercase">
                        Directory
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Students</h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {totalStudents} student intern{totalStudents === 1 ? '' : 's'}
                        {schoolYearValue === 'all' && departmentFilter === 'all' && companyFilter === 'all' && statusFilter === 'all' && !debouncedQuery
                            ? ' on record'
                            : ' match your filters'}
                    </p>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="relative max-w-sm flex-1">
                    <Search
                        size={15}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-muted)]"
                    />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        type="text"
                        placeholder="Search name, student no., section..."
                        className="w-full rounded-xl border border-[var(--color-line)] bg-white/80 py-2.5 pr-3 pl-9 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={schoolYearValue}
                        onChange={(event) => onFilterChange(setSchoolYearFilter)(event.target.value)}
                        className={selectClass}
                    >
                        {schoolYearOptions.map((sy) => (
                            <option key={sy.key} value={sy.key}>
                                {sy.label}
                            </option>
                        ))}
                    </select>

                    {user?.role?.name === 'super_admin' && (
                        <select
                            value={departmentFilter}
                            onChange={(event) => onFilterChange(setDepartmentFilter)(event.target.value)}
                            className={selectClass}
                        >
                            {departmentOptions.map((dept) => (
                                <option key={dept.key} value={dept.key}>
                                    {dept.label}
                                </option>
                            ))}
                        </select>
                    )}

                    <select
                        value={companyFilter}
                        onChange={(event) => onFilterChange(setCompanyFilter)(event.target.value)}
                        className={selectClass}
                    >
                        {companyOptions.map((company) => (
                            <option key={company.key} value={company.key}>
                                {company.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            onFilterChange(setStatusFilter)(event.target.value as InternshipStatus | 'all')
                        }
                        className={selectClass}
                    >
                        {FILTERS.map((filter) => (
                            <option key={filter.key} value={filter.key}>
                                {filter.label}
                            </option>
                        ))}
                    </select>
                </div>
            </motion.div>

            <div
                className={[
                    'mt-5 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white/80 shadow-sm transition-opacity',
                    isFetching && !isLoading ? 'opacity-70' : 'opacity-100',
                ].join(' ')}
            >
                <div className="hidden grid-cols-[1.5fr_1.1fr_1.1fr_1.1fr_0.8fr_0.7fr] gap-3 border-b border-[var(--color-line)] px-4 py-2.5 text-[11px] font-semibold tracking-wide text-[var(--color-muted)] uppercase sm:grid">
                    <span>Student</span>
                    <span>Section / S.Y.</span>
                    <span>Company</span>
                    <span>Progress</span>
                    <span>Status</span>
                    <span className="text-right">Action</span>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-14">
                        <Loader2 className="animate-spin text-[var(--color-accent)]" size={22} />
                    </div>
                ) : isError ? (
                    <div className="py-14 text-center text-sm text-red-500">Failed to load students.</div>
                ) : (
                    <motion.div variants={listVariants} initial="hidden" animate="show">
                        <AnimatePresence mode="popLayout">
                            {students.map((student) => {
                                const hoursCompleted = student.hours_completed ?? 0
                                const hoursRequired = student.hours_required ?? 486
                                const status = student.status ?? 'pending'
                                const progress = Math.min(100, Math.round((hoursCompleted / hoursRequired) * 100))
                                const schoolYearName =
                                    student.section?.school_year?.name ?? student.section?.schoolYear?.name

                                return (
                                    <motion.div
                                        key={student.id}
                                        layout
                                        variants={rowVariants}
                                        initial="hidden"
                                        animate="show"
                                        exit="exit"
                                        onClick={() => navigate(`/students/${student.id}`)}
                                        className="grid grid-cols-1 gap-3 border-b border-[var(--color-line)] px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-slate-50 cursor-pointer sm:grid-cols-[1.5fr_1.1fr_1.1fr_1.1fr_0.8fr_0.7fr] sm:items-center"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[11px] font-semibold text-[var(--color-accent)]">
                                                {initialsOf(student)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-[var(--color-ink)]">{fullNameOf(student)}</p>
                                                <p className="truncate text-xs text-[var(--color-muted)]">{student.student_number}</p>
                                            </div>
                                        </div>

                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-[var(--color-ink)] sm:text-sm">
                                                {student.section?.name ?? '—'}
                                            </p>
                                            {schoolYearName && (
                                                <p className="truncate text-[11px] text-[var(--color-muted)]">
                                                    S.Y. {schoolYearName}
                                                </p>
                                            )}
                                        </div>

                                        <span className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--color-muted)] sm:text-sm">
                                            {student.company ? (
                                                <>
                                                    <Building2 size={13} className="shrink-0" />
                                                    <span className="truncate">{student.company.name}</span>
                                                </>
                                            ) : (
                                                <span className="text-[var(--color-muted)]">Not yet placed</span>
                                            )}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-full max-w-[100px] overflow-hidden rounded-full bg-slate-100">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                                    className="h-full rounded-full bg-[var(--color-accent)]"
                                                />
                                            </div>
                                            <span className="shrink-0 text-xs text-[var(--color-muted)]">{progress}%</span>
                                        </div>

                                        <span
                                            className={[
                                                'w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                                                STATUS_STYLE[status],
                                            ].join(' ')}
                                        >
                                            {STATUS_LABEL[status]}
                                        </span>

                                        <div className="flex items-center justify-end">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    navigate(`/students/${student.id}`)
                                                }}
                                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)] shadow-2xs hover:bg-[var(--color-accent-soft)] transition"
                                            >
                                                <Eye size={13} /> View
                                            </button>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </motion.div>
                )}

                <AnimatePresence>
                    {!isLoading && !isError && students.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-14 text-center"
                        >
                            <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                                <Search size={16} />
                            </div>
                            <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">No students found</p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                                Try adjusting your search or filters.
                            </p>
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                {/* Pagination Controls */}
                {lastPage > 1 && (
                    <div className="flex items-center justify-between border-t border-[var(--color-line)] px-4 py-3 bg-white/50">
                        <span className="text-xs text-[var(--color-muted)]">
                            Page {currentPage} of {lastPage}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={currentPage === 1 || isLoading}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                <ChevronLeft size={14} /> Previous
                            </button>
                            <button
                                type="button"
                                disabled={currentPage === lastPage || isLoading}
                                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                                className="flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

export default StudentsPage