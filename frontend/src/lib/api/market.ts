import { apiFetch } from "./client";
import type { Crop, State } from "@/types";
import type {
  CashPricesResponse,
  FuturesPrice,
  BasisHistoryResponse,
} from "@/types";

export function getCashPrices(params: {
  state: State;
  crop: Crop;
  zip?: string;
}): Promise<CashPricesResponse> {
  const query = new URLSearchParams(params as Record<string, string>);
  return apiFetch(`/api/market/cash-prices?${query}`);
}

export function getFutures(params: {
  symbol: string;
  contract?: string;
}): Promise<FuturesPrice> {
  const query = new URLSearchParams(params as Record<string, string>);
  return apiFetch(`/api/market/futures?${query}`);
}

export function getBasisHistory(params: {
  state: State;
  crop: Crop;
  zip?: string;
  from: string;
  to: string;
}): Promise<BasisHistoryResponse> {
  const query = new URLSearchParams(params as Record<string, string>);
  return apiFetch(`/api/market/basis-history?${query}`);
}
