import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  parseISO,
} from "date-fns";
import { FileDown, Download, X } from "lucide-react";
import type { DateRange } from "@/lib/exportDtr";

type Mode =
  | "all"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "weeks"
  | "months"
  | "year"
  | "custom";

const WEEK = { weekStartsOn: 1 as const }; // Monday; change to 0 for Sunday
const EASE = [0.22, 1, 0.36, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onCSV: (range: DateRange | null) => void;
  onPDF: (range: DateRange | null) => void;
}

/** Collapses/expands its children smoothly when mounted/unmounted. */
function Reveal({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: EASE }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

export function ExportDTRModal({ open, onClose, onCSV, onPDF }: Props) {
  const today = new Date();
  const [mode, setMode] = useState<Mode>("this_month");
  const [from, setFrom] = useState(format(today, "yyyy-MM-dd"));
  const [to, setTo] = useState(format(today, "yyyy-MM-dd"));
  const [fromMonth, setFromMonth] = useState(format(today, "yyyy-MM"));
  const [toMonth, setToMonth] = useState(format(today, "yyyy-MM"));
  const [year, setYear] = useState(today.getFullYear());

  const range: DateRange | null | "invalid" = useMemo(() => {
    const now = new Date();
    let r: DateRange | null = null;
    switch (mode) {
      case "all":
        return null;
      case "this_week":
        r = { from: startOfWeek(now, WEEK), to: endOfWeek(now, WEEK) };
        break;
      case "last_week": {
        const d = subWeeks(now, 1);
        r = { from: startOfWeek(d, WEEK), to: endOfWeek(d, WEEK) };
        break;
      }
      case "this_month":
        r = { from: startOfMonth(now), to: endOfMonth(now) };
        break;
      case "last_month": {
        const d = subMonths(now, 1);
        r = { from: startOfMonth(d), to: endOfMonth(d) };
        break;
      }
      case "weeks": // pick any date in the first and last week
        r = {
          from: startOfWeek(parseISO(from), WEEK),
          to: endOfWeek(parseISO(to), WEEK),
        };
        break;
      case "months":
        r = {
          from: startOfMonth(parseISO(fromMonth)),
          to: endOfMonth(parseISO(toMonth)),
        };
        break;
      case "year": {
        const d = new Date(year, 0, 1);
        r = { from: startOfYear(d), to: endOfYear(d) };
        break;
      }
      case "custom":
        r = { from: parseISO(from), to: parseISO(to) };
        break;
    }
    return r && !isNaN(+r.from) && !isNaN(+r.to) && r.from <= r.to
      ? r
      : "invalid";
  }, [mode, from, to, fromMonth, toMonth, year]);

  const invalid = range === "invalid";
  const safeRange = invalid ? null : (range as DateRange | null);

  const summary = invalid
    ? "Please choose a valid range (start must be before end)."
    : safeRange
      ? `${format(safeRange.from, "MMM d, yyyy")} – ${format(
          safeRange.to,
          "MMM d, yyyy"
        )}`
      : "Every log on record";

  const input =
    "rounded-lg border border-[var(--color-line)] px-2.5 py-1.5 text-xs outline-none transition focus:border-[var(--color-accent)]";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="export-dtr-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--color-ink)]">
                Export DTR
              </h3>
              <motion.button
                type="button"
                onClick={onClose}
                aria-label="Close"
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                <X size={16} />
              </motion.button>
            </div>

            <select
              className={`${input} w-full`}
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="this_week">This week</option>
              <option value="last_week">Last week</option>
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="weeks">Week range…</option>
              <option value="months">Month range…</option>
              <option value="year">Whole year…</option>
              <option value="custom">Custom dates…</option>
              <option value="all">All records</option>
            </select>

            {/* Mode-specific inputs slide open/closed */}
            <AnimatePresence initial={false} mode="wait">
              {(mode === "weeks" || mode === "custom") && (
                <Reveal id="dates">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <input
                        type="date"
                        className={input}
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                      />
                      <span>to</span>
                      <input
                        type="date"
                        className={input}
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                      />
                    </div>
                    {mode === "weeks" && (
                      <p className="text-[11px] text-[var(--color-muted)]">
                        Pick any day in the first and last week; both are
                        expanded to full weeks.
                      </p>
                    )}
                  </div>
                </Reveal>
              )}
              {mode === "months" && (
                <Reveal id="months">
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="month"
                      className={input}
                      value={fromMonth}
                      onChange={(e) => setFromMonth(e.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="month"
                      className={input}
                      value={toMonth}
                      onChange={(e) => setToMonth(e.target.value)}
                    />
                  </div>
                </Reveal>
              )}
              {mode === "year" && (
                <Reveal id="year">
                  <input
                    type="number"
                    className={`${input} w-28`}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </Reveal>
              )}
            </AnimatePresence>

            {/* Summary fades when it changes; turns red when invalid */}
            <div className="min-h-[16px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={summary}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.12 }}
                  className={`text-[11px] ${
                    invalid ? "text-rose-600" : "text-[var(--color-muted)]"
                  }`}
                >
                  {summary}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="flex justify-end gap-2">
              <motion.button
                type="button"
                disabled={invalid}
                whileHover={invalid ? undefined : { y: -1 }}
                whileTap={invalid ? undefined : { scale: 0.96 }}
                onClick={() => {
                  onCSV(safeRange);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <FileDown size={14} className="text-green-600" /> CSV
              </motion.button>
              <motion.button
                type="button"
                disabled={invalid}
                whileHover={invalid ? undefined : { y: -1 }}
                whileTap={invalid ? undefined : { scale: 0.96 }}
                onClick={() => {
                  onPDF(safeRange);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <Download size={14} className="text-red-600" /> PDF
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ExportDTRModal;