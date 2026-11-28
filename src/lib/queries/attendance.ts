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

/* ── Attendance CSV import (coordinator) ──────────────────────── */

export interface AttendanceImportRow {
    file: string;
    row: number;
    company_name: string;
    student_number: string;
    student_name: string;
    date: string;
    time_in: string;
    break_out: string | null;
    break_in: string | null;
    time_out: string;
    task_note: string | null;
    /** Only "new" and "replace" rows are written */
    status: "new" | "replace" | "unchanged" | "protected";
    /** Why a protected row is skipped */
    reason: string | null;
    /** Saved values ("YYYY-MM-DD HH:mm") when a log already exists for that day */
    existing: {
        time_in: string | null;
        break_out: string | null;
        break_in: string | null;
        time_out: string | null;
        task_note: string | null;
    } | null;
}

export interface AttendanceImportError {
    file: string;
    row: number;
    message: string;
}

export interface AttendanceImportPreview {
    rows: AttendanceImportRow[];
    errors: AttendanceImportError[];
    total: number;
    /** Send back on commit to confirm the replacements; empty when there are none */
    replace_token: string;
}

/**
 * Two-step import of one or more CSVs. The server links rows by student number.
 *  - preview: validates the files and returns the rows + row errors (saves nothing)
 *  - commit:  re-validates and saves new and replaced logs in one transaction.
 *             Protected and unchanged rows are skipped. Replacing needs replaceToken.
 *
 * The files go up as multipart FormData. apiRequest must pass a FormData body
 * through untouched (no JSON.stringify, no forced Content-Type header).
 */
export function useImportAttendance(token?: string | null) {
    const queryClient = useQueryClient();
    const endpoint = "/attendance/import";

    const send = <T,>(files: File[], commit: boolean, replaceToken?: string) => {
        const form = new FormData();
        files.forEach((file) => form.append("files[]", file));
        form.append("commit", commit ? "1" : "0");
        if (replaceToken) form.append("replace_token", replaceToken);
        return apiRequest<T>(endpoint, { method: "POST", body: form, token });
    };

    const preview = useMutation({
        mutationFn: (files: File[]) => send<AttendanceImportPreview>(files, false),
    });

    const commit = useMutation({
        mutationFn: ({ files, replaceToken }: { files: File[]; replaceToken?: string }) =>
            send<{
                message: string;
                saved: number;
                replaced: number;
                unchanged: number;
                protected: number;
                date_from: string;
                date_to: string;
            }>(files, true, replaceToken),
        onSuccess: () => {
            // refresh the monitoring tables and any report built from time logs
            void queryClient.invalidateQueries({ queryKey: ["attendance-monitoring"] });
            void queryClient.invalidateQueries({ queryKey: ["absence-monitoring"] });
            void queryClient.invalidateQueries({ queryKey: ["reports"] });
        },
    });

    return { preview, commit };
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