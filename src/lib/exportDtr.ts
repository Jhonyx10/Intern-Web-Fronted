import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { toast } from "@/components/Toaster";
import { logoWidthFor, scopeText, type PdfBranding } from "@/lib/pdf-branding";
import type { PdfResult } from "@/lib/pdf-result"

/* ── Date range filter ────────────────────────────────────────── */

export type DateRange = { from: Date; to: Date };

export function filterLogsByRange(logs: any[], range?: DateRange | null) {
    if (!range) return logs;
    const interval = { start: startOfDay(range.from), end: endOfDay(range.to) };
    return logs.filter((l) => {
        const d = new Date(l.time_in);
        return !isNaN(d.getTime()) && isWithinInterval(d, interval);
    });
}

const fileSuffix = (range?: DateRange | null) =>
    range ? `_${format(range.from, "yyyyMMdd")}-${format(range.to, "yyyyMMdd")}` : "";

/**
 * Exact time, not rounded to decimal hours.
 * 283 -> "4 hrs 43 mins", 300 -> "5 hrs", 45 -> "45 mins", 0 -> "0 mins"
 */
export function formatDuration(totalMinutes: number): string {
    const m = Math.max(0, Math.round(totalMinutes));
    const h = Math.floor(m / 60);
    const mins = m % 60;
    const parts: string[] = [];
    if (h) parts.push(`${h} ${h === 1 ? "hr" : "hrs"}`);
    if (mins || !h) parts.push(`${mins} ${mins === 1 ? "min" : "mins"}`);
    return parts.join(" ");
}

/* ── Shared download helper ───────────────────────────────────── */
function downloadText(fileName: string, text: string, mime: string) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const csvLine = (r: (string | number)[]) =>
    r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");

/* ── CSV ──────────────────────────────────────────────────────── */
export const exportDTRAsCSV = (
    student: any,
    allLogs: any[],
    range?: DateRange | null,
) => {
    const timeLogs = filterLogsByRange(allLogs, range);
    if (!timeLogs || timeLogs.length === 0) {
        toast.error("No time logs in the selected period.");
        return;
    }

    // Student Number, Date and the four time columns are what the attendance import reads
    const headers = ["Student Number", "Company", "Date", "Session", "Time In", "Break Out", "Break In", "Time Out", "Total Time", "Verification"];
    const timeOf = (v?: string | null) => (v ? format(new Date(v), "hh:mm a") : "");

    const rows = timeLogs.map((log) => {
        const dateFormatted = log.time_in ? format(new Date(log.time_in), "MMM dd, yyyy") : "";
        const totalTime =
            log.duration_minutes != null ? formatDuration(log.duration_minutes) : "In Progress";

        return [
            student.student_number ?? "",
            student.companies?.[0]?.name ?? "",
            dateFormatted,
            log.session_period || "Regular",
            timeOf(log.time_in),
            timeOf(log.break_out),
            timeOf(log.break_in),
            log.time_out ? timeOf(log.time_out) : "Active",
            totalTime,
            log.verification_method || "Facial Match"
        ];
    });

    // BOM so Excel opens it as UTF-8 (keeps "ñ" and other accents intact)
    const csvContent = "\uFEFF" + [headers, ...rows].map(csvLine).join("\r\n");

    downloadText(
        `${student.first_name}_${student.last_name}_DTR${fileSuffix(range)}.csv`,
        csvContent,
        "text/csv;charset=utf-8;",
    );
    toast.success("CSV Exported successfully.");
};

/* ── PDF: Civil Service Form 48 style ─────────────────────────── */
export const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

// Letter portrait = 215.9 x 279.4 mm. 8 + 96 + 7.9 + 96 + 8 = 215.9
const PAGE_MARGIN = 8;
const COPY_WIDTH = 96;
const TABLE_START_Y = 58;

type Cell = string | number;

// 12-hour clock without AM/PM, because the column already says which it is
function clock(d: Date): string {
    const h = d.getHours() % 12 || 12;
    return `${h}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function scheduleClock(t?: string | null): string {
    const m = t?.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return "";
    return `${Number(m[1]) % 12 || 12}:${m[2]}`;
}

// Same as scheduleClock but with AM/PM, for CSV: "08:00" -> "8:00 AM", "17:30" -> "5:30 PM"
function scheduleClock12(t?: string | null): string {
    const m = t?.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return "";
    const h = Number(m[1]);
    return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

export function groupByMonth(logs: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>();
    for (const log of logs) {
        const d = new Date(log.time_in);
        if (isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(log);
    }
    return map;
}

export function buildRows(logs: any[], requiredMinutes: number) {
    const byDay = new Map<number, any[]>();
    for (const log of logs) {
        const day = new Date(log.time_in).getDate();
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day)!.push(log);
    }

    const rows: Cell[][] = [];
    let underTotal = 0;
    let workedTotal = 0;

    for (let day = 1; day <= 31; day++) {
        const dayLogs = (byDay.get(day) ?? []).sort(
            (a, b) => new Date(a.time_in).getTime() - new Date(b.time_in).getTime(),
        );

        let amIn = "", amOut = "", pmIn = "", pmOut = "";
        let worked = 0;
        let completed = false;

        for (const log of dayLogs) {
            const toDate = (v?: string | null) => {
                if (!v) return null;
                const d = new Date(v);
                return isNaN(d.getTime()) ? null : d;
            };
            const inD = new Date(log.time_in);
            const outD = toDate(log.time_out);
            const brkOut = toDate(log.break_out);
            const brkIn = toDate(log.break_in);

            if (brkOut || brkIn) {
                // Full shift with a lunch break: maps straight onto the four columns
                if (!amIn) amIn = clock(inD);
                if (brkOut) amOut = clock(brkOut);
                if (brkIn) pmIn = clock(brkIn);
                if (outD) pmOut = clock(outD);
            } else if (inD.getHours() < 12) {
                if (!amIn) amIn = clock(inD);
                if (outD) {
                    // A single punch that runs past noon: time out goes in the PM departure
                    if (outD.getHours() < 12) amOut = clock(outD);
                    else pmOut = clock(outD);
                }
            } else {
                if (!pmIn) pmIn = clock(inD);
                if (outD) pmOut = clock(outD);
            }

            // Fallback when duration_minutes is missing: elapsed time minus the break
            const breakMinutes =
                brkOut && brkIn
                    ? Math.max(0, Math.round((brkIn.getTime() - brkOut.getTime()) / 60000))
                    : 0;
            worked +=
                log.duration_minutes ??
                (outD
                    ? Math.max(0, Math.round((outD.getTime() - inD.getTime()) / 60000) - breakMinutes)
                    : 0);
            if (outD) completed = true;
        }

        const under = completed ? Math.max(0, requiredMinutes - worked) : 0;
        underTotal += under;
        workedTotal += worked;

        rows.push([
            day,
            amIn,
            amOut,
            pmIn,
            pmOut,
            under ? Math.floor(under / 60) : "",
            under ? under % 60 : "",
            // Exact time worked that day (blank when nothing was completed)
            worked ? formatDuration(worked) : "",
        ]);
    }

    return { rows, underTotal, workedTotal };
}

function drawCopy(
    doc: jsPDF,
    x: number,
    ctx: {
        name: string;
        /** Empty string leaves a blank line to write on (templates) */
        studentNumber: string;
        company: string;
        /** Course and section, e.g. "BSIT · BSIT 4A" */
        scope: string;
        /** Empty string leaves "For the month of" blank (templates) */
        monthLabel: string;
        year: number;
        official: string;
        rows: Cell[][];
        underTotal: number;
        workedTotal: number;
        branding?: PdfBranding | null;
        /** Blank template: no totals printed, left for handwriting */
        blank?: boolean;
    },
) {
    const w = COPY_WIDTH;
    const mid = x + w / 2;
    doc.setTextColor(0);
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);

    // School header: logo on the left, name centered, both above the title
    if (ctx.branding) {
        const { logo, schoolName } = ctx.branding;
        if (logo) {
            doc.addImage(logo.dataUrl, "PNG", x + 4, 4, logoWidthFor(logo, 8), 8);
        }
        if (schoolName) {
            doc.setFont("helvetica", "bold");
            let size = 8;
            doc.setFontSize(size);
            // Shrink long names so they don't run into the logo
            while (size > 5 && doc.getTextWidth(schoolName) > w - (logo ? 30 : 10)) {
                size -= 0.5;
                doc.setFontSize(size);
            }
            doc.text(schoolName, mid, 8.5, { align: "center" });
        }
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DAILY TIME RECORD", mid, 14, { align: "center" });

    // Name on a line
    doc.setFontSize(9);
    if (ctx.name) doc.text(ctx.name, mid, 21.5, { align: "center", maxWidth: w - 10 });
    doc.line(x + 4, 23, x + w - 4, 23);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("(Name)", mid, 26, { align: "center" });

    // Student number
    doc.setFontSize(8);
    doc.text("Student No.", x + 4, 30.8);
    doc.line(x + 22, 31.3, x + w - 4, 31.3);
    if (ctx.studentNumber) {
        doc.setFont("helvetica", "bold");
        doc.text(ctx.studentNumber, x + 23, 30.4);
        doc.setFont("helvetica", "normal");
    }

    // Course / section
    if (ctx.scope) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(ctx.scope, mid, 34.4, { align: "center", maxWidth: w - 10 });
        doc.setFont("helvetica", "normal");
    }

    // For the month of
    doc.setFontSize(8);
    doc.text("For the month of", x + 4, 37);
    doc.line(x + 27, 37.5, x + w - 4, 37.5);
    if (ctx.monthLabel) {
        doc.setFont("helvetica", "bold");
        doc.text(`${ctx.monthLabel} ${ctx.year}`, x + 28, 36.6);
    }

    // Company
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Company", x + 4, 43);
    doc.line(x + 20, 43.5, x + w - 4, 43.5);
    if (ctx.company) {
        doc.setFont("helvetica", "bold");
        // Shrink long company names so they stay on the line
        let size = 8;
        doc.setFontSize(size);
        while (size > 5 && doc.getTextWidth(ctx.company) > w - 26) {
            size -= 0.5;
            doc.setFontSize(size);
        }
        doc.text(ctx.company, x + 21, 42.6);
    }

    // Official hours
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Official hours for arrival and departure", x + 4, 49);
    doc.text("Regular days", x + 4, 53.5);
    doc.line(x + 22, 54, x + 54, 54);
    doc.text("Saturdays", x + 57, 53.5);
    doc.line(x + 71, 54, x + w - 4, 54);
    if (ctx.official) {
        doc.setFont("helvetica", "bold");
        doc.text(ctx.official, x + 38, 53.2, { align: "center" });
        doc.setFont("helvetica", "normal");
    }

    // Table (column widths add up to COPY_WIDTH = 96 mm)
    autoTable(doc, {
        startY: TABLE_START_Y,
        margin: { left: x, right: PAGE_MARGIN },
        tableWidth: w,
        theme: "grid",
        head: [
            [
                { content: "Day", rowSpan: 2 },
                { content: "A.M.", colSpan: 2 },
                { content: "P.M.", colSpan: 2 },
                { content: "Undertime", colSpan: 2 },
                { content: "Total Time", rowSpan: 2 },
            ],
            ["Time In", "Time Out", "Time In", "Time Out", "Hours", "Min."],
        ],
        body: ctx.rows.map((r) => r.map((c) => String(c))),
        foot: [
            [
                { content: "Total", colSpan: 5, styles: { halign: "left" } },
                ctx.blank ? "" : String(Math.floor(ctx.underTotal / 60)),
                ctx.blank ? "" : String(ctx.underTotal % 60),
                ctx.blank ? "" : formatDuration(ctx.workedTotal),
            ],
        ],
        showFoot: "lastPage",
        styles: {
            font: "helvetica",
            fontSize: 7,
            cellPadding: 0.6,
            halign: "center",
            valign: "middle",
            textColor: 0,
            lineColor: 0,
            lineWidth: 0.2,
            minCellHeight: 5,
        },
        headStyles: { fillColor: 255, textColor: 0, fontStyle: "bold", fontSize: 6.5 },
        footStyles: { fillColor: 255, textColor: 0, fontStyle: "bold" },
        bodyStyles: { fillColor: 255 },
        alternateRowStyles: { fillColor: 255 },
        columnStyles: {
            0: { cellWidth: 9, fontStyle: "bold" },
            1: { cellWidth: 12.5 },
            2: { cellWidth: 12.5 },
            3: { cellWidth: 12.5 },
            4: { cellWidth: 12.5 },
            5: { cellWidth: 9 },
            6: { cellWidth: 9 },
            7: { cellWidth: 19, fontSize: 6.5 },
        },
    });

    let y: number = ((doc as any).lastAutoTable?.finalY ?? 215) + 5;

    // Total time rendered this month, in exact hours and minutes
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    if (ctx.blank) {
        doc.text("Total time rendered:", x, y);
        doc.line(x + 29, y + 0.5, x + 70, y + 0.5);
    } else {
        doc.text(`Total time rendered: ${formatDuration(ctx.workedTotal)}`, x, y);
    }

    // Certification
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const cert = doc.splitTextToSize(
        "I certify on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office.",
        w - 4,
    );
    doc.text(cert, x + 2, y);
    y += cert.length * 3 + 7;

    // Student signature
    doc.line(x + 20, y, x + w - 4, y);
    doc.text("(Signature)", x + 20 + (w - 24) / 2, y + 3.5, { align: "center" });

    // Verification (spacing kept tight so the In-Charge line stays on the page)
    y += 9;
    doc.text("Verified as to the prescribed office hours.", x + 2, y);
    y += 8;
    doc.line(x + 20, y, x + w - 4, y);
    doc.text("In-Charge", x + 20 + (w - 24) / 2, y + 3.5, { align: "center" });
}

/**
 * Draws one intern's DTR pages (one page per month with logs) into an existing doc.
 * Returns false when the intern has nothing to draw.
 */
function renderStudentDTR(
    doc: jsPDF,
    student: any,
    allLogs: any[],
    range: DateRange | null | undefined,
    hasPreviousPage: boolean,
    branding?: PdfBranding | null,
): boolean {
    const grouped = groupByMonth(filterLogsByRange(allLogs, range));
    const keys = [...grouped.keys()].sort();
    if (!keys.length) return false;

    const name = [student.first_name, student.middle_name, student.last_name]
        .filter(Boolean)
        .join(" ");
    const company: string = student.companies?.[0]?.name ?? "";

    // Each intern may be in a different course/section, so prefer their own
    // and fall back to the report's scope (filter or the logged-in user's).
    const scope = scopeText({
        course: student.course_code ?? branding?.scope?.course,
        section: student.section ?? branding?.scope?.section,
    });

    // Official hours come from the company's first schedule, if there is one
    const schedule = student.companies?.[0]?.schedules?.[0];
    const tIn = scheduleClock(schedule?.time_in);
    const tOut = scheduleClock(schedule?.time_out);
    const official = tIn && tOut ? `${tIn} - ${tOut}` : "";

    // Undertime is measured against this many hours per day
    const requiredMinutes = (Number(student.ojt_schedule?.hours_per_day) || 8) * 60;

    keys.forEach((key, i) => {
        if (hasPreviousPage || i > 0) doc.addPage();
        const [year, month] = key.split("-").map(Number);
        const { rows, underTotal, workedTotal } = buildRows(grouped.get(key) ?? [], requiredMinutes);

        drawCopy(doc, (215.9 - COPY_WIDTH) / 2, {
            name,
            studentNumber: String(student.student_number ?? ""),
            company,
            scope,
            monthLabel: MONTHS[month - 1],
            year,
            official,
            rows,
            underTotal,
            workedTotal,
            branding,
        });
    });

    return true;
}

/** Builds one intern's DTR PDF without saving it, so it can be previewed first. */
export const buildDTRPDF = (
    student: any,
    allLogs: any[],
    range?: DateRange | null,
    branding?: PdfBranding | null,
): PdfResult | null => {
    const timeLogs = filterLogsByRange(allLogs, range);
    if (!timeLogs || timeLogs.length === 0) {
        toast.error("No time logs in the selected period.");
        return null;
    }

    const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });

    if (!renderStudentDTR(doc, student, allLogs, range, false, branding)) {
        toast.error("No valid time logs available to export.");
        return null;
    }

    return {
        doc,
        fileName: `${student.first_name}_${student.last_name}_DTR${fileSuffix(range)}.pdf`,
    };
};

/** Direct download (no preview). */
export const exportDTRAsPDF = (...args: Parameters<typeof buildDTRPDF>) => {
    const r = buildDTRPDF(...args);
    if (!r) return;
    r.doc.save(r.fileName);
    toast.success("PDF Exported successfully.");
};

/** Many interns, one PDF: each intern's months back to back. Built, not saved. */
export const buildBulkDTRPDF = (
    students: any[],
    range?: DateRange | null,
    branding?: PdfBranding | null,
): (PdfResult & { count: number }) | null => {
    const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });

    let exported = 0;
    for (const s of students) {
        // The bulk endpoint returns each intern's logs as `time_logs`
        if (renderStudentDTR(doc, s, s.time_logs ?? [], range, exported > 0, branding)) exported++;
    }

    if (!exported) {
        toast.error("No time logs in the selected period.");
        return null;
    }

    return {
        doc,
        count: exported,
        fileName: `DTR_${exported}_interns${fileSuffix(range)}.pdf`,
    };
};

/** Direct download (no preview). */
export const exportBulkDTRAsPDF = (...args: Parameters<typeof buildBulkDTRPDF>) => {
    const r = buildBulkDTRPDF(...args);
    if (!r) return;
    r.doc.save(r.fileName);
    toast.success(`Exported DTRs for ${r.count} intern${r.count !== 1 ? "s" : ""}.`);
};

/* ── Blank DTR templates ──────────────────────────────────────────
 * For interns at companies whose supervisor doesn't use the system:
 * company and official hours are prefilled; name, student number, month and
 * times are left blank to be filled in by hand. Same layout as the mobile export.
 */

export type DtrTemplateCompany = {
    name: string;
    /** "HH:mm" or "HH:mm:ss" from the company schedule */
    scheduleIn?: string | null;
    scheduleOut?: string | null;
};

const templateFileBase = (company: DtrTemplateCompany) =>
    `${company.name.trim().replace(/[^\w-]+/g, "_") || "Company"}_DTR_Template`;

/** Blank Form 48 PDF, built (not saved) so it can be previewed first. */
export const buildBlankDTRTemplatePDF = (
    company: DtrTemplateCompany,
    branding?: PdfBranding | null,
): PdfResult => {
    const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });

    const tIn = scheduleClock(company.scheduleIn);
    const tOut = scheduleClock(company.scheduleOut);

    const rows: Cell[][] = Array.from({ length: 31 }, (_, i) => [i + 1, "", "", "", "", "", "", ""]);

    drawCopy(doc, (215.9 - COPY_WIDTH) / 2, {
        name: "",
        studentNumber: "",
        company: company.name,
        scope: "",
        monthLabel: "",
        year: 0,
        official: tIn && tOut ? `${tIn} - ${tOut}` : "",
        rows,
        underTotal: 0,
        workedTotal: 0,
        branding,
        blank: true,
    });

    return { doc, fileName: `${templateFileBase(company)}.pdf` };
};

/** Direct download (no preview). */
export const exportBlankDTRTemplatePDF = (
    company: DtrTemplateCompany,
    branding?: PdfBranding | null,
) => {
    const r = buildBlankDTRTemplatePDF(company, branding);
    r.doc.save(r.fileName);
    toast.success("DTR template downloaded.");
};

/** Blank CSV with the same title block and columns as the mobile CSV export. */
export const exportBlankDTRTemplateCSV = (company: DtrTemplateCompany) => {
    const tIn = scheduleClock12(company.scheduleIn);
    const tOut = scheduleClock12(company.scheduleOut);
    const schedule = tIn && tOut ? `${tIn} - ${tOut}` : "Not set";

    const lines: (string | number)[][] = [
        ["DAILY TIME RECORD"],
        ["Name", ""],
        ["Student Number", ""],
        ["Company", company.name],
        ["Scheduled Time", schedule],
        ["Period", ""], // month and year, e.g. November 2026
        [],
        // The importer reads past these lines. Don't start one with "Student Number:", "Company:" or
        // "Period:", or it will be read as the actual value.
        ["HOW TO FILL IN (type in the empty cells; do not rename or move the labels and column titles)"],
        ["1. Student Number - beside the label above, exactly as recorded in the system (e.g. 2024-1-05820)"],
        ["2. Period - one month and year per file (e.g. November 2026)"],
        ["3. Times - include AM or PM (e.g. 8:00 AM and 5:00 PM) or use 24-hour time (08:00 and 17:00)"],
        ["4. Breaks - fill in both Break Out and Break In, or leave both blank"],
        ["5. Order - Time In, then Break Out, Break In, Time Out, each later than the one before, on the same day"],
        ["6. Days not worked - leave all the times blank. Each day worked needs both Time In and Time Out"],
        ["7. Task Note - optional, up to 1000 characters. The Status column is not imported"],
        ["8. Save as CSV (not .xlsx). Do not add totals or signatures below the table"],
        [],
        ["Day", "Time In", "Break Out", "Break In", "Time Out", "Status", "Task Note"],
        ...Array.from({ length: 31 }, (_, i) => [i + 1, "", "", "", "", "", ""]),
    ];

    // BOM so Excel opens it as UTF-8 (keeps "ñ" and other accents intact)
    downloadText(
        `${templateFileBase(company)}.csv`,
        "\uFEFF" + lines.map(csvLine).join("\r\n"),
        "text/csv;charset=utf-8;",
    );
    toast.success("DTR template downloaded.");
};