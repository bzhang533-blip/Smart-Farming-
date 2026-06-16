/**
 * v1 Scenario schema — single source of truth, mirrored from
 * `docs/v1-alignment.md` §6 (and `tasks/api-contracts.md`).
 *
 * Pure data types only: no `next/*`, no React, no imports from the app.
 * Any change here is a shared FE/BE decision and must be reflected in the
 * alignment doc.
 */

export type CropKey = "corn" | "soybeans" | "other";

export type CostSource = "default" | "user";

/** One direct-cost line, in $/acre. */
export interface CostLine {
  key: string; // stable id, e.g. "seed"
  label: string; // display label, e.g. "Seed/Plants (Treated)"
  value: number; // $/acre
  source: CostSource; // was it a default, or did the user edit it?
}

export interface CropEntry {
  crop: CropKey;
  acres: number;
  yieldBasis: "aph" | "expected";
  yieldBuPerAcre: number;
  cashPricePerBu: number;
  govtPaymentPerAcre: number; // averaged over acres; default 0
  directCosts: CostLine[]; // the ~17 standard direct-expense lines
  landCostPerAcre: number; // single manual number in v1
  machineryCostPerAcre: number; // single manual number in v1
}

/** Optional in v1; affects breakeven when present. */
export interface FamilyLiving {
  annualLivingExpense: number;
  annualNonFarmIncome: number;
}

export interface Scenario {
  id?: string;
  year: number;
  region: string; // e.g. "midwest"
  farm: { name?: string; address?: string };
  crops: CropEntry[];
  familyLiving?: FamilyLiving; // optional in v1; defaults to 0
  createdAt?: string;
  updatedAt?: string;
}
