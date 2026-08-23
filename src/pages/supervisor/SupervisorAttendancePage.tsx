import { useState } from 'react'
import { AlertCircle, Calendar, Clock, Plus, Pencil, Trash2, Search, Building2 } from 'lucide-react'
import {
    useSupervisorAttendance,
    useSupervisorSchedules,
    useSupervisorProfile,
    useCreateSupervisorSchedule,
    useUpdateSupervisorSchedule,
    useDeleteSupervisorSchedule,
    type CompanyScheduleData,
    type ScheduleInput
} from '@/lib/queries/supervisor'
import { useAuth } from '@/lib/auth'
import AddEditScheduleModal from '@/components/modal/AddEditScheduleModal'

function fmtTime(isoOrTime: string | null) {
    if (!isoOrTime) return '—'
    if (isoOrTime.includes('T')) {
        return new Date(isoOrTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    // If e.g. "08:00:00"
    const [h, m] = isoOrTime.split(':')
    if (h !== undefined && m !== undefined) {
        const hour = parseInt(h, 10)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const formattedHour = hour % 12 || 12
        return `${formattedHour}:${m} ${ampm}`
    }
    return isoOrTime
}

function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDuration(minutes: number | null) {
    if (minutes == null) return '—'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function SupervisorAttendancePage() {
    const { user } = useAuth()
    const { data: profile } = useSupervisorProfile()
    const { data: logs, isLoading: isLoadingLogs, error: errorLogs } = useSupervisorAttendance()
    const { data: schedules, isLoading: isLoadingSchedules, error: errorSchedules } = useSupervisorSchedules()

    const { mutate: createSchedule, isPending: isCreating } = useCreateSupervisorSchedule()
    const { mutate: updateSchedule, isPending: isUpdating } = useUpdateSupervisorSchedule()
    const { mutate: deleteSchedule, isPending: isDeleting } = useDeleteSupervisorSchedule()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState<CompanyScheduleData | null>(null)
    const [search, setSearch] = useState('')

    if (!user || user.role?.name !== 'supervisor') {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <AlertCircle size={48} className="text-[var(--color-muted)]" />
                <div>
                    <h2 className="text-xl font-semibold">Access Denied</h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">You do not have permission to view this page.</p>
                </div>
            </div>
        )
    }

    if (isLoadingLogs || isLoadingSchedules) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-20 max-w-sm rounded-xl bg-black/5" />
                <div className="h-48 rounded-xl bg-black/5" />
                <div className="h-64 rounded-xl bg-black/5" />
            </div>
        )
    }

    if (errorLogs || errorSchedules) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">Failed to load attendance or schedule records.</p>
            </div>
        )
    }

    const filtered = (logs ?? []).filter(
        (l) =>
            l.student_name.toLowerCase().includes(search.toLowerCase()) ||
            (l.student_number ?? '').includes(search)
    )

    function handleSaveSchedule(input: ScheduleInput) {
        if (editingSchedule) {
            updateSchedule(
                { id: editingSchedule.id, input },
                {
                    onSuccess: () => {
                        setIsModalOpen(false)
                        setEditingSchedule(null)
                    },
                }
            )
        } else {
            createSchedule(input, {
                onSuccess: () => {
                    setIsModalOpen(false)
                },
            })
        }
    }

    function handleDelete(id: number) {
        if (confirm('Are you sure you want to delete this schedule?')) {
            deleteSchedule(id)
        }
    }

    return (
        <section className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold tracking-wide text-[var(--color-accent)] uppercase">Supervisor Portal</p>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">Attendance & Work Schedule</h1>
                </div>

                {profile?.company && (
                    <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] w-fit">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                            <Building2 size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">Company</p>
                            <p className="text-sm font-bold text-[var(--color-ink)]">{profile.company.name}</p>
                        </div>
                    </div>
                )}
            </header>

            {/* Company Schedule Section */}
            <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Calendar size={18} className="text-[var(--color-muted)]" />
                            Work Schedule
                            <span className="text-sm font-normal text-[var(--color-muted)]">({schedules?.length ?? 0})</span>
                        </h2>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">Company working hours and break schedules for interns.</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingSchedule(null)
                            setIsModalOpen(true)
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] shadow-sm"
                    >
                        <Plus size={16} /> Add Schedule
                    </button>
                </div>

                {schedules && schedules.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-[var(--color-muted)]">
                            <thead className="bg-slate-50/50 text-xs uppercase text-[var(--color-muted)]">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Start Date</th>
                                    <th className="px-6 py-3 font-medium">Time In</th>
                                    <th className="px-6 py-3 font-medium">Lunch Break</th>
                                    <th className="px-6 py-3 font-medium">Time Out</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                {schedules.map((sch) => (
                                    <tr key={sch.id} className="transition-colors hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-medium whitespace-nowrap">{fmtDate(sch.start_date)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{fmtTime(sch.time_in)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {sch.lunch_break ? (
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                                    {sch.lunch_break}
                                                </span>
                                            ) : (
                                                <span className="italic text-[var(--color-muted)]">None</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{fmtTime(sch.time_out)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingSchedule(sch)
                                                        setIsModalOpen(true)
                                                    }}
                                                    className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-slate-100 hover:text-[var(--color-ink)] transition"
                                                    title="Edit Schedule"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(sch.id)}
                                                    disabled={isDeleting}
                                                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                                                    title="Delete Schedule"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                        <Calendar size={32} className="text-[var(--color-muted)]" />
                        <p className="text-sm text-[var(--color-muted)]">No company schedule has been created yet.</p>
                    </div>
                )}
            </div>

            {/* Attendance / Time Logs Section */}
            <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-6 py-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Clock size={18} className="text-[var(--color-muted)]" />
                        Attendance Time Logs
                        <span className="text-sm font-normal text-[var(--color-muted)]">({filtered.length})</span>
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={14} />
                        <input
                            type="text"
                            placeholder="Search intern..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-xl border border-[var(--color-line)] py-2 pl-8 pr-3 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                        />
                    </div>
                </div>

                {filtered.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-[var(--color-muted)]">
                            <thead className="bg-slate-50/50 text-xs uppercase text-[var(--color-muted)]">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Student</th>
                                    <th className="px-6 py-3 font-medium">Date</th>
                                    <th className="px-6 py-3 font-medium">Time In</th>
                                    <th className="px-6 py-3 font-medium">Time Out</th>
                                    <th className="px-6 py-3 font-medium">Duration</th>
                                    <th className="px-6 py-3 font-medium">Task Note</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                {filtered.map((log) => (
                                    <tr key={log.id} className="transition-colors hover:bg-slate-50/50">
                                        <td className="px-6 py-4">
                                            <p className="font-medium">{log.student_name}</p>
                                            <p className="text-xs text-[var(--color-muted)]">{log.student_number}</p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{fmtDate(log.time_in)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{fmtTime(log.time_in)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.time_out ? fmtTime(log.time_out) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                                    In Progress
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{fmtDuration(log.duration_minutes)}</td>
                                        <td className="max-w-[200px] truncate px-6 py-4 text-[var(--color-muted)]">
                                            {log.task_note ?? <span className="italic">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                        <Clock size={36} className="text-[var(--color-muted)]" />
                        <p className="text-sm text-[var(--color-muted)]">No attendance records found.</p>
                    </div>
                )}
            </div>

            <AddEditScheduleModal
                open={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingSchedule(null)
                }}
                isLoading={isCreating || isUpdating}
                scheduleToEdit={editingSchedule}
                onSubmit={handleSaveSchedule}
            />
        </section>
    )
}
