import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import {
  useSyncCourseRequirements,
  type DocumentRequirement,
} from "@/lib/queries/documents";
import { firstErrorMessage } from "@/lib/utils/errors";
import { listVariants, itemVariants } from "@/lib/utils/animations";

export function AssignRequirementsModal({
  visible,
  onClose,
  courseId,
  masterList,
  currentIds,
  currentDeadline,
}: {
  visible: boolean;
  onClose: () => void;
  courseId: number;
  masterList: DocumentRequirement[];
  currentIds: number[];
  currentDeadline?: string;
}) {
  const syncRequirements = useSyncCourseRequirements(courseId);
  const [selected, setSelected] = useState<Set<number>>(new Set(currentIds));
  const [deadline, setDeadline] = useState(currentDeadline ?? "");
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size > 0 && !deadline) {
      setError("Please set a deadline for the selected requirements.");
      return;
    }
    try {
      await syncRequirements.mutateAsync({
        document_requirement_ids: Array.from(selected),
        deadline_at: deadline,
      });
      onClose();
    } catch (err) {
      setError(
        firstErrorMessage(
          err,
          "Could not save your selection. Please try again."
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
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-paper,#FAF9F5)]"
          >
            <div className="shrink-0 border-b border-[var(--color-line)] px-6 py-4">
              <h2
                className="text-base font-semibold text-[var(--color-ink)]"
                style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
              >
                Select Requirements for Your Course
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                Choose which requirements from the master list apply to your
                students, and set the deadline for this course.
              </p>
            </div>

            <div className="shrink-0 border-b border-[var(--color-line)] px-6 py-4">
              <label className="text-xs font-medium text-[var(--color-ink)]">
                Deadline for selected requirements
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1.5 w-full border-0 border-b border-[var(--color-line)] bg-transparent py-1.5 text-sm text-[var(--color-ink)] transition focus:border-[var(--color-accent)] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                Applies to every requirement selected below — useful when this
                course starts internships earlier or later than others.
              </p>
            </div>

            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="min-h-0 flex-1 overflow-y-auto"
            >
              {masterList.length === 0 ? (
                <p className="px-6 py-8 text-center text-xs text-[var(--color-muted)]">
                  No document requirements have been created yet.
                </p>
              ) : (
                masterList.map((req, index) => (
                  <motion.label
                    key={req.id}
                    variants={itemVariants}
                    className={`flex cursor-pointer items-start gap-3 px-6 py-3.5 transition hover:bg-slate-50 ${
                      index !== 0 ? "border-t border-[var(--color-line)]" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(req.id)}
                      onChange={() => toggle(req.id)}
                      className="mt-0.5 h-3.5 w-3.5 accent-[var(--color-accent)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        {req.title}
                      </p>
                      {req.document_type && (
                        <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                          {req.document_type.name}
                        </p>
                      )}
                    </div>
                  </motion.label>
                ))
              )}
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-6 mt-4 flex items-center gap-2 border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-3 py-2 text-xs text-[var(--color-accent)]"
                >
                  <AlertCircle size={13} className="shrink-0" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--color-line)] px-6 py-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={syncRequirements.isPending}
                className="flex items-center gap-1.5 bg-[var(--color-ink)] px-4 py-2 text-xs font-medium text-white transition disabled:opacity-50"
              >
                {syncRequirements.isPending && (
                  <Loader2 size={13} className="animate-spin" />
                )}
                Save Selection ({selected.size})
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
