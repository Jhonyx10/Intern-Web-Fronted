import { addDays, differenceInCalendarWeeks, format, startOfWeek } from 'date-fns'
import type { TimeLog } from '@/types'
import type { WeeklyReportRow, WeeklyReportSession } from './weeklyReportPdf'

// ── Field mapping ─────────────────────────────────────────────────
// If the accomplishment text or photo is empty in the PDF, add your real
// field names here.
const TASK_FIELDS = [
  'task_note',
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
  'file_url',
  'url',
  'photo_url',
  'image_url',
  'path',
  'photo_path',
  'file_path',
] as const

type Loose = Record<string, unknown>
type SessionKey = 'morning' | 'afternoon'

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

// ── Task note: "[Morning] … [Afternoon] …" → separate sessions ────

function parseTaskNote(note: string) {
  const result = {
    morning: '',
    afternoon: '',
    general: '',
  }

  const parts = note.split(/\[(Morning|Afternoon)\]\s*/i)
  // parts: [leading text, "Morning", text, "Afternoon", text, ...]
  result.general = (parts[0] ?? '').trim()

  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].toLowerCase() as SessionKey
    result[key] = (parts[i + 1] ?? '').trim()
  }
  return result
}

// ── Photos: work out which session each one belongs to ────────────

function photoSessionOf(item: Loose, breakIn: string): SessionKey {
  // 1. The API says so
  const raw = String(item.session ?? item.period ?? '').toLowerCase()
  if (raw.startsWith('morn')) return 'morning'
  if (raw.startsWith('after')) return 'afternoon'

  // 2. Otherwise compare when it was uploaded with when the break ended
  const stamp = pickString(item, ['submitted_at', 'created_at', 'updated_at'])
  if (stamp && breakIn) {
    const uploaded = Date.parse(stamp)
    const resumed = Date.parse(breakIn)
    if (!Number.isNaN(uploaded) && !Number.isNaN(resumed)) {
      return uploaded >= resumed ? 'afternoon' : 'morning'
    }
  }

  return 'morning'
}

function photosBySession(log: Loose, breakIn: string) {
  const found: Partial<Record<SessionKey, string>> = {}

  for (const listKey of PHOTO_LIST_FIELDS) {
    const list = log[listKey]
    if (!Array.isArray(list)) continue

    for (const item of list) {
      let url = ''
      let session: SessionKey = 'morning'

      if (typeof item === 'string' && item) {
        url = toPhotoUrl(item)
      } else if (item && typeof item === 'object') {
        const value = pickString(item as Loose, PHOTO_URL_FIELDS)
        if (value) url = toPhotoUrl(value)
        session = photoSessionOf(item as Loose, breakIn)
      }

      if (url && !found[session]) found[session] = url
    }
  }

  return found
}

// ── Per-session accumulator (a day can have more than one log) ────

type Acc = {
  present: boolean
  start: number | null
  end: number | null
  minutes: number
  notes: Set<string>
  photoUrl: string | null
}

const newAcc = (): Acc => ({
  present: false,
  start: null,
  end: null,
  minutes: 0,
  notes: new Set(),
  photoUrl: null,
})

function addRange(acc: Acc, startIso: string, endIso: string) {
  const start = Date.parse(startIso)
  if (Number.isNaN(start)) return

  acc.present = true
  acc.start = acc.start === null ? start : Math.min(acc.start, start)

  if (!endIso) return
  const end = Date.parse(endIso)
  if (Number.isNaN(end)) return

  acc.end = acc.end === null ? end : Math.max(acc.end, end)
  acc.minutes += Math.max(0, Math.round((end - start) / 60000))
}

function toSession(acc: Acc): WeeklyReportSession {
  const hasRange = acc.present && acc.start !== null
  return {
    present: acc.present,
    task_note: acc.present
      ? Array.from(acc.notes).join('\n') || 'No accomplishment recorded.'
      : '—',
    hours: Math.round((acc.minutes / 60) * 10) / 10,
    timeRange: hasRange
      ? `${format(acc.start as number, 'h:mm a')} – ${
          acc.end !== null ? format(acc.end, 'h:mm a') : 'ongoing'
        }`
      : undefined,
    photoUrl: acc.photoUrl,
  }
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
 * One entry per weekday (Mon–Fri) of the week containing `weekDate`, each with
 * a morning and an afternoon session. Saturday / Sunday are only included when
 * the student logged time on them.
 *
 *   Morning   = time in  → break out (or time out if there was no break)
 *   Afternoon = break in → time out
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

    if (logs.length === 0) {
      rows.push({ date: day, empty: true })
      continue
    }

    const morning = newAcc()
    const afternoon = newAcc()

    for (const log of logs) {
      const l = log as unknown as Loose
      const str = (key: string) => (typeof l[key] === 'string' ? (l[key] as string) : '')

      const timeIn = str('time_in')
      const breakOut = str('break_out')
      const breakIn = str('break_in')
      const timeOut = str('time_out')

      // Hours / time ranges
      addRange(morning, timeIn, breakOut || timeOut)
      if (breakIn) addRange(afternoon, breakIn, timeOut)

      // Task notes, split by their [Morning] / [Afternoon] tags
      const rawNote = pickString(l, TASK_FIELDS)
      if (rawNote) {
        const note = parseTaskNote(rawNote)
        if (note.morning) {
          morning.present = true
          morning.notes.add(note.morning)
        }
        if (note.afternoon) {
          afternoon.present = true
          afternoon.notes.add(note.afternoon)
        }
        if (note.general) {
          // An untagged note belongs to the day: show it under the morning
          morning.present = true
          morning.notes.add(note.general)
        }
      }

      // Photos
      const photos = photosBySession(l, breakIn)
      if (photos.morning && !morning.photoUrl) morning.photoUrl = photos.morning
      if (photos.afternoon && !afternoon.photoUrl) afternoon.photoUrl = photos.afternoon
    }

    rows.push({
      date: day,
      morning: toSession(morning),
      afternoon: toSession(afternoon),
    })
  }

  return rows
}