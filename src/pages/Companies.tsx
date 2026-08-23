import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Search,
    Building2,
    CheckCircle2,
    XCircle,
    Clock,
    MapPin,
    Phone,
    Mail,
    User,
    X,
    Check,
    Ban,
    AlertTriangle,
    Filter,
} from 'lucide-react'
import {
    useCompanies,
    usePendingCompanies,
    useApproveCompany,
    useRejectCompany,
} from '@/lib/queries/companies'
import type { Company } from '@/types'

// ─── animation variants ────────────────────────────────────────────────────────
const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
const row = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
    company,
    action,
    onClose,
    onConfirm,
    isPending,
}: {
    company: Company
    action: 'approve' | 'reject'
    onClose: () => void
    onConfirm: () => void
    isPending: boolean
}) {
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    const isApprove = action === 'approve'

    return (
        <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/30 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-sm rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)]"
            >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${isApprove ? 'bg-[var(--color-accent-soft)]' : 'bg-red-50'}`}>
                    {isApprove
                        ? <Check size={20} className="text-[var(--color-accent)]" />
                        : <Ban size={20} className="text-red-500" />
                    }
                </div>
                <h2 className="text-base font-semibold">
                    {isApprove ? 'Approve company?' : 'Reject company?'}
                </h2>
                <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                    <strong className="font-medium text-[var(--color-ink)]">{company.name}</strong>
                    {isApprove
                        ? ' will become visible to coordinators and students.'
                        : ' will be marked as rejected and hidden from the system.'}
                </p>
                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isPending}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${isApprove
                            ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]'
                            : 'bg-red-500 hover:bg-red-600'
                            }`}
                    >
                        {isPending && (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        )}
                        {isApprove ? 'Approve' : 'Reject'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ─── Company Card ──────────────────────────────────────────────────────────────

function CompanyCard({
    company,
    onApprove,
    onReject,
}: {
    company: Company
    onApprove?: (c: Company) => void
    onReject?: (c: Company) => void
}) {
    const navigate = useNavigate()
    const isPending = company.is_approved === false && company.is_active !== false
    const isApproved = company.is_approved === true
    const isRejected = company.is_active === false

    return (
        <motion.article
            variants={row}
            layout
            onClick={() => navigate(`/companies/${company.id}`)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur transition hover:border-[var(--color-accent)]/40 hover:shadow-md"
        >
            {/* Status stripe */}
            <div
                className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl transition-all ${isApproved
                    ? 'bg-[var(--color-accent)]'
                    : isRejected
                        ? 'bg-red-400'
                        : 'bg-amber-400'
                    }`}
            />

            <div className="pl-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">
                                {company.name}
                            </h3>
                            <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${isApproved
                                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                                    : isRejected
                                        ? 'bg-red-50 text-red-600'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}
                            >
                                {isApproved
                                    ? <><CheckCircle2 size={9} /> Approved</>
                                    : isRejected
                                        ? <><XCircle size={9} /> Rejected</>
                                        : <><Clock size={9} /> Pending Approval</>
                                }
                            </span>
                        </div>
                        {company.address && (
                            <p className="mt-1 flex items-center gap-1 truncate text-xs text-[var(--color-muted)]">
                                <MapPin size={10} />
                                {company.address}
                            </p>
                        )}
                    </div>

                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-accent-soft)]">
                        <Building2 size={18} className="text-[var(--color-accent)]" />
                    </div>
                </div>

                {/* Contact info */}
                <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-3">
                    {company.contact_person && (
                        <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                            <User size={10} className="shrink-0" />
                            <span className="truncate">{company.contact_person}</span>
                        </p>
                    )}
                    {company.contact_email && (
                        <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                            <Mail size={10} className="shrink-0" />
                            <span className="truncate">{company.contact_email}</span>
                        </p>
                    )}
                    {company.contact_phone && (
                        <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                            <Phone size={10} className="shrink-0" />
                            <span className="truncate">{company.contact_phone}</span>
                        </p>
                    )}
                </div>

                {/* Geofence info */}
                {company.geofence_enabled && (
                    <p className="mt-2 text-[11px] text-[var(--color-muted)]">
                        Geofence: {company.geofence_radius_meters ?? '—'}m radius
                    </p>
                )}

                {/* Actions for pending companies */}
                {isPending && onApprove && onReject && (
                    <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-line)] pt-4">
                        <button
                            type="button"
                            id={`approve-company-${company.id}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onApprove(company);
                            }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
                        >
                            <Check size={13} />
                            Approve
                        </button>
                        <button
                            type="button"
                            id={`reject-company-${company.id}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onReject(company);
                            }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
                        >
                            <Ban size={13} />
                            Reject
                        </button>
                    </div>
                )}
            </div>
        </motion.article>
    )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'all' | 'pending' | 'approved' | 'rejected'

export default function Companies() {
    const [activeTab, setActiveTab] = useState<Tab>('pending')
    const [search, setSearch] = useState('')
    const [confirmTarget, setConfirmTarget] = useState<{ company: Company; action: 'approve' | 'reject' } | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)

    const { data: allCompanies = [], isLoading: allLoading } = useCompanies()
    const { data: pendingCompanies = [], isLoading: pendingLoading } = usePendingCompanies()

    const approveCompany = useApproveCompany()
    const rejectCompany = useRejectCompany()

    // Combine: pending tab uses the /companies/pending endpoint directly
    const displayCompanies = (() => {
        if (activeTab === 'pending') return pendingCompanies
        const base = activeTab === 'all'
            ? allCompanies
            : activeTab === 'approved'
                ? allCompanies.filter((c) => c.is_approved === true)
                : allCompanies.filter((c) => c.is_active === false)
        return base
    })()

    const filtered = displayCompanies.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.address ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.contact_person ?? '').toLowerCase().includes(search.toLowerCase()),
    )

    const isLoading = activeTab === 'pending' ? pendingLoading : allLoading

    // Stats
    const totalApproved = allCompanies.filter((c) => c.is_approved && c.is_active !== false).length
    const totalPending = pendingCompanies.length
    const totalRejected = allCompanies.filter((c) => c.is_active === false).length

    async function handleConfirm() {
        if (!confirmTarget) return
        setActionError(null)
        try {
            if (confirmTarget.action === 'approve') {
                await approveCompany.mutateAsync(confirmTarget.company.id)
            } else {
                await rejectCompany.mutateAsync(confirmTarget.company.id)
            }
            setConfirmTarget(null)
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Action failed.')
            setConfirmTarget(null)
        }
    }

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: 'pending', label: 'Pending', count: totalPending },
        { key: 'approved', label: 'Approved', count: totalApproved },
        { key: 'rejected', label: 'Rejected', count: totalRejected },
        { key: 'all', label: 'All', count: allCompanies.length + totalPending },
    ]

    return (
        <>
            <motion.section
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                {/* ── Page header ───────────────────────────────────── */}
                <motion.div variants={row} className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
                            Company Management
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Companies</h2>
                        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                            Review pending companies from coordinators and manage approval.
                        </p>
                    </div>
                </motion.div>

                {/* ── Stat cards ────────────────────────────────────── */}
                <motion.div variants={row} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {[
                        {
                            label: 'Pending Approval',
                            value: totalPending,
                            icon: Clock,
                            color: 'text-amber-600 bg-amber-50',
                        },
                        {
                            label: 'Approved',
                            value: totalApproved,
                            icon: CheckCircle2,
                            color: 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]',
                        },
                        {
                            label: 'Rejected',
                            value: totalRejected,
                            icon: XCircle,
                            color: 'text-red-500 bg-red-50',
                        },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <article
                            key={label}
                            className="flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur"
                        >
                            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm ${color}`}>
                                <Icon size={18} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold tracking-tight">{value}</p>
                                <p className="text-xs font-medium text-[var(--color-muted)]">{label}</p>
                            </div>
                        </article>
                    ))}
                </motion.div>

                {/* ── Error ─────────────────────────────────────────── */}
                {actionError && (
                    <motion.div
                        variants={row}
                        className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                    >
                        <AlertTriangle size={16} className="shrink-0 text-red-500" />
                        <p className="text-sm text-red-700">{actionError}</p>
                        <button
                            type="button"
                            onClick={() => setActionError(null)}
                            className="ml-auto text-red-400 hover:text-red-600"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                )}

                {/* ── Table card ────────────────────────────────────── */}
                <motion.div
                    variants={row}
                    className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur"
                >
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
                        {/* Tabs */}
                        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-line)] bg-slate-50/80 p-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    id={`tab-${tab.key}`}
                                    onClick={() => { setActiveTab(tab.key); setSearch('') }}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeTab === tab.key
                                        ? 'bg-white text-[var(--color-accent)] shadow-sm'
                                        : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                                        }`}
                                >
                                    {tab.label}
                                    <span
                                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${activeTab === tab.key
                                            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                                            : 'bg-slate-200 text-slate-500'
                                            }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <label className="flex flex-1 min-w-48 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-muted)] focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20 transition">
                            <Search size={14} />
                            <input
                                id="company-search"
                                type="search"
                                placeholder="Search companies…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent outline-none placeholder:text-[var(--color-muted)] text-[var(--color-ink)]"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </label>

                        <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                            <Filter size={12} />
                            {isLoading ? 'Loading…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
                        </span>
                    </div>

                    {/* Content */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--color-muted)]">
                            <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                            <p className="text-sm">Loading companies…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                            <Building2 size={36} className="text-[var(--color-line)]" />
                            <p className="text-sm font-medium text-[var(--color-muted)]">
                                {search ? 'No companies match your search.' : `No ${activeTab === 'all' ? '' : activeTab} companies found.`}
                            </p>
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="mt-1 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <motion.div
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3"
                        >
                            <AnimatePresence mode="popLayout">
                                {filtered.map((company) => (
                                    <CompanyCard
                                        key={company.id}
                                        company={company}
                                        onApprove={activeTab === 'pending' ? (c) => setConfirmTarget({ company: c, action: 'approve' }) : undefined}
                                        onReject={activeTab === 'pending' ? (c) => setConfirmTarget({ company: c, action: 'reject' }) : undefined}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </motion.div>
            </motion.section>

            {/* ── Confirm Modal ─── */}
            <AnimatePresence>
                {confirmTarget && (
                    <ConfirmModal
                        key="confirm-modal"
                        company={confirmTarget.company}
                        action={confirmTarget.action}
                        onClose={() => setConfirmTarget(null)}
                        onConfirm={() => void handleConfirm()}
                        isPending={approveCompany.isPending || rejectCompany.isPending}
                    />
                )}
            </AnimatePresence>
        </>
    )
}