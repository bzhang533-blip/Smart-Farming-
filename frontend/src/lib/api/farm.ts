import { mockFarmProfile, mockMachinery } from "@/lib/mocks/data/farm";
import type { FarmProfile, MachineryListResponse } from "@/types";

export function getFarmProfile(farmId: string): Promise<FarmProfile> {
  return Promise.resolve({ ...mockFarmProfile, farmId });
}

export function createFarmProfile(
  data: Omit<FarmProfile, "farmId">
): Promise<{ farmId: string }> {
  void data;
  return Promise.resolve({ farmId: "farm-001" });
}

export function updateFarmProfile(
  farmId: string,
  data: Partial<Omit<FarmProfile, "farmId">>
): Promise<{ ok: boolean }> {
  void farmId;
  void data;
  return Promise.resolve({ ok: true });
}

export function getMachinery(farmId: string): Promise<MachineryListResponse> {
  return Promise.resolve({ ...mockMachinery, farmId });
}
