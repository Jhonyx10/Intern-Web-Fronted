import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, ExternalLink, X } from "lucide-react";

type Props = {
  open: boolean;
  /** Object URL of the generated PDF (URL.createObjectURL(blob)) */
  url: string | null;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
  /** Optional: go back to the week picker to change the week */
  onChangeWeek?: () => void;
};

export default function WeeklyReportPreviewModal({
  open,
  url,
  fileName,
  onClose,
  onDownload,
  onChangeWeek,
}: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && url && (
        <motion.div
          key="weekly-preview-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Weekly report preview"
            className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[var(--color-ink)]">
                  Preview weekly report
                </h2>
                <p className="truncate font-mono text-[11px] text-[var(--color-muted)]">
                  {fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close preview"
                className="shrink-0 rounded-lg p-1.5 text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* PDF viewer */}
            <div className="min-h-0 flex-1 bg-slate-100">
              <iframe
                title="Weekly report preview"
                src={url}
                className="h-full w-full border-0"
              />
            </div>

            {/* Footer */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--color-line)] px-5 py-3">
              <div className="flex items-center gap-2">
                {onChangeWeek && (
                  <button
                    type="button"
                    onClick={onChangeWeek}
                    className="rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-slate-50"
                  >
                    Change week
                  </button>
                )}
                {/* Phones often can't render PDFs inside an iframe */}
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-sky-600 transition hover:bg-sky-50"
                >
                  <ExternalLink size={13} /> Open in new tab
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDownload}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  <Download size={13} /> Download PDF
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}