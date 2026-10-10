import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface AttendanceRecord {
    id: number;
    student_id: number;
    student_name: string;
    student_number: string;
    course_code: string;
    section_code: string;
    time_in: string | null;
    break_out: string | null;
    break_in: string | null;
    time_out: string | null;
    duration_minutes: number | null;
    verification_method: string | null;
    face_match_score: string | null;
    task_note: string | null;
    session_period: string;
    status: string;
}

export interface AttendanceFilterParams {
    range?: "today" | "week" | "month" | "custom";
    search?: string;
    section_id?: number | string;
    date_from?: string;
    date_to?: string;
}

export function useAttendanceMonitoring(params: AttendanceFilterParams, token?: string | null) {
    const queryParams = new URLSearchParams();
    if (params.range) queryParams.set("range", params.range);
    if (params.search) queryParams.set("search", params.search);
    if (params.section_id) queryParams.set("section_id", String(params.section_id));
    if (params.date_from) queryParams.set("date_from", params.date_from);
    if (params.date_to) queryParams.set("date_to", params.date_to);

    const queryString = queryParams.toString();
    const endpoint = `/attendance-monitoring${queryString ? `?${queryString}` : ""}`;

    return useQuery({
        queryKey: ["attendance-monitoring", params],
        queryFn: () => apiRequest<AttendanceRecord[]>(endpoint, { token }),
    });
}
