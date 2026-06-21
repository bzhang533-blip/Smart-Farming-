import type { CostLine, CropKey } from "@/lib/calc/scenario";

/** Per-crop slice of the GET /defaults response. */
export interface DefaultsCropEntry {
  directCosts: CostLine[];
  landCostPerAcre: number;
  machineryCostPerAcre: number;
}

/**
 * Shape of GET /defaults response.
 * Mirrors docs/v1-alignment.md DefaultsResponse.
 * crops is keyed by canonical CropKey ("corn" | "soybeans" | "other").
 */
export interface DefaultsResponse {
  year: number;
  region: string;
  interestRatePct: number;
  crops: Partial<Record<CropKey, DefaultsCropEntry>>;
  sources: { label: string; url: string }[];
}
