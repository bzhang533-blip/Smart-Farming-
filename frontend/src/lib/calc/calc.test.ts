import { describe, expect, it } from "vitest";

import {
  breakevenPrice,
  breakevenYield,
  familyLivingPerAcre,
  netMarginPerAcre,
  revenuePerAcre,
  sensitivityGrid,
  totalCapitalExpense,
  totalDirectExpense,
  totalExpensePerAcre,
  wholeFarm,
} from "./calc";
import type { CostLine, CropEntry, Scenario } from "./scenario";

/** Build a default-sourced direct-cost array from a key→$/acre map. */
function costs(map: Record<string, number>): CostLine[] {
  return Object.entries(map).map(([key, value]) => ({
    key,
    label: key,
    value,
    source: "default",
  }));
}

// Fixtures from docs/build-calc-engine.md (reference budget table).
const CORN: CropEntry = {
  crop: "corn",
  acres: 100,
  yieldBasis: "expected",
  yieldBuPerAcre: 210,
  cashPricePerBu: 4.2,
  govtPaymentPerAcre: 0,
  landCostPerAcre: 265,
  machineryCostPerAcre: 65,
  directCosts: costs({
    chemicals_herbicide: 55,
    fungicide_insecticide: 0,
    crop_insurance: 22,
    custom_hire: 15,
    labor_hired: 21,
    fertilizer_lime: 200,
    fuel_oil: 30,
    insurance: 20,
    operating_interest: 20,
    repairs_maintenance: 46,
    seed: 135,
    storage_drying: 30,
    supplies: 0,
    trucking_freight: 4,
    utilities: 10,
    other_1: 14,
    other_2: 0,
  }),
};

const SOYBEAN: CropEntry = {
  crop: "soybeans",
  acres: 100,
  yieldBasis: "expected",
  yieldBuPerAcre: 60,
  cashPricePerBu: 10.2,
  govtPaymentPerAcre: 0,
  landCostPerAcre: 265,
  machineryCostPerAcre: 65,
  directCosts: costs({
    chemicals_herbicide: 66,
    fungicide_insecticide: 0,
    crop_insurance: 19,
    custom_hire: 10,
    labor_hired: 15,
    fertilizer_lime: 72,
    fuel_oil: 20,
    insurance: 16,
    operating_interest: 15,
    repairs_maintenance: 33,
    seed: 65,
    storage_drying: 2,
    supplies: 0,
    trucking_freight: 3,
    utilities: 8,
    other_1: 10,
    other_2: 0,
  }),
};

function makeScenario(
  crops: CropEntry[],
  familyLiving?: Scenario["familyLiving"],
): Scenario {
  return { year: 2026, region: "midwest", farm: {}, crops, familyLiving };
}

describe("corn per-acre", () => {
  it("direct expense = 622", () => {
    expect(totalDirectExpense(CORN)).toBe(622);
  });
  it("capital expense = 330", () => {
    expect(totalCapitalExpense(CORN)).toBe(330);
  });
  it("total expense = 952", () => {
    expect(totalExpensePerAcre(CORN)).toBe(952);
  });
  it("revenue = 882", () => {
    expect(revenuePerAcre(CORN)).toBeCloseTo(882, 6);
  });
  it("net margin = -70", () => {
    expect(netMarginPerAcre(CORN)).toBeCloseTo(-70, 6);
  });
  it("breakeven price ≈ 4.533", () => {
    expect(breakevenPrice(CORN)).toBeCloseTo(4.533, 3);
  });
});

describe("soybean per-acre", () => {
  it("direct expense = 354", () => {
    expect(totalDirectExpense(SOYBEAN)).toBe(354);
  });
  it("capital expense = 330", () => {
    expect(totalCapitalExpense(SOYBEAN)).toBe(330);
  });
  it("total expense = 684", () => {
    expect(totalExpensePerAcre(SOYBEAN)).toBe(684);
  });
  it("revenue = 612", () => {
    expect(revenuePerAcre(SOYBEAN)).toBeCloseTo(612, 6);
  });
  it("net margin = -72", () => {
    expect(netMarginPerAcre(SOYBEAN)).toBeCloseTo(-72, 6);
  });
  it("breakeven price = 11.40", () => {
    expect(breakevenPrice(SOYBEAN)).toBeCloseTo(11.4, 6);
  });
  it("breakeven yield = 684 / 10.20 ≈ 67.06", () => {
    expect(breakevenYield(SOYBEAN)).toBeCloseTo(684 / 10.2, 6);
  });
});

describe("whole-farm (corn + soybean, 100 ac each)", () => {
  it("rolls up revenue / expense / net", () => {
    const scenario = makeScenario([CORN, SOYBEAN]);
    const wf = wholeFarm(scenario);
    expect(wf.revenue).toBeCloseTo(149400, 6);
    expect(wf.expense).toBeCloseTo(163600, 6);
    expect(wf.netMargin).toBeCloseTo(-14200, 6);
  });
});

describe("sensitivity grid (corn)", () => {
  it("rows = price, cols = yield; cell = yield×price − fixed + govt", () => {
    const grid = sensitivityGrid(CORN, [4.2, 4.7], [210]);
    expect(grid[0][0]).toBeCloseTo(-70, 6); // price 4.20, yield 210
    expect(grid[1][0]).toBeCloseTo(35, 6); // price 4.70, yield 210
  });
});

describe("family living", () => {
  it("max(0, living − nonFarm) / total acres", () => {
    const s = makeScenario(
      [CORN, SOYBEAN], // 200 total acres
      { annualLivingExpense: 50000, annualNonFarmIncome: 10000 },
    );
    expect(familyLivingPerAcre(s)).toBe(200); // 40000 / 200 = exactly representable
  });
  it("clamps negatives to 0", () => {
    const s = makeScenario(
      [CORN],
      { annualLivingExpense: 10000, annualNonFarmIncome: 50000 },
    );
    expect(familyLivingPerAcre(s)).toBe(0);
  });
});

describe("guards", () => {
  it("breakevenPrice returns NaN when yield = 0", () => {
    expect(breakevenPrice({ ...CORN, yieldBuPerAcre: 0 })).toBeNaN();
  });
  it("breakevenYield returns NaN when price = 0", () => {
    expect(breakevenYield({ ...CORN, cashPricePerBu: 0 })).toBeNaN();
  });
});
