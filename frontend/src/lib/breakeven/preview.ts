import type { Crop } from "@/types";
import type {
  CostItem,
  RevenueInputs,
  CostSubtotals,
  SensitivityMatrix,
  BreakevenResult,
} from "@/types";
import { CROP_CONFIG } from "@/config/crops";
import { costItemSign } from "@/config/costModel";

/**
 * ⚠️ 非权威预览引擎（NON-AUTHORITATIVE）。
 *
 * 镜像 Compeer Grain Margin Manager 的公式（见 tasks/domain-cost-model.md），
 * 仅用于：(1) 成本录入时的即时预览；(2) 驱动 MSW mock 数据。
 *
 * 展示给用户的权威保本/盈亏数字必须来自后端 `POST /api/breakeven/calculate`。
 * 本文件不得被当作财务真理来源。
 *
 * 所有除法均做 0 守卫（修复竞品 #DIV/0! 脆弱：单产=0 时返回安全值，不产生 NaN/Infinity）。
 */

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** 成本科目小计：direct / capital 直接求和，netFamilyLiving = max(0, 家庭生活 − 非农收入)。 */
export function costSubtotals(items: CostItem[]): CostSubtotals {
  let directTotal = 0;
  let capitalTotal = 0;
  let familyRaw = 0; // 家庭生活(+) − 非农收入(−)，可能为负
  for (const it of items) {
    if (it.category === "direct") directTotal += it.valuePerAcre;
    else if (it.category === "capital") capitalTotal += it.valuePerAcre;
    else if (it.category === "netFamilyLiving") {
      familyRaw += costItemSign(it.key) * it.valuePerAcre;
    }
  }
  return {
    directTotal: round2(directTotal),
    capitalTotal: round2(capitalTotal),
    netFamilyLiving: round2(Math.max(0, familyRaw)),
  };
}

/** 每英亩总成本 = direct + capital + netFamilyLiving。 */
export function totalCostPerAcre(sub: CostSubtotals): number {
  return round2(sub.directTotal + sub.capitalTotal + sub.netFamilyLiving);
}

function buildAxis(center: number, step: number, extent: number): number[] {
  const axis: number[] = [];
  for (let i = -extent; i <= extent; i++) {
    axis.push(round2(center + i * step));
  }
  return axis;
}

/** price × yield 敏感性矩阵；cells[priceIdx][yieldIdx] = 每英亩净利润。 */
export function sensitivityMatrix(
  items: CostItem[],
  revenue: RevenueInputs,
  crop: Crop
): SensitivityMatrix {
  const { sensitivity } = CROP_CONFIG[crop];
  const total = totalCostPerAcre(costSubtotals(items));
  const yieldAxis = buildAxis(revenue.aph, sensitivity.yieldStep, sensitivity.yieldExtent)
    .map((y) => Math.max(0, y)); // 单产不为负
  const priceAxis = buildAxis(revenue.cashPrice, sensitivity.priceStep, sensitivity.priceExtent)
    .map((p) => Math.max(0, p));
  const cells = priceAxis.map((price) =>
    yieldAxis.map((y) => round2(y * price + revenue.govtPaymentPerAcre - total))
  );
  return { yieldAxis, priceAxis, cells };
}

export interface PreviewInput {
  fieldId: string;
  crop: Crop;
  season: string;
  items: CostItem[];
  revenue: RevenueInputs;
  /** 决策比对用的本地现金价；缺省时用 revenue.cashPrice。 */
  currentCashPrice?: number;
}

/** 生成一份与后端契约同形状的预览结果。 */
export function computeBreakevenPreview(input: PreviewInput): BreakevenResult {
  const { fieldId, crop, season, items, revenue } = input;
  const sub = costSubtotals(items);
  const total = totalCostPerAcre(sub);
  const aph = revenue.aph;
  const cashPrice = input.currentCashPrice ?? revenue.cashPrice;

  const breakevenPrice = aph > 0 ? round2(total / aph) : 0; // #DIV/0! 守卫
  const totalRevenuePerAcre = round2(aph * cashPrice + revenue.govtPaymentPerAcre);
  const netMarginPerAcre = round2(totalRevenuePerAcre - total);
  const profitPerBushel = round2(cashPrice - breakevenPrice);
  const profitMarginPct = total > 0 ? round1((netMarginPerAcre / total) * 100) : 0;

  return {
    fieldId,
    crop,
    season,
    breakevenPrice,
    totalCostPerAcre: total,
    aph,
    currentCashPrice: cashPrice,
    totalRevenuePerAcre,
    profitPerBushel,
    profitPerAcre: netMarginPerAcre,
    netMarginPerAcre,
    profitMarginPct,
    subtotals: sub,
    sensitivityMatrix: sensitivityMatrix(items, { ...revenue, cashPrice }, crop),
  };
}
