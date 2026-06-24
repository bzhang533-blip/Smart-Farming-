import { mockDefaults } from "@/lib/mocks/data/defaults";
import { apiFetch, hasConfiguredApiBase } from "./client";
import type { DefaultsResponse } from "@/types";

export function getDefaults(params?: {
  crop?: string;
  region?: string;
}): Promise<DefaultsResponse> {
  const qs = new URLSearchParams();
  if (params?.crop) qs.set("crop", params.crop);
  if (params?.region) qs.set("region", params.region);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  if (!hasConfiguredApiBase()) return Promise.resolve(mockDefaults);
  return apiFetch(`/defaults${query}`);
}
