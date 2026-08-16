const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
}

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      payload.message ??
      Object.values(payload.errors ?? {}).flat()[0] ??
      'Request failed.'

    throw new ApiError(String(message), response.status, payload.errors ?? {})
  }

  return payload as T
}
