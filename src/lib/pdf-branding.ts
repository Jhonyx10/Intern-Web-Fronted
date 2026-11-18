/**
 * School name + logo shown at the top of every exported PDF.
 * Set SCHOOL_NAME to the name that should print on reports.
 */
export const SCHOOL_NAME = "Opol Community College";

/** Course / section printed under the school name on exports. */
export type PdfScope = {
    course?: string | null;
    section?: string | null;
};

export type PdfBranding = {
    schoolName: string;
    /** PNG data URL plus its pixel size, so the aspect ratio can be kept */
    logo: { dataUrl: string; width: number; height: number } | null;
    /** Course and section this report is limited to (filter, or the user's own) */
    scope?: PdfScope | null;
};

/** "BSIT · BSIT 4A" style label, or "" when there is no scope. */
export function scopeText(scope?: PdfScope | null): string {
    return [scope?.course, scope?.section].filter(Boolean).join(" · ");
}

const MAX_LOGO_PX = 256; // keeps the PDF small

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Needed so the canvas isn't tainted when the logo comes from another origin
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not load logo"));
        img.src = src;
    });
}

/**
 * Loads the logo and converts it to a PNG data URL (jsPDF can't use webp directly).
 * Never throws: if the logo can't be loaded, the PDF just prints without it.
 */
export async function loadPdfBranding(
    logoSrc?: string | null,
    schoolName: string = SCHOOL_NAME,
    scope: PdfScope | null = null
): Promise<PdfBranding> {
    const base = { schoolName, scope };
    if (!logoSrc) return { ...base, logo: null };

    try {
        const img = await loadImage(logoSrc);
        const ratio = Math.min(1, MAX_LOGO_PX / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * ratio));
        const height = Math.max(1, Math.round(img.naturalHeight * ratio));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return { ...base, logo: null };

        ctx.drawImage(img, 0, 0, width, height);
        return { ...base, logo: { dataUrl: canvas.toDataURL("image/png"), width, height } };
    } catch {
        return { ...base, logo: null };
    }
}

/** Width in mm for a logo drawn at the given height, keeping its aspect ratio. */
export function logoWidthFor(logo: { width: number; height: number }, heightMm: number): number {
    return (logo.width / logo.height) * heightMm;
}