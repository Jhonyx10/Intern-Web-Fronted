import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  disabled?: boolean; // e.g. while the next page is fetching
};

// 1 … 4 5 [6] 7 8 … 20
function pageNumbers(page: number, lastPage: number): (number | "…")[] {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, i) => i + 1);
  }

  const pages: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(lastPage - 1, page + 1);

  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < lastPage - 1) pages.push("…");

  pages.push(lastPage);
  return pages;
}

export default function Pagination({
  page,
  lastPage,
  total,
  perPage,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-[var(--color-muted)]">
        Showing{" "}
        <span className="font-semibold text-[var(--color-ink)]">
          {from}–{to}
        </span>{" "}
        of <span className="font-semibold text-[var(--color-ink)]">{total}</span>
      </p>

      {lastPage > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Previous page"
            className={`${btn} border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-slate-50`}
          >
            <ChevronLeft size={14} />
          </button>

          {pageNumbers(page, lastPage).map((p, i) =>
            p === "…" ? (
              <span
                key={`gap-${i}`}
                className="px-1 text-xs text-[var(--color-muted)]"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={disabled}
                aria-current={p === page ? "page" : undefined}
                className={
                  p === page
                    ? `${btn} border-[var(--color-accent)] bg-[var(--color-accent)] text-white`
                    : `${btn} border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-slate-50`
                }
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= lastPage}
            aria-label="Next page"
            className={`${btn} border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-slate-50`}
          >
            <ChevronRight size={14} />
          </button>
        </nav>
      )}
    </div>
  );
}