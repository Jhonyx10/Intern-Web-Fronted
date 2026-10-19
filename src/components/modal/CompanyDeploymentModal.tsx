import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

type SchoolYear = {
    id: number;
    name: string;
    semester?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_active?: boolean;
};

type DeployedStudent = {
    id: number;
    student_number: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    is_active?: boolean;
    section?: { name: string } | null;
};

interface Props {
    companyId: number | string;
    companyName: string;
    onClose: () => void;
}

export function DeploymentHistoryModal({ companyId, companyName, onClose }: Props) {
    const { token } = useAuth();
    const [selectedYearId, setSelectedYearId] = useState<number | null>(null);

    const { data: schoolYears, isLoading: loadingYears } = useQuery({
        queryKey: ["school-years", "deployment-history"],
        queryFn: () => apiRequest<SchoolYear[]>("/school-years", { token }),
        enabled: Boolean(token),
    });

    // Only school years that have already ended, newest first
    const pastYears = useMemo(() => {
        const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
        return (schoolYears ?? [])
            .filter((sy) => sy.end_date != null && sy.end_date < today)
            .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
    }, [schoolYears]);

    const yearId = selectedYearId ?? pastYears[0]?.id ?? null;

    const {
        data: students,
        isLoading: loadingStudents,
        isError,
    } = useQuery({
        queryKey: ["company-deployment-history", companyId, yearId],
        queryFn: () =>
            apiRequest<DeployedStudent[]>(
                `/companies/${companyId}/deployment-history?school_year_id=${yearId}`,
                { token }
            ),
        enabled: Boolean(token) && yearId !== null,
    });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Student deployment history"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-4">
                    <div className="min-w-0">
                        <h3 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                            Deployment history
                        </h3>
                        <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
                            Students previously deployed to {companyName}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--color-muted)] transition hover:bg-slate-50 hover:text-[var(--color-ink)]"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* School year filter */}
                <div className="flex items-center gap-3 border-b border-[var(--color-line)] px-6 py-3">
                    <label
                        htmlFor="deployment-history-year"
                        className="text-sm font-medium text-[var(--color-ink)]"
                    >
                        School year
                    </label>
                    <select
                        id="deployment-history-year"
                        value={yearId ?? ""}
                        onChange={(e) => setSelectedYearId(Number(e.target.value))}
                        disabled={pastYears.length === 0}
                        className="h-9 min-w-[10rem] rounded-lg border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] disabled:opacity-60"
                    >
                        {pastYears.map((sy) => (
                            <option key={sy.id} value={sy.id}>
                                S.Y. {sy.name}
                                {sy.semester ? ` (${sy.semester})` : ""}
                            </option>
                        ))}
                    </select>
                    {students && (
                        <span className="ml-auto text-sm text-[var(--color-muted)]">
                            {students.length} {students.length === 1 ? "student" : "students"}
                        </span>
                    )}
                </div>

                {/* Student list */}
                <div className="min-h-[200px] flex-1 overflow-y-auto">
                    {loadingYears || (yearId !== null && loadingStudents) ? (
                        <div className="flex h-40 items-center justify-center">
                            <Loader2 className="animate-spin text-[var(--color-accent)]" size={24} />
                        </div>
                    ) : pastYears.length === 0 ? (
                        <p className="py-12 text-center text-sm text-[var(--color-muted)]">
                            No past school years yet.
                        </p>
                    ) : isError ? (
                        <p className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            Couldn't load deployed students. Please try again.
                        </p>
                    ) : !students || students.length === 0 ? (
                        <p className="py-12 text-center text-sm text-[var(--color-muted)]">
                            No students were deployed here that school year.
                        </p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-xs text-[var(--color-muted)]">
                                <tr>
                                    <th className="px-6 py-2.5 font-medium">Student no.</th>
                                    <th className="px-6 py-2.5 font-medium">Name</th>
                                    <th className="px-6 py-2.5 font-medium">Section</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-ink)]">
                                {students.map((s) => (
                                    <tr key={s.id}>
                                        <td className="whitespace-nowrap px-6 py-3 font-medium">
                                            {s.student_number}
                                        </td>
                                        <td className="px-6 py-3">
                                            {s.last_name}, {s.first_name} {s.middle_name || ""}
                                        </td>
                                        <td className="px-6 py-3 text-[var(--color-muted)]">
                                            {s.section?.name ?? "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}