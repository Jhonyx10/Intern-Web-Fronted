import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, ClipboardList, Repeat, CalendarDays } from "lucide-react";
import {
  useCreateDocumentRequirement,
  useDocumentTypes,
} from "@/lib/queries/documents";
import { useCourses } from "@/lib/queries/courses";
import { firstErrorMessage } from "@/lib/utils/errors";
import { useTheme } from "@/context/ThemeContext";

export function CreateRequirementModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { themeColor } = useTheme();
  const createRequirement = useCreateDocumentRequirement();
  const { data: documentTypes, isLoading: loadingTypes } = useDocumentTypes();
  const { data: courses, isLoading: loadingCourses } = useCourses();

  const [documentTypeId, setDocumentTypeId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(
    new Set()
  );
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedType = useMemo(
    () => documentTypes?.find((t) => t.id === documentTypeId) ?? null,
    [documentTypes, documentTypeId]
  );
  const recurrence = selectedType?.recurrence ?? "none";

  const allCourseIds = useMemo(
    () => (courses ?? []).map((c) => Number(c.id)),
    [courses]
  );
  const allSelected =
    allCourseIds.length > 0 && selectedCourseIds.size === allCourseIds.length;

  const toggleCourse = (id: number) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedCourseIds(allSelected ? new Set() : new Set(allCourseIds));
  };

  const reset = () => {
    setDocumentTypeId("");
    setTitle("");
    setDescription("");
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
    if (!documentTypeId) {
      setError("Document type is required.");
      return;
    }
    if (selectedCourseIds.size > 0 && !deadline) {
      setError("Please set a deadline for the selected departments.");
      return;
    }
    try {
      await createRequirement.mutateAsync({
        document_type_id: Number(documentTypeId),
        title: title.trim(),
        description: description.trim() || undefined,
        course_ids: Array.from(selectedCourseIds),
        deadline_at: selectedCourseIds.size > 0 ? deadline : undefined,
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
                    A specific ask tied to a document type
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
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                  Document Type
                </label>
                <select
                  value={documentTypeId}
                  onChange={(e) =>
                    setDocumentTypeId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  disabled={loadingTypes}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none transition disabled:opacity-60"
                  style={{
                    borderColor: documentTypeId ? `${themeColor}55` : undefined,
                  }}
                >
                  <option value="">
                    {loadingTypes ? "Loading..." : "Select a type"}
                  </option>
                  {documentTypes?.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                      {type.recurrence && type.recurrence !== "none"
                        ? ` (${type.recurrence})`
                        : ""}
                    </option>
                  ))}
                </select>

                {selectedType && recurrence !== "none" && (
                  <div
                    className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold"
                    style={{
                      backgroundColor: "var(--color-accent-soft)",
                      color: themeColor,
                    }}
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
                  style={{
                    borderColor: title ? `${themeColor}55` : undefined,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = themeColor)}
                  onBlur={(e) =>
                  (e.currentTarget.style.borderColor = title
                    ? `${themeColor}55`
                    : "")
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400"
                  style={{
                    borderColor: description ? `${themeColor}55` : undefined,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = themeColor)}
                  onBlur={(e) =>
                  (e.currentTarget.style.borderColor = description
                    ? `${themeColor}55`
                    : "")
                  }
                />
              </div>

              {/* Assign to departments */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-500">
                    Assign to departments (optional)
                  </label>
                  {allCourseIds.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-[11px] font-semibold hover:underline"
                      style={{ color: themeColor }}
                    >
                      {allSelected ? "Clear all" : "Select all"}
                    </button>
                  )}
                </div>

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
                          className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] text-slate-700 transition hover:bg-white ${
                            index !== 0 ? "border-t border-slate-200" : ""
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
                  {selectedCourseIds.size} selected. You can change this later
                  with “Assign to department”.
                </p>
              </div>

              {/* Deadline (only needed when departments are selected) */}
              {selectedCourseIds.size > 0 && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                    Deadline for selected departments
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none transition"
                    style={{
                      borderColor: deadline ? `${themeColor}55` : undefined,
                    }}
                  />
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