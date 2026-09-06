import { ApiError } from '@/lib/api'

// Pulls the friendliest message out of an ApiError — prefers a field-specific
// validation message over the generic one, since that's what the person
// actually needs to fix.
export function firstErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const fieldMessage = Object.values(err.errors).flat()[0]
    return fieldMessage ?? err.message ?? fallback
  }
  return fallback
}