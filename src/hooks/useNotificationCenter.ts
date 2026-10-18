import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { echo } from '@/lib/echo'

// ── Types ─────────────────────────────────────────────────────────

/** Shape returned by GET /notifications (Laravel database notifications) */
type ApiNotification = {
  id: string // UUID
  type: string // e.g. "App\\Notifications\\EvaluationSubmitted"
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

/** Shape the UI uses */
export type AppNotification = {
  id: string
  title: string
  message: string | null
  /** In-app route to open on click, e.g. "/attendance" */
  link: string | null
  read_at: string | null
  created_at: string
}

// ── Mapping ───────────────────────────────────────────────────────

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

// "App\Notifications\EvaluationSubmittedNotification" -> "Evaluation Submitted"
function titleFromType(type: string): string {
  const base = type.split('\\').pop() ?? type
  return base
    .replace(/Notification$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim() || 'Notification'
}

// Absolute same-origin URLs become in-app routes so React Router can navigate to them
function toRoute(link: string | null): string | null {
  if (!link) return null
  try {
    const u = new URL(link, window.location.origin)
    return u.origin === window.location.origin ? u.pathname + u.search + u.hash : link
  } catch {
    return link
  }
}

function toAppNotification(n: ApiNotification): AppNotification {
  const d = n.data ?? {}
  return {
    id: n.id,
    title: str(d.title) ?? str(d.subject) ?? titleFromType(n.type),
    message: str(d.message) ?? str(d.body) ?? str(d.text),
    link: toRoute(str(d.link) ?? str(d.url) ?? str(d.action_url)),
    read_at: n.read_at,
    created_at: n.created_at,
  }
}

// ── Fetch ─────────────────────────────────────────────────────────

export async function fetchNotifications(token: string | null): Promise<AppNotification[]> {
  const rows = await apiRequest<ApiNotification[]>('/notifications', { token })
  return Array.isArray(rows) ? rows.map(toAppNotification) : []
}

// ── Who receives notifications on the web ─────────────────────────
// Roles that must NOT get the bell / realtime subscription.
// Use the exact value of `user.role.name` for interns in your roles table.
const NON_RECIPIENT_ROLES = ['intern', 'student']

export function canReceiveNotifications(roleName: string | null | undefined): boolean {
  return !!roleName && !NON_RECIPIENT_ROLES.includes(roleName)
}

// ── Hook ──────────────────────────────────────────────────────────

export function useNotificationCenter() {
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id
  const allowed = Boolean(token) && canReceiveNotifications(user?.role?.name)

  const query = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => fetchNotifications(token),
    enabled: allowed,
    // Realtime does the heavy lifting; this is only a safety net
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  // Real-time: Laravel broadcasts every database notification to the private
  // channel "App.Models.User.{id}". We reuse the shared `echo` instance, so we
  // only add/remove OUR listener and never disconnect or leave the channel
  // (other features may be listening on it too).
  useEffect(() => {
    if (!allowed || userId == null) return

    const channel = echo.private(`App.Models.User.${userId}`)
    const onNotification = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
      // Document pages use these literal keys (prefix match covers every filter variant)
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.submitted })
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.requirements })
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.courseRequirements })
    }

    channel.notification(onNotification)

    return () => {
      channel.stopListening(
        '.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated',
        onNotification,
      )
    }
  }, [allowed, userId, queryClient])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}/read`, { token, method: 'POST' }),
    onSuccess: invalidate,
  })

  const markAllRead = useMutation({
    mutationFn: () => apiRequest('/notifications/read-all', { token, method: 'POST' }),
    onSuccess: invalidate,
  })

  const notifications = query.data ?? []
  const unreadCount = notifications.filter((n) => !n.read_at).length

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markRead,
    markAllRead,
  }
}