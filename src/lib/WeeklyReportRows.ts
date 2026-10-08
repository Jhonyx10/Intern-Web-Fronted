import { addDays, differenceInCalendarWeeks, format, startOfWeek } from 'date-fns'
import type { TimeLog } from '@/types'
import type { WeeklyReportRow } from './weeklyReportPdf'

// ── Field mapping ─────────────────────────────────────────────────
// I haven't seen the TimeLog payload for tasks / photos, so these lists are
// best guesses. If the accomplishment text or photo is empty in the PDF,
// add your real field names here.
const TASK_FIELDS = [
  'task_description',
  'tasks',
  'task',
  'accomplishment',
  'accomplishments',
  'task_update',
  'notes',
  'remarks',
] as const

const PHOTO_LIST_FIELDS = ['task_photos', 'taskPhotos'] as const
const PHOTO_URL_FIELDS = [
  'url',
  'photo_url',
  'image_url',
  'path',
  'photo_path',
  'file_path',
] as const

type Loose = Record<string, unknown>

function pickString(obj: Loose, keys: readonly string[]): string {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

// Relative storage paths become absolute URLs on the API's origin (/storage/…)
function toPhotoUrl(value: string): string {
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  const api = import.meta.env.VITE_API_URL as string | undefined
  const origin = api ? new URL(api, window.location.origin).origin : window.location.origin
  return `${origin}/storage/${value.replace(/^\/+/, '').replace(/^storage\//, '')}`
}

function firstPhotoOf(log: Loose): string | null {
  for (const listKey of PHOTO_LIST_FIELDS) {
    const list = log[listKey]
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (typeof item === 'string' && item) return toPhotoUrl(item)
      if (item && typeof item === 'object') {
        const value = pickString(item as Loose, PHOTO_URL_FIELDS)
        if (value) return toPhotoUrl(value)
      }
    }
  }
  return null
}

// ── Helpers used by the page / modal ──────────────────────────────

export function getFirstLogDate(timeLogs: TimeLog[]): Date | null {
  if (timeLogs.length === 0) return null
  return new Date(Math.min(...timeLogs.map((l) => new Date(l.time_in).getTime())))
}

export function getLatestLogDate(timeLogs: TimeLog[]): Date | null {
  if (timeLogs.length === 0) return null
  return new Date(Math.max(...timeLogs.map((l) => new Date(l.time_in).getTime())))
}

/** Week 1 = the (Mon–Sun) week of the student's first time log. */
export function suggestWeekNo(firstLogDate: Date | null, weekDate: Date): number {
  if (!firstLogDate) return 1
  return Math.max(
    1,
    differenceInCalendarWeeks(weekDate, firstLogDate, { weekStartsOn: 1 }) + 1,
  )
}

/**
 * One row per weekday (Mon–Fri) of the week containing `weekDate`.
 * Saturday / Sunday are only included when the student logged time on them.
 */
export function buildWeeklyReportRows(
  timeLogs: TimeLog[],
  weekDate: Date,
): WeeklyReportRow[] {
  const monday = startOfWeek(weekDate, { weekStartsOn: 1 })

  const logsByDay = new Map<string, TimeLog[]>()
  for (const log of timeLogs) {
    const key = format(new Date(log.time_in), 'yyyy-MM-dd')
    const list = logsByDay.get(key) ?? []
    list.push(log)
    logsByDay.set(key, list)
  }

  const rows: WeeklyReportRow[] = []

  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i)
    const logs = (logsByDay.get(format(day, 'yyyy-MM-dd')) ?? []).sort(
      (a, b) => new Date(a.time_in).getTime() - new Date(b.time_in).getTime(),
    )
    const isWeekend = i >= 5
    if (isWeekend && logs.length === 0) continue

    const minutes = logs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0)

    const tasks = Array.from(
      new Set(
        logs
          .map((l) => pickString(l as unknown as Loose, TASK_FIELDS))
          .filter(Boolean),
      ),
    )

    let photoUrl: string | null = null
    for (const log of logs) {
      photoUrl = firstPhotoOf(log as unknown as Loose)
      if (photoUrl) break
    }

    rows.push({
      date: day,
      accomplishment:
        logs.length === 0
          ? 'No time log recorded.'
          : tasks.length > 0
            ? tasks.join('\n')
            : 'No accomplishment recorded.',
      hours: Math.round((minutes / 60) * 10) / 10,
      photoUrl,
    })
  }

  return rows
}