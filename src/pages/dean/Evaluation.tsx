import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Edit3,
  Copy,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import {
  useEvaluationTemplates,
  useDuplicateEvaluationTemplate,
  type EvaluationTemplateDetail,
} from "@/lib/queries/evaluation";
import { useAuth } from "@/lib/auth";

type QuickFilter = "all" | "editable" | "locked";
type StatusFilter = "all" | "active" | "inactive";

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-medium text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{caption}</p>
    </div>
  );
}

// ── Row "···" menu ────────────────────────────────────────────────
// Rendered with fixed positioning so the table's overflow never clips it.

type MenuItem = {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
};

function RowMenu({ items }: { items: MenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        onClick={(e) => {
          if (open) return setPos(null);
          const rect = e.currentTarget.getBoundingClientRect();
          setPos({
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
          });
        }}
        className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-muted)] transition hover:bg-slate-50 hover:text-[var(--color-ink)]"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && pos && (
        <div
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 w-48 rounded-xl border border-[var(--color-line)] bg-white p-1 shadow-[var(--shadow-soft)]"
        >
          {items.map(({ label, icon: Icon, onClick, disabled }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => {
                setPos(null);
                onClick();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-ink)] transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Icon size={14} className="text-[var(--color-muted)]" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export const EvaluationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.name === "super_admin";

  const [searchTerm, setSearchTerm] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: templates = [], isLoading } = useEvaluationTemplates();
  const duplicateMutation = useDuplicateEvaluationTemplate();

  const editableCount = templates.filter((t) => !t.is_used).length;
  const lockedCount = templates.filter((t) => t.is_used).length;
  const activeCount = templates.filter((t) => t.is_active).length;

  const filteredTemplates = templates.filter((template) => {
    if (quickFilter === "editable" && template.is_used) return false;
    if (quickFilter === "locked" && !template.is_used) return false;
    if (statusFilter === "active" && !template.is_active) return false;
    if (statusFilter === "inactive" && template.is_active) return false;

    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    return (
      (template.title ?? "").toLowerCase().includes(query) ||
      (template.description ?? "").toLowerCase().includes(query) ||
      (template.used_in_school_years ?? []).some((sy) =>
        sy.toLowerCase().includes(query)
      )
    );
  });

  const pills: { key: QuickFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: templates.length },
    { key: "editable", label: "Editable", count: editableCount },
    { key: "locked", label: "Used / locked", count: lockedCount },
  ];

  function duplicate(template: EvaluationTemplateDetail) {
    duplicateMutation.mutate(template.id, {
      onSuccess: (data) => navigate(`/evaluation/edit/${data.id}`),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-7xl space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Evaluation setup / Templates
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            Evaluation library
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            Build, reuse, and preview OJT evaluation questionnaires.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => navigate("/evaluation/create")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
          >
            <Plus size={16} /> New template
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="All templates"
          value={templates.length}
          caption="Named templates"
        />
        <StatCard
          label="Editable"
          value={editableCount}
          caption="Available to update"
        />
        <StatCard
          label="Used / locked"
          value={lockedCount}
          caption="Duplicate to make changes"
        />
        <StatCard
          label="Active"
          value={activeCount}
          caption="Open for assignment"
        />
      </div>

      {/* Browse panel */}
      <section className="rounded-2xl border border-[var(--color-line)] bg-white shadow-sm">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                Browse templates
              </h2>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                {filteredTemplates.length} matching template
                {filteredTemplates.length === 1 ? "" : "s"}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {pills.map((pill) => {
                const active = quickFilter === pill.key;
                return (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setQuickFilter(pill.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "text-[var(--color-muted)] hover:bg-slate-50 hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {pill.label} ({pill.count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-muted)] transition focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent-soft)]">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search name, description, or school year"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter by status"
              className="rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)] sm:w-48"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border-t border-[var(--color-line)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                <th className="px-6 py-3.5">Template</th>
                <th className="px-4 py-3.5">Questions</th>
                <th className="px-4 py-3.5">Usage</th>
                <th className="px-4 py-3.5">State</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <Loader2
                      className="mx-auto animate-spin text-[var(--color-accent)]"
                      size={24}
                    />
                    <span className="mt-2 block text-xs text-[var(--color-muted)]">
                      Loading templates…
                    </span>
                  </td>
                </tr>
              ) : filteredTemplates.length > 0 ? (
                <AnimatePresence>
                  {filteredTemplates.map((template: EvaluationTemplateDetail) => {
                    const used = Boolean(template.is_used);
                    const schoolYears = template.used_in_school_years ?? [];

                    return (
                      <motion.tr
                        key={template.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group transition-colors hover:bg-slate-50/70"
                      >
                        {/* Template */}
                        <td className="border-l-2 border-l-transparent px-6 py-4 group-hover:border-l-[var(--color-accent)]">
                          <p className="font-semibold text-[var(--color-ink)]">
                            {template.title}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                            Created {formatDate(template.created_at)} ·{" "}
                            {used ? "Locked after assignment" : "Editable"}
                          </p>
                          {template.description && (
                            <p
                              className="mt-0.5 max-w-sm truncate text-xs text-[var(--color-muted)]"
                              title={template.description}
                            >
                              {template.description}
                            </p>
                          )}
                        </td>

                        {/* Questions */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center rounded-full border border-[var(--color-line)] bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-ink)]">
                            {template.items_count ?? 0} item
                            {(template.items_count ?? 0) === 1 ? "" : "s"}
                          </span>
                        </td>

                        {/* Usage */}
                        <td className="px-4 py-4">
                          {schoolYears.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {schoolYears.slice(0, 2).map((sy) => (
                                <span
                                  key={sy}
                                  className="inline-flex items-center rounded-md border border-[var(--color-line)] bg-white px-2 py-0.5 text-xs font-medium text-[var(--color-ink)]"
                                >
                                  {sy}
                                </span>
                              ))}
                              {schoolYears.length > 2 && (
                                <span
                                  className="inline-flex items-center rounded-md border border-[var(--color-line)] bg-white px-2 py-0.5 text-xs font-medium text-[var(--color-muted)]"
                                  title={schoolYears.slice(2).join(", ")}
                                >
                                  +{schoolYears.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs italic text-[var(--color-muted)]">
                              Not used yet
                            </span>
                          )}
                        </td>

                        {/* State */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                used ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  used ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                              />
                              {used ? "Used / locked" : "Editable"}
                            </span>
                            {!template.is_active && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/evaluation/details/${template.id}`)
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 text-xs font-semibold text-[var(--color-ink)] transition hover:bg-slate-50"
                            >
                              <Eye size={13} /> View
                            </button>

                            {isSuperAdmin && (
                              <RowMenu
                                items={
                                  used
                                    ? [
                                        {
                                          label: "Duplicate & edit",
                                          icon: Copy,
                                          onClick: () => duplicate(template),
                                          disabled: duplicateMutation.isPending,
                                        },
                                      ]
                                    : [
                                        {
                                          label: "Edit template",
                                          icon: Edit3,
                                          onClick: () =>
                                            navigate(
                                              `/evaluation/edit/${template.id}`
                                            ),
                                        },
                                      ]
                                }
                              />
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-14 text-center text-sm text-[var(--color-muted)]"
                  >
                    No evaluation templates match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
};

export default EvaluationPage;