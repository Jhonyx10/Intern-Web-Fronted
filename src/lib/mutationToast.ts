import { toast } from '@/components/Toaster'
import { ApiError } from '@/lib/api'

export function getMutationErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ApiError) {
    const firstValidation = Object.values(error.errors).flat()[0]
    if (firstValidation) return String(firstValidation)
    return error.message || fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function toastMutationSuccess(message: string, description?: string) {
  toast.success(message, description)
}

export function toastMutationError(error: unknown, fallbackMessage: string) {
  const detail = getMutationErrorMessage(error, fallbackMessage)
  if (detail === fallbackMessage) {
    toast.error(fallbackMessage)
  } else {
    toast.error(fallbackMessage, detail)
  }
}
