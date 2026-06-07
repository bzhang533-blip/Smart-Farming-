import type { DashboardResponse } from "@/types";

export const mockDashboardResponse: DashboardResponse = {
  farmId: "farm-001",
  updatedAt: "2026-06-04T10:00:00Z",
  signals: [
    {
      fieldId: "field-001",
      crop: "corn",
      signalType: "sell",
      reason: "Cash price clears breakeven by $0.32/bu. Basis is strengthening vs 5-year average — favorable window to price bushels.",
      currentCashPrice: 4.85,
      breakevenPrice: 4.53,
      basisAlert: true,
      basisVs5YearAvg: 0.05,
    },
    {
      fieldId: "field-002",
      crop: "soybean",
      signalType: "watch",
      reason: "Cash price is $0.30/bu below breakeven. Hold and monitor — basis still under 5-year average.",
      currentCashPrice: 11.10,
      breakevenPrice: 11.40,
      basisAlert: false,
      basisVs5YearAvg: -0.12,
    },
  ],
};
