import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft,
    Building2,
    Clock,
    FileText,
    Calendar,
    User,
    Mail,
    Phone,
    MapPin,
    AlertCircle,
    Loader2,
    ShieldCheck,
    Briefcase,
    ExternalLink,
    FileCheck
} from 'lucide-react'
import { useStudent } from '@/lib/queries/students'
import type { CompanySchedule, TimeLog, StudentDocument } from '@/types'
function formatTime12Hour(timeStr?: string | null): string {
    if (!timeStr) return '—'
    if (/am|pm/i.test(timeStr)) return timeStr

    const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (match) {
        let hours = parseInt(match[1], 10)
        const minutes = match[2]
        const ampm = hours >= 12 ? 'PM' : 'AM'
        hours = hours % 12 || 12
        return `${hours}:${minutes} ${ampm}`
    }

    try {
        const date = new Date(timeStr.includes('T') ? timeStr : `1970-01-01T${timeStr}`)
        if (!isNaN(date.getTime())) {
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
        }
    } catch {
        // fallback
    }

    return timeStr
}

function formatDateReadable(dateStr?: string | null): string {
    if (!dateStr) return '—'
    try {
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
        }
    } catch {
        // fallback
    }
    return dateStr
}

export function StudentDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { data: student, isLoading, isError } = useStudent(id)
    const [activeTab, setActiveTab] = useState<'overview' | 'company' | 'timelogs' | 'reports'>('overview')

    const fullName = useMemo(() => {
        if (!student) return ''
        return [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')
    }, [student])

    // Calculate total hours rendered from time logs
    const totalMinutes = useMemo(() => {
        if (!student?.time_logs) return 0
        return student.time_logs.reduce((acc, log) => acc + (log.duration_minutes ?? 0), 0)
    }, [student])

    const totalHoursRendered = (totalMinutes / 60).toFixed(1)
    const requiredHours = student?.section?.course?.required_hours ?? 486
    const progressPercent = Math.min(100, Math.round(((totalMinutes / 60) / requiredHours) * 100))

    const assignedCompany = student?.companies?.[0]
    const companySchedules: CompanySchedule[] = assignedCompany?.schedules ?? []
    const timeLogs: TimeLog[] = student?.time_logs ?? []
    const documents: StudentDocument[] = student?.documents ?? []

    if (isLoading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <Loader2 className="animate-spin text-[var(--color-accent)]" size={28} />
            </div>
        )
    }

    if (isError || !student) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center max-w-md">
                    <AlertCircle className="mx-auto text-red-600 mb-2" size={32} />
                    <h2 className="text-lg font-semibold text-red-900">Student Not Found</h2>
                    <p className="text-xs text-red-700 mt-1">Unable to load details for this student record.</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-red-900 border border-red-200 shadow-sm hover:bg-red-100/50"
                    >
                        <ArrowLeft size={14} /> Go Back
                    </button>
                </div>
            </div>
        )
    }

    return (
        <section className="space-y-6 pb-12">
            {/* Header Navigation */}
            <div>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-[var(--shadow-soft)] transition hover:bg-slate-50"
                >
                    <ArrowLeft size={14} /> Back to Directory
                </button>
            </div>

            {/* Profile Overview Card */}
            <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-xl font-bold text-[var(--color-accent)] shadow-inner">
                            {student.first_name[0]}
                            {student.last_name[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-[var(--color-ink)]">{fullName}</h1>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">
                                    {student.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-xs font-medium text-[var(--color-muted)] mt-0.5">
                                Student ID: <span className="font-mono font-semibold text-[var(--color-ink)]">{student.student_number}</span>
                            </p>
                        </div>
                    </div>

                    {/* Section & Course Badges */}
                    <div className="flex flex-wrap gap-2.5">
                        {student.section && (
                            <div className="rounded-xl border border-[var(--color-line)] bg-slate-50 px-3.5 py-2">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">Section</p>
                                <p className="text-xs font-bold text-[var(--color-ink)]">{student.section.name}</p>
                            </div>
                        )}

                        {student.section?.course && (
                            <div className="rounded-xl border border-[var(--color-line)] bg-indigo-50/50 px-3.5 py-2">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-indigo-500">Course</p>
                                <p className="text-xs font-bold text-indigo-900">{student.section.course.code}</p>
                            </div>
                        )}

                        {student.section?.course_major && (
                            <div className="rounded-xl border border-[var(--color-line)] bg-purple-50/50 px-3.5 py-2">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-purple-500">Major</p>
                                <p className="text-xs font-bold text-purple-900">{student.section.course_major.code}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="border-t border-[var(--color-line)] pt-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-[var(--color-ink)]">OJT Hours Rendered</span>
                        <span className="font-bold text-[var(--color-accent)]">
                            {totalHoursRendered} / {requiredHours} hrs ({progressPercent}%)
                        </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-indigo-600"
                        />
                    </div>
                </div>
            </div>

            {/* Tabs Bar */}
            <div className="flex border-b border-[var(--color-line)] gap-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${activeTab === 'overview'
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                        }`}
                >
                    <Building2 size={16} /> Company &amp; Schedule
                </button>
                <button
                    onClick={() => setActiveTab('timelogs')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${activeTab === 'timelogs'
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                        }`}
                >
                    <Clock size={16} /> Time Logs ({timeLogs.length})
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${activeTab === 'reports'
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                        }`}
                >
                    <FileText size={16} /> Weekly Reports &amp; Documents ({documents.length})
                </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {/* TAB 1: Company & Supervisor Schedule */}
                {(activeTab === 'overview' || activeTab === 'company') && (
                    <motion.div
                        key="tab-company"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="grid gap-6 md:grid-cols-2"
                    >
                        {/* Assigned Company Info */}
                        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                        <Building2 size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[var(--color-ink)]">Assigned Company</h3>
                                        <p className="text-xs text-[var(--color-muted)]">Current deployment location</p>
                                    </div>
                                </div>
                                {assignedCompany && (
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 uppercase">
                                        Assigned
                                    </span>
                                )}
                            </div>

                            {assignedCompany ? (
                                <div className="space-y-3.5 pt-2 border-t border-[var(--color-line)]">
                                    <div>
                                        <p className="text-sm font-bold text-[var(--color-ink)]">{assignedCompany.name}</p>
                                    </div>

                                    {assignedCompany.address && (
                                        <div className="flex items-start gap-2.5 text-xs text-[var(--color-muted)]">
                                            <MapPin size={15} className="shrink-0 text-slate-400 mt-0.5" />
                                            <span>{assignedCompany.address}</span>
                                        </div>
                                    )}

                                    {assignedCompany.contact_person && (
                                        <div className="flex items-center gap-2.5 text-xs text-[var(--color-muted)]">
                                            <User size={15} className="shrink-0 text-slate-400" />
                                            <span>Contact: <strong className="text-[var(--color-ink)]">{assignedCompany.contact_person}</strong></span>
                                        </div>
                                    )}

                                    {assignedCompany.contact_email && (
                                        <div className="flex items-center gap-2.5 text-xs text-[var(--color-muted)]">
                                            <Mail size={15} className="shrink-0 text-slate-400" />
                                            <a href={`mailto:${assignedCompany.contact_email}`} className="text-sky-600 hover:underline">
                                                {assignedCompany.contact_email}
                                            </a>
                                        </div>
                                    )}

                                    {assignedCompany.contact_phone && (
                                        <div className="flex items-center gap-2.5 text-xs text-[var(--color-muted)]">
                                            <Phone size={15} className="shrink-0 text-slate-400" />
                                            <span>{assignedCompany.contact_phone}</span>
                                        </div>
                                    )}

                                    {assignedCompany.geofence_enabled && (
                                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50/70 p-2.5 text-xs text-emerald-800 font-medium">
                                            <ShieldCheck size={16} className="text-emerald-600" />
                                            <span>Geofencing Active ({assignedCompany.geofence_radius_meters ?? 100}m radius)</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-8 text-center border-t border-[var(--color-line)]">
                                    <Building2 className="mx-auto text-slate-300 mb-2" size={32} />
                                    <p className="text-sm font-medium text-[var(--color-ink)]">Not Assigned to a Company</p>
                                    <p className="text-xs text-[var(--color-muted)] mt-1">
                                        This student has not yet been placed in an internship company.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Supervisor Created Schedule */}
                        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[var(--color-ink)]">Company Work Schedule</h3>
                                        <p className="text-xs text-[var(--color-muted)]">Created by company supervisor</p>
                                    </div>
                                </div>
                                <Briefcase size={18} className="text-indigo-400" />
                            </div>

                            {companySchedules.length > 0 ? (
                                <div className="space-y-3 pt-2 border-t border-[var(--color-line)]">
                                    {companySchedules.map((schedule) => (
                                        <div key={schedule.id} className="rounded-xl border border-[var(--color-line)] bg-slate-50/70 p-4 space-y-2.5">
                                            <div className="flex items-center justify-between text-xs font-semibold">
                                                <span className="text-indigo-900">Work Shift Schedule</span>
                                                {schedule.start_date && (
                                                    <span className="text-[var(--color-muted)]">Effective: {formatDateReadable(schedule.start_date)}</span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                                                <div className="rounded-lg bg-white p-2 border border-[var(--color-line)]">
                                                    <p className="text-[10px] text-[var(--color-muted)] uppercase">Time In</p>
                                                    <p className="font-bold text-emerald-700 mt-0.5">{formatTime12Hour(schedule.time_in)}</p>
                                                </div>
                                                <div className="rounded-lg bg-white p-2 border border-[var(--color-line)]">
                                                    <p className="text-[10px] text-[var(--color-muted)] uppercase">Lunch Break</p>
                                                    <p className="font-bold text-amber-700 mt-0.5">{formatTime12Hour(schedule.lunch_break)}</p>
                                                </div>
                                                <div className="rounded-lg bg-white p-2 border border-[var(--color-line)]">
                                                    <p className="text-[10px] text-[var(--color-muted)] uppercase">Time Out</p>
                                                    <p className="font-bold text-rose-700 mt-0.5">{formatTime12Hour(schedule.time_out)}</p>
                                                </div>
                                            </div>

                                            {schedule.creator?.user && (
                                                <p className="text-[11px] text-[var(--color-muted)] pt-1">
                                                    Supervisor: <strong className="text-[var(--color-ink)]">{schedule.creator.user.name}</strong>
                                                    {schedule.creator.position_title ? ` (${schedule.creator.position_title})` : ''}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : student.ojt_schedule ? (
                                <div className="space-y-3 pt-2 border-t border-[var(--color-line)]">
                                    <div className="rounded-xl border border-[var(--color-line)] bg-slate-50 p-4 space-y-2">
                                        <p className="text-xs font-semibold text-indigo-900">Standard OJT Target Schedule</p>
                                        <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                                            <span>Hours / Day: <strong className="text-[var(--color-ink)]">{student.ojt_schedule.hours_per_day} hrs</strong></span>
                                            <span>Days / Week: <strong className="text-[var(--color-ink)]">{student.ojt_schedule.days_per_week} days</strong></span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center border-t border-[var(--color-line)]">
                                    <Calendar className="mx-auto text-slate-300 mb-2" size={32} />
                                    <p className="text-sm font-medium text-[var(--color-ink)]">No Schedule Configured</p>
                                    <p className="text-xs text-[var(--color-muted)] mt-1">
                                        The company supervisor has not set a specific shift schedule yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* TAB 2: Time Logs */}
                {activeTab === 'timelogs' && (
                    <motion.div
                        key="tab-timelogs"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-[var(--color-ink)]">Student Time Logs</h3>
                            <span className="text-xs text-[var(--color-muted)] font-medium">
                                Total: {timeLogs.length} entries · {totalHoursRendered} hrs rendered
                            </span>
                        </div>

                        {timeLogs.length > 0 ? (
                            <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="border-b border-[var(--color-line)] bg-slate-50/80 font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3">Session</th>
                                                <th className="px-4 py-3">Time In</th>
                                                <th className="px-4 py-3">Time Out</th>
                                                <th className="px-4 py-3">Duration</th>
                                                <th className="px-4 py-3">Verification</th>
                                                <th className="px-4 py-3">Task / Note</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-line)]">
                                            {timeLogs.map((log) => {
                                                const durationHours = log.duration_minutes
                                                    ? (log.duration_minutes / 60).toFixed(1)
                                                    : 'In Progress'

                                                return (
                                                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                                                        <td className="px-4 py-3 font-semibold text-[var(--color-ink)] capitalize">
                                                            {log.session_period || 'Regular'}
                                                        </td>
                                                        <td className="px-4 py-3 text-[var(--color-muted)]">
                                                            {new Date(log.time_in).toLocaleString([], {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </td>
                                                        <td className="px-4 py-3 text-[var(--color-muted)]">
                                                            {log.time_out ? (
                                                                new Date(log.time_out).toLocaleString([], {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })
                                                            ) : (
                                                                <span className="font-semibold text-amber-600">Active Shift</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-indigo-600">
                                                            {durationHours} {typeof durationHours === 'number' || !isNaN(Number(durationHours)) ? 'hrs' : ''}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 capitalize">
                                                                {log.verification_method || 'Facial Match'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-[var(--color-muted)] max-w-xs truncate">
                                                            {log.task_note || '—'}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-[var(--color-line)] bg-white p-12 text-center shadow-[var(--shadow-soft)]">
                                <Clock className="mx-auto text-slate-300 mb-2" size={32} />
                                <p className="text-sm font-medium text-[var(--color-ink)]">No Time Logs Recorded</p>
                                <p className="text-xs text-[var(--color-muted)] mt-1">
                                    This student has not submitted any time logs yet.
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* TAB 3: Weekly Reports & Documents */}
                {activeTab === 'reports' && (
                    <motion.div
                        key="tab-reports"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-[var(--color-ink)]">Weekly Reports &amp; Submitted Documents</h3>
                            <span className="text-xs text-[var(--color-muted)] font-medium">
                                {documents.length} document{documents.length === 1 ? '' : 's'} on record
                            </span>
                        </div>

                        {documents.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {documents.map((doc) => {
                                    const statusColor =
                                        doc.review_status === 'approved'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : doc.review_status === 'rejected'
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'

                                    return (
                                        <div
                                            key={doc.id}
                                            className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] flex flex-col justify-between space-y-4"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <FileCheck className="text-indigo-600 shrink-0" size={18} />
                                                        <h4 className="text-sm font-bold text-[var(--color-ink)] line-clamp-1">
                                                            {doc.document_type?.name || doc.document_requirement?.title || doc.original_filename}
                                                        </h4>
                                                    </div>
                                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor}`}>
                                                        {doc.review_status}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-[var(--color-muted)] font-mono truncate">
                                                    {doc.original_filename}
                                                </p>

                                                {doc.notes && (
                                                    <p className="text-xs text-[var(--color-muted)] italic line-clamp-2 bg-slate-50 p-2 rounded-lg border border-[var(--color-line)]">
                                                        &ldquo;{doc.notes}&rdquo;
                                                    </p>
                                                )}

                                                {doc.rejection_reason && (
                                                    <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                                                        Reason: {doc.rejection_reason}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-3 text-xs">
                                                <span className="text-[var(--color-muted)]">
                                                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                                </span>

                                                <a
                                                    href={`${import.meta.env.VITE_API_URL}/storage/${doc.file_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:underline"
                                                >
                                                    View File <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-[var(--color-line)] bg-white p-12 text-center shadow-[var(--shadow-soft)]">
                                <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                                <p className="text-sm font-medium text-[var(--color-ink)]">No Reports or Documents Uploaded</p>
                                <p className="text-xs text-[var(--color-muted)] mt-1">
                                    Weekly reports or required documents will appear here once submitted by the student.
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}

export default StudentDetailsPage
