import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export interface TimeLogTaskPhoto {
  id: number;
  time_log_id: number;
  student_id: number;
  file_path: string;
  file_url: string | null;
  original_filename: string;
  file_size: number;
  mime_type: string;
  status: "draft" | "submitted";
  submitted_at: string | null;
}

export interface TimeLogStudent {
  id: number;
  name: string;
  student_number?: string;
}

export interface TimeLogDetails {
  id: number;
  student_id: number;
  session_period: string;
  task_note: string | null;
  time_in: string | null;
  break_out: string | null;
  break_in: string | null;
  time_out: string | null;
  duration_minutes: number | null;
  verification_method: string | null;
  face_match_score: string | null;
  device_info: string | null;
  task_photos: TimeLogTaskPhoto[];
  student?: TimeLogStudent;
}

/**
 * Fetches a single time log, including its task photos and the
 * associated student, for display in the details modal.
 *
 * Adjust the endpoint below to match your actual route
 * (registered against TimeLogController::timeLogDetails).
 */
export function useTimeLogDetails(id: number | null) {
  return useQuery({
    queryKey: id !== null ? queryKeys.timeLogs.detail(id) : queryKeys.timeLogs.all,
    queryFn: () => apiRequest<TimeLogDetails>(`/time-logs/${id}/details`),
    enabled: id !== null,
  });
}