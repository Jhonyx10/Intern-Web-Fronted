import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export type ReportFilters = {
    section_id?: string;
    company_id?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
};

export type ReportOptions = {
    sections: { id: number; name: string; course_code: string | null }[];
    companies: { id: number; name: string }[];
};

/* ── Row types (match ReportsController) ───────────────────────── */

export type DtrStudent = {
    id: number;
    student_number: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    section: string | null;
    course_code: string | null;
    ojt_schedule: { hours_per_day: number | null };
    companies: {
        id: number;
        name: string;
        schedules: { time_in: string | null; time_out: string | null }[];
    }[];
    time_logs: {
        id: number;
        time_in: string | null;
        break_out: string | null;
        break_in: string | null;
        time_out: string | null;
        duration_minutes: number | null;
        session_period: string | null;
        verification_method: string | null;
    }[];
};

export type HoursRow = {
    id: number;
    student_name: string;
    student_number: string;
    section: string | null;
    company: string | null;
    required_hours: number | null;
    rendered_hours: number;
    remaining_hours: number | null;
    percent: number;
    last_log_at: string | null;
    status: "completed" | "in_progress" | "not_started";
};

export type AttendanceSummaryRow = {
    id: number;
    student_name: string;
    student_number: string;
    section: string | null;
    company: string | null;
    days_present: number;
    total_minutes: number;
    absences_filed: number;
    absences_awaiting: number;
    missed_punch_outs: number;
};

export type RequirementStatus = "approved" | "uploaded" | "rejected" | "pending" | "n/a";

export type RequirementsReport = {
    columns: { id: number; title: string }[];
    data: {
        id: number;
        student_name: string;
        student_number: string;
        section: string | null;
        statuses: Record<string, RequirementStatus>;
        approved: number;
        required: number;
    }[];
};

export type EvaluationRow = {
    student_name: string;
    student_number: string;
    section: string | null;
    company: string | null;
    evaluation: string | null;
    status: "submitted" | "pending" | "none";
    computed_score: number | null;
    submitted_at: string | null;
};

/* ── Hooks ─────────────────────────────────────────────────────── */

function qs(filters: ReportFilters) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
        if (v) q.set(k, v);
    }
    const s = q.toString();
    return s ? `?${s}` : "";
}

export function useReportOptions(token?: string | null) {
    return useQuery({
        queryKey: ["reports", "options"],
        queryFn: () => apiRequest<ReportOptions>("/reports/options", { token }),
        enabled: Boolean(token),
    });
}

/** One hook for every report; `path` is the segment after /reports/. */
export function useReport<T>(
    path: string,
    filters: ReportFilters,
    token?: string | null,
    enabled = true
) {
    return useQuery({
        queryKey: ["reports", path, filters],
        queryFn: () => apiRequest<T>(`/reports/${path}${qs(filters)}`, { token }),
        enabled: Boolean(token) && enabled,
    });
}