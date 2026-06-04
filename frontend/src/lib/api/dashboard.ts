import { apiFetch } from "./client";
import type { DashboardResponse } from "@/types";

export function getDashboardSignals(farmId: string): Promise<DashboardResponse> {
  return apiFetch(`/api/dashboard/signals/${farmId}`);
}
