import { mockFarmProfile, mockMachinery } from "@/lib/mocks/data/farm";
import { apiFetch, hasConfiguredApiBase } from "./client";
import type { FarmProfile, MachineryListResponse } from "@/types";

export function getFarmProfile(farmId: string): Promise<FarmProfile> {
  if (!hasConfiguredApiBase()) return Promise.resolve({ ...mockFarmProfile, farmId });
  return apiFetch(`/api/farm/profile/${farmId}`);
}

export function createFarmProfile(
  data: Omit<FarmProfile, "farmId">
): Promise<{ farmId: string }> {
  if (!hasConfiguredApiBase()) return Promise.resolve({ farmId: "farm-001" });
  return apiFetch("/api/farm/profile", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateFarmProfile(
  farmId: string,
  data: Partial<Omit<FarmProfile, "farmId">>
): Promise<{ ok: boolean }> {
  if (!hasConfiguredApiBase()) return Promise.resolve({ ok: true });
  return apiFetch(`/api/farm/profile/${farmId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getMachinery(farmId: string): Promise<MachineryListResponse> {
  if (!hasConfiguredApiBase()) return Promise.resolve({ ...mockMachinery, farmId });
  return apiFetch(`/api/farm/machinery?farmId=${farmId}`);
}
