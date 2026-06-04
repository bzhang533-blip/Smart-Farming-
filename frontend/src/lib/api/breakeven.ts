import { apiFetch } from "./client";
import type { BreakevenRequest, BreakevenResult } from "@/types";

export function calculateBreakeven(
  req: BreakevenRequest
): Promise<BreakevenResult> {
  return apiFetch("/api/breakeven/calculate", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
