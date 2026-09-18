import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Loader2 } from "lucide-react";

interface RemoveInternModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  internName: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function RemoveInternModal({
  isOpen,
  isSubmitting,
  internName,
  onConfirm,
  onClose,
}: RemoveInternModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setReason("");
    setError(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("Please provide a reason for removal.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-intern-title"
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.97, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="absolute right-4 top-4 rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--color-ink)] disabled:opacity-40"
            >
              <X size={16} />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50">
              <AlertTriangle size={17} className="text-rose-600" />
            </div>

            <h3
              id="remove-intern-title"
              className="mt-4 text-base font-semibold text-[var(--color-ink)]"
            >
              Remove {internName} from the program?
            </h3>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              This marks the intern as inactive for your company. This can be
              reversed by a coordinator or admin if needed.
            </p>

            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-medium text-[var(--color-ink)]">
                Reason for removal <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
                placeholder="e.g. Completed required hours early, policy violation, withdrew from internship..."
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-1 ${
                  error
                    ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500"
                    : "border-[var(--color-line)] bg-white focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                } disabled:opacity-50`}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Removing…
                  </>
                ) : (
                  "Remove intern"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
