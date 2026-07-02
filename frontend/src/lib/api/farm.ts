import { apiFetch } from "./client";
import type { FarmProfile, MachineryListResponse, Machinery } from "@/types";

export function getFarmProfile(): Promise<FarmProfile> {
  return apiFetch("/api/me/farm");
}

export function updateFarmProfile(
  data: Partial<Omit<FarmProfile, "farmId">> & { machinery?: Machinery[] },
): Promise<{ ok: boolean }> {
  return apiFetch("/api/me/farm", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getMachinery(): Promise<MachineryListResponse> {
  return apiFetch("/api/me/farm/machinery");
}
