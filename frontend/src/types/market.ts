import type { Crop, State } from "./common";

export interface ElevatorCashPrice {
  elevatorId: string;
  elevatorName: string;
  zip: string;
  cashPrice: number;
  futuresMonth: string;
  basis: number;
}

export interface CashPricesResponse {
  state: State;
  crop: Crop;
  updatedAt: string;
  prices: ElevatorCashPrice[];
}

export interface FuturesPrice {
  symbol: string;
  contract: string;
  price: number;
  updatedAt: string;
}

export interface BasisPoint {
  date: string;
  basis: number;
}

export interface BasisHistoryResponse {
  state: State;
  crop: Crop;
  zip: string;
  series: BasisPoint[];
}
