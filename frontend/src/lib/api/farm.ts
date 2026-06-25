import { apiFetch } from "./client";
import type { FarmProfile, MachineryListResponse } from "@/types";

export function getFarmProfile(): Promise<FarmProfile> {
  return apiFetch("/api/me/farm");
}

export function updateFarmProfile(
  data: Partial<Omit<FarmProfile, "farmId">>,
): Promise<{ ok: boolean }> {
  return apiFetch("/api/me/farm", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getMachinery(): Promise<MachineryListResponse> {
  return apiFetch("/api/me/farm/machinery");
}
