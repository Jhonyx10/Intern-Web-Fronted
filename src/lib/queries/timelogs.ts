import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
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
  correction_reason?: string | null;
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

/* ───────────── Coordinator face review ───────────── */

export type FaceReviewStatus = "verified" | "rejected";

/** Which punch is being reviewed (the stored TimeLogPunchPhoto session). */
export type FaceReviewSession = "time_in" | "time_out";

/** One punch (time in or time out), reviewed on its own. */
export interface FaceReviewPunch {
  id: number;
  session: FaceReviewSession;
  has_photo: boolean;
  face_match_score: number | null;
  review: {
    status: FaceReviewStatus | null;
    note: string | null;
    verified_by: string | null;
    verified_at: string | null;
  };
}

export interface FaceReview {
  time_log_id: number;
  student: { id: number; name: string; student_number: string | null };
  time_in: string | null;
  time_out: string | null;
  has_enrolled_photo: boolean;
  punches: {
    time_in: FaceReviewPunch | null;
    time_out: FaceReviewPunch | null;
  };
  /** Overall result for the log (derived from its punch photos) */
  review_status: FaceReviewStatus | null;
}

// Shared prefix so one invalidate refreshes both the single review and the pending list
const FACE_REVIEW_ROOT = "time-log-face-review";
const faceReviewKey = (id: number | null) => [FACE_REVIEW_ROOT, id] as const;

/**
 * Both punch photos, their match scores and the coordinator's review of each
 * for one time log (TimeLogFaceReviewController::show). Only coordinators and
 * super admins may call it, so pass enabled = false for anyone else.
 */
export function useFaceReview(id: number | null, enabled = true) {
  const { token } = useAuth();

  return useQuery({
    queryKey: faceReviewKey(id),
    queryFn: () =>
      apiRequest<FaceReview>(`/time-logs/${id}/face-review`, { token }),
    enabled: Boolean(token && id && enabled),
  });
}

/**
 * The coordinator confirms, or rejects, that the person in ONE punch photo
 * (time in or time out) is the student.
 */
export function useSubmitFaceReview(id: number | null) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      session: FaceReviewSession;
      status: FaceReviewStatus;
      note?: string;
    }) => {
      if (!token) throw new Error("Not authenticated.");
      const { session, ...body } = input;
      return apiRequest(`/time-logs/${id}/face-review/${session}`, {
        method: "POST",
        token,
        body,
      });
    },
    onSuccess: () => {
      // Refreshes this log's review AND the pending list (it drops once reviewed)
      void queryClient.invalidateQueries({ queryKey: [FACE_REVIEW_ROOT] });
      toastMutationSuccess("Review saved");
    },
    onError: (error) => toastMutationError(error, "Failed to save review"),
  });
}

/* ───────────── Pending reviews ───────────── */

/** One row per punch photo that nobody has reviewed yet. */
export interface PendingFaceReviewItem {
  id: number; // punch photo id
  time_log_id: number;
  session: FaceReviewSession;
  student: {
    id: number;
    first_name: string;
    last_name: string;
    student_number: string | null;
  } | null;
  /** time in for a time_in photo, time out for a time_out photo */
  punched_at: string | null;
  face_match_score: number | null;
}

export interface PendingFaceReviews {
  data: PendingFaceReviewItem[];
  total: number;
}

/**
 * Punch photos nobody has reviewed yet
 * (TimeLogFaceReviewController::pending). Coordinators see their own
 * section's photos; super admins see all.
 */
export function usePendingFaceReviews(page = 1, perPage = 25, enabled = true) {
  const { token } = useAuth();

  return useQuery({
    queryKey: [FACE_REVIEW_ROOT, "pending", page, perPage] as const,
    queryFn: () =>
      apiRequest<PendingFaceReviews>(
        `/face-reviews?page=${page}&per_page=${perPage}`,
        { token }
      ),
    enabled: Boolean(token && enabled),
  });
}