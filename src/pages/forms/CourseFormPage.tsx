import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Hash, UserRound, Stamp } from 'lucide-react'
import { useCourse, useCreateCourse, useUpdateCourse } from '@/lib/queries/courses'
import { useUsers } from '@/lib/queries/users'

export function CourseFormPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEditMode = !!id

    const { data: course, isLoading: isLoadingCourse } = useCourse(id)
    const { data: users, isLoading: isLoadingUsers } = useUsers()

    const deans = users?.filter(user => user?.role?.name === 'dean') || []
    const programHeads = users?.filter(user => user?.role?.name === 'program_head') || []

    const createMutation = useCreateCourse()
    const updateMutation = useUpdateCourse()

    const [form, setForm] = useState({
        code: '',
        name: '',
        required_hours: '',
        dean_user_id: '',
        program_head_id: '',
        is_active: true,
    })

    useEffect(() => {
        if (isEditMode && course) {
            setForm({
                code: course.code || '',
                name: course.name || '',
                required_hours: course.required_hours ? course.required_hours.toString() : '',
                dean_user_id: course.dean_user_id ? course.dean_user_id.toString() : '',
                program_head_id: course.program_head_id ? course.program_head_id.toString() : '',
                is_active: course.is_active ?? true,
            })
        }
    }, [isEditMode, course])

    const set = (patch: any) => setForm((f) => ({ ...f, ...patch }))
    const dean = deans.find((d) => d.id.toString() === form.dean_user_id.toString())
    const programHead = programHeads.find((p) => p.id.toString() === form.program_head_id.toString())
    const canSubmit = form.code.trim() && form.name.trim() && form.required_hours && form.dean_user_id

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return

        const payload = {
            ...form,
            required_hours: Number(form.required_hours),
            program_head_id: form.program_head_id ? Number(form.program_head_id) : null,
        }

        if (isEditMode) {
            updateMutation.mutate({ id: id as string, data: payload }, {
                onSuccess: () => navigate('/courses'),
            })
        } else {
            createMutation.mutate(payload, {
                onSuccess: () => navigate('/courses'),
            })
        }
    }

    if (isLoadingCourse || isLoadingUsers) {
        return <div className="p-8 text-sm text-[var(--color-muted)]">Loading...</div>
    }

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
                        Office of the Registrar
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                        {isEditMode ? 'Edit course record' : 'New course record'}
                    </h2>
                </div>
                <Link
                    to="/courses"
                    className="rounded-xl border border-[var(--color-line)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                    Back to courses
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <form
                    onSubmit={handleSubmit}
                    className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur"
                >
                    <div className="mb-6 flex items-baseline justify-between border-b border-[var(--color-line)] pb-4">
                        <h3 className="text-xl font-semibold tracking-tight">Course details</h3>
                        <span className="font-mono text-xs text-[var(--color-muted)]">FORM OJT-07</span>
                    </div>

                    <div className="space-y-5">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-[var(--color-ink)]">
                                Course code <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-[var(--color-muted)]">unique, e.g. OJT-401</p>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 font-mono text-sm uppercase transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                                placeholder="OJT-401"
                                value={form.code}
                                onChange={(e) => set({ code: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-[var(--color-ink)]">
                                Course name <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-[var(--color-muted)]">e.g. Information Technology Internship</p>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                                placeholder="e.g. Information Technology Internship"
                                value={form.name}
                                onChange={(e) => set({ name: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-[var(--color-ink)]">
                                Required hours <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-[var(--color-muted)]">total OJT hours to complete</p>
                            <div className="relative max-w-[200px]">
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 pr-12 text-sm transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                                    placeholder="486"
                                    value={form.required_hours}
                                    onChange={(e) => set({ required_hours: e.target.value })}
                                />
                                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-[var(--color-muted)] pointer-events-none">
                                    hrs
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-[var(--color-ink)]">
                                Assigned dean <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-[var(--color-muted)]">approves and oversees the program</p>
                            <select
                                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                                value={form.dean_user_id}
                                onChange={(e) => set({ dean_user_id: e.target.value })}
                            >
                                <option value="">Select a dean&hellip;</option>
                                {deans.map((d) => (
                                    <option key={d.id} value={d.id.toString()}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-[var(--color-ink)]">
                                Program Head
                                <span className="ml-1 text-[11px] font-normal text-[var(--color-muted)]">(optional)</span>
                            </label>
                            <p className="text-xs text-[var(--color-muted)]">manages the academic program</p>
                            <select
                                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                                value={form.program_head_id}
                                onChange={(e) => set({ program_head_id: e.target.value })}
                            >
                                <option value="">None</option>
                                {programHeads.map((p) => (
                                    <option key={p.id} value={p.id.toString()}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-[var(--color-ink)]">Status <span className="text-red-500">*</span></label>
                            <p className="text-xs text-[var(--color-muted)]">active or inactive</p>
                            <div className="mt-2 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => set({ is_active: !form.is_active })}
                                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-[var(--color-line)] transition-colors ${form.is_active ? 'bg-[var(--color-accent-soft)]' : 'bg-slate-100'
                                        }`}
                                >
                                    <motion.div
                                        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-black/5"
                                        animate={{ left: form.is_active ? '1.25rem' : '0.125rem' }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                </button>
                                <span className="text-sm text-[var(--color-ink)]">
                                    {form.is_active ? 'Active — open for enrollment' : 'Inactive — hidden from students'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3 border-t border-[var(--color-line)] pt-5">
                        <button
                            type="submit"
                            disabled={!canSubmit || createMutation.isPending || updateMutation.isPending}
                            className="rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                        >
                            {isEditMode ? 'Update course' : 'Create course record'}
                        </button>
                        <Link
                            to="/courses"
                            className="rounded-xl border border-[var(--color-line)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>

                <aside className="h-fit rounded-2xl border border-[var(--color-line)] bg-white/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
                    <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-[var(--color-muted)] uppercase">
                        <span>Course record</span>
                        <AnimatePresence>
                            {form.is_active && (
                                <motion.div
                                    key="stamp"
                                    initial={{ opacity: 0, scale: 1.2, rotate: -10 }}
                                    animate={{ opacity: 1, scale: 1, rotate: -6 }}
                                    exit={{ opacity: 0, scale: 1.1 }}
                                    className="flex items-center gap-1 rounded-full border border-[var(--color-accent)] px-2 py-0.5 text-[var(--color-accent)]"
                                >
                                    <Stamp size={10} strokeWidth={2} /> Active
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="mt-4 font-mono text-sm font-semibold text-[var(--color-accent)]">
                        {form.code ? form.code.toUpperCase() : 'CODE —'}
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-ink)] leading-tight">
                        {form.name || 'Untitled course'}
                    </div>

                    <div className="my-4 border-t border-dashed border-[var(--color-line)]" />

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                            <Clock size={14} className="text-[var(--color-muted)]" />
                            {form.required_hours ? `${form.required_hours} hours required` : 'Hours not set'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                            <UserRound size={14} className="text-[var(--color-muted)]" />
                            {dean ? dean.name : 'No dean assigned'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                            <UserRound size={14} className="text-[var(--color-muted)]" />
                            {programHead ? programHead.name : 'No program head assigned'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                            <Hash size={14} className="text-[var(--color-muted)]" />
                            <span className="font-mono text-xs">{id || 'id — pending'}</span>
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    )
}
