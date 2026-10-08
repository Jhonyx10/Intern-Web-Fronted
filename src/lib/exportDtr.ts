import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { toast } from "@/components/Toaster";

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

    const headers = ["Date", "Session", "Time In", "Time Out", "Duration (hrs)", "Verification"];

    const rows = timeLogs.map((log) => {
        const dateFormatted = log.time_in ? format(new Date(log.time_in), "MMM dd, yyyy") : "";
        const timeInFormatted = log.time_in ? format(new Date(log.time_in), "hh:mm a") : "";
        const timeOutFormatted = log.time_out ? format(new Date(log.time_out), "hh:mm a") : "Active";
        const durationHours = log.duration_minutes ? (log.duration_minutes / 60).toFixed(2) : "In Progress";

        return [
            dateFormatted,
            log.session_period || "Regular",
            timeInFormatted,
            timeOutFormatted,
            durationHours,
            log.verification_method || "Facial Match"
        ];
    });

    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(str => `"${str}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
        "download",
        `${student.first_name}_${student.last_name}_DTR${fileSuffix(range)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Exported successfully.");
};

/* ── PDF: Civil Service Form 48 style ─────────────────────────── */
const MONTHS = [
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

function groupByMonth(logs: any[]): Map<string, any[]> {
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

function buildRows(logs: any[], requiredMinutes: number) {
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
        ]);
    }

    return { rows, underTotal, workedTotal };
}

function drawCopy(
    doc: jsPDF,
    x: number,
    ctx: {
        name: string;
        company: string;
        monthLabel: string;
        year: number;
        official: string;
        rows: Cell[][];
        underTotal: number;
        workedTotal: number;
    },
) {
    const w = COPY_WIDTH;
    const mid = x + w / 2;
    doc.setTextColor(0);
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DAILY TIME RECORD", mid, 14, { align: "center" });

    // Name on a line
    doc.setFontSize(9);
    doc.text(ctx.name, mid, 25, { align: "center", maxWidth: w - 10 });
    doc.line(x + 4, 26.5, x + w - 4, 26.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("(Name)", mid, 30, { align: "center" });

    // For the month of
    doc.setFontSize(8);
    doc.text("For the month of", x + 4, 37);
    doc.line(x + 27, 37.5, x + w - 4, 37.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${ctx.monthLabel} ${ctx.year}`, x + 28, 36.6);

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

    // Table
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
            ],
            ["Arrival", "Depart.", "Arrival", "Depart.", "Hours", "Min."],
        ],
        body: ctx.rows.map((r) => r.map((c) => String(c))),
        foot: [
            [
                { content: "Total", colSpan: 5, styles: { halign: "left" } },
                String(Math.floor(ctx.underTotal / 60)),
                String(ctx.underTotal % 60),
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
        headStyles: { fillColor: 255, textColor: 0, fontStyle: "bold" },
        footStyles: { fillColor: 255, textColor: 0, fontStyle: "bold" },
        bodyStyles: { fillColor: 255 },
        alternateRowStyles: { fillColor: 255 },
        columnStyles: { 0: { cellWidth: 8, fontStyle: "bold" } },
    });

    let y: number = ((doc as any).lastAutoTable?.finalY ?? 215) + 5;

    // Total hours rendered this month
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`Total hours rendered: ${(ctx.workedTotal / 60).toFixed(1)} hrs`, x, y);

    // Certification
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const cert = doc.splitTextToSize(
        "I certify on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office.",
        w - 4,
    );
    doc.text(cert, x + 2, y);
    y += cert.length * 3 + 12;

    // Student signature
    doc.line(x + 20, y, x + w - 4, y);
    doc.text("(Signature)", x + 20 + (w - 24) / 2, y + 3.5, { align: "center" });

    // Verification
    y += 10;
    doc.text("Verified as to the prescribed office hours.", x + 2, y);
    y += 12;
    doc.line(x + 20, y, x + w - 4, y);
    doc.text("In-Charge", x + 20 + (w - 24) / 2, y + 3.5, { align: "center" });
}

export const exportDTRAsPDF = (
    student: any,
    allLogs: any[],
    range?: DateRange | null,
) => {
    const timeLogs = filterLogsByRange(allLogs, range);
    if (!timeLogs || timeLogs.length === 0) {
        toast.error("No time logs in the selected period.");
        return;
    }

    const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });

    const name = [student.first_name, student.middle_name, student.last_name]
        .filter(Boolean)
        .join(" ");

    const company: string = student.companies?.[0]?.name ?? "";

    // Official hours come from the company's first schedule, if there is one
    const schedule = student.companies?.[0]?.schedules?.[0];
    const tIn = scheduleClock(schedule?.time_in);
    const tOut = scheduleClock(schedule?.time_out);
    const official = tIn && tOut ? `${tIn} - ${tOut}` : "";

    // Undertime is measured against this many hours per day
    const requiredMinutes = (Number(student.ojt_schedule?.hours_per_day) || 8) * 60;

    // One page per month that has logs
    const grouped = groupByMonth(timeLogs);
    const keys = [...grouped.keys()].sort();

    if (!keys.length) {
        toast.error("No valid time logs available to export.");
        return;
    }

    keys.forEach((key, i) => {
        if (i > 0) doc.addPage();
        const [year, month] = key.split("-").map(Number);
        const { rows, underTotal, workedTotal } = buildRows(
            grouped.get(key) ?? [],
            requiredMinutes,
        );
        const ctx = {
            name,
            company,
            monthLabel: MONTHS[month - 1],
            year,
            official,
            rows,
            underTotal,
            workedTotal,
        };

        drawCopy(doc, (215.9 - COPY_WIDTH) / 2, ctx);
    });

    doc.save(`${student.first_name}_${student.last_name}_DTR${fileSuffix(range)}.pdf`);
    toast.success("PDF Exported successfully.");
};