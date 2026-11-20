import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export type ReportFilters = {
    /** Minimum absences, for the frequent absentees report */
    min?: string;
    /** Missed punch-outs: "all" also lists corrected ones */
    status?: string;
    course_id?: string;
    section_id?: string;
    company_id?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
};

export type ReportOptions = {
    sections: { id: number; name: string; course_code: string | null }[];
    companies: { id: number; name: string }[];
    /** Only filled for the super admin */
    courses: { id: number; code: string; name: string }[];
    can_filter_course: boolean;
    /** e.g. "CIT only", "Your sections only", "All departments" */
    scope: string;
    /** Which kind of user is looking, used for the PDF header */
    scope_type: "coordinator" | "dean" | "super_admin";
    /** The dean's own course code */
    course_code: string | null;
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
    late_logs: number;
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

export type PlacementRow = {
    id: number;
    company: string;
    address: string | null;
    active_interns: number;
    inactive_interns: number;
    supervisors: string;
};

export type UnassignedRow = {
    id: number;
    student_name: string;
    student_number: string;
    section: string | null;
    status: "unassigned" | "removed" | "ended";
    last_company: string | null;
    reason: string | null;
    date: string | null;
};

export type WorkloadRow = {
    id: number;
    supervisor: string | null;
    email: string | null;
    company: string | null;
    position_title: string | null;
    assigned_interns: number;
    company_interns: number;
    pending_schedules: number;
    logs_to_fix: number;
};

export type ScheduleRequestRow = {
    id: number;
    student_name: string;
    student_number: string;
    company: string | null;
    requested_at: string | null;
    start_date: string | null;
    time_in: string | null;
    time_out: string | null;
    hours_per_day: number | null;
    days_per_week: number | null;
    reason: string | null;
    status: "pending" | "approved" | "rejected";
    turnaround_days: number | null;
};

export type VerificationRow = {
    id: number;
    student_name: string;
    student_number: string;
    section: string | null;
    total_logs: number;
    face_verified: number;
    supervisor_created: number;
    supervisor_corrected: number;
    auto_closed: number;
    other: number;
    face_percent: number;
};

export type ManualLogRow = {
    id: number;
    student_name: string;
    student_number: string;
    company: string | null;
    time_in: string | null;
    time_out: string | null;
    duration_minutes: number | null;
    type: "supervisor_created" | "supervisor_corrected" | "auto_closed_missed_punch_out";
    reason: string | null;
    system_note: string | null;
};

export type FaceScoreRow = {
    id: number;
    student_name: string;
    student_number: string;
    time_in: string | null;
    score: number;
    limit: number;
    margin: number;
    closeness: number;
};

export type CompletionRow = {
    id: number;
    student_name: string;
    student_number: string;
    section: string | null;
    company: string | null;
    required_hours: number;
    rendered_hours: number;
    completed_on: string | null;
    docs_approved: number;
    docs_total: number;
    evaluations_pending: number;
    clearance_ready: boolean;
    blockers: string;
};

export type NearingRow = {
    id: number;
    student_name: string;
    student_number: string;
    section: string | null;
    company: string | null;
    required_hours: number;
    rendered_hours: number;
    remaining_hours: number;
    percent: number;
    avg_hours_per_day: number | null;
    est_finish: string | null;
    last_log_at: string | null;
};

export type WeekStatus = "approved" | "uploaded" | "rejected" | "missing" | "upcoming";

export type WeeklyReport = {
    columns: { id: string; title: string }[];
    data: {
        id: number;
        student_name: string;
        student_number: string;
        section: string | null;
        weeks: Record<string, WeekStatus>;
        submitted: number;
        expected: number;
    }[];
};

export type FollowUpRow = {
    id: number;
    student_name: string;
    student_number: string;
    section: string | null;
    requirement: string | null;
    schedule: "once" | "weekly";
    period: string | null;
    issue: "missing" | "rejected";
    reason: string | null;
    uploaded_at: string | null;
};

export type AbsenteeRow = {
    id: number;
    student_name: string;
    student_number: string;
    section: string | null;
    company: string | null;
    total_absences: number;
    filed: number;
    filed_with_proof: number;
    awaiting: number;
    dates: string;
};

export type PunctualityRow = {
    id: number;
    student_name: string;
    student_number: string;
    section: string | null;
    total_logs: number;
    early: number;
    on_time: number;
    late: number;
    unrecorded: number;
    late_percent: number;
};

export type MissedPunchOutRow = {
    id: number;
    student_name: string;
    student_number: string;
    company: string | null;
    time_in: string | null;
    time_out: string | null;
    status: "open" | "no_reason" | "reason_filed" | "corrected";
    days_waiting: number | null;
    reason: string | null;
    system_note: string | null;
};

export type GeofenceRow = {
    id: number;
    student_name: string;
    student_number: string;
    company: string | null;
    exit_at: string | null;
    return_at: string | null;
    duration_seconds: number | null;
    max_distance_m: number | null;
    status: string; // "completed" | still-open values
    reason: string | null;
};

export type SectionSummaryRow = {
    id: number;
    course_code: string | null;
    section: string;
    coordinator: string | null;
    is_total: boolean;
    interns: number;
    placed: number;
    completed: number;
    completion_rate: number | null;
    avg_progress: number | null;
    absences: number;
    absence_rate: number | null;
    late_rate: number | null;
    docs_compliance: number | null;
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

export function useReportOptions(
    token?: string | null,
    filters: Pick<ReportFilters, "course_id"> = {}
) {
    return useQuery({
        queryKey: ["reports", "options", filters],
        queryFn: () => apiRequest<ReportOptions>(`/reports/options${qs(filters)}`, { token }),
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