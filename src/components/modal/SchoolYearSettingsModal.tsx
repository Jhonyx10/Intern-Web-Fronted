import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, TriangleAlert } from "lucide-react";

type SchoolYearSummary = {
  id: number;
  name: string;
  semester?: string | null;
  is_active: boolean;
  is_evaluation_enabled: boolean;
  evaluation_templates?: { id: number; title: string }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  year: SchoolYearSummary | null;
  onSave: (isActive: boolean, isEvaluationEnabled: boolean, templateIds: number[]) => void;
  isLoading?: boolean;
};

const STATUS_INFO = {
  active: {
    label: "Active",
    description:
      "Marks this as the current school year. Any other active school year becomes inactive.",
  },
  inactive: {
    label: "Inactive",
    description: "Not the current school year. Its records stay available.",
  },
} as const;

import { useEvaluationTemplates } from "@/lib/queries/evaluation";

export default function SchoolYearSettingsModal({
  open,
  onClose,
  year,
  onSave,
  isLoading = false,
}: Props) {
  const [isActive, setIsActive] = useState(false);
  const [isEvaluationEnabled, setIsEvaluationEnabled] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);

  const { data: templates = [], isLoading: isLoadingTemplates } = useEvaluationTemplates();

  // Reset to the school year's saved status each time the modal opens
  useEffect(() => {
    if (open && year) {
      setIsActive(year.is_active);
      setIsEvaluationEnabled(year.is_evaluation_enabled);
      setSelectedTemplateIds(year.evaluation_templates?.map((t) => t.id) ?? []);
    }
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

  const unchanged = useMemo(() => {
    if (!year) return true;
    const initialIds = year.evaluation_templates?.map(t => t.id) ?? [];
    if (isActive !== year.is_active) return false;
    if (isEvaluationEnabled !== year.is_evaluation_enabled) return false;
    if (selectedTemplateIds.length !== initialIds.length) return false;
    const sortedSelected = [...selectedTemplateIds].sort();
    const sortedInitial = [...initialIds].sort();
    return sortedSelected.every((id, i) => id === sortedInitial[i]);
  }, [year, isActive, isEvaluationEnabled, selectedTemplateIds]);

  const deactivatingCurrent = Boolean(year?.is_active) && !isActive;
  const status = isActive ? STATUS_INFO.active : STATUS_INFO.inactive;

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
            className="flex w-full max-w-md max-h-[85vh] flex-col rounded-2xl border border-[var(--color-line)] bg-white shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-5 border-b border-[var(--color-line)] shrink-0">
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

            <div className="flex-1 overflow-y-auto p-5">
              {/* Status */}
              <p className="text-xs font-semibold text-[var(--color-muted)]">
                Status
              </p>
              <div
                className={`mt-2 flex items-start justify-between gap-4 rounded-xl border px-3.5 py-3 transition ${isActive
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                  : "border-[var(--color-line)] bg-white"
                  }`}
              >
                <div className="min-w-0">
                  <span
                    id="sy-status-label"
                    className="block text-sm font-semibold text-[var(--color-ink)]"
                  >
                    {status.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                    {status.description}
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  aria-labelledby="sy-status-label"
                  disabled={isLoading}
                  onClick={() => setIsActive((prev) => !prev)}
                  className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? "bg-[var(--color-accent)]" : "bg-slate-300"
                    }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-[22px]" : "translate-x-0.5"
                      }`}
                  />
                </button>
              </div>

              {deactivatingCurrent && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                  <span>
                    No school year will be current until you activate another one.
                  </span>
                </div>
              )}

              {/* Evaluation Templates */}
              <div className="mt-6 border-t border-[var(--color-line)] pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-muted)]">
                      Evaluations
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Toggle to allow deans to distribute evaluations.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEvaluationEnabled}
                    disabled={isLoading}
                    onClick={() => setIsEvaluationEnabled((prev) => !prev)}
                    className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isEvaluationEnabled ? "bg-[var(--color-accent)]" : "bg-slate-300"
                      }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isEvaluationEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                    />
                  </button>
                </div>

                {isEvaluationEnabled ? (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <p className="text-xs font-semibold text-[var(--color-muted)]">
                      Evaluation Questionnaires
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Select which templates to anchor to this school year. Anchoring a template will lock it.
                    </p>
                    <div className="mt-3 space-y-2">
                      {isLoadingTemplates ? (
                        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                          <Loader2 size={14} className="animate-spin" /> Loading templates...
                        </div>
                      ) : templates.length === 0 ? (
                        <p className="text-sm text-[var(--color-muted)] italic">No templates available.</p>
                      ) : (
                        templates.map((template) => {
                          const isSelected = selectedTemplateIds.includes(template.id);
                          return (
                            <label
                              key={template.id}
                              className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-3 transition hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTemplateIds((prev) => [...prev, template.id]);
                                  } else {
                                    setSelectedTemplateIds((prev) =>
                                      prev.filter((id) => id !== template.id)
                                    );
                                  }
                                }}
                                className="mt-0.5 shrink-0 rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                                  {template.title}
                                </span>
                                {template.description && (
                                  <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">
                                    {template.description}
                                  </span>
                                )}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-[var(--color-line)] bg-slate-50 px-4 py-3">
                    <p className="text-sm text-center text-[var(--color-muted)]">
                      Turn on Evaluations to assign templates.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-[var(--color-line)] p-5 shrink-0 bg-slate-50/50">
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
                onClick={() => onSave(isActive, isEvaluationEnabled, selectedTemplateIds)}
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