import type { Crop } from "@/types";
import type { CostCategory, CostItem } from "@/types";

/**
 * 成本科目目录（data-driven）。
 *
 * 来源：Compeer Grain Margin Manager —— `Farm Margin Manager` sheet，
 * 见 `tasks/domain-cost-model.md`。每个科目的默认值是「玉米带平均水平」占位，
 * 仅作前端录入兜底（后端 `GET /defaults` 也会下发，可覆盖这里的占位值）。
 * 保本/盈亏的权威计算在前端 TS 引擎（`lib/breakeven/`），后端不算账（CLAUDE.md §2）。
 *
 * 加一种作物 = 在每个 `defaults` 里加一列；加一个成本项 = 在数组里加一条。
 * 严禁在组件里硬编码科目/标签/默认值。
 */
export interface CostItemDef {
  key: string;
  label: string;              // 原样英文标签（与 xlsx 一致）
  category: CostCategory;
  sign?: 1 | -1;              // 默认 +1；非农收入在 Net Family Living 内为 -1（抵减）
  defaults: Record<Crop, number>; // 每英亩默认值
}

export const COST_CATEGORY_ORDER: CostCategory[] = [
  "direct",
  "capital",
  "netFamilyLiving",
];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  direct: "Direct Expense",
  capital: "Capital Expense",
  netFamilyLiving: "Net Family Living",
};

export const COST_CATEGORY_HINTS: Record<CostCategory, string> = {
  direct: "Seed, fertilizer, chemicals, labor, fuel — variable inputs for the season",
  capital: "Land (P&I + rent + RE taxes) and machinery (P&I + lease)",
  netFamilyLiving: "max(0, family living − non-farm income) — only the shortfall is counted as cost",
};

export const COST_ITEM_CATALOG: CostItemDef[] = [
  // —— Direct Expense（17 项）——
  { key: "chemicals-herbicide", label: "Chemicals (Herbicide)", category: "direct", defaults: { corn: 55, soybeans: 66 } },
  { key: "fungicide-insecticide", label: "Fungicide/Insecticide", category: "direct", defaults: { corn: 0, soybeans: 0 } },
  { key: "crop-insurance", label: "Crop Insurance", category: "direct", defaults: { corn: 22, soybeans: 19 } },
  { key: "custom-hire", label: "Custom Hire", category: "direct", defaults: { corn: 15, soybeans: 10 } },
  { key: "labor-hired-benefits", label: "Labor Hired & Employee Benefits", category: "direct", defaults: { corn: 21, soybeans: 15 } },
  { key: "fertilizer-lime", label: "Fertilizer and Lime", category: "direct", defaults: { corn: 200, soybeans: 72 } },
  { key: "gas-fuel-oil", label: "Gas/Fuel/Oil", category: "direct", defaults: { corn: 30, soybeans: 20 } },
  { key: "insurance", label: "Insurance", category: "direct", defaults: { corn: 20, soybeans: 16 } },
  { key: "operating-interest", label: "Operating Interest", category: "direct", defaults: { corn: 20, soybeans: 15 } },
  { key: "repairs-maintenance", label: "Repairs/Maintenance", category: "direct", defaults: { corn: 46, soybeans: 33 } },
  { key: "seed-plants-treated", label: "Seed/Plants (Treated)", category: "direct", defaults: { corn: 135, soybeans: 65 } },
  { key: "storage-drying-warehouse", label: "Storage/Drying/Warehouse", category: "direct", defaults: { corn: 30, soybeans: 2 } },
  { key: "supplies", label: "Supplies", category: "direct", defaults: { corn: 0, soybeans: 0 } },
  { key: "trucking-freight", label: "Trucking/Freight", category: "direct", defaults: { corn: 4, soybeans: 3 } },
  { key: "utilities", label: "Utilities", category: "direct", defaults: { corn: 10, soybeans: 8 } },
  { key: "other-expense-1", label: "Other Expense", category: "direct", defaults: { corn: 14, soybeans: 10 } },
  { key: "other-expense-2", label: "Other Expense", category: "direct", defaults: { corn: 0, soybeans: 0 } },

  // —— Capital Expense（2 项）——
  { key: "land-cost", label: "Land Cost (P&I + Rent + RE Taxes)", category: "capital", defaults: { corn: 265, soybeans: 265 } },
  { key: "machinery-cost", label: "Machinery Cost (P&I + Lease)", category: "capital", defaults: { corn: 65, soybeans: 65 } },

  // —— Net Family Living（2 项；非农收入为抵减）——
  { key: "family-living-expense", label: "Family Living Expense", category: "netFamilyLiving", sign: 1, defaults: { corn: 0, soybeans: 0 } },
  { key: "non-farm-income-wages", label: "Non-Farm Income & Wages", category: "netFamilyLiving", sign: -1, defaults: { corn: 0, soybeans: 0 } },
];

/** 目录索引（按 key 快速查 def）。 */
export const COST_ITEM_BY_KEY: Record<string, CostItemDef> = Object.fromEntries(
  COST_ITEM_CATALOG.map((d) => [d.key, d])
);

/** 按作物生成一套默认成本项，作为录入表单兜底。 */
export function buildDefaultCostItems(crop: Crop): CostItem[] {
  return COST_ITEM_CATALOG.map((d) => ({
    key: d.key,
    category: d.category,
    valuePerAcre: d.defaults[crop],
  }));
}

/** 取某科目的符号（+1 / -1），未登记则默认 +1。 */
export function costItemSign(key: string): 1 | -1 {
  return COST_ITEM_BY_KEY[key]?.sign ?? 1;
}

/**
 * 把已有成本项与目录对齐，产出「目录顺序、键齐全」的完整列表：
 * 已录入的用录入值，缺失的用该作物默认值兜底（低摩擦：农户少填也能算）。
 */
export function mergeCostItems(items: CostItem[], crop: Crop): CostItem[] {
  const byKey = new Map(items.map((i) => [i.key, i.valuePerAcre]));
  return COST_ITEM_CATALOG.map((d) => ({
    key: d.key,
    category: d.category,
    valuePerAcre: byKey.get(d.key) ?? d.defaults[crop],
  }));
}
