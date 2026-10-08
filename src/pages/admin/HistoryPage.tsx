import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
    GraduationCap,
    Users,
    BookOpen,
    CalendarRange,
    ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

/* ── Helpers ──────────────────────────────────────────────────── */
function toList(res: any): any[] {
    const list = res?.data?.data ?? res?.data ?? res;
    return Array.isArray(list) ? list : [];
}

function useSchoolYears() {
    return useQuery({
        queryKey: ["history", "school-years"],
        queryFn: async () => toList(await apiRequest<any>("/history/school-years")),
    });
}

function errorMessage(e: unknown) {
    return e instanceof Error ? e.message : "Something went wrong while loading data.";
}

/* ── Page ─────────────────────────────────────────────────────── */
export function HistoryPage() {
    const { data = [], isLoading, error } = useSchoolYears();

    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-3xl font-semibold tracking-tight">History Archive</h2>
                <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                    Open a past school year to view its students and submitted documents.
                </p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-44 animate-pulse rounded-2xl bg-slate-100 border border-[var(--color-line)]"
                        />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {errorMessage(error)}
                </div>
            ) : !data.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--color-muted)]">
                    <CalendarRange size={40} className="mb-3 opacity-30" />
                    <p className="font-medium">No past school years found</p>
                    <p className="text-sm mt-1">
                        Archived school years will appear here once they are no longer active.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.map((sy: any) => (
                        <SchoolYearCard key={sy.id} sy={sy} />
                    ))}
                </div>
            )}
        </section>
    );
}

function SchoolYearCard({ sy }: { sy: any }) {
    const stats = [
        { label: "Sections", value: sy.section_count, icon: BookOpen },
        { label: "Students", value: sy.student_count, icon: GraduationCap },
        { label: "Coordinators", value: sy.coordinator_count, icon: Users },
        { label: "Deans", value: sy.dean_count, icon: Users },
    ];

    return (
        <div className="rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">{sy.name}</h3>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        {sy.start_date ? format(new Date(sy.start_date), "MMM yyyy") : "—"}
                        {" – "}
                        {sy.end_date ? format(new Date(sy.end_date), "MMM yyyy") : "—"}
                    </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Archived
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                {stats.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                            <Icon size={15} />
                        </span>
                        <div>
                            <p className="text-lg font-bold leading-none text-[var(--color-ink)]">{value ?? 0}</p>
                            <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Link
                to={`/history/school-years/${sy.id}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-line)] py-2 text-sm font-medium text-[var(--color-muted)] hover:bg-slate-50 hover:text-[var(--color-ink)] transition-colors"
            >
                <ExternalLink size={14} />
                View details
            </Link>
        </div>
    );
}

export default HistoryPage;