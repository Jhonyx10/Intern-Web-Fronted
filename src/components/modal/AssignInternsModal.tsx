import { useState, useMemo } from "react";
import { X, Search, Building2, Calendar } from "lucide-react";
import type { SupervisorIntern } from "@/lib/queries/supervisor";

type BuildingOption = {
  id: number;
  name: string;
};

type AssignInternsModalProps = {
  open: boolean;
  onClose: () => void;
  isLoading: boolean;
  buildings: BuildingOption[];
  interns: SupervisorIntern[];
  getAssignedIds: (buildingId: number) => number[]; // interns already in the selected building
  onAssign: (buildingId: number, studentIds: number[], dateStart: string, dateEnd: string | null) => void;
};

export function AssignInternsModal({
  open,
  onClose,
  isLoading,
  buildings,
  interns,
  getAssignedIds,
  onAssign,
}: AssignInternsModalProps) {
  const [buildingId, setBuildingId] = useState<number | "">(buildings[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>(
    buildings[0] ? getAssignedIds(buildings[0].id) : []
  );
  const [dateStart, setDateStart] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [dateEnd, setDateEnd] = useState<string>("");

  const filteredInterns = useMemo(() => {
    if (!search.trim()) return interns;
    const q = search.toLowerCase();
    return interns.filter(
      (i) =>
        `${i.first_name} ${i.last_name}`.toLowerCase().includes(q) ||
        i.student_number.toLowerCase().includes(q)
    );
  }, [interns, search]);

  if (!open) return null;

  const handleBuildingChange = (value: string) => {
    const id = Number(value);
    setBuildingId(id);
    setSelectedIds(getAssignedIds(id));
  };

  const toggleIntern = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  const dateRangeInvalid = Boolean(dateEnd) && dateEnd < dateStart;
  const canSubmit = buildingId !== "" && selectedIds.length > 0 && dateStart && !dateRangeInvalid;

  const handleSubmit = () => {
    if (buildingId === "" || selectedIds.length === 0 || !dateStart || dateRangeInvalid) return;
    onAssign(buildingId, selectedIds, dateStart, dateEnd || null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Assign interns</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Building dropdown */}
        <div className="px-6 pt-4">
          <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">Building</label>
          <select
            value={buildingId}
            onChange={(e) => handleBuildingChange(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-line)] bg-slate-50/50 px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
          >
            {buildings.length === 0 && <option value="">No buildings available</option>}
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3 px-6 pt-4">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
              <Calendar size={12} /> Start date
            </label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-line)] bg-slate-50/50 px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
              <Calendar size={12} /> End date <span className="text-[var(--color-muted)]/70">(optional)</span>
            </label>
            <input
              type="date"
              value={dateEnd}
              min={dateStart}
              onChange={(e) => setDateEnd(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-line)] bg-slate-50/50 px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        </div>
        {dateRangeInvalid && (
          <p className="px-6 pt-2 text-xs text-red-600">End date must be on or after the start date.</p>
        )}

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-slate-50/50 px-3 py-2">
            <Search size={14} className="text-[var(--color-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or student number"
              className="w-full bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none"
            />
          </div>
        </div>

        {/* Intern list — capped to ~3 rows, scrolls beyond that */}
        <div className="mt-4 max-h-[168px] space-y-1.5 overflow-y-auto px-6">
          {filteredInterns.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-muted)]">
              No interns found.
            </p>
          ) : (
            filteredInterns.map((intern) => {
              const checked = selectedIds.includes(intern.id);
              return (
                <label
                  key={intern.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    checked
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                      : "border-[var(--color-line)] bg-white hover:bg-slate-50/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleIntern(intern.id)}
                    className="h-4 w-4 rounded border-[var(--color-line)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                      {intern.last_name}, {intern.first_name}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">{intern.student_number}</p>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-line)] px-6 py-4 mt-4">
          <p className="text-xs text-[var(--color-muted)]">{selectedIds.length} selected</p>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-ink)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !canSubmit}
              className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Saving…" : "Save assignment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}