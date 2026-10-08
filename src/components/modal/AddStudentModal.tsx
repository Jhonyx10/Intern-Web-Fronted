import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X, UserPlus, FileSpreadsheet, UploadCloud, Trash2, Download } from 'lucide-react'
import { useImportStudents, useDownloadTemplate } from '@/lib/queries/students'
import { useToast } from '@/components/Toaster'

type AddMode = 'single' | 'excel'

type NewStudent = {
  first_name: string
  middle_name: string | null
  last_name: string
  student_number: string
  section: string
  email?: string | null
  contact_number?: string | null
  gender?: 'Male' | 'Female' | null
}

type ParsedRow = NewStudent & { rowIndex: number; error?: string }

type AddStudentModalProps = {
  open: boolean
  sectionId: number | string
  onClose: () => void
  onAddSingle: (student: NewStudent) => void
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.98,
    transition: { duration: 0.16 },
  },
}

function splitName(raw: string): { first: string; middle: string | null; last: string } | null {
  const comma = raw.indexOf(',')
  if (comma === -1) return null
  const last = raw.slice(0, comma).trim()
  const parts = raw.slice(comma + 1).trim().split(/\s+/).filter(Boolean)
  if (!last || parts.length === 0) return null
  let middle: string | null = null
  if (parts.length > 1 && /^\p{Lu}\.?$/u.test(parts[parts.length - 1])) {
    middle = parts.pop() ?? null
  }
  return { first: parts.join(' '), middle, last }
}

function parseRows(json: Record<string, unknown>[], sectionId: number | string): ParsedRow[] {
  const seenNumbers = new Set<string>()
  const seenEmails = new Set<string>()

  return json.map((row, index) => {
    const cell = (...keys: string[]) => {
      for (const k of keys) {
        const v = row[k]
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
      }
      return ''
    }

    const student_number = cell('ID Number', 'Student Number', 'student_number', 'Student ID', 'ID')
    const email = cell('Email', 'email').toLowerCase()
    let contact = cell('Contact Number', 'contact_number')
    if (/^9\d{9}$/.test(contact)) contact = '0' + contact
    const genderRaw = cell('Gender', 'gender')
    const gender = genderRaw
      ? ((genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1).toLowerCase()) as 'Male' | 'Female')
      : null

    let first = cell('First Name', 'first_name')
    let middle: string | null = cell('Middle Name', 'middle_name') || null
    let last = cell('Last Name', 'last_name')
    let nameInvalid = false

    if (!first && !last) {
      const parsed = splitName(cell('Name', 'name'))
      if (parsed) {
        first = parsed.first
        middle = parsed.middle
        last = parsed.last
      } else {
        nameInvalid = true
      }
    }

    let error: string | undefined
    if (nameInvalid) error = 'Name must be "Last Name, First Name M."'
    else if (!first || !last) error = 'Missing name details'
    else if (!student_number) error = 'Missing ID number'
    else if (!email) error = 'Missing email'
    else if (!/^\S+@\S+\.\S+$/.test(email)) error = 'Invalid email'
    else if (gender && gender !== 'Male' && gender !== 'Female') error = 'Gender must be Male or Female'
    else if (seenNumbers.has(student_number)) error = 'Duplicate ID number in file'
    else if (seenEmails.has(email)) error = 'Duplicate email in file'

    if (!error) {
      seenNumbers.add(student_number)
      seenEmails.add(email)
    }

    return {
      first_name: first,
      middle_name: middle,
      last_name: last,
      student_number,
      email,
      contact_number: contact || null,
      gender,
      section: String(sectionId),
      rowIndex: index + 2,
      error,
    }
  })
}

export function AddStudentModal({ open, sectionId, onClose, onAddSingle }: AddStudentModalProps) {
  const { addToast } = useToast()
  const [mode, setMode] = useState<AddMode>('single')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [email, setEmail] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [gender, setGender] = useState('')

  const [fileName, setFileName] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importMutation = useImportStudents()
  const downloadTemplateMutation = useDownloadTemplate()

  async function handleDownloadTemplate() {
    try {
      await downloadTemplateMutation.mutateAsync()
      addToast('success', 'Template downloaded successfully.')
    } catch {
      addToast('error', 'Failed to download template.')
    }
  }

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setMode('single')
      setFirstName('')
      setMiddleName('')
      setLastName('')
      setStudentNumber('')
      setEmail('')
      setContactNumber('')
      setGender('')
      setFileName(null)
      setSelectedFile(null)
      setRows([])
      setParseError(null)
      setIsDragging(false)
      importMutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleFile(file: File) {
    setParseError(null)
    importMutation.reset() // clear any previous import result when a new file is picked
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setParseError('Please upload a .xlsx, .xls, or .csv file.')
      return
    }

    try {
      // requires `xlsx` (SheetJS) — npm install xlsx
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet)

      if (json.length === 0) {
        setParseError('That file has no rows to import.')
        return
      }

      setFileName(file.name)
      setSelectedFile(file)
      setRows(parseRows(json, sectionId))
    } catch {
      setParseError('Could not read that file. Check the format and try again.')
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  function clearFile() {
    setFileName(null)
    setSelectedFile(null)
    setRows([])
    importMutation.reset()
  }

  const validRows = rows.filter((row) => !row.error)
  const invalidRows = rows.filter((row) => row.error)

  function submitSingle(event: React.FormEvent) {
    event.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !studentNumber.trim()) return
    onAddSingle({
      first_name: firstName.trim(),
      middle_name: middleName.trim() || null,
      last_name: lastName.trim(),
      student_number: studentNumber.trim(),
      section: String(sectionId),
      email: email.trim() || null,
      contact_number: contactNumber.trim() || null,
      gender: (gender || null) as 'Male' | 'Female' | null,
    })
    onClose()
  }

  function submitImport() {
    if (!selectedFile || validRows.length === 0) return
    importMutation.mutate(
      { sectionId, file: selectedFile },
      {
        onSuccess: (result) => {
          if (result.failures.length === 0) {
            addToast('success', `${result.imported} student${result.imported === 1 ? '' : 's'} imported`)
            onClose()
          } else {
            addToast('info', `${result.imported} imported, ${result.failures.length} failed`)
          }
        },
        onError: (error) => {
          addToast('error', 'Import failed', error instanceof Error ? error.message : undefined)
        },
      }
    )
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        >
          <motion.div
            variants={panelVariants}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Add student"
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-ink)]">Add Student</h2>
                <p className="text-xs text-[var(--color-muted)]">Add one intern, or import a batch from Excel.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative mx-5 mt-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
              {(['single', 'excel'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={[
                    'relative z-10 flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-colors',
                    mode === value ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]',
                  ].join(' ')}
                >
                  {value === 'single' ? <UserPlus size={14} /> : <FileSpreadsheet size={14} />}
                  {value === 'single' ? 'Single Entry' : 'Import Excel'}
                </button>
              ))}
              <motion.span
                layout
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm"
                style={{ left: mode === 'single' ? 4 : '50%' }}
              />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <AnimatePresence mode="wait">
                {mode === 'single' ? (
                  <motion.form
                    key="single"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={submitSingle}
                    className="flex flex-col gap-3.5"
                  >
                    <div className="grid grid-cols-2 gap-3.5">
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-medium text-[var(--color-ink)]">First Name</span>
                        <input
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          placeholder="e.g. Kyla"
                          required
                          className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                        />
                      </label>

                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-medium text-[var(--color-ink)]">Last Name</span>
                        <input
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          placeholder="e.g. Mendoza"
                          required
                          className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                        />
                      </label>
                    </div>

                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium text-[var(--color-ink)]">Middle Name <span className="text-[var(--color-muted)] font-normal">(Optional)</span></span>
                      <input
                        value={middleName}
                        onChange={(event) => setMiddleName(event.target.value)}
                        placeholder="e.g. Santos"
                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium text-[var(--color-ink)]">Student Number</span>
                      <input
                        value={studentNumber}
                        onChange={(event) => setStudentNumber(event.target.value)}
                        placeholder="e.g. 21-0143"
                        required
                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium text-[var(--color-ink)]">Email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="e.g. kyla@gmail.com"
                        required
                        className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3.5">
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-medium text-[var(--color-ink)]">
                          Contact Number <span className="text-[var(--color-muted)] font-normal">(Optional)</span>
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={contactNumber}
                          onChange={(event) => setContactNumber(event.target.value)}
                          placeholder="e.g. 09123456789"
                          maxLength={20}
                          className="rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                        />
                      </label>

                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-medium text-[var(--color-ink)]">
                          Gender <span className="text-[var(--color-muted)] font-normal">(Optional)</span>
                        </span>
                        <select
                          value={gender}
                          onChange={(event) => setGender(event.target.value)}
                          className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                        >
                          <option value="">Select…</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="mt-2 rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                    >
                      Add Student
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="excel"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-3.5"
                  >
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      disabled={downloadTemplateMutation.isPending}
                      className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50"
                    >
                      <Download size={13} /> {downloadTemplateMutation.isPending ? 'Preparing…' : 'Download import template'}
                    </button>
                    <div
                      onDragOver={(event) => {
                        event.preventDefault()
                        setIsDragging(true)
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={[
                        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
                        isDragging
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                          : 'border-[var(--color-line)] hover:border-[var(--color-accent)]/50',
                      ].join(' ')}
                    >
                      <UploadCloud size={20} className="text-[var(--color-accent)]" />
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        {fileName ?? 'Drop your file here, or click to browse'}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">.xlsx, .xls, or .csv</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) void handleFile(file)
                        }}
                      />
                    </div>

                    {parseError ? <p className="text-xs text-red-500">{parseError}</p> : null}

                    <AnimatePresence>
                      {rows.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--color-muted)]">
                              <span className="font-medium text-[var(--color-ink)]">{validRows.length}</span> ready to
                              import
                              {invalidRows.length > 0 ? (
                                <span className="text-red-500"> · {invalidRows.length} with errors</span>
                              ) : null}
                            </span>
                            <button
                              type="button"
                              onClick={clearFile}
                              className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-red-500"
                            >
                              <Trash2 size={12} /> Clear
                            </button>
                          </div>

                          <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[var(--color-line)]">
                            {rows.map((row) => (
                              <div
                                key={row.rowIndex}
                                className={[
                                  'flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2 text-xs last:border-b-0',
                                  row.error ? 'bg-red-50/60' : '',
                                ].join(' ')}
                              >
                                <span className="min-w-0 truncate text-[var(--color-ink)]">
                                  {row.first_name ? `${row.first_name} ${row.last_name}` : `Row ${row.rowIndex}`}
                                </span>
                                <span className={row.error ? 'text-red-500' : 'text-[var(--color-muted)]'}>
                                  {row.error ?? `${row.student_number} · ${row.email}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    {importMutation.isError ? (
                      <p className="text-xs text-red-500">{importMutation.error.message}</p>
                    ) : null}

                    <AnimatePresence>
                      {importMutation.isSuccess ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden rounded-xl border border-[var(--color-line)] p-3 text-xs"
                        >
                          <p className="font-medium text-[var(--color-ink)]">
                            {importMutation.data.imported} student{importMutation.data.imported === 1 ? '' : 's'} imported
                          </p>
                          {importMutation.data.failures.length > 0 ? (
                            <ul className="mt-1.5 space-y-1 text-red-500">
                              {importMutation.data.failures.map((failure, i) => (
                                <li key={i}>
                                  Row {failure.row}: {failure.errors.join(', ')}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={submitImport}
                      disabled={validRows.length === 0 || importMutation.isPending}
                      className="mt-1 rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {importMutation.isPending
                        ? 'Importing…'
                        : `Import ${validRows.length > 0 ? validRows.length : ''} Student${validRows.length === 1 ? '' : 's'}`}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}