import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, TriangleAlert } from "lucide-react";

type SchoolYearSummary = {
  id: number;
  name: string;
  semester?: string | null;
  is_active: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  year: SchoolYearSummary | null;
  onSave: (isActive: boolean) => void;
  isLoading?: boolean;
};

const OPTIONS = [
  {
    value: true,
    label: "Active",
    description:
      "Marks this as the current school year. Any other active school year becomes inactive.",
  },
  {
    value: false,
    label: "Inactive",
    description: "Not the current school year. Its records stay available.",
  },
] as const;

export default function SchoolYearSettingsModal({
  open,
  onClose,
  year,
  onSave,
  isLoading = false,
}: Props) {
  const [isActive, setIsActive] = useState(false);

  // Reset to the school year's saved status each time the modal opens
  useEffect(() => {
    if (open && year) setIsActive(year.is_active);
  }, [open, year]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isLoading, onClose]);

  const unchanged = year ? isActive === year.is_active : true;
  const deactivatingCurrent = Boolean(year?.is_active) && !isActive;

  return (
    <AnimatePresence>
      {open && year ? (
        <motion.div
          key="sy-settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
          onClick={() => {
            if (!isLoading) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sy-settings-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="sy-settings-title"
                  className="text-lg font-bold tracking-tight text-[var(--color-ink)]"
                >
                  School year settings
                </h2>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {year.name}
                  {year.semester ? ` · ${year.semester}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                aria-label="Close"
                className="rounded-lg p-1.5 text-[var(--color-muted)] transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Status */}
            <p className="mt-5 text-xs font-semibold text-[var(--color-muted)]">
              Status
            </p>
            <div role="radiogroup" aria-label="Status" className="mt-2 space-y-2">
              {OPTIONS.map((opt) => {
                const selected = isActive === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setIsActive(opt.value)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                      selected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--color-line)] bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                        selected
                          ? "border-[var(--color-accent)]"
                          : "border-slate-300"
                      }`}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--color-ink)]">
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {deactivatingCurrent && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                <span>
                  No school year will be current until you activate another one.
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onSave(isActive)}
                disabled={unchanged || isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                Save changes
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}