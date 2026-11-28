import { useState } from 'react'
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useImportAttendance } from '@/lib/queries/attendance'

// Keep in step with the server: MAX_FILES and PHP's default post_max_size (8M)
const MAX_FILES = 20
const MAX_TOTAL_BYTES = 7.5 * 1024 * 1024

const STATUS = {
    new: { label: 'New', style: 'bg-green-100 text-green-800' },
    replace: { label: 'Will replace', style: 'bg-amber-100 text-amber-800' },
    unchanged: { label: 'Unchanged', style: 'bg-slate-100 text-slate-600' },
    protected: { label: 'Protected', style: 'bg-red-100 text-red-800' },
} as const

// "2026-11-02 08:00" -> "08:00"
const timeOf = (v: string | null) => v?.slice(11) ?? '—'

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

export default function ImportAttendanceModal({
    open,
    token,
    onImported,
    onClose,
}: {
    open: boolean
    token?: string | null
    /** Called after a successful import with the span of imported dates (YYYY-MM-DD) */
    onImported?: (range: { from: string; to: string }) => void
    onClose: () => void
}) {
    const { preview, commit } = useImportAttendance(token)
    const [files, setFiles] = useState<File[]>([])
    const [limitError, setLimitError] = useState<string | null>(null)
    const [saved, setSaved] = useState<number | null>(null)
    // Holds the token that was ticked, so a new preview with different replacements unticks the box
    const [confirmedToken, setConfirmedToken] = useState('')

    const result = preview.data ?? null
    const failure = limitError ?? (preview.isError
        ? errorMessage(preview.error, 'Could not read the files.')
        : commit.isError
            ? errorMessage(commit.error, 'Import failed. Nothing was saved.')
            : null)

    const reset = () => {
        setFiles([])
        setLimitError(null)
        setSaved(null)
        setConfirmedToken('')
        preview.reset()
        commit.reset()
    }
    const close = () => {
        reset()
        onClose()
    }

    if (!open) return null

    // Any change to the list re-checks all files together (catches duplicates across files)
    const check = (next: File[]) => {
        setFiles(next)
        setLimitError(null)
        setConfirmedToken('')
        preview.reset()
        commit.reset()
        if (next.length) preview.mutate(next)
    }

    const addFiles = (picked: File[]) => {
        if (!picked.length) return
        // Picking a file with the same name replaces it, e.g. after fixing its rows
        const names = new Set(picked.map((f) => f.name))
        const next = [...files.filter((f) => !names.has(f.name)), ...picked]

        if (next.length > MAX_FILES) {
            setLimitError(`You can import up to ${MAX_FILES} files at a time.`)
            return
        }
        if (next.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) {
            setLimitError('These files are too large to upload together. Import them in smaller batches.')
            return
        }
        check(next)
    }

    const removeFile = (name: string) => check(files.filter((f) => f.name !== name))

    const countOf = (status: keyof typeof STATUS) => result?.rows.filter((r) => r.status === status).length ?? 0
    const replaceCount = countOf('replace')
    const writeCount = countOf('new') + replaceCount
    const confirmed = replaceCount === 0 || confirmedToken === result?.replace_token

    const canSave = files.length > 0 && !!result && result.errors.length === 0 && writeCount > 0 && confirmed && saved === null

    const save = () =>
        commit.mutate(
            { files, replaceToken: replaceCount > 0 ? confirmedToken : undefined },
            {
                onSuccess: (d) => {
                    setSaved(d.saved)
                    onImported?.({ from: d.date_from, to: d.date_to })
                },
                // Saved logs may have changed, so check again and ask for confirmation again
                onError: () => {
                    setConfirmedToken('')
                    preview.mutate(files)
                },
            },
        )


    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-[var(--color-ink)]">Import attendance</h2>

                    </div>
                    <button type="button" onClick={close} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4 overflow-y-auto p-5">
                    <p className="text-sm text-[var(--color-muted)]">
                        Upload one or more completed DTR CSVs, either the DTR template (fill in <b>Student Number</b> and <b>Period</b>, e.g.
                        November 2026) or a file with <b>student_number, date, time_in, time_out</b> columns. Students are matched by student
                        number. Attendance recorded in the app is never overwritten. Replacing an earlier import needs your confirmation.
                    </p>

                    {saved === null && (
                        <label className={`flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-line)] px-4 py-4 text-sm ${commit.isPending ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-[var(--color-accent)]'}`}>
                            <Upload size={18} className="text-[var(--color-muted)]" />
                            <span className="font-medium text-[var(--color-ink)]">{files.length ? 'Add more CSV files' : 'Choose CSV files'}</span>
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                multiple
                                disabled={commit.isPending}
                                className="sr-only"
                                onChange={(e) => {
                                    addFiles(Array.from(e.target.files ?? []))
                                    e.target.value = '' // lets the same file be picked again
                                }}
                            />
                        </label>
                    )}

                    {files.length > 0 && (
                        <ul className="max-h-32 space-y-1 overflow-y-auto">
                            {files.map((f) => (
                                <li key={f.name} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                                    <span className="truncate text-[var(--color-ink)]">{f.name}</span>
                                    {saved === null && (
                                        <button
                                            type="button"
                                            onClick={() => removeFile(f.name)}
                                            disabled={commit.isPending}
                                            aria-label={`Remove ${f.name}`}
                                            className="rounded p-1 hover:bg-slate-200 disabled:opacity-50"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {preview.isPending && <p className="text-sm text-[var(--color-muted)]">Checking {files.length === 1 ? 'file' : 'files'}…</p>}
                    {failure && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{failure}</p>}

                    {saved !== null && (
                        <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                            <CheckCircle2 size={16} /> {saved} attendance record{saved === 1 ? '' : 's'} imported.
                            {commit.data &&
                                ` Replaced: ${commit.data.replaced}. Skipped: ${commit.data.unchanged} unchanged, ${commit.data.protected} protected.`}
                        </p>
                    )}

                    {result && saved === null && (
                        <>
                            <p className="text-sm font-medium text-[var(--color-ink)]">
                                {writeCount} of {result.total} row{result.total === 1 ? '' : 's'} ready to import
                                {result.errors.length > 0 && `, ${result.errors.length} with errors`}
                            </p>

                            {result.rows.length > 0 && (
                                <div className="flex flex-wrap gap-2 text-xs font-medium">
                                    {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((key) => (
                                        <span key={key} className={`rounded-full px-2.5 py-1 ${STATUS[key].style}`}>
                                            {STATUS[key].label}: {countOf(key)}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {replaceCount > 0 && (
                                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={confirmed}
                                        disabled={commit.isPending}
                                        onChange={(e) => setConfirmedToken(e.target.checked ? result.replace_token : '')}
                                    />
                                    <span>
                                        I checked the rows marked <b>Will replace</b>. Overwrite {replaceCount} earlier imported log
                                        {replaceCount === 1 ? '' : 's'}. The old values can’t be restored from here.
                                    </span>
                                </label>
                            )}

                            {result.rows.length > 0 && writeCount === 0 && (
                                <p className="text-sm text-[var(--color-muted)]">Nothing to import. Every valid row is unchanged or protected.</p>
                            )}

                            {result.errors.length > 0 && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800">
                                        <AlertCircle size={15} /> Fix these rows, then choose the corrected file again
                                    </p>
                                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-red-800">
                                        {result.errors.map((e, i) => (
                                            <li key={i}>
                                                {e.file}, row {e.row}: {e.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.rows.length > 0 && (
                                <div className="max-h-64 overflow-auto rounded-xl border border-[var(--color-line)]">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 bg-slate-50 text-[var(--color-muted)]">
                                            <tr>
                                                {['Status', 'Student no.', 'Student', 'Company', 'Date', 'In', 'Break', 'Out', 'Task'].map((h) => (
                                                    <th key={h} className="px-3 py-2 font-semibold">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-line)]">
                                            {result.rows.map((r) => (
                                                <tr key={`${r.file}-${r.row}`} title={`${r.file}, row ${r.row}`}>
                                                    <td className="min-w-[170px] px-3 py-2 align-top">
                                                        <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 font-semibold ${STATUS[r.status].style}`}>
                                                            {STATUS[r.status].label}
                                                        </span>
                                                        {r.reason && <span className="mt-1 block text-[var(--color-muted)]">{r.reason}</span>}
                                                        {r.existing && (r.status === 'replace' || r.status === 'protected') && (
                                                            <span className="mt-1 block text-[var(--color-muted)]">
                                                                Saved: {timeOf(r.existing.time_in)}–{timeOf(r.existing.time_out)}, break{' '}
                                                                {timeOf(r.existing.break_out)}–{timeOf(r.existing.break_in)}
                                                                {r.status === 'replace' && r.task_note !== null && r.task_note !== r.existing.task_note && (
                                                                    <span className="block">Note: {r.existing.task_note ?? '(none)'}</span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-2">{r.student_number}</td>
                                                    <td className="px-3 py-2">{r.student_name}</td>
                                                    <td className="px-3 py-2">{r.company_name}</td>
                                                    <td className="px-3 py-2">{r.date}</td>
                                                    <td className="px-3 py-2">{r.time_in}</td>
                                                    <td className="px-3 py-2">{r.break_out && r.break_in ? `${r.break_out}–${r.break_in}` : '—'}</td>
                                                    <td className="px-3 py-2">{r.time_out}</td>
                                                    <td className="max-w-[200px] truncate px-3 py-2" title={r.task_note ?? ''}>
                                                        {r.task_note ?? '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-[var(--color-line)] px-5 py-3">
                    <button type="button" onClick={close} className="h-10 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold hover:bg-slate-50">
                        {saved !== null ? 'Done' : 'Cancel'}
                    </button>
                    {saved === null && (
                        <button
                            type="button"
                            disabled={!canSave || commit.isPending}
                            onClick={save}
                            className="h-10 rounded-xl bg-[var(--color-accent)] px-4 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                        >
                            {commit.isPending ? 'Importing…' : `Import ${writeCount} record${writeCount === 1 ? '' : 's'}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}