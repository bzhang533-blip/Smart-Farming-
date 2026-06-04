import type { Crop } from "./common";

export type SignalType = "sell" | "hold" | "watch";

export interface DashboardSignal {
  fieldId: string;
  crop: Crop;
  signalType: SignalType;
  reason: string;
  currentCashPrice: number;
  breakevenPrice: number;
  basisAlert: boolean;
  basisVs5YearAvg: number;
}

export interface DashboardResponse {
  farmId: string;
  updatedAt: string;
  signals: DashboardSignal[];
}
