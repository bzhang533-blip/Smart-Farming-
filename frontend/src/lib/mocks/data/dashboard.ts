import type { DashboardResponse } from "@/types";

export const mockDashboardResponse: DashboardResponse = {
  farmId: "farm-001",
  updatedAt: "2026-06-04T10:00:00Z",
  signals: [
    {
      fieldId: "field-001",
      crop: "corn",
      signalType: "sell",
      reason: "Cash price is 48% above breakeven. Basis is strengthening vs 5-year average.",
      currentCashPrice: 4.52,
      breakevenPrice: 3.05,
      basisAlert: true,
      basisVs5YearAvg: 0.05,
    },
    {
      fieldId: "field-002",
      crop: "soybean",
      signalType: "watch",
      reason: "Margin positive but basis below 5-year average. Monitor for improvement.",
      currentCashPrice: 10.80,
      breakevenPrice: 9.95,
      basisAlert: false,
      basisVs5YearAvg: -0.12,
    },
  ],
};
