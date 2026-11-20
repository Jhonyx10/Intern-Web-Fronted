const STYLES: Record<string, { label: string; cls: string }> = {
    early: { label: "Early", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
    on_time: { label: "On time", cls: "bg-blue-50 text-blue-700 ring-blue-600/20" },
    late: { label: "Late", cls: "bg-rose-50 text-rose-700 ring-rose-600/20" },
};

export function SessionBadge({ value }: { value?: string | null }) {
    if (!value) return <span className="text-[var(--color-muted)]">—</span>;

    const s = STYLES[value];
    if (!s) return <span className="capitalize">{value}</span>;

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.cls}`}
        >
            {s.label}
        </span>
    );
}