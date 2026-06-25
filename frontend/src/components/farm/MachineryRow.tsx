import type { Machinery } from "@/types";

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-bold tabular-nums leading-none text-stone-900">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">{label}</span>
    </div>
  );
}

interface Props {
  item: Machinery;
  onUpdate: (patch: Partial<Machinery>) => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggle: () => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export default function MachineryRow({
  item,
  onUpdate,
  selectionMode,
  isSelected,
  onToggle,
  isEditing,
  onEditToggle,
}: Props) {
  const annualDepreciationPerAcre =
    item.annualAcresCovered > 0
      ? item.purchasePrice / item.estimatedUsefulLifeYears / item.annualAcresCovered
      : 0;

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-colors ${
        selectionMode && isSelected
          ? "border-amber-400 ring-1 ring-amber-200"
          : isEditing
          ? "border-amber-300"
          : "border-stone-200"
      }`}
    >
      <div className="flex items-start gap-3 p-5">
        {selectionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="mt-1 h-4 w-4 cursor-pointer rounded border-stone-300 accent-amber-500"
          />
        )}

        {isEditing ? (
          /* ── Edit mode ── */
          <div className="flex-1 flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Model</label>
                <input
                  type="text" value={item.model}
                  onChange={(e) => onUpdate({ model: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Type</label>
                <input
                  type="text" value={item.type}
                  onChange={(e) => onUpdate({ type: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Year</label>
                <input
                  type="number" min="1900" max="2100" step="1" value={item.purchaseYear}
                  onChange={(e) => onUpdate({ purchaseYear: parseInt(e.target.value) || item.purchaseYear })}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Purchase price ($)</label>
                <input
                  type="number" min="0" step="1000" value={item.purchasePrice}
                  onChange={(e) => onUpdate({ purchasePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Useful life (yr)</label>
                <input
                  type="number" min="1" step="1" value={item.estimatedUsefulLifeYears}
                  onChange={(e) => onUpdate({ estimatedUsefulLifeYears: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Acres/yr</label>
                <input
                  type="number" min="0" step="1" value={item.annualAcresCovered}
                  onChange={(e) => onUpdate({ annualAcresCovered: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Depr./acre</label>
                <p className="mt-1.5 px-3 py-2 text-sm font-semibold text-stone-700 tabular-nums">
                  ${annualDepreciationPerAcre.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onEditToggle}
                className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-base font-semibold text-stone-900">{item.model}</p>
                <p className="text-xs text-stone-400 capitalize mt-0.5">{item.type} · {item.purchaseYear}</p>
              </div>
              {!selectionMode && (
                <button
                  onClick={onEditToggle}
                  className="shrink-0 rounded-lg border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-400 hover:border-amber-400 hover:text-amber-600 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="flex items-start gap-6">
              <Stat value={`$${(item.purchasePrice / 1000).toFixed(0)}k`} label="Price" />
              <div className="w-px self-stretch bg-stone-100" />
              <Stat value={`${item.estimatedUsefulLifeYears} yr`} label="Useful life" />
              <div className="w-px self-stretch bg-stone-100" />
              <Stat value={item.annualAcresCovered.toLocaleString()} label="Acres/yr" />
              <div className="w-px self-stretch bg-stone-100" />
              <Stat value={`$${annualDepreciationPerAcre.toFixed(2)}`} label="Depr./acre" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
