import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiRequest } from "@/lib/api";
import type { InternDetailAbsence } from "@/lib/queries/supervisor";

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

// Same shape the supervisor page uses, plus the student columns
export interface AbsenceRecord extends InternDetailAbsence {
    student_id: number;
    student_name: string;
    student_number: string;
    course_code: string;
    section_code: string;
}

export interface AttendanceFilterParams {
    range?: "today" | "week" | "month" | "custom";
    search?: string;
    section_id?: number | string;
    date_from?: string;
    date_to?: string;
}

function buildQueryString(params: AttendanceFilterParams) {
    const q = new URLSearchParams();
    if (params.range) q.set("range", params.range);
    if (params.search) q.set("search", params.search);
    if (params.section_id) q.set("section_id", String(params.section_id));
    if (params.date_from) q.set("date_from", params.date_from);
    if (params.date_to) q.set("date_to", params.date_to);
    const s = q.toString();
    return s ? `?${s}` : "";
}

export function useAttendanceMonitoring(
    params: AttendanceFilterParams,
    token?: string | null,
    options?: { enabled?: boolean }
) {
    const endpoint = `/attendance-monitoring${buildQueryString(params)}`;

    return useQuery({
        queryKey: ["attendance-monitoring", params],
        queryFn: () => apiRequest<AttendanceRecord[]>(endpoint, { token }),
        enabled: options?.enabled ?? true,
    });
}

export function useAbsenceMonitoring(
    params: AttendanceFilterParams,
    token?: string | null,
    options?: { enabled?: boolean }
) {
    const endpoint = `/attendance-monitoring/absences${buildQueryString(params)}`;

    return useQuery({
        queryKey: ["absence-monitoring", params],
        queryFn: () => apiRequest<AbsenceRecord[]>(endpoint, { token }),
        enabled: options?.enabled ?? true,
    });
}

export interface AppNotification {
    id: string;
    type: string;
    data: { category?: string; absence_id?: number;[key: string]: unknown };
    read_at: string | null;
    created_at: string;
}

// Unread "absence filed" notifications for the logged-in user (drives the badge).
// Same key and endpoint as useNotificationsQuery, so React Query shares one cache.
export function useUnreadAbsenceNotifications(token?: string | null) {
    return useQuery({
        queryKey: queryKeys.notifications.list(),
        queryFn: () => apiRequest<AppNotification[]>("/notifications", { token }),
        select: (rows) =>
            rows.filter((n) => !n.read_at && n.data?.category === "absence_filed"),
        enabled: Boolean(token),
        refetchInterval: 30_000, // fallback if the websocket misses an event
    });
}

export function useMarkNotificationRead(token?: string | null) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            apiRequest(`/notifications/${id}/read`, { method: "PATCH", token }),
        onSuccess: () => {
            // refreshes the badge, the bell, and any other notification list
            void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}