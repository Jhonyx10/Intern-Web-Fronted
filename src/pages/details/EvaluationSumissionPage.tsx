import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, Eye, Loader2, Search } from "lucide-react";
import {
    useEvaluationTemplate,
    useEvaluationSubmissions,
    type EvaluationSubmission,
} from "@/lib/queries/evaluation";
import { EvaluationReviewModal } from "@/components/modal/EvaluationReviewModal";

function formatDateTime(value: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function scoreStyle(score: number | null) {
    if (score === null) return "bg-slate-100 text-slate-600";
    if (score >= 75) return "bg-emerald-50 text-emerald-700";
    if (score >= 50) return "bg-amber-50 text-amber-700";
    return "bg-red-50 text-red-600";
}

export const EvaluationSubmissionsPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const { data: template } = useEvaluationTemplate(id);
    const { data: submissions = [], isLoading, isError } =
        useEvaluationSubmissions(id);

    const [search, setSearch] = useState("");
    const [schoolYear, setSchoolYear] = useState("");
    const [selectedSubmission, setSelectedSubmission] =
        useState<EvaluationSubmission | null>(null);

    const schoolYearOptions = useMemo(
        () =>
            Array.from(
                new Set(submissions.map((s) => s.school_year).filter(Boolean))
            ) as string[],
        [submissions]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return submissions.filter((s) => {
            if (schoolYear && s.school_year !== schoolYear) return false;
            if (!q) return true;
            return (
                (s.student?.name ?? "").toLowerCase().includes(q) ||
                (s.student?.student_number ?? "").toLowerCase().includes(q) ||
                (s.evaluator ?? "").toLowerCase().includes(q) ||
                (s.course_code ?? "").toLowerCase().includes(q)
            );
        });
    }, [submissions, search, schoolYear]);

    const scored = filtered.filter((s) => s.computed_score !== null);
    const average =
        scored.length > 0
            ? scored.reduce((sum, s) => sum + (s.computed_score ?? 0), 0) /
            scored.length
            : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-7xl space-y-6 p-6"
        >
            {/* Header */}
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    onClick={() => navigate("/evaluation")}
                    className="mt-1 rounded-lg p-2 text-[var(--color-muted)] transition hover:bg-slate-100"
                    aria-label="Back to evaluation library"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                        Evaluation / Submissions
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                        {template?.title ?? "Evaluation"}
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        Evaluations answered and submitted by supervisors.
                    </p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--color-line)] bg-white px-5 py-4 shadow-sm">
                    <p className="text-xs font-medium text-[var(--color-muted)]">
                        Submitted
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                        {filtered.length}
                    </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-line)] bg-white px-5 py-4 shadow-sm">
                    <p className="text-xs font-medium text-[var(--color-muted)]">
                        Average score
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                        {average === null ? "—" : `${average.toFixed(1)}%`}
                    </p>
                </div>
            </div>

            {/* List */}
            <section className="rounded-2xl border border-[var(--color-line)] bg-white shadow-sm">
                <div className="flex flex-col gap-3 p-5 sm:flex-row">
                    <label className="flex flex-1 items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-muted)] transition focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent-soft)]">
                        <Search size={15} />
                        <input
                            type="text"
                            placeholder="Search student, ID, supervisor, or program"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
                        />
                    </label>

                    {schoolYearOptions.length > 0 && (
                        <select
                            value={schoolYear}
                            onChange={(e) => setSchoolYear(e.target.value)}
                            aria-label="Filter by school year"
                            className="rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] sm:w-56"
                        >
                            <option value="">All school years</option>
                            {schoolYearOptions.map((sy) => (
                                <option key={sy} value={sy}>
                                    {sy}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="overflow-x-auto border-t border-[var(--color-line)]">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead>
                            <tr className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                                <th className="px-6 py-3.5">Student</th>
                                <th className="px-4 py-3.5">Program / Section</th>
                                <th className="px-4 py-3.5">School year</th>
                                <th className="px-4 py-3.5">Evaluated by</th>
                                <th className="px-4 py-3.5">Score</th>
                                <th className="px-6 py-3.5">Submitted</th>
                                <th className="px-6 py-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-14 text-center">
                                        <Loader2
                                            className="mx-auto animate-spin text-[var(--color-accent)]"
                                            size={24}
                                        />
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-6 py-14 text-center text-sm text-red-600"
                                    >
                                        Couldn't load the submitted evaluations.
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-14 text-center">
                                        <ClipboardList
                                            size={32}
                                            className="mx-auto text-[var(--color-line)]"
                                        />
                                        <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">
                                            {search || schoolYear
                                                ? "No submissions match your filters."
                                                : "No evaluations have been submitted yet."}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((s) => (
                                    <tr
                                        key={s.id}
                                        className="transition-colors hover:bg-slate-50/70"
                                    >
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-[var(--color-ink)]">
                                                {s.student?.name ?? "Unknown student"}
                                            </p>
                                            {s.student?.student_number && (
                                                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                                                    {s.student.student_number}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                                {s.course_code ?? "—"}
                                                {s.section_code ? ` (${s.section_code})` : ""}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-xs text-[var(--color-ink)]">
                                            {s.school_year ?? "—"}
                                        </td>
                                        <td className="px-4 py-4 text-xs text-[var(--color-ink)]">
                                            {s.evaluator ?? "—"}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span
                                                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${scoreStyle(
                                                    s.computed_score
                                                )}`}
                                            >
                                                {s.computed_score === null
                                                    ? "No rating"
                                                    : `${s.computed_score}%`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-[var(--color-muted)]">
                                            {formatDateTime(s.submitted_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedSubmission(s)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] shadow-xs transition hover:bg-slate-50 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                                            >
                                                <Eye size={13} />
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <EvaluationReviewModal
                isOpen={!!selectedSubmission}
                submission={selectedSubmission}
                templateTitle={template?.title}
                onClose={() => setSelectedSubmission(null)}
            />
        </motion.div>
    );
};

export default EvaluationSubmissionsPage;