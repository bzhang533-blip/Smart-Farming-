import type { Crop, Season } from "./common";

export interface BreakevenRequest {
  farmId: string;
  fieldId: string;
  crop: Crop;
  season: Season;
}

export interface BreakevenResult {
  fieldId: string;
  crop: Crop;
  season: Season;
  breakevenPrice: number;    // $/bu — authoritative from backend
  totalCostPerAcre: number;  // $
  aph: number;               // bu/acre
  currentCashPrice: number;  // $/bu — local cash price, NOT futures
  profitPerBushel: number;   // $/bu
  profitPerAcre: number;     // $
  profitMarginPct: number;   // %
}
