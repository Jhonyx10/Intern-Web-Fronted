import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, ClipboardList, Repeat, CalendarDays, Layers, Building } from "lucide-react";
import { useCreateDocumentRequirement } from "@/lib/queries/documents";
import { useCourses } from "@/lib/queries/courses";
import { firstErrorMessage } from "@/lib/utils/errors";
import { useTheme } from "@/context/ThemeContext";

type Recurrence = "none" | "daily" | "weekly";
type DocumentType = "common" | "departmental";

export function CreateRequirementModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { themeColor } = useTheme();
  const createRequirement = useCreateDocumentRequirement();
  const { data: courses, isLoading: loadingCourses } = useCourses();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [documentType, setDocumentType] = useState<DocumentType>("common");
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(
    new Set()
  );
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);

  const allCourseIds = useMemo(
    () => (courses ?? []).map((c) => Number(c.id)),
    [courses]
  );

  // Auto-check all departments whenever Common is active
  useEffect(() => {
    if (documentType === "common" && allCourseIds.length > 0) {
      setSelectedCourseIds(new Set(allCourseIds));
    }
  }, [documentType, allCourseIds]);

  const handleDocumentTypeChange = (type: DocumentType) => {
    setDocumentType(type);
    if (type === "common") {
      setSelectedCourseIds(new Set(allCourseIds));
    } else {
      setSelectedCourseIds(new Set());
    }
  };

  const toggleCourse = (id: number) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setRecurrence("none");
    setDocumentType("common");
    setSelectedCourseIds(new Set());
    setDeadline("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const isRecurring = recurrence !== "none";
    const targetCourseIds =
      documentType === "common"
        ? allCourseIds
        : Array.from(selectedCourseIds);

    if (documentType === "departmental" && targetCourseIds.length === 0) {
      setError("Please select at least one department for departmental requirements.");
      return;
    }

    try {
      await createRequirement.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        recurrence,
        document_type: documentType,
        course_ids: targetCourseIds,
        deadline_at: (!isRecurring && deadline) ? deadline : undefined,
      });
      reset();
      onClose();
    } catch (err) {
      setError(
        firstErrorMessage(
          err,
          "Could not create the requirement. Please try again."
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between px-6 pb-5 pt-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "var(--color-accent-soft)" }}
                >
                  <ClipboardList size={18} strokeWidth={2.25} style={{ color: themeColor }} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900">
                    New Document Requirement
                  </h2>
                  <p className="text-[12px] text-slate-400">
                    Define a document requirement for interns
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-5">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Waiver Form"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400"
                  style={{ borderColor: title ? `${themeColor}55` : undefined }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = themeColor)}
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = title ? `${themeColor}55` : "")
                  }
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400"
                  style={{ borderColor: description ? `${themeColor}55` : undefined }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = themeColor)}
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = description ? `${themeColor}55` : "")
                  }
                />
              </div>

              {/* Recurrence */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                  Recurrence
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none transition"
                  style={{ borderColor: recurrence !== "none" ? `${themeColor}55` : undefined }}
                >
                  <option value="none">One-time (no recurrence)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                {recurrence !== "none" && (
                  <div
                    className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold"
                    style={{ backgroundColor: "var(--color-accent-soft)", color: themeColor }}
                  >
                    {recurrence === "weekly" ? (
                      <Repeat size={12} strokeWidth={2.5} />
                    ) : (
                      <CalendarDays size={12} strokeWidth={2.5} />
                    )}
                    Interns will submit this {recurrence} — each period is tracked separately.
                  </div>
                )}
              </div>

              {/* Document Type (Common vs Departmental) */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                  Document Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDocumentTypeChange("common")}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition ${documentType === "common"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/40 shadow-xs"
                      : "border-slate-200 bg-slate-50 hover:bg-white"
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers size={13} style={{ color: documentType === "common" ? themeColor : "#64748b" }} />
                      <span className="text-[12px] font-bold text-slate-800">
                        Common
                      </span>
                    </div>
                    <span className="text-[10.5px] text-slate-500 leading-tight">
                      Auto-applies to all departments
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDocumentTypeChange("departmental")}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition ${documentType === "departmental"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/40 shadow-xs"
                      : "border-slate-200 bg-slate-50 hover:bg-white"
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Building size={13} style={{ color: documentType === "departmental" ? themeColor : "#64748b" }} />
                      <span className="text-[12px] font-bold text-slate-800">
                        Departmental
                      </span>
                    </div>
                    <span className="text-[10.5px] text-slate-500 leading-tight">
                      Selected departments only
                    </span>
                  </button>
                </div>
              </div>

              {/* Assign to departments */}
              <div>
                <div className="mb-1.5">
                  <label className="block text-[11px] font-semibold text-slate-500">
                    {documentType === "common" ? "Departments (all included)" : "Assign to departments"}
                  </label>
                </div>

                {documentType === "common" ? (
                  <div
                    className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-medium"
                    style={{
                      borderColor: `${themeColor}40`,
                      backgroundColor: "var(--color-accent-soft)",
                      color: "var(--color-ink)",
                    }}
                  >
                    <Layers size={14} style={{ color: themeColor }} className="shrink-0" />
                    <span>
                      All <strong>{allCourseIds.length}</strong> departments are automatically assigned for this common requirement.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50">
                      {loadingCourses ? (
                        <p className="px-3 py-3 text-[12px] text-slate-400">
                          Loading departments…
                        </p>
                      ) : (courses ?? []).length === 0 ? (
                        <p className="px-3 py-3 text-[12px] text-slate-400">
                          No departments found.
                        </p>
                      ) : (
                        (courses ?? []).map((c, index) => {
                          const courseId = Number(c.id);
                          const checked = selectedCourseIds.has(courseId);
                          return (
                            <label
                              key={c.id}
                              className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] text-slate-700 transition hover:bg-white ${index !== 0 ? "border-t border-slate-200" : ""
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCourse(courseId)}
                                className="h-3.5 w-3.5"
                                style={{ accentColor: themeColor }}
                              />
                              <span className="font-mono text-[11px] text-slate-400">
                                {c.code}
                              </span>
                              <span className="truncate">{c.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {selectedCourseIds.size} of {allCourseIds.length} selected.
                    </p>
                  </>
                )}
              </div>

              {/* Deadline (shown for one-time requirements, hidden for daily/weekly) */}
              {recurrence === "none" && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                    Deadline {selectedCourseIds.size > 0 ? "for selected departments" : ""} <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none transition"
                    style={{ borderColor: deadline ? `${themeColor}55` : undefined }}
                  />
                  {selectedCourseIds.size === 0 && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      If departments are selected, this deadline will be assigned to them.
                    </p>
                  )}
                </div>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600"
                  >
                    <AlertCircle size={13} className="shrink-0" /> {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={handleClose}
                className="rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={createRequirement.isPending}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm transition disabled:opacity-50"
                style={{ backgroundColor: themeColor }}
              >
                {createRequirement.isPending && (
                  <Loader2 size={13} className="animate-spin" />
                )}
                Create Requirement
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}