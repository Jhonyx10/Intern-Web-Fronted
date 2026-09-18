import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, FileText, CalendarDays, Repeat, Check } from "lucide-react";
import { useCreateDocumentType } from "@/lib/queries/documents";
import { firstErrorMessage } from "@/lib/utils/errors";
import { useTheme } from "@/context/ThemeContext";

function withAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}

type Recurrence = "none" | "daily" | "weekly";

const RECURRENCE_OPTIONS: {
  value: Recurrence;
  label: string;
  hint: string;
  icon: typeof FileText;
}[] = [
  { value: "none", label: "One-time", hint: "Waiver, ID, MOA", icon: FileText },
  { value: "daily", label: "Daily", hint: "e.g. DTR", icon: CalendarDays },
  { value: "weekly", label: "Weekly", hint: "e.g. weekly report", icon: Repeat },
];

export function CreateTypeModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { themeColor } = useTheme();

  const createType = useCreateDocumentType();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCode("");
    setName("");
    setIsRequired(false);
    setRecurrence("none");
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
        recurrence,
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pb-5 pt-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "var(--color-accent-soft)" }}
                >
                  <FileText size={18} strokeWidth={2.25} style={{ color: themeColor }} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900">
                    New Document Type
                  </h2>
                  <p className="text-[12px] text-slate-400">
                    Defines what interns can submit
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
            <div className="space-y-5 px-6 pb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                    Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="weekly_report"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400"
                    style={{
                      borderColor: code ? withAlpha(themeColor, "55") : undefined,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = themeColor)}
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = code
                        ? withAlpha(themeColor, "55")
                        : "")
                    }
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Weekly Report"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400"
                    style={{
                      borderColor: name ? withAlpha(themeColor, "55") : undefined,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = themeColor)}
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = name
                        ? withAlpha(themeColor, "55")
                        : "")
                    }
                  />
                </div>
              </div>

              {/* Recurrence picker */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
                  How often is this submitted?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {RECURRENCE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = recurrence === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRecurrence(opt.value)}
                        className="flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition"
                        style={{
                          borderColor: selected ? themeColor : "#E2E8F0",
                          backgroundColor: selected
                            ? "var(--color-accent-soft)"
                            : "#F8FAFC",
                        }}
                      >
                        <Icon
                          size={16}
                          strokeWidth={2.25}
                          color={selected ? themeColor : "#94A3B8"}
                        />
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: selected ? themeColor : "#475569" }}
                        >
                          {opt.label}
                        </span>
                        <span className="text-[9.5px] leading-tight text-slate-400">
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Required toggle */}
              <button
                type="button"
                onClick={() => setIsRequired((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5"
              >
                <span className="text-[12.5px] font-semibold text-slate-700">
                  Required by default
                </span>
                <span
                  className="relative h-5 w-9 rounded-full transition-colors"
                  style={{ backgroundColor: isRequired ? themeColor : "#CBD5E1" }}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
                    style={{ left: isRequired ? 18 : 2 }}
                  />
                </span>
              </button>

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
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={handleClose}
                className="rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={createType.isPending}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm transition disabled:opacity-50"
                style={{ backgroundColor: themeColor }}
              >
                {createType.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} strokeWidth={2.5} />
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