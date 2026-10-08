import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────

export type WeeklyReportRow = {
  /** 'YYYY-MM-DD' string or Date */
  date: string | Date
  accomplishment: string
  hours: number
  /** Optional attachment photo (URL or data URL) */
  photoUrl?: string | null
}

export type WeeklyReportOptions = {
  studentName: string // e.g. "Ordaniza, Jhon Mark E."
  weekNo: number | string
  rows: WeeklyReportRow[]
  verifiedBy: { name: string; organization?: string } // student + company
  notedBy: { name: string; position?: string } // supervisor
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

// ── Look & feel (matches the sample) ──────────────────────────────

const ORANGE: [number, number, number] = [237, 125, 49]
const PEACH: [number, number, number] = [251, 228, 213]
const NAVY: [number, number, number] = [31, 56, 100]
const RULE_BLUE: [number, number, number] = [68, 114, 196]
const INK: [number, number, number] = [30, 30, 30]

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

// ── PDF ───────────────────────────────────────────────────────────

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } }

export async function exportWeeklyReportPdf(options: WeeklyReportOptions): Promise<void> {
  const {
    studentName,
    weekNo,
    rows,
    verifiedBy,
    notedBy,
    logos,
    fileName = `weekly-report-week-${weekNo}.pdf`,
  } = options

  const school = {
    name: options.school?.name ?? 'OPOL COMMUNITY COLLEGE',
    address: options.school?.address ?? 'Opol Misamis Oriental',
    college: options.school?.college ?? 'College of Information Technology',
    subject: options.school?.subject ?? 'IT405 – On-the-Job Training (OJT)',
  }

  // Load everything first so the document can be built synchronously
  const [leftLogo, rightLogo, ...photos] = await Promise.all([
    loadImage(logos?.left, 'image/png', 400),
    loadImage(logos?.right, 'image/png', 400),
    ...rows.map((r) => loadImage(r.photoUrl)),
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
    head: [['DATE', 'Accomplishments', 'No. of Hours', 'Attachments']],
    body: rows.map((r) => [
      format(typeof r.date === 'string' ? parseISO(r.date) : r.date, 'MM/dd/yyyy'),
      r.accomplishment,
      `${r.hours}hrs`,
      '',
    ]),
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
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: { fillColor: PEACH },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 50 },
    },
    didParseCell: (data) => {
      // Give rows with an attachment enough height for the photo
      if (
        data.section === 'body' &&
        data.column.index === 3 &&
        photos[data.row.index]
      ) {
        data.cell.styles.minCellHeight = PHOTO_ROW_HEIGHT
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 3) return
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

  doc.setTextColor(...INK).setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Verified by:', leftX, y)
  doc.text('Noted by:', rightX, y)

  doc.setFont('helvetica', 'bold')
  doc.text(verifiedBy.name.toUpperCase(), leftX, y + 14)
  doc.text(notedBy.name.toUpperCase(), rightX, y + 14)

  doc.setFontSize(8.5)
  if (verifiedBy.organization) {
    doc.text(verifiedBy.organization.toUpperCase(), leftX, y + 24)
  }
  if (notedBy.position) {
    doc.text(notedBy.position.toUpperCase(), rightX, y + 24)
  }

  doc.save(fileName)
}