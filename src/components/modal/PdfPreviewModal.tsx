import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink, Printer, X } from "lucide-react";
import { toast } from "@/components/Toaster";
import type { PdfResult } from "@/lib/pdf-result";

type Props = {
    result: PdfResult | null;
    onClose: () => void;
    title?: string;
};

export function PdfPreviewModal({ result, onClose, title = "Preview" }: Props) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Blob URL lives only as long as the preview is open
    const url = useMemo(
        () => (result ? URL.createObjectURL(result.doc.output("blob")) : null),
        [result],
    );
    useEffect(() => {
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [url]);

    useEffect(() => {
        if (!result) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [result, onClose]);

    if (!result || !url) return null;

    const download = () => {
        result.doc.save(result.fileName);
        toast.success("PDF exported successfully.");
    };

    const print = () => {
        try {
            iframeRef.current?.contentWindow?.focus();
            iframeRef.current?.contentWindow?.print();
        } catch {
            window.open(url, "_blank");
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                        <p className="truncate text-xs text-slate-500">{result.fileName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={print}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                            <Printer className="h-3.5 w-3.5" /> Print
                        </button>
                        <button
                            onClick={download}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                        >
                            <Download className="h-3.5 w-3.5" /> Download
                        </button>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="relative flex-1 bg-slate-100">
                    <iframe
                        ref={iframeRef}
                        src={`${url}#view=FitH`}
                        title="PDF preview"
                        className="h-full w-full"
                    />
                    {/* Some mobile browsers can't render PDFs inside an iframe */}
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] text-slate-600 shadow md:hidden"
                    >
                        <ExternalLink className="h-3 w-3" /> Not showing? Open in new tab
                    </a>
                </div>
            </div>
        </div>
    );
}

/**
 * const { show, modal } = usePdfPreview("Report preview");
 * <button onClick={() => show(buildTablePDF(table, branding))}>Preview</button>
 * {modal}
 */
export function usePdfPreview(title?: string) {
    const [result, setResult] = useState<PdfResult | null>(null);
    const close = useCallback(() => setResult(null), []);
    const show = useCallback((r: PdfResult | null) => {
        if (r) setResult(r);
    }, []);
    const modal = <PdfPreviewModal result={result} onClose={close} title={title} />;
    return { show, modal };
}