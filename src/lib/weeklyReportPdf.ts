import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { RowInput, Styles } from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────

export type WeeklyReportSession = {
  /** false when the student has no time recorded for this session */
  present: boolean
  task_note: string
  hours: number
  /** e.g. "8:00 AM – 12:00 PM" */
  timeRange?: string
  /** Optional attachment photo (URL or data URL) */
  photoUrl?: string | null
}

export type WeeklyReportRow = {
  /** 'YYYY-MM-DD' string or Date */
  date: string | Date
  morning?: WeeklyReportSession
  afternoon?: WeeklyReportSession
  /** true when there is no time log for the day */
  empty?: boolean
  /** Legacy single-row fields (used only when morning/afternoon are missing) */
  task_note?: string
  hours?: number
  photoUrl?: string | null
}

export type WeeklyReportOptions = {
  studentName: string // e.g. "Ordaniza, Jhon Mark E."
  weekNo: number | string
  rows: WeeklyReportRow[]
  /** Left signature — company supervisor */
  supervisorBy: { name: string; title?: string | null; organization?: string }
  /** Right signature — the student intern */
  studentBy: { name: string }
  school?: {
    name?: string
    address?: string
    college?: string
    subject?: string
  }
  /** URLs or data URLs. webp is fine, it is converted through a canvas. */
  logos?: { left?: string | null; right?: string | null }
  fileName?: string
}

type LoadedImage = { dataUrl: string; width: number; height: number }
type RGB = [number, number, number]

// ── Look & feel (matches the sample) ──────────────────────────────

const ORANGE: RGB = [237, 125, 49]
const PEACH: RGB = [251, 228, 213]
const WHITE: RGB = [255, 255, 255]
const NAVY: RGB = [31, 56, 100]
const RULE_BLUE: RGB = [68, 114, 196]
const INK: RGB = [30, 30, 30]
const MUTED: RGB = [120, 120, 120]

const MARGIN = 18
const PHOTO_ROW_HEIGHT = 30 // mm, rows that have an attachment

// ── Image helpers ─────────────────────────────────────────────────

/**
 * Loads any browser-supported image (png, jpg, webp…) and re-encodes it through
 * a canvas so jsPDF can embed it. Resolves to null if loading fails
 * (e.g. the image host does not send CORS headers), so the PDF still exports.
 */
export function loadImage(
  src: string | null | undefined,
  mime: 'image/jpeg' | 'image/png' = 'image/jpeg',
  maxPx = 900,
): Promise<LoadedImage | null> {
  if (!src) return Promise.resolve(null)

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight))
        const width = Math.max(1, Math.round(img.naturalWidth * scale))
        const height = Math.max(1, Math.round(img.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        if (mime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff' // JPEG has no transparency
          ctx.fillRect(0, 0, width, height)
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve({ dataUrl: canvas.toDataURL(mime, 0.85), width, height })
      } catch {
        resolve(null) // tainted canvas etc.
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function fit(img: LoadedImage, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / img.width, maxH / img.height)
  return { w: img.width * ratio, h: img.height * ratio }
}

// ── Table body ────────────────────────────────────────────────────

const cell = (content: string, fill: RGB, extra: Partial<Styles> = {}) => ({
  content,
  styles: { fillColor: fill, ...extra } as Partial<Styles>,
})

const roundHours = (value: number) => Math.round(value * 10) / 10

/**
 * Each day becomes two rows (Morning, Afternoon) sharing one date cell.
 * Days without a log become one "No time log recorded." row.
 * `photoUrls` lines up 1:1 with the body rows so images can be drawn later.
 */
function buildBody(rows: WeeklyReportRow[]) {
  const body: RowInput[] = []
  const photoUrls: (string | null)[] = []
  let totalHours = 0

  rows.forEach((r, dayIdx) => {
    const fill = dayIdx % 2 === 0 ? PEACH : WHITE
    const dateStr = format(typeof r.date === 'string' ? parseISO(r.date) : r.date, 'MM/dd/yyyy')
    const dateStyles: Partial<Styles> = { halign: 'center', fontStyle: 'bold', valign: 'middle' }

    if (r.empty) {
      body.push([
        cell(dateStr, fill, dateStyles),
        {
          ...cell('No time log recorded.', fill, {
            halign: 'center',
            fontStyle: 'italic',
            textColor: MUTED,
          }),
          colSpan: 4, // spans Session through Attachments
        },
      ])
      photoUrls.push(null)
      return
    }

    if (r.morning || r.afternoon) {
      const sessions: [string, WeeklyReportSession][] = [
        ['Morning', r.morning ?? { present: false, task_note: '—', hours: 0 }],
        ['Afternoon', r.afternoon ?? { present: false, task_note: '—', hours: 0 }],
      ]

      sessions.forEach(([label, s], i) => {
        totalHours += s.hours
        const sessionCell = cell(
          s.timeRange ? `${label}\n${s.timeRange}` : label,
          fill,
          { halign: 'center', fontStyle: 'bold', fontSize: 8 },
        )
        const noteCell = cell(
          s.task_note,
          fill,
          s.present ? { halign: 'left' } : { halign: 'left', textColor: MUTED, fontStyle: 'italic' },
        )
        const hoursCell = cell(s.present ? `${s.hours}hrs` : '—', fill, {
          halign: 'center',
          fontStyle: 'bold',
        })
        const photoCell = cell('', fill)

        if (i === 0) {
          // The date cell spans both session rows
          const dateCell = { ...cell(dateStr, fill, dateStyles), rowSpan: 2 }
          body.push([dateCell, sessionCell, noteCell, hoursCell, photoCell])
        } else {
          body.push([sessionCell, noteCell, hoursCell, photoCell])
        }
        photoUrls.push(s.photoUrl ?? null)
      })
      return
    }

    // Legacy single-row input
    const hours = r.hours ?? 0
    totalHours += hours
    body.push([
      cell(dateStr, fill, dateStyles),
      cell('Whole day', fill, { halign: 'center', fontSize: 8 }),
      cell(r.task_note ?? '', fill, { halign: 'left' }),
      cell(`${hours}hrs`, fill, { halign: 'center', fontStyle: 'bold' }),
      cell('', fill),
    ])
    photoUrls.push(r.photoUrl ?? null)
  })

  // Weekly total
  const totalStyles: Partial<Styles> = { fontStyle: 'bold', textColor: WHITE }
  body.push([
    { ...cell('TOTAL HOURS', ORANGE, { ...totalStyles, halign: 'right' }), colSpan: 3 },
    cell(`${roundHours(totalHours)}hrs`, ORANGE, { ...totalStyles, halign: 'center' }),
    cell('', ORANGE),
  ])
  photoUrls.push(null)

  return { body, photoUrls }
}

// ── PDF ───────────────────────────────────────────────────────────

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } }

export async function exportWeeklyReportPdf(options: WeeklyReportOptions): Promise<void> {
  const {
    studentName,
    weekNo,
    rows,
    supervisorBy,
    studentBy,
    logos,
    fileName = `weekly-report-week-${weekNo}.pdf`,
  } = options

  const school = {
    name: options.school?.name ?? 'OPOL COMMUNITY COLLEGE',
    address: options.school?.address ?? 'Opol Misamis Oriental',
    college: options.school?.college ?? 'College of Information Technology',
    subject: options.school?.subject ?? 'IT405 – On-the-Job Training (OJT)',
  }

  const { body, photoUrls } = buildBody(rows)

  // Load everything first so the document can be built synchronously
  const [leftLogo, rightLogo, ...photos] = await Promise.all([
    loadImage(logos?.left, 'image/png', 400),
    loadImage(logos?.right, 'image/png', 400),
    ...photoUrls.map((url) => loadImage(url)),
  ])

  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as DocWithTable
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  function drawHeader() {
    const logoBox = 20
    if (leftLogo) {
      const { w, h } = fit(leftLogo, logoBox, logoBox)
      doc.addImage(leftLogo.dataUrl, 'PNG', MARGIN + 4, 10 + (logoBox - h) / 2, w, h)
    }
    if (rightLogo) {
      const { w, h } = fit(rightLogo, logoBox, logoBox)
      doc.addImage(
        rightLogo.dataUrl,
        'PNG',
        pageW - MARGIN - 4 - w,
        10 + (logoBox - h) / 2,
        w,
        h,
      )
    }

    const cx = pageW / 2
    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...NAVY)
    doc.text(school.name, cx, 16, { align: 'center' })

    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...NAVY)
    doc.text(school.address, cx, 20.5, { align: 'center' })

    doc.setFontSize(9.5)
    doc.text(school.college, cx, 25.5, { align: 'center' })

    doc.setFontSize(7.5).setTextColor(90, 90, 90)
    doc.text(school.subject, cx, 30, { align: 'center' })
    doc.text('WEEKLY REPORT', cx, 33.5, { align: 'center' })

    doc.setDrawColor(...RULE_BLUE).setLineWidth(0.8)
    doc.line(MARGIN, 37, pageW - MARGIN, 37)
  }

  // ── Page 1: header + student info ──
  drawHeader()

  doc.setFontSize(10).setTextColor(...INK)
  doc.setFont('helvetica', 'normal')
  doc.text('Name of Student:', MARGIN + 4, 47)
  doc.setFont('helvetica', 'bold')
  doc.text(studentName, MARGIN + 4 + doc.getTextWidth('Name of Student:  '), 47)

  doc.setFont('helvetica', 'normal')
  doc.text('Week No.:', MARGIN + 4, 54)
  doc.setFont('helvetica', 'bold')
  doc.text(String(weekNo), MARGIN + 4 + doc.getTextWidth('Week No.:  '), 54)

  // ── Table ──
  autoTable(doc, {
    startY: 60,
    margin: { top: 44, left: MARGIN, right: MARGIN, bottom: 20 },
    head: [['DATE', 'Session', 'Accomplishments', 'No. of Hours', 'Attachments']],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: INK,
      cellPadding: 3,
      valign: 'middle',
      lineColor: ORANGE,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: ORANGE,
      textColor: WHITE,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26 },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 20 },
      4: { cellWidth: 46 },
    },
    didParseCell: (data) => {
      // Give rows with an attachment enough height for the photo
      if (
        data.section === 'body' &&
        data.column.index === 4 &&
        photos[data.row.index]
      ) {
        data.cell.styles.minCellHeight = PHOTO_ROW_HEIGHT
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 4) return
      const img = photos[data.row.index]
      if (!img) return
      const pad = 2
      const { w, h } = fit(img, data.cell.width - pad * 2, data.cell.height - pad * 2)
      doc.addImage(
        img.dataUrl,
        'JPEG',
        data.cell.x + (data.cell.width - w) / 2,
        data.cell.y + (data.cell.height - h) / 2,
        w,
        h,
      )
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader()
    },
  })

  // ── Signatures ──
  let y = (doc.lastAutoTable?.finalY ?? 100) + 14
  if (y + 36 > pageH - 10) {
    doc.addPage()
    drawHeader()
    y = 50
  }

  const leftX = MARGIN + 8
  const rightX = pageW - MARGIN - 62

  // Labels
  doc.setTextColor(...INK).setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Noted by:', leftX, y)
  doc.text('Prepared by:', rightX, y)

  // Signature lines
  doc.setDrawColor(...MUTED).setLineWidth(0.4)
  doc.line(leftX, y + 18, leftX + 70, y + 18)
  doc.line(rightX, y + 18, rightX + 70, y + 18)

  // Names
  doc.setFont('helvetica', 'bold').setFontSize(9)
  doc.text(supervisorBy.name.toUpperCase(), leftX, y + 14)
  doc.text(studentBy.name.toUpperCase(), rightX, y + 14)

  // Sub-labels (position + company name | Intern)
  doc.setFont('helvetica', 'normal').setFontSize(8.5)
  let subY = y + 24
  if (supervisorBy.title) {
    doc.text(supervisorBy.title.toUpperCase(), leftX, subY)
    subY += 4
  }
  if (supervisorBy.organization) {
    doc.text(supervisorBy.organization.toUpperCase(), leftX, subY)
  }
  doc.text('INTERN', rightX, y + 24)

  doc.save(fileName)
}