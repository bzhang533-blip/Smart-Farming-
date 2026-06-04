import { apiFetch } from "./client";
import type { FarmProfile, MachineryListResponse } from "@/types";

export function getFarmProfile(farmId: string): Promise<FarmProfile> {
  return apiFetch(`/api/farm/profile/${farmId}`);
}

export function createFarmProfile(
  data: Omit<FarmProfile, "farmId">
): Promise<{ farmId: string }> {
  return apiFetch("/api/farm/profile", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateFarmProfile(
  farmId: string,
  data: Partial<Omit<FarmProfile, "farmId">>
): Promise<{ ok: boolean }> {
  return apiFetch(`/api/farm/profile/${farmId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getMachinery(farmId: string): Promise<MachineryListResponse> {
  return apiFetch(`/api/farm/machinery?farmId=${farmId}`);
}
