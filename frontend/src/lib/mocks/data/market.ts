import type {
  CashPricesResponse,
  FuturesPrice,
  BasisHistoryResponse,
} from "@/types";

export const mockCashPrices: CashPricesResponse = {
  state: "IA",
  crop: "corn",
  updatedAt: "2026-06-04T10:00:00Z",
  prices: [
    {
      elevatorId: "elev-001",
      elevatorName: "Iowa Falls Grain Co.",
      zip: "50126",
      cashPrice: 4.52,
      futuresMonth: "ZCZ26",
      basis: -0.18,
    },
    {
      elevatorId: "elev-002",
      elevatorName: "Ames Farmers Elevator",
      zip: "50010",
      cashPrice: 4.48,
      futuresMonth: "ZCZ26",
      basis: -0.22,
    },
  ],
};

export const mockFuturesPrice: FuturesPrice = {
  symbol: "ZC",
  contract: "ZCZ26",
  price: 4.70,
  updatedAt: "2026-06-04T10:00:00Z",
};

export const mockBasisHistory: BasisHistoryResponse = {
  state: "IA",
  crop: "corn",
  zip: "50126",
  series: [
    { date: "2026-01-01", basis: -0.22 },
    { date: "2026-02-01", basis: -0.20 },
    { date: "2026-03-01", basis: -0.19 },
    { date: "2026-04-01", basis: -0.18 },
    { date: "2026-05-01", basis: -0.17 },
    { date: "2026-06-01", basis: -0.18 },
  ],
};
