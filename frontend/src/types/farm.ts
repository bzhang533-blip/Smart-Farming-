import type { Crop, State } from "./common";

export interface CostStructure {
  seedCostPerAcre: number;
  fertilizerCostPerAcre: number;
  chemicalCostPerAcre: number;
  landRentPerAcre: number;
  machineryDepreciationPerAcre: number;
  laborCostPerAcre: number;
  otherCostPerAcre: number;
}

export interface Field {
  fieldId: string;
  name: string;
  acres: number;
  zip: string;
  crop: Crop;
  aph: number; // average production history (bu/acre)
}

export interface ValueRange {
  low: number;
  high: number;
}

export interface Machinery {
  machineryId: string;
  type: string;
  model: string;
  purchaseYear: number;
  purchasePrice: number;
  estimatedUsefulLifeYears: number;
  annualAcresCovered: number;
  referenceValueRange: ValueRange;
}

export interface FarmProfile {
  farmId: string;
  name: string;
  state: State;
  fields: Field[];
  costStructure: CostStructure;
}

export interface MachineryListResponse {
  farmId: string;
  machinery: Machinery[];
}
