import { mockFarmProfile, mockMachinery } from "@/lib/mocks/data/farm";
import { apiFetch, getClerkToken, hasConfiguredApiBase } from "./client";
import type { FarmProfile, MachineryListResponse, Machinery } from "@/types";

export async function getFarmProfile(): Promise<FarmProfile> {
  if (!hasConfiguredApiBase() || !(await getClerkToken())) {
    return mockFarmProfile;
  }
  return apiFetch("/api/me/farm");
}

export async function updateFarmProfile(
  data: Partial<Omit<FarmProfile, "farmId">> & { machinery?: Machinery[] },
): Promise<{ ok: boolean }> {
  if (!hasConfiguredApiBase() || !(await getClerkToken())) {
    void data;
    return { ok: true };
  }
  return apiFetch("/api/me/farm", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getMachinery(): Promise<MachineryListResponse> {
  if (!hasConfiguredApiBase() || !(await getClerkToken())) {
    return mockMachinery;
  }
  return apiFetch("/api/me/farm/machinery");
}
