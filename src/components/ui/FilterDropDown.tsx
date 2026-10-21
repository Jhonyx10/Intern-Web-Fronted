import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";

export type FilterOption = {
    value: string | number;
    label: string;
    /** Secondary text, e.g. a semester or a course code */
    hint?: string;
    /** Small pill next to the label, e.g. "Current" */
    tag?: string;
};

type Props = {
    /** Small caption above the value (filter mode only) */
    caption?: string;
    icon?: ReactNode;
    options: FilterOption[];
    /** Selected value. Ignored in "action" mode. */
    value?: string | number | null;
    onSelect: (value: string | number) => void;
    placeholder?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    align?: "left" | "right";
    /**
     * "filter": shows the selected value and a check mark in the list.
     * "action": a button that opens a menu of choices; nothing stays selected.
     */
    mode?: "filter" | "action";
    menuTitle?: string;
};

export function FilterDropdown({
    caption,
    icon,
    options,
    value = null,
    onSelect,
    placeholder = "Select…",
    searchable = false,
    searchPlaceholder = "Search…",
    emptyText = "Nothing to show",
    disabled = false,
    align = "left",
    mode = "filter",
    menuTitle,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);

    // Close on outside click or Escape
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const selected =
        mode === "filter"
            ? options.find((o) => String(o.value) === String(value))
            : undefined;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) =>
            `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q)
        );
    }, [options, query]);

    const pick = (v: string | number) => {
        onSelect(v);
        setOpen(false);
        setQuery("");
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`flex items-center gap-2.5 rounded-xl border bg-white px-3 shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${mode === "filter" && caption ? "py-1.5" : "py-2.5"
                    } ${open
                        ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20"
                        : "border-[var(--color-line)] hover:border-[var(--color-accent)]"
                    }`}
            >
                {icon && (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                        {icon}
                    </span>
                )}

                {mode === "filter" && caption ? (
                    <span className="flex flex-col items-start text-left leading-tight">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            {caption}
                        </span>
                        <span className="text-sm font-medium text-[var(--color-ink)]">
                            {selected?.label ?? placeholder}
                            {selected?.hint && (
                                <span className="font-normal text-[var(--color-muted)]">
                                    {" "}
                                    · {selected.hint}
                                </span>
                            )}
                        </span>
                    </span>
                ) : (
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                        {selected?.label ?? placeholder}
                    </span>
                )}

                <ChevronDown
                    size={14}
                    className={`shrink-0 text-[var(--color-muted)] transition-transform ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className={`absolute top-full z-30 mt-2 w-72 max-w-[85vw] overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-lg ${align === "right" ? "right-0" : "left-0"
                            }`}
                    >
                        {menuTitle && (
                            <p className="border-b border-[var(--color-line)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                                {menuTitle}
                            </p>
                        )}

                        {searchable && (
                            <label className="flex items-center gap-2 border-b border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-muted)]">
                                <Search size={13} />
                                <input
                                    autoFocus
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="flex-1 bg-transparent text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
                                />
                            </label>
                        )}

                        <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
                            {filtered.length === 0 ? (
                                <li className="px-3 py-3 text-center text-xs text-[var(--color-muted)]">
                                    {emptyText}
                                </li>
                            ) : (
                                filtered.map((o) => {
                                    const isSelected =
                                        mode === "filter" && String(o.value) === String(value);
                                    return (
                                        <li key={o.value} role="option" aria-selected={isSelected}>
                                            <button
                                                type="button"
                                                onClick={() => pick(o.value)}
                                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${isSelected
                                                        ? "bg-[var(--color-accent-soft)]/50 font-semibold text-[var(--color-accent)]"
                                                        : "text-[var(--color-ink)]"
                                                    }`}
                                            >
                                                <span className="min-w-0 flex-1 truncate">
                                                    {o.label}
                                                    {o.hint && (
                                                        <span className="font-normal text-[var(--color-muted)]">
                                                            {" "}
                                                            · {o.hint}
                                                        </span>
                                                    )}
                                                </span>
                                                {o.tag && (
                                                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                                        {o.tag}
                                                    </span>
                                                )}
                                                {isSelected && (
                                                    <Check size={14} className="shrink-0" />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}