import { http, HttpResponse } from "msw";
import type { BreakevenRequest } from "@/types";
import { mockFarmProfile, mockMachinery } from "./data/farm";
import { breakevenFromRequest } from "./data/breakeven";

export const handlers = [
  http.get("/api/farm/profile/:farmId", () =>
    HttpResponse.json(mockFarmProfile)
  ),

  http.post("/api/farm/profile", () =>
    HttpResponse.json({ farmId: "farm-001" }, { status: 201 })
  ),

  http.put("/api/farm/profile/:farmId", () =>
    HttpResponse.json({ ok: true })
  ),

  http.get("/api/farm/machinery", () =>
    HttpResponse.json(mockMachinery)
  ),

  http.post("/api/breakeven/calculate", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<BreakevenRequest>;
    return HttpResponse.json(breakevenFromRequest(body));
  }),
];
