import { AlertCircle, Users2, Clock, Building2 } from 'lucide-react'
import { useSupervisorInterns, useSupervisorProfile } from '@/lib/queries/supervisor'
import { useAuth } from '@/lib/auth'

export function SupervisorInternsPage() {
    const { user } = useAuth()
    const { data: profile } = useSupervisorProfile()
    const { data: interns, isLoading, error } = useSupervisorInterns()

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

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-20 max-w-sm rounded-xl bg-black/5" />
                <div className="h-64 rounded-xl bg-black/5" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">Failed to load interns.</p>
            </div>
        )
    }

    return (
        <section className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold tracking-wide text-[var(--color-accent)] uppercase">Supervisor Portal</p>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">My Interns</h1>
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

            <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                <div className="border-b border-[var(--color-line)] px-6 py-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Users2 size={18} className="text-[var(--color-muted)]" />
                        Assigned Interns
                        <span className="text-sm font-normal text-[var(--color-muted)]">({interns?.length ?? 0})</span>
                    </h2>
                </div>

                {interns && interns.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-[var(--color-muted)]">
                            <thead className="bg-slate-50/50 text-xs uppercase text-[var(--color-muted)]">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Student No.</th>
                                    <th className="px-6 py-3 font-medium">Name</th>
                                    <th className="px-6 py-3 font-medium">Section</th>
                                    <th className="px-6 py-3 font-medium">Hours Rendered</th>
                                    <th className="px-6 py-3 font-medium">Required Hours</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                {interns.map((intern) => {
                                    const pct = intern.required_hours
                                        ? Math.min(100, Math.round((intern.total_hours / intern.required_hours) * 100))
                                        : null
                                    return (
                                        <tr key={intern.id} className="transition-colors hover:bg-slate-50/50">
                                            <td className="whitespace-nowrap px-6 py-4 font-medium">{intern.student_number}</td>
                                            <td className="px-6 py-4">
                                                {intern.last_name}, {intern.first_name} {intern.middle_name ?? ''}
                                            </td>
                                            <td className="px-6 py-4">{intern.section?.name ?? '—'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{intern.total_hours} hrs</span>
                                                    {pct !== null && (
                                                        <div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-[var(--color-accent)]"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{intern.required_hours != null ? `${intern.required_hours} hrs` : '—'}</td>
                                            <td className="px-6 py-4">
                                                {intern.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Inactive</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                        <Clock size={36} className="text-[var(--color-muted)]" />
                        <p className="text-sm text-[var(--color-muted)]">No interns are currently assigned to your company.</p>
                    </div>
                )}
            </div>
        </section>
    )
}
