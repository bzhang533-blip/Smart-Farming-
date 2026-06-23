import { create } from "zustand";
import type { FarmProfile, Field } from "@/types/farm";
import type { DefaultsResponse } from "@/types/defaults";
import type { FieldInputs } from "@/components/breakeven/FieldInputPanel";
import type { CropKey } from "@/lib/calc/scenario";

// Build FieldInputs maps from a FarmProfile + DefaultsResponse.
// Used on initial load; also called when a field's crop changes.
function buildInputMaps(
  farm: FarmProfile,
  defaults: DefaultsResponse,
): {
  inputs: Map<string, FieldInputs>;
  defaultsMap: Map<string, FieldInputs>;
} {
  const inputs = new Map<string, FieldInputs>();
  const defaultsMap = new Map<string, FieldInputs>();
  for (const field of farm.fields) {
    const cropKey = field.crop as CropKey;
    const cropDefs = defaults.crops[cropKey];
    const fi: FieldInputs = {
      cashPricePerBu: 0,
      yieldBuPerAcre: field.aph,
      landCostPerAcre: cropDefs?.landCostPerAcre ?? 0,
      machineryCostPerAcre: cropDefs?.machineryCostPerAcre ?? 0,
      directCosts: cropDefs?.directCosts.map((c) => ({ ...c })) ?? [],
    };
    inputs.set(field.fieldId, fi);
    defaultsMap.set(field.fieldId, {
      ...fi,
      directCosts: fi.directCosts.map((c) => ({ ...c })),
    });
  }
  return { inputs, defaultsMap };
}

interface FarmState {
  farm: FarmProfile | null;
  defaults: DefaultsResponse | null;
  fieldInputs: Map<string, FieldInputs>;
  defaultFieldInputs: Map<string, FieldInputs>;
}

interface FarmActions {
  /** Called by FarmClient and BreakevenClient fallback after fetching from the API. */
  initFromFetch: (farm: FarmProfile, defaults: DefaultsResponse) => void;
  updateFarmName: (name: string) => void;
  /**
   * Patch any Field property. Side effects:
   * - patch.crop: re-seeds this field's FieldInputs from the new crop defaults.
   * - patch.aph (without crop): syncs fieldInputs[fieldId].yieldBuPerAcre.
   */
  updateField: (fieldId: string, patch: Partial<Field>) => void;
  /** Called by BreakevenClient's FieldInputPanel onChange. */
  updateFieldInputs: (fieldId: string, inputs: FieldInputs) => void;
}

export const useFarmStore = create<FarmState & FarmActions>((set, get) => ({
  farm: null,
  defaults: null,
  fieldInputs: new Map(),
  defaultFieldInputs: new Map(),

  initFromFetch(farm, defaults) {
    const { inputs, defaultsMap } = buildInputMaps(farm, defaults);
    set({
      farm,
      defaults,
      fieldInputs: inputs,
      defaultFieldInputs: defaultsMap,
    });
  },

  updateFarmName(name) {
    const { farm } = get();
    if (!farm) return;
    set({ farm: { ...farm, name } });
  },

  updateField(fieldId, patch) {
    const { farm, defaults, fieldInputs, defaultFieldInputs } = get();
    if (!farm) return;

    const updatedFields = farm.fields.map((f) =>
      f.fieldId === fieldId ? { ...f, ...patch } : f,
    );
    const updates: Partial<FarmState> = {
      farm: { ...farm, fields: updatedFields },
    };

    // Crop changed: re-seed FieldInputs from new crop defaults.
    if (patch.crop !== undefined && defaults) {
      const cropKey = patch.crop as CropKey;
      const cropDefs = defaults.crops[cropKey];
      const currentAph =
        farm.fields.find((f) => f.fieldId === fieldId)?.aph ?? 0;
      const fi: FieldInputs = {
        cashPricePerBu: 0,
        yieldBuPerAcre: currentAph,
        landCostPerAcre: cropDefs?.landCostPerAcre ?? 0,
        machineryCostPerAcre: cropDefs?.machineryCostPerAcre ?? 0,
        directCosts: cropDefs?.directCosts.map((c) => ({ ...c })) ?? [],
      };
      updates.fieldInputs = new Map(fieldInputs).set(fieldId, fi);
      updates.defaultFieldInputs = new Map(defaultFieldInputs).set(fieldId, {
        ...fi,
        directCosts: fi.directCosts.map((c) => ({ ...c })),
      });
    }

    // APH changed (without crop change): sync yieldBuPerAcre.
    if (patch.aph !== undefined && patch.crop === undefined) {
      const fi = fieldInputs.get(fieldId);
      if (fi) {
        updates.fieldInputs = new Map(fieldInputs).set(fieldId, {
          ...fi,
          yieldBuPerAcre: patch.aph,
        });
      }
    }

    set(updates);
  },

  updateFieldInputs(fieldId, inputs) {
    set((s) => ({
      fieldInputs: new Map(s.fieldInputs).set(fieldId, inputs),
    }));
  },
}));
