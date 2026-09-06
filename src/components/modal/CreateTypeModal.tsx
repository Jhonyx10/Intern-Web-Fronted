import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle } from "lucide-react";
import { useCreateDocumentType } from "@/lib/queries/documents";
import { firstErrorMessage } from "@/lib/utils/errors";

export function CreateTypeModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const createType = useCreateDocumentType();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCode("");
    setName("");
    setIsRequired(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) {
      setError("Code and name are required.");
      return;
    }
    try {
      await createType.mutateAsync({
        code: code.trim(),
        name: name.trim(),
        is_required: isRequired,
      });
      reset();
      onClose();
    } catch (err) {
      setError(
        firstErrorMessage(
          err,
          "Could not create the document type. Please try again."
        )
      );
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-paper,#FAF9F5)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
              <h2
                className="text-base font-semibold text-[var(--color-ink)]"
                style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
              >
                New Document Type
              </h2>
              <button
                onClick={handleClose}
                className="text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="text-xs font-medium text-[var(--color-ink)]">
                  Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. weekly_report"
                  className="mt-1.5 w-full border-0 border-b border-[var(--color-line)] bg-transparent py-1.5 text-sm text-[var(--color-ink)] transition focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)]">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekly Report"
                  className="mt-1.5 w-full border-0 border-b border-[var(--color-line)] bg-transparent py-1.5 text-sm text-[var(--color-ink)] transition focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--color-ink)]">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                />
                Required by default
              </label>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-3 py-2 text-xs text-[var(--color-accent)]"
                  >
                    <AlertCircle size={13} className="shrink-0" /> {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--color-line)] px-6 py-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={createType.isPending}
                className="flex items-center gap-1.5 bg-[var(--color-ink)] px-4 py-2 text-xs font-medium text-white transition disabled:opacity-50"
              >
                {createType.isPending && (
                  <Loader2 size={13} className="animate-spin" />
                )}
                Create Type
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
