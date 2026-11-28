import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Send, X, Loader2 } from "lucide-react";

interface EvaluationTemplate {
  id: number;
  title: string;
  is_active: boolean | number;
  courses?: { id: number; code: string; name: string }[];
}

interface SendEvaluationModalProps {
  isOpen: boolean;
  isSending: boolean;
  sectionCount: number;
  totalStudentCount: number;
  templates: EvaluationTemplate[];
  selectedTemplateId: number | null;
  onSelectTemplate: (id: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/** "Global" = no courses attached; otherwise list the course codes. */
function templateScopeLabel(template: EvaluationTemplate): string {
  const codes = (template.courses ?? []).map((c) => c.code).filter(Boolean);
  return codes.length === 0 ? "Global" : codes.join(", ");
}

export function SendEvaluationModal({
  isOpen,
  isSending,
  sectionCount,
  totalStudentCount,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onConfirm,
  onClose,
}: SendEvaluationModalProps) {
  const prefersReducedMotion = useReducedMotion();

  // Backend already limits this list to the coordinator's courses + global templates
  const activeTemplates = templates.filter((t) => Boolean(t.is_active));
  const hasSections = sectionCount > 0;

  const handleClose = () => {
    if (!isSending) onClose();
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
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-evaluation-title"
            aria-describedby="send-evaluation-desc"
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.97, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
            }
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isSending}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--color-ink)] disabled:opacity-40"
            >
              <X size={16} />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
              <Send size={17} className="text-[var(--color-accent)]" />
            </div>

            <h3
              id="send-evaluation-title"
              className="mt-4 text-base font-semibold text-[var(--color-ink)]"
            >
              Send evaluations to all sections?
            </h3>

            <p id="send-evaluation-desc" className="mt-1.5 text-sm text-[var(--color-muted)]">
              {hasSections ? (
                <>
                  This sends evaluation requests to up to {totalStudentCount} student
                  {totalStudentCount === 1 ? "" : "s"} across your {sectionCount} assigned{" "}
                  {sectionCount === 1 ? "section" : "sections"}.
                </>
              ) : (
                "You have no assigned sections for the active school year."
              )}
            </p>

            {hasSections && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Only students with an active company placement will receive it. Students who
                already have this evaluation are skipped.
              </p>
            )}

            {/* Template Selection */}
            <div className="mt-4 space-y-1.5">
              <label
                htmlFor="send-evaluation-template"
                className="block text-xs font-medium text-[var(--color-ink)]"
              >
                Select Evaluation Template <span className="text-red-500">*</span>
              </label>
              <select
                id="send-evaluation-template"
                value={selectedTemplateId ?? ""}
                onChange={(e) => onSelectTemplate(Number(e.target.value))}
                disabled={isSending || activeTemplates.length === 0}
                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50"
              >
                <option value="" disabled>
                  -- Choose an active template --
                </option>
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} ({templateScopeLabel(template)})
                  </option>
                ))}
              </select>
              {activeTemplates.length === 0 && (
                <p className="text-xs text-amber-600">
                  No active templates available for your course.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSending}
                className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSending || !selectedTemplateId || !hasSections}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send evaluations"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}