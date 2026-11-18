import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "@/components/Toaster";
import { logoWidthFor, scopeText, type PdfBranding } from "@/lib/pdf-branding";
import type { PdfResult } from "@/lib/pdf-result"

export type ExportTable = {
    title: string;
    subtitle?: string;
    headers: string[];
    rows: (string | number)[][];
    fileName: string; // without extension
};

export function exportTableCSV(t: ExportTable) {
    if (t.rows.length === 0) {
        toast.error("Nothing to export.");
        return;
    }

    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [t.headers, ...t.rows].map((r) => r.map(esc).join(",")).join("\n");

    // BOM so Excel opens UTF-8 names correctly
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${t.fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully.");
}

/** Builds the report PDF without saving it, so it can be previewed first. */
export function buildTablePDF(t: ExportTable, branding?: PdfBranding | null): PdfResult | null {
    if (t.rows.length === 0) {
        toast.error("Nothing to export.");
        return null;
    }

    // Wide tables (e.g. the requirements matrix) need landscape
    const doc = new jsPDF({
        unit: "mm",
        format: "letter",
        orientation: t.headers.length > 7 ? "landscape" : "portrait",
    });

    const M = 14;
    const pageW = doc.internal.pageSize.getWidth();
    const hasBrand = Boolean(branding?.logo || branding?.schoolName);
    let startY: number;

    if (hasBrand && branding) {
        // Header block: logo on the left, school name / report title / course + filters beside it
        let textX = M;
        if (branding.logo) {
            const logoH = 16;
            doc.addImage(branding.logo.dataUrl, "PNG", M, 9, logoWidthFor(branding.logo, logoH), logoH);
            textX = M + logoWidthFor(branding.logo, logoH) + 4;
        }

        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(branding.schoolName, textX, 15, { maxWidth: pageW - textX - M });

        doc.setFontSize(10.5);
        doc.text(t.title, textX, 20.5);

        let y = 25;
        const scope = scopeText(branding.scope);
        if (scope) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(scope, textX, y, { maxWidth: pageW - textX - M });
            y += 4.5;
        }
        if (t.subtitle) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(100);
            doc.text(t.subtitle, textX, y, { maxWidth: pageW - textX - M });
            doc.setTextColor(0);
            y += 4;
        }

        const ruleY = Math.max(28.5, y - 0.5);
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(M, ruleY, pageW - M, ruleY);
        startY = ruleY + 3.5;
    } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(t.title, M, 16);
        startY = 22;

        const sub = [scopeText(branding?.scope), t.subtitle].filter(Boolean).join("  ·  ");
        if (sub) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(sub, M, 21.5);
            doc.setTextColor(0);
            startY = 26;
        }
    }

    const generated = new Date().toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    autoTable(doc, {
        startY,
        head: [t.headers],
        body: t.rows.map((r) => r.map(String)),
        styles: { font: "helvetica", fontSize: 8, cellPadding: 1.8 },
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: M, right: M },
        didDrawPage: (data) => {
            const { width, height } = doc.internal.pageSize;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(120);
            doc.text(`Generated ${generated}`, M, height - 8);
            doc.text(`Page ${data.pageNumber}`, width - M, height - 8, { align: "right" });
            doc.setTextColor(0);
        },
    });

    return { doc, fileName: `${t.fileName}.pdf` };
}

/** Direct download (no preview). */
export function exportTablePDF(t: ExportTable, branding?: PdfBranding | null) {
    const r = buildTablePDF(t, branding);
    if (!r) return;
    r.doc.save(r.fileName);
    toast.success("PDF exported successfully.");
}