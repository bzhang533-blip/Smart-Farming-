"use client";

import { useEffect, useRef, useState } from "react";
import type { Machinery, FarmProfile } from "@/types";
import type { Crop } from "@/types/common";
import { getFarmProfile, getMachinery, updateFarmProfile } from "@/lib/api/farm";
import { getDefaults } from "@/lib/api/defaults";
import { STATE_CONFIG } from "@/config/states";
import { CROP_CONFIG, CROPS } from "@/config/crops";
import { useFarmStore } from "@/lib/store/farmStore";
import MachineryRow from "./MachineryRow";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-stone-200 ${className ?? ""}`} />
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-bold tabular-nums leading-none text-stone-900">
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
        {label}
      </span>
    </div>
  );
}

export default function FarmClient() {
  // Start without skeleton if store is already loaded (e.g. user visited /breakeven first).
  const [loading, setLoading] = useState(
    () => useFarmStore.getState().farm === null,
  );
  const [error, setError] = useState<string | null>(null);
  const [machinery, setMachinery] = useState<Machinery[]>([]);

  const originalFarmRef = useRef<FarmProfile | null>(null);
  const originalMachineryRef = useRef<Machinery[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingMachineryId, setEditingMachineryId] = useState<string | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [machinerySelectionMode, setMachinerySelectionMode] = useState(false);
  const [machinerySelectedIds, setMachinerySelectedIds] = useState<Set<string>>(new Set());
  const [showMachineryDeleteConfirm, setShowMachineryDeleteConfirm] = useState(false);

  const farm = useFarmStore((s) => s.farm);
  const initFromFetch = useFarmStore((s) => s.initFromFetch);
  const updateFarmName = useFarmStore((s) => s.updateFarmName);
  const updateField = useFarmStore((s) => s.updateField);
  const addField = useFarmStore((s) => s.addField);
  const deleteFields = useFarmStore((s) => s.deleteFields);
  const resetFarm = useFarmStore((s) => s.resetFarm);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Only fetch farm + defaults if the store is not yet initialised.
        if (useFarmStore.getState().farm === null) {
          const [f, defs] = await Promise.all([
            getFarmProfile(),
            getDefaults(),
          ]);
          initFromFetch(f, defs);
        }
        const macRes = await getMachinery();
        if (!cancelled) {
          setMachinery(macRes.machinery);
          // Snapshot current state once — used for dirty detection and Cancel.
          if (originalFarmRef.current === null) {
            originalFarmRef.current = JSON.parse(
              JSON.stringify(useFarmStore.getState().farm),
            );
            originalMachineryRef.current = JSON.parse(
              JSON.stringify(macRes.machinery),
            );
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load farm profile",
          );
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [initFromFetch]);

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (loading || !farm) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <SkeletonBlock className="h-7 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
        </div>
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  const stateLabel = STATE_CONFIG[farm.state]?.label ?? farm.state;

  function toggleSelect(fieldId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(fieldId) ? next.delete(fieldId) : next.add(fieldId);
      return next;
    });
  }

  function handleAddField() {
    if (!farm) return;
    const id = `field-${Date.now()}`;
    addField({
      fieldId: id,
      name: `Field ${farm.fields.length + 1}`,
      acres: 0,
      zip: farm.fields[0]?.zip ?? "",
      crop: "corn" as Crop,
      aph: 0,
    });
    setEditingFieldId(id);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function confirmDelete() {
    deleteFields([...selectedIds]);
    exitSelectionMode();
    setShowDeleteConfirm(false);
  }

  function toggleMachinerySelect(id: string) {
    setMachinerySelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitMachinerySelectionMode() {
    setMachinerySelectionMode(false);
    setMachinerySelectedIds(new Set());
  }

  function confirmMachineryDelete() {
    setMachinery((prev) => prev.filter((m) => !machinerySelectedIds.has(m.machineryId)));
    exitMachinerySelectionMode();
    setShowMachineryDeleteConfirm(false);
  }

  function handleAddMachinery() {
    const id = `machinery-${Date.now()}`;
    setMachinery((prev) => [
      ...prev,
      {
        machineryId: id,
        type: "tractor",
        model: "New Equipment",
        purchaseYear: new Date().getFullYear(),
        purchasePrice: 0,
        estimatedUsefulLifeYears: 10,
        annualAcresCovered: 0,
        referenceValueRange: { low: 0, high: 0 },
      },
    ]);
    setEditingMachineryId(id);
  }

  function updateMachinery(id: string, patch: Partial<Machinery>) {
    setMachinery((prev) =>
      prev.map((m) => (m.machineryId === id ? { ...m, ...patch } : m)),
    );
  }

  const isDirty =
    originalFarmRef.current !== null &&
    (JSON.stringify({ name: farm?.name, fields: farm?.fields }) !==
      JSON.stringify({
        name: originalFarmRef.current.name,
        fields: originalFarmRef.current.fields,
      }) ||
      JSON.stringify(machinery) !==
        JSON.stringify(originalMachineryRef.current));

  async function handleSave() {
    if (!farm) return;
    setSaveStatus("saving");
    try {
      await updateFarmProfile({ name: farm.name, fields: farm.fields });
      // Commit snapshot so dirty resets.
      originalFarmRef.current = JSON.parse(JSON.stringify(farm));
      originalMachineryRef.current = JSON.parse(JSON.stringify(machinery));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }

  function handleDiscard() {
    if (!originalFarmRef.current) return;
    resetFarm(originalFarmRef.current);
    setMachinery(JSON.parse(JSON.stringify(originalMachineryRef.current)));
    setSaveStatus("idle");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      {/* Header — farm name */}
      <div className="border-b border-stone-100 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-2">
          {stateLabel} · Farm Profile
        </p>
        <input
          type="text"
          value={farm.name}
          onChange={(e) => updateFarmName(e.target.value)}
          className="w-full bg-transparent text-3xl font-bold text-stone-900 placeholder:text-stone-300 focus:outline-none border-b-2 border-transparent focus:border-amber-400 transition-colors pb-1"
          placeholder="Farm Name"
        />
      </div>

      {/* Fields */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
              Fields
            </p>
            <p className="mt-0.5 text-sm text-stone-500">
              {farm.fields.length} field{farm.fields.length !== 1 ? "s" : ""}{" "}
              ·{" "}
              {farm.fields
                .reduce((s, f) => s + f.acres, 0)
                .toLocaleString()}{" "}
              total acres
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                  >
                    Delete ({selectedIds.size})
                  </button>
                )}
                <button
                  onClick={exitSelectionMode}
                  className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-500 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleAddField}
                  className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
                >
                  + Add Field
                </button>
                <button
                  onClick={() => setSelectionMode(true)}
                  className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-400 hover:bg-stone-50 transition-colors"
                >
                  Select
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {farm.fields.map((f) => {
            const isSelected = selectedIds.has(f.fieldId);
            const isEditing = !selectionMode && editingFieldId === f.fieldId;
            return (
              <div
                key={f.fieldId}
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
                      onChange={() => toggleSelect(f.fieldId)}
                      className="mt-1 h-4 w-4 cursor-pointer rounded border-stone-300 accent-amber-500"
                    />
                  )}

                  {isEditing ? (
                    /* ── Edit mode ── */
                    <div className="flex-1">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="col-span-2 sm:col-span-2">
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Field Name</label>
                          <input
                            type="text"
                            value={f.name}
                            onChange={(e) => updateField(f.fieldId, { name: e.target.value })}
                            className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Crop</label>
                          <select
                            value={f.crop}
                            onChange={(e) => updateField(f.fieldId, { crop: e.target.value as Crop })}
                            className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          >
                            {CROPS.map((c) => (
                              <option key={c} value={c}>{CROP_CONFIG[c].label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Acres</label>
                            <input
                              type="number" min="0" step="1" value={f.acres}
                              onChange={(e) => updateField(f.fieldId, { acres: Math.max(0, parseFloat(e.target.value) || 0) })}
                              className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">APH bu/ac</label>
                            <input
                              type="number" min="0" step="1" value={f.aph}
                              onChange={(e) => updateField(f.fieldId, { aph: Math.max(0, parseFloat(e.target.value) || 0) })}
                              className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => setEditingFieldId(null)}
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
                        <h3 className="text-base font-semibold text-stone-900">{f.name}</h3>
                        {!selectionMode && (
                          <button
                            onClick={() => setEditingFieldId(f.fieldId)}
                            className="shrink-0 rounded-lg border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-400 hover:border-amber-400 hover:text-amber-600 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      <div className="flex items-start gap-6">
                        <Stat value={f.acres.toLocaleString()} label="Acres" />
                        <div className="w-px self-stretch bg-stone-100" />
                        <Stat value={CROP_CONFIG[f.crop]?.label ?? f.crop} label="Crop" />
                        <div className="w-px self-stretch bg-stone-100" />
                        <Stat value={f.aph} label="APH bu/ac" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl mx-4">
            <h3 className="text-base font-semibold text-stone-900">
              Delete {selectedIds.size} field{selectedIds.size !== 1 ? "s" : ""}?
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              This will remove the selected field
              {selectedIds.size !== 1 ? "s" : ""} and all associated cost data.
              This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Machinery */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
              Machinery
            </p>
            <p className="mt-0.5 text-sm text-stone-500">
              {machinery.length} item{machinery.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {machinerySelectionMode ? (
              <>
                {machinerySelectedIds.size > 0 && (
                  <button
                    onClick={() => setShowMachineryDeleteConfirm(true)}
                    className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                  >
                    Delete ({machinerySelectedIds.size})
                  </button>
                )}
                <button
                  onClick={exitMachinerySelectionMode}
                  className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-500 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleAddMachinery}
                  className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
                >
                  + Add
                </button>
                <button
                  onClick={() => setMachinerySelectionMode(true)}
                  className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-400 hover:bg-stone-50 transition-colors"
                >
                  Select
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {machinery.map((m) => (
            <MachineryRow
              key={m.machineryId}
              item={m}
              onUpdate={(patch) => updateMachinery(m.machineryId, patch)}
              selectionMode={machinerySelectionMode}
              isSelected={machinerySelectedIds.has(m.machineryId)}
              onToggle={() => toggleMachinerySelect(m.machineryId)}
              isEditing={!machinerySelectionMode && editingMachineryId === m.machineryId}
              onEditToggle={() =>
                setEditingMachineryId(
                  editingMachineryId === m.machineryId ? null : m.machineryId,
                )
              }
            />
          ))}
          {machinery.length === 0 && (
            <p className="text-sm text-stone-400">No machinery added yet.</p>
          )}
        </div>
      </section>

      {/* Machinery delete confirmation */}
      {showMachineryDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMachineryDeleteConfirm(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl mx-4">
            <h3 className="text-base font-semibold text-stone-900">
              Delete {machinerySelectedIds.size} item
              {machinerySelectedIds.size !== 1 ? "s" : ""}?
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              This will remove the selected machinery item
              {machinerySelectedIds.size !== 1 ? "s" : ""} permanently.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowMachineryDeleteConfirm(false)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmMachineryDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      {(isDirty || saveStatus === "saved") && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur shadow-lg">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
            <p className="text-sm font-medium text-stone-600">
              {saveStatus === "saved" ? "Changes saved." : "You have unsaved changes."}
            </p>
            {saveStatus !== "saved" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscard}
                  disabled={saveStatus === "saving"}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {saveStatus === "saving" ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
