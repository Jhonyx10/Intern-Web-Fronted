import { useQuery } from '@tanstack/react-query'
import { sectionQueries } from '@/lib/queries/section'
import { useAuth } from '@/lib/auth'
import { Users2, AlertCircle } from 'lucide-react'

export function CoordinatorSectionPage() {
    const { user, token } = useAuth()
    const sectionId = user?.section?.id

    const {
        data: section,
        isLoading,
        error,
    } = useQuery({
        ...sectionQueries.details(sectionId!, token!),
        enabled: Boolean(sectionId && token),
    })

    if (!user || user.role?.name !== 'coordinator') {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <AlertCircle size={48} className="text-[var(--color-muted)]" />
                <div>
                    <h2 className="text-xl font-semibold">Access Denied</h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        You do not have permission to view this page.
                    </p>
                </div>
            </div>
        )
    }

    if (!sectionId) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <Users2 size={48} className="text-[var(--color-muted)]" />
                <div>
                    <h2 className="text-xl font-semibold">No Section Assigned</h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        You are not currently assigned to an active section.
                    </p>
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

    if (error || !section) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                    Failed to load section details.
                </p>
            </div>
        )
    }

    return (
        <section className="space-y-6">
            <header className="flex flex-col gap-1">
                <p className="text-sm font-semibold tracking-wide text-[var(--color-accent)] uppercase">
                    My Section
                </p>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                        {section.name}
                    </h1>
                    {section.code && (
                        <span className="rounded-md bg-[var(--color-line)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)]">
                            {section.code}
                        </span>
                    )}
                </div>
            </header>

            <div className="rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
                <div className="border-b border-[var(--color-line)] px-6 py-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Users2 size={18} className="text-[var(--color-muted)]" />
                        Enrolled Students <span className="text-sm font-normal text-[var(--color-muted)]">({section.students?.length || 0})</span>
                    </h2>
                </div>

                {section.students && section.students.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-[var(--color-muted)]">
                            <thead className="bg-slate-50/50 text-xs uppercase text-[var(--color-muted)]">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Student No.</th>
                                    <th className="px-6 py-3 font-medium">Name</th>
                                    <th className="px-6 py-3 font-medium">Assigned Company</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                {section.students.map((student) => (
                                    <tr key={student.id} className="transition-colors hover:bg-slate-50/50">
                                        <td className="whitespace-nowrap px-6 py-4 font-medium">
                                            {student.student_number}
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.last_name}, {student.first_name} {student.middle_name || ''}
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.companies && student.companies.length > 0 ? (
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {student.companies.map((c) => (
                                                        <span key={c.id} className="inline-flex items-center rounded-md bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-medium text-[var(--color-accent)] ring-1 ring-inset ring-[var(--color-accent)]/20">
                                                            {c.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[var(--color-muted)] text-sm italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-sm text-[var(--color-muted)]">
                        No students are currently enrolled in this section.
                    </div>
                )}
            </div>
        </section>
    )
}
