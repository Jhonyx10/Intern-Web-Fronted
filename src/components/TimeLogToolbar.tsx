import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  Download,
  FileText,
  List,
} from "lucide-react";

type TimeLogView = "normal" | "dtr";

interface TimeLogToolbarProps {
  view: TimeLogView;
  onViewChange: (view: TimeLogView) => void;
  onExportWeekly: () => void;
  onExportDtr: () => void;
}

const VIEWS: { value: TimeLogView; label: string; icon: typeof List }[] = [
  { value: "normal", label: "Logs", icon: List },
  { value: "dtr", label: "DTR", icon: CalendarDays },
];

export function TimeLogToolbar({
  view,
  onViewChange,
  onExportWeekly,
  onExportDtr,
}: TimeLogToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the export menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const choose = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <div className="flex items-center gap-3">
      {/* View switcher */}
      <div
        role="tablist"
        aria-label="Time log view"
        className="relative inline-flex rounded-xl bg-slate-100 p-1"
      >
        {VIEWS.map(({ value, label, icon: Icon }) => {
          const active = view === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onViewChange(value)}
              className={`relative z-10 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                active
                  ? "text-[var(--color-ink)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="timelog-view-pill"
                  className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm ring-1 ring-black/5"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Export menu */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <Download size={14} />
          Export
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 z-30 mt-2 w-72 origin-top-right rounded-2xl border border-[var(--color-line)] bg-white p-1.5 shadow-xl ring-1 ring-black/5"
            >
              <MenuItem
                icon={<FileText size={16} />}
                title="Weekly report"
                description="Signed weekly accomplishment report (PDF)"
                onClick={() => choose(onExportWeekly)}
              />
              <MenuItem
                icon={<CalendarDays size={16} />}
                title="Daily time record"
                description="Monthly DTR as PDF or CSV"
                onClick={() => choose(onExportDtr)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition hover:bg-slate-50 focus-visible:bg-slate-50"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[var(--color-ink)]">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-muted)]">
          {description}
        </span>
      </span>
    </button>
  );
}

export default TimeLogToolbar;