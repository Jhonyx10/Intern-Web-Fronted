import type { jsPDF } from "jspdf";

/** A built (not yet saved) PDF plus the file name to save it under (with extension). */
export type PdfResult = { doc: jsPDF; fileName: string };