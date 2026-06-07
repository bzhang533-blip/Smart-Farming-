import { http, HttpResponse } from "msw";
import type { BreakevenRequest } from "@/types";
import { mockCashPrices, mockFuturesPrice, mockBasisHistory } from "./data/market";
import { mockFarmProfile, mockMachinery } from "./data/farm";
import { breakevenFromRequest } from "./data/breakeven";
import { mockDashboardResponse } from "./data/dashboard";

export const handlers = [
  http.get("/api/market/cash-prices", () =>
    HttpResponse.json(mockCashPrices)
  ),

  http.get("/api/market/futures", () =>
    HttpResponse.json(mockFuturesPrice)
  ),

  http.get("/api/market/basis-history", () =>
    HttpResponse.json(mockBasisHistory)
  ),

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

  http.get("/api/dashboard/signals/:farmId", () =>
    HttpResponse.json(mockDashboardResponse)
  ),
];
