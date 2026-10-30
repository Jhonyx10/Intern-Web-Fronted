import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Loader2,
    AlertCircle,
    ClipboardList,
    Search,
    X,
    CheckCircle2,
    Clock,
    ChevronRight,
    CalendarDays,
    Building2,
    MapPin,
    UserCheck,
    GraduationCap,
    Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
    useInternEvaluations,
    useSubmitEvaluation,
    type InternEvaluationRow,
} from "@/lib/queries/supervisor";
import { useCurrentSchoolYear } from "@/lib/queries/school-year";
import { useQueryClient } from "@tanstack/react-query";

// ─── types & helpers ────────────────────────────────────────────────────────

type ResponseValue = string | number | string[];
type AnswerMap = Record<number, ResponseValue>;

const DISALLOWED_RATING_VALUE = 3;
const MIN_TEXT_LENGTH = 8;
const MIN_TEXTAREA_LENGTH = 20;

type EvalItem = NonNullable<InternEvaluationRow["template"]>["items"][number];

function multiChoiceSelections(value: ResponseValue | undefined): string[] {
    return Array.isArray(value) ? value : [];
}

function isItemValid(item: EvalItem, value: ResponseValue | undefined): boolean {
    if (item.item_type === "multiple_choice") return multiChoiceSelections(value).length > 0;
    if (value === undefined || value === "") return false;
    if (item.item_type === "rating") {
        const num = Number(value);
        return !isNaN(num) && num !== DISALLOWED_RATING_VALUE;
    }
    if (item.item_type === "text") return typeof value === "string" && value.trim().length >= MIN_TEXT_LENGTH;
    if (item.item_type === "textarea") return typeof value === "string" && value.trim().length >= MIN_TEXTAREA_LENGTH;
    if (item.item_type === "single_choice") return typeof value === "string" && value.length > 0;
    return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseOptions(raw: unknown): Record<string, any> | null {
    if (!raw) return null;
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw as Record<string, any>;
}

function studentName(s: InternEvaluationRow["student"]) {
    if (!s) return "—";
    return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
}

function fmtDate(raw: string | null | undefined) {
    if (!raw) return "—";
    return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const AVATAR_STYLES = [
    "bg-emerald-50 text-emerald-700",
    "bg-amber-50 text-amber-700",
    "bg-sky-50 text-sky-700",
    "bg-violet-50 text-violet-700",
    "bg-rose-50 text-rose-700",
];

function avatarStyle(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % AVATAR_STYLES.length;
    return AVATAR_STYLES[hash];
}

function initialsFor(first?: string, last?: string) {
    return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

type StatusFilter = "all" | "pending" | "submitted";

function StatusBadge({ submitted }: { submitted: boolean }) {
    return submitted ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 size={12} /> Submitted
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <Clock size={12} /> Pending
        </span>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[var(--color-muted)]">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">{label}</p>
                <p className="text-sm font-medium text-[var(--color-ink)] break-words">
                    {value || <span className="font-normal italic text-[var(--color-muted)]">Not available</span>}
                </p>
            </div>
        </div>
    );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export function InternEvaluationsPage() {
    const { user } = useAuth();
    const role = user?.role?.name;
    const { data: evaluations, isLoading, isError } = useInternEvaluations();
    const { data: currentSchoolYear } = useCurrentSchoolYear();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [sectionFilter, setSectionFilter] = useState<string>("all");
    const [drawerEval, setDrawerEval] = useState<InternEvaluationRow | null>(null);

    // Unique sections for coordinator tab switcher
    const sections = useMemo(() => {
        if (!evaluations) return [];
        const map = new Map<number, string>();
        for (const ev of evaluations) {
            if (ev.section_id && ev.section_name && !map.has(ev.section_id)) {
                map.set(ev.section_id, ev.section_name);
            }
        }
        return Array.from(map, ([id, name]) => ({ id, name }));
    }, [evaluations]);

    const filtered = useMemo(() => {
        if (!evaluations) return [];
        return evaluations.filter((ev) => {
            if (statusFilter !== "all" && ev.status !== statusFilter) return false;
            if (sectionFilter !== "all" && String(ev.section_id) !== sectionFilter) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                const name = studentName(ev.student).toLowerCase();
                const num = ev.student?.student_number?.toLowerCase() ?? "";
                const tmpl = ev.template?.title?.toLowerCase() ?? "";
                if (!name.includes(q) && !num.includes(q) && !tmpl.includes(q)) return false;
            }
            return true;
        });
    }, [evaluations, statusFilter, sectionFilter, search]);

    const pendingCount = evaluations?.filter((e) => e.status === "pending").length ?? 0;
    const submittedCount = evaluations?.filter((e) => e.status === "submitted").length ?? 0;

    // Guard: only supervisor, dean, coordinator
    if (!user || !["supervisor", "dean", "coordinator"].includes(role ?? "")) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <AlertCircle size={40} className="text-[var(--color-muted)]" />
                <h2 className="text-xl font-semibold text-[var(--color-ink)]">Access denied</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">You don't have permission to view this page.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-14 max-w-md rounded-lg bg-black/5" />
                <div className="h-11 max-w-xl rounded-xl bg-black/5" />
                <div className="h-72 rounded-xl bg-black/5" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                    <p className="text-sm font-medium text-red-800">Couldn&apos;t load evaluations</p>
                    <p className="mt-0.5 text-sm text-red-700/80">Check your connection and try refreshing the page.</p>
                </div>
            </div>
        );
    }

    const isSupervisor = role === "supervisor";
    const isCoordinator = role === "coordinator";

    return (
        <section className="space-y-6">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[var(--color-ink)]">
                            Intern Evaluations
                        </h1>
                        {currentSchoolYear && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                                <CalendarDays size={12} className="text-amber-600" />
                                S.Y. {currentSchoolYear.name}
                                {currentSchoolYear.semester && (
                                    <span className="font-normal text-amber-700">· {currentSchoolYear.semester}</span>
                                )}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {isSupervisor
                            ? "Review and fill out evaluations for your interns."
                            : "Review evaluation results for your students."}
                    </p>
                </div>
            </header>

            {/* Stats strip */}
            <div className="flex flex-wrap divide-x divide-[var(--color-line)] overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">
                <div className="flex-1 min-w-[140px] px-5 py-4">
                    <p className="text-2xl font-semibold text-[var(--color-ink)]">{evaluations?.length ?? 0}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">Total evaluations</p>
                </div>
                <div className="flex-1 min-w-[140px] px-5 py-4">
                    <p className="text-2xl font-semibold text-amber-600">{pendingCount}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">Pending</p>
                </div>
                <div className="flex-1 min-w-[140px] px-5 py-4">
                    <p className="text-2xl font-semibold text-emerald-600">{submittedCount}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">Submitted</p>
                </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Search */}
                <label className="flex flex-1 items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-muted)] transition focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent-soft)]">
                    <Search size={15} />
                    <input
                        type="text"
                        placeholder="Search student name, number, or template"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
                    />
                </label>

                {/* Status filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    aria-label="Filter by status"
                    className="rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)] sm:w-44"
                >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                </select>

                {/* Section filter (coordinator only) */}
                {isCoordinator && sections.length > 1 && (
                    <select
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value)}
                        aria-label="Filter by section"
                        className="rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)] sm:w-52"
                    >
                        <option value="all">All sections</option>
                        {sections.map((s) => (
                            <option key={s.id} value={String(s.id)}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-[var(--color-line)] bg-white">
                {filtered.length > 0 ? (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--color-line)] text-xs text-[var(--color-muted)]">
                                        <th className="px-6 py-3 font-medium">Student</th>
                                        <th className="px-6 py-3 font-medium">Template</th>
                                        <th className="px-6 py-3 font-medium">Section</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium">Score</th>
                                        <th className="px-6 py-3 font-medium">Submitted</th>
                                        <th className="px-6 py-3 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-line)]">
                                    {filtered.map((ev) => (
                                        <tr
                                            key={ev.id}
                                            className="transition-colors hover:bg-slate-50/60 cursor-pointer"
                                            onClick={() => setDrawerEval(ev)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarStyle(ev.student?.student_number ?? "")}`}
                                                    >
                                                        {initialsFor(ev.student?.first_name, ev.student?.last_name)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-[var(--color-ink)]">{studentName(ev.student)}</p>
                                                        <p className="text-xs text-[var(--color-muted)]">{ev.student?.student_number ?? "—"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[var(--color-ink)]">{ev.template?.title ?? "—"}</td>
                                            <td className="px-6 py-4 text-[var(--color-muted)]">{ev.section_name ?? "—"}</td>
                                            <td className="px-6 py-4">
                                                <StatusBadge submitted={ev.status === "submitted"} />
                                            </td>
                                            <td className="px-6 py-4 font-bold text-[var(--color-ink)] tabular-nums">
                                                {ev.computed_score != null ? `${ev.computed_score}%` : "—"}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-[var(--color-muted)]">{fmtDate(ev.submitted_at)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDrawerEval(ev);
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-sky-600 transition-colors hover:border-sky-300 hover:bg-sky-50"
                                                >
                                                    {isSupervisor && ev.status === "pending" ? "Evaluate" : "View"}
                                                    <ChevronRight size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="divide-y divide-[var(--color-line)] md:hidden">
                            {filtered.map((ev) => (
                                <div key={ev.id} className="p-4" onClick={() => setDrawerEval(ev)}>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarStyle(ev.student?.student_number ?? "")}`}
                                        >
                                            {initialsFor(ev.student?.first_name, ev.student?.last_name)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-[var(--color-ink)]">{studentName(ev.student)}</p>
                                            <p className="text-xs text-[var(--color-muted)]">
                                                {ev.student?.student_number ?? "—"} · {ev.template?.title ?? "—"}
                                            </p>
                                        </div>
                                        <StatusBadge submitted={ev.status === "submitted"} />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-muted)]">
                                        <span>{ev.section_name ?? "—"}</span>
                                        <span>{ev.computed_score != null ? `Score: ${ev.computed_score}%` : ""}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-14 text-center">
                        <ClipboardList size={32} className="text-[var(--color-muted)]" />
                        <div>
                            <p className="text-sm font-medium text-[var(--color-ink)]">No evaluations found</p>
                            <p className="mt-1 text-sm text-[var(--color-muted)]">
                                {evaluations && evaluations.length > 0
                                    ? "Try changing your filters."
                                    : "Once evaluations are assigned they'll appear here."}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Side drawer */}
            <EvaluationDrawer
                evaluation={drawerEval}
                canEdit={isSupervisor}
                onClose={() => setDrawerEval(null)}
            />
        </section>
    );
}

// ─── Drawer ─────────────────────────────────────────────────────────────────

function EvaluationDrawer({
    evaluation,
    canEdit,
    onClose,
}: {
    evaluation: InternEvaluationRow | null;
    canEdit: boolean;
    onClose: () => void;
}) {
    const open = evaluation !== null;
    const submitMutation = useSubmitEvaluation();
    const queryClient = useQueryClient();
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset answers whenever a different evaluation is opened
    const [lastEvalId, setLastEvalId] = useState<number | null>(null);
    if (evaluation && evaluation.id !== lastEvalId) {
        setLastEvalId(evaluation.id);
        setAnswers({});
        setError(null);
        setSubmitting(false);
    }

    if (!evaluation || !evaluation.template) return null;

    const isSubmitted = evaluation.status === "submitted";
    const showForm = canEdit && evaluation.status === "pending";
    const sortedItems = [...evaluation.template.items].sort((a, b) => a.sort_order - b.sort_order);
    const existingResponses = (evaluation.responses ?? {}) as Record<string, unknown>;

    const requiredItems = sortedItems.filter((i) => i.is_required);
    const answeredRequired = requiredItems.filter((i) => isItemValid(i, answers[i.id])).length;
    const allRequiredAnswered = showForm ? answeredRequired === requiredItems.length : false;
    const progress = requiredItems.length ? Math.round((answeredRequired / requiredItems.length) * 100) : 100;

    function getDisplayValue(itemId: number): ResponseValue | undefined {
        if (showForm) return answers[itemId];
        return existingResponses[String(itemId)] as ResponseValue | undefined;
    }

    function setAnswer(itemId: number, value: ResponseValue) {
        setAnswers((prev) => ({ ...prev, [itemId]: value }));
    }

    async function handleSubmit() {
        if (!evaluation) return;
        setSubmitting(true);
        setError(null);
        try {
            await submitMutation.mutateAsync({ evaluationId: evaluation.id, responses: answers });
            void queryClient.invalidateQueries({ queryKey: ["intern-evaluations"] });
            onClose();
        } catch {
            setError("This evaluation could not be submitted. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    // Add `company_location?: string | null` and `supervisor_name?: string | null`
    // to InternEvaluationRow in lib/queries/supervisor
    const extra = evaluation as InternEvaluationRow & {
        company_location?: string | null;
        supervisor_name?: string | null;
    };
    const companyName = evaluation.company_name;
    const companyLocation = extra.company_location;
    const supervisorName = extra.supervisor_name ?? evaluation.evaluator;

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        key="drawer-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
                        onClick={onClose}
                    />

                    <motion.aside
                        key="drawer-panel"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 400, damping: 36 }}
                        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-slate-50 shadow-2xl"
                    >
                        {/* ── Header ───────────────────────────────────── */}
                        <div className="border-b border-[var(--color-line)] bg-white px-6 py-5">
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                                    {showForm ? "Fill out evaluation" : "Evaluation details"}
                                </p>
                                <div className="flex items-center gap-2">
                                    <StatusBadge submitted={isSubmitted} />
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-muted)] transition hover:bg-slate-50 hover:text-[var(--color-ink)]"
                                        aria-label="Close drawer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center gap-4">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-accent-soft)] text-sm font-semibold text-[var(--color-accent)]">
                                    {initialsFor(evaluation.student?.first_name, evaluation.student?.last_name)}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-lg font-semibold leading-tight text-[var(--color-ink)]">
                                        {studentName(evaluation.student)}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                                        {evaluation.student?.student_number ?? "—"}
                                        {evaluation.section_name && ` · ${evaluation.section_name}`}
                                        {` · ${evaluation.template.title}`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Scrollable body ──────────────────────────── */}
                        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                            {/* Placement info */}
                            <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <InfoRow icon={<Building2 size={16} />} label="Company" value={companyName} />
                                    <InfoRow icon={<MapPin size={16} />} label="Location" value={companyLocation} />
                                    <InfoRow icon={<UserCheck size={16} />} label="Supervisor" value={supervisorName} />
                                    {evaluation.course_code && (
                                        <InfoRow
                                            icon={<GraduationCap size={16} />}
                                            label="Course"
                                            value={evaluation.course_code}
                                        />
                                    )}
                                    {isSubmitted && evaluation.submitted_at && (
                                        <InfoRow
                                            icon={<CalendarDays size={16} />}
                                            label="Submitted"
                                            value={fmtDate(evaluation.submitted_at)}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Score card */}
                            {isSubmitted && evaluation.computed_score != null && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-700/80">
                                        Overall score
                                    </p>
                                    <p className="mt-0.5 text-3xl font-bold tabular-nums text-emerald-700">
                                        {evaluation.computed_score}%
                                    </p>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                                        <div
                                            className="h-full rounded-full bg-emerald-500"
                                            style={{ width: `${Math.min(100, Number(evaluation.computed_score))}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Questions */}
                            <div className="space-y-3">
                                {sortedItems.map((item, index) => {
                                    const options = parseOptions(item.options);
                                    const value = getDisplayValue(item.id);
                                    const textLength = typeof value === "string" ? value.trim().length : 0;
                                    const answered = isItemValid(item, value);
                                    const choices = (options?.choices as string[] | undefined) ?? [];

                                    return (
                                        <div
                                            key={item.id}
                                            className="rounded-xl border border-[var(--color-line)] bg-white p-4 shadow-2xs"
                                        >
                                            {/* Question header */}
                                            <div className="flex items-start gap-3">
                                                <span
                                                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition ${
                                                        showForm && answered
                                                            ? "bg-emerald-500 text-white"
                                                            : "bg-slate-100 text-[var(--color-muted)]"
                                                    }`}
                                                >
                                                    {showForm && answered ? <Check size={13} /> : index + 1}
                                                </span>
                                                <p className="flex-1 text-sm font-medium leading-snug text-[var(--color-ink)]">
                                                    {item.label}
                                                    {item.is_required && (
                                                        <span className="ml-0.5 text-[var(--color-accent)]">*</span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="mt-3 pl-9">
                                                {/* Rating */}
                                                {item.item_type === "rating" && (
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {Array.from({ length: options?.max ?? 5 }).map((_, i) => {
                                                                const rv = i + 1;
                                                                const isDisallowed = rv === DISALLOWED_RATING_VALUE;
                                                                const isSelected = Number(value) === rv;
                                                                return (
                                                                    <button
                                                                        key={rv}
                                                                        type="button"
                                                                        disabled={!showForm || isDisallowed}
                                                                        title={isDisallowed ? "This rating is not available" : undefined}
                                                                        onClick={() => showForm && !isDisallowed && setAnswer(item.id, rv)}
                                                                        className={`grid h-10 w-10 place-items-center rounded-lg border text-sm font-semibold transition ${
                                                                            isDisallowed
                                                                                ? "cursor-not-allowed border-dashed border-[var(--color-line)] text-slate-300 line-through"
                                                                                : isSelected
                                                                                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-sm"
                                                                                  : showForm
                                                                                    ? "border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                                                                                    : "border-[var(--color-line)] text-slate-400"
                                                                        }`}
                                                                    >
                                                                        {rv}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="mt-2 flex max-w-xs items-center justify-between text-[11px] text-[var(--color-muted)]">
                                                            <span>{options?.lowLabel ?? "Needs improvement"}</span>
                                                            <span>{options?.highLabel ?? "Outstanding"}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Single choice */}
                                                {item.item_type === "single_choice" && (
                                                    <div className="space-y-2">
                                                        {choices.map((opt) => {
                                                            const checked = value === opt;
                                                            return (
                                                                <label
                                                                    key={opt}
                                                                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                                                                        checked
                                                                            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                                                                            : "border-[var(--color-line)] text-[var(--color-ink)]"
                                                                    } ${showForm ? "cursor-pointer hover:border-[var(--color-accent)]" : "cursor-default"}`}
                                                                >
                                                                    <input
                                                                        type="radio"
                                                                        className="sr-only"
                                                                        name={`drawer-item-${item.id}`}
                                                                        checked={checked}
                                                                        disabled={!showForm}
                                                                        onChange={() => showForm && setAnswer(item.id, opt)}
                                                                    />
                                                                    <span
                                                                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                                                                            checked ? "border-[var(--color-accent)]" : "border-slate-300"
                                                                        }`}
                                                                    >
                                                                        {checked && (
                                                                            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                                                                        )}
                                                                    </span>
                                                                    {opt}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Multiple choice */}
                                                {item.item_type === "multiple_choice" && (
                                                    <div className="space-y-2">
                                                        {choices.map((opt) => {
                                                            const selected = multiChoiceSelections(value);
                                                            const checked = selected.includes(opt);
                                                            return (
                                                                <label
                                                                    key={opt}
                                                                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                                                                        checked
                                                                            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                                                                            : "border-[var(--color-line)] text-[var(--color-ink)]"
                                                                    } ${showForm ? "cursor-pointer hover:border-[var(--color-accent)]" : "cursor-default"}`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className="sr-only"
                                                                        checked={checked}
                                                                        disabled={!showForm}
                                                                        onChange={() => {
                                                                            if (!showForm) return;
                                                                            setAnswer(
                                                                                item.id,
                                                                                checked
                                                                                    ? selected.filter((o) => o !== opt)
                                                                                    : [...selected, opt],
                                                                            );
                                                                        }}
                                                                    />
                                                                    <span
                                                                        className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                                                                            checked
                                                                                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                                                                                : "border-slate-300"
                                                                        }`}
                                                                    >
                                                                        {checked && <Check size={11} strokeWidth={3} />}
                                                                    </span>
                                                                    {opt}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Text */}
                                                {item.item_type === "text" &&
                                                    (showForm ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                value={(value as string) ?? ""}
                                                                onChange={(e) => setAnswer(item.id, e.target.value)}
                                                                placeholder={options?.placeholder ?? "Your answer"}
                                                                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                                            />
                                                            <p
                                                                className={`mt-1.5 text-[11px] ${
                                                                    textLength > 0 && textLength < MIN_TEXT_LENGTH
                                                                        ? "text-[var(--color-accent)]"
                                                                        : "text-[var(--color-muted)]"
                                                                }`}
                                                            >
                                                                {textLength}/{MIN_TEXT_LENGTH} characters minimum
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-[var(--color-ink)]">
                                                            {(value as string) || (
                                                                <span className="italic text-[var(--color-muted)]">No answer</span>
                                                            )}
                                                        </p>
                                                    ))}

                                                {/* Textarea */}
                                                {item.item_type === "textarea" &&
                                                    (showForm ? (
                                                        <>
                                                            <textarea
                                                                value={(value as string) ?? ""}
                                                                onChange={(e) => setAnswer(item.id, e.target.value)}
                                                                placeholder={options?.placeholder ?? "Your feedback"}
                                                                rows={4}
                                                                className="w-full resize-none rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                                                            />
                                                            <p
                                                                className={`mt-1.5 text-[11px] ${
                                                                    textLength > 0 && textLength < MIN_TEXTAREA_LENGTH
                                                                        ? "text-[var(--color-accent)]"
                                                                        : "text-[var(--color-muted)]"
                                                                }`}
                                                            >
                                                                {textLength}/{MIN_TEXTAREA_LENGTH} characters minimum
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <p className="whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-[var(--color-ink)]">
                                                            {(value as string) || (
                                                                <span className="italic text-[var(--color-muted)]">No answer</span>
                                                            )}
                                                        </p>
                                                    ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Footer ───────────────────────────────────── */}
                        {showForm && (
                            <div className="space-y-3 border-t border-[var(--color-line)] bg-white px-6 py-4">
                                <div>
                                    <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--color-muted)]">
                                        <span>
                                            {answeredRequired} of {requiredItems.length} required answered
                                        </span>
                                        <span className="tabular-nums">{progress}%</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                        <AlertCircle size={14} /> {error}
                                    </div>
                                )}

                                <motion.button
                                    whileTap={{ scale: 0.99 }}
                                    type="button"
                                    disabled={!allRequiredAnswered || submitting}
                                    onClick={handleSubmit}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    Submit evaluation
                                </motion.button>
                            </div>
                        )}
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

export default InternEvaluationsPage;