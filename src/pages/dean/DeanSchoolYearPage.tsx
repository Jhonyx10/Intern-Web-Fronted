import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarDays, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type CurrentSchoolYear = {
    id: number;
    name: string;
    semester?: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    is_evaluation_enabled?: boolean;
    evaluation_templates?: { id: number; title: string }[];
};

function semesterStyle(semester?: string | null) {
    const s = (semester ?? "").toLowerCase();
    if (s.includes("summer"))
        return { pill: "bg-orange-50 text-orange-700", dot: "bg-orange-500" };
    if (s.includes("second"))
        return { pill: "bg-green-50 text-green-700", dot: "bg-green-500" };
    if (s.includes("first"))
        return { pill: "bg-blue-50 text-blue-700", dot: "bg-blue-500" };
    return { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
}

export default function DeanSchoolYearPage() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const {
        data: currentYear,
        isLoading,
        isError,
        error,
    } = useQuery<CurrentSchoolYear>({
        queryKey: ["school-years", "current"],
        queryFn: () => apiRequest<CurrentSchoolYear>("/school-years/current", { token }),
        enabled: Boolean(token),
        retry: false,
    });

    // Auto-redirect once we have the current school year
    useEffect(() => {
        if (currentYear?.id) {
            navigate(`/dean/school-year-section/${currentYear.id}`, { replace: true });
        }
    }, [currentYear, navigate]);

    if (isLoading) {
        return (
            <div className="flex h-60 items-center justify-center">
                <Loader2 className="animate-spin text-[var(--color-accent)]" size={28} />
            </div>
        );
    }

    // 404 or any error → no active school year
    const isNoYear =
        isError ||
        !currentYear ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error && (error as any)?.status === 404);

    if (isNoYear) {
        return (
            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] py-24 text-center"
            >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    <CalendarDays size={24} />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-[var(--color-ink)]">
                    No Current School Year
                </h2>
                <p className="mt-2 max-w-sm text-sm text-[var(--color-muted)]">
                    The Super Admin has not set an active school year yet. Once they do,
                    you'll be automatically directed here to manage your sections.
                </p>
            </motion.section>
        );
    }

    // Briefly shown while the redirect fires
    const sem = semesterStyle(currentYear.semester);
    return (
        <div className="flex h-60 flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-[var(--color-accent)]" size={24} />
            <p className="text-sm text-[var(--color-muted)]">
                Opening{" "}
                <span className="font-semibold text-[var(--color-ink)]">
                    {currentYear.name}
                </span>
                {currentYear.semester && (
                    <span
                        className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${sem.pill}`}
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${sem.dot}`} />
                        {currentYear.semester}
                    </span>
                )}
                …
            </p>
        </div>
    );
}
