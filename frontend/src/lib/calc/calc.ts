/**
 * v1 financial calculation engine — the single, authoritative implementation
 * (CLAUDE.md §2). Pure TypeScript: no `next/*`, no React, no app imports.
 *
 * All figures are per-acre unless noted. Formulas mirror
 * `docs/v1-alignment.md` §7 exactly.
 */

import type { CropEntry, Scenario } from "./scenario";

/** revenue/acre = yield × cashPrice + govtPayment */
export function revenuePerAcre(c: CropEntry): number {
  return c.yieldBuPerAcre * c.cashPricePerBu + c.govtPaymentPerAcre;
}

/** Σ directCosts[].value */
export function totalDirectExpense(c: CropEntry): number {
  return c.directCosts.reduce((sum, line) => sum + line.value, 0);
}

/** land + machinery (the two single $/acre capital numbers in v1) */
export function totalCapitalExpense(c: CropEntry): number {
  return c.landCostPerAcre + c.machineryCostPerAcre;
}

/** direct + capital + net family living (per acre) */
export function totalExpensePerAcre(
  c: CropEntry,
  netFamilyLivingPerAcre = 0,
): number {
  return (
    totalDirectExpense(c) + totalCapitalExpense(c) + netFamilyLivingPerAcre
  );
}

/** revenue − total expense */
export function netMarginPerAcre(
  c: CropEntry,
  netFamilyLivingPerAcre = 0,
): number {
  return revenuePerAcre(c) - totalExpensePerAcre(c, netFamilyLivingPerAcre);
}

/** "what I must sell at" = total expense ÷ yield. Returns NaN when yield ≤ 0. */
export function breakevenPrice(
  c: CropEntry,
  netFamilyLivingPerAcre = 0,
): number {
  if (c.yieldBuPerAcre <= 0) return NaN;
  return totalExpensePerAcre(c, netFamilyLivingPerAcre) / c.yieldBuPerAcre;
}

/** total expense ÷ cashPrice. Returns NaN when price ≤ 0. */
export function breakevenYield(
  c: CropEntry,
  netFamilyLivingPerAcre = 0,
): number {
  if (c.cashPricePerBu <= 0) return NaN;
  return totalExpensePerAcre(c, netFamilyLivingPerAcre) / c.cashPricePerBu;
}

/**
 * price × yield sensitivity grid. Holds expenses fixed, varies price & yield.
 * Returns number[][] with rows = price, cols = yield.
 *   cell = yield × price − (direct + capital + nfl) + govtPayment
 */
export function sensitivityGrid(
  c: CropEntry,
  priceRange: number[],
  yieldRange: number[],
  netFamilyLivingPerAcre = 0,
): number[][] {
  const fixedExpense =
    totalDirectExpense(c) + totalCapitalExpense(c) + netFamilyLivingPerAcre;
  return priceRange.map((price) =>
    yieldRange.map(
      (yieldBu) => yieldBu * price - fixedExpense + c.govtPaymentPerAcre,
    ),
  );
}

/** net family living per acre = max(0, living − nonFarm) ÷ total acres */
export function familyLivingPerAcre(s: Scenario): number {
  if (!s.familyLiving) return 0;
  const totalAcres = s.crops.reduce((sum, c) => sum + c.acres, 0);
  if (totalAcres <= 0) return 0;
  const net = Math.max(
    0,
    s.familyLiving.annualLivingExpense - s.familyLiving.annualNonFarmIncome,
  );
  return net / totalAcres;
}

/**
 * Whole-farm rollup: each crop's per-acre figures × that crop's acres, summed.
 * Net family living is spread across all acres via familyLivingPerAcre.
 */
export function wholeFarm(s: Scenario): {
  revenue: number;
  expense: number;
  netMargin: number;
} {
  const nfl = familyLivingPerAcre(s);
  let revenue = 0;
  let expense = 0;
  for (const c of s.crops) {
    revenue += revenuePerAcre(c) * c.acres;
    expense += totalExpensePerAcre(c, nfl) * c.acres;
  }
  return { revenue, expense, netMargin: revenue - expense };
}
